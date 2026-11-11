import { User } from '../models/user.model.js';

// GET USER PROFILE
export const getUserProfile = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }
    // toJSON() on model strips password automatically
    res.status(200).json({
      success: true,
      message: 'Successfully fetched user profile.',
      data: user,
    });
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching user profile.',
      error: error.message,
    });
  }
};

// UPDATE USER PROFILE
export const updateUserProfile = async (req, res) => {
  try {
    // identity (username/email) is managed by Google SSO — only username is
    // editable locally as a display name; password-based accounts no longer exist
    const { username, email } = req.body;
    const updates = {};

    if (username != null) updates.username = username;
    if (email != null) updates.email = email;

    // guard against empty update body
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid fields provided for update.',
      });
    }

    // confirm user exists before updating
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    await user.update(updates);

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully.',
      data: user,
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating profile.',
      error: error.message,
    });
  }
};

// DELETE USER PROFILE
export const deleteUserProfile = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    await user.destroy();

    res.status(200).json({
      success: true,
      message: 'Account deleted successfully.',
    });
  } catch (error) {
    console.error('Error deleting account:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting account.',
      error: error.message,
    });
  }
};
