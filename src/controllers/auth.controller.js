import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { User } from '../models/user.model.js';
import { sendPasswordResetEmail } from '../helpers/email.js';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('FATAL ERROR: JWT_SECRET is not defined.');
}

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// REGISTER NEW USER
export const registerNewUser = async (req, res) => {
  // extract email alongside username and password
  const { username, email, password } = req.body;

  // basic input validation
  if (!username || !email || !password) {
    return res
      .status(400)
      .json({ error: 'Username, email, and password are required.' });
  }

  // check password length
  if (password.length < 8) {
    return res
      .status(400)
      .json({ error: 'Password must be at least 8 characters.' });
  }

  try {
    // checks if user already exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res
        .status(409)
        .json({ error: 'A user with this email already exists.' });
    }

    // hash the password before storing it
    const hashedPassword = await bcrypt.hash(password, 10);
    // pass email to the creation method
    const user = await User.create({
      username,
      email,
      password: hashedPassword,
    });

    // generate a JWT token for the new user
    const token = jwt.sign(
      { id: user.id, email: user.email, username: user.username },
      JWT_SECRET,
      {
        expiresIn: JWT_EXPIRES_IN,
        algorithm: 'HS256',
      },
    );

    res.status(201).json({
      success: true,
      message: 'User account created successfully.',
      token,
      user: { id: user.id, username: user.username, email: user.email },
    });
  } catch (error) {
    console.error('Error registering new user:', error);
    res.status(500).json({
      success: false,
      message: 'Error registering new user.',
      error: error.message,
    });
  }
};

// SIGN IN USER
export const signInUser = async (req, res) => {
  try {
    const { username, password } = req.body;

    // basic input validation 
    if (!username || !password) {
      return res
        .status(400)
        .json({ error: 'Username and password are required.' });
    }

    // Use unscoped query to include password field
    const user = await User.unscoped().findOne({
      where: { username },
    });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials.',
      });
    }

    // Compare the provided password with the hashed password in the database
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials.',
      });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, username: user.username },
      JWT_SECRET,
      {
        expiresIn: JWT_EXPIRES_IN,
      },
    );

    res.status(200).json({
      success: true,
      message: 'Signed in successfully.',
      token,
      user: { id: user.id, username: user.username, email: user.email },
    });
  } catch (error) {
    console.error('Error signing in:', error);
    res.status(500).json({
      success: false,
      message: 'Error signing in.',
      error: error.message,
    });
  }
};

// SIGN OUT USER
export const signOutUser = (_req, res) => {
  // JWT is stateless — client discards the token
  // If you add a token blocklist later, handle it here
  res.status(200).json({
    success: true,
    message: 'Signed out successfully.',
  });
};

// FORGOT USER PASSWORD
export const forgotPassword = async (req, res) => {
  // Generates a short-lived reset token and emails the user a reset link.
  // Always responds with 200 to prevent email enumeration.
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email is required.' });
  }

  try {
    const user = await User.findOne({ where: { email } });

    if (user) {
      // generate a cryptographically random raw token (sent in email)
      const rawToken = crypto.randomBytes(32).toString('hex');
      // store only the hash — never persist the raw token
      const tokenHash = crypto
        .createHash('sha256')
        .update(rawToken)
        .digest('hex');

      user.resetPasswordToken = tokenHash;
      user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
      await user.save();

      const clientOrigin = process.env.CORS_ORIGIN || 'http://localhost:4200';
      const resetUrl = `${clientOrigin}/reset-password?token=${rawToken}`;

      await sendPasswordResetEmail(email, resetUrl);
    }

    // always return 200 so callers cannot enumerate registered emails
    return res.status(200).json({
      success: true,
      message:
        'If an account with that email exists, a reset link has been sent.',
    });
  } catch (error) {
    console.error('Error in forgotPassword:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing password reset request.',
      error: error.message,
    });
  }
};

// RESET USER PASSWORD
export const resetPassword = async (req, res) => {
  // Validates the reset token and updates the user's password.
  const { token, password } = req.body;

  if (!token || !password) {
    return res
      .status(400)
      .json({ error: 'Token and new password are required.' });
  }

  if (password.length < 8) {
    return res
      .status(400)
      .json({ error: 'Password must be at least 8 characters.' });
  }

  try {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      where: { resetPasswordToken: tokenHash },
    });

    if (
      !user ||
      !user.resetPasswordExpires ||
      user.resetPasswordExpires < new Date()
    ) {
      return res.status(400).json({
        success: false,
        message: 'Password reset token is invalid or has expired.',
      });
    }

    user.password = await bcrypt.hash(password, 10);
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Password has been reset successfully. You can now sign in.',
    });
  } catch (error) {
    console.error('Error in resetPassword:', error);
    res.status(500).json({
      success: false,
      message: 'Error resetting password.',
      error: error.message,
    });
  }
};
