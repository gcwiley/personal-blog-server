import { Router } from 'express';
import {
  registerNewUser,
  signInUser,
  signOutUser,
  forgotPassword,
  resetPassword,
} from '../controllers/auth.controller.js';

// --- AUTH ROUTER ---
export const authRouter = Router();

// POST /api/auth/register
// Route to register a new user
authRouter.post('/register', registerNewUser);

// POST /api/auth/signin
// Route to sign in an existing user
authRouter.post('/signin', signInUser);

// POST /api/auth/signout
authRouter.post('/signout', signOutUser);

// POST /api/auth/forgot-password
// Sends a password reset email to the provided address
authRouter.post('/forgot-password', forgotPassword);

// POST /api/auth/reset-password
// Validates the reset token and updates the user's password
authRouter.post('/reset-password', resetPassword);
