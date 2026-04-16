const User = require('../models/User');
const { getAuthCookieClearOptions } = require('../config/authCookie');

class AuthController {
  // Get current authenticated user
  static async getCurrentUser(req, res) {
    try {
      // User is attached to req object by authMiddleware as { id: userId }
      const userId = req.user.id || req.user;
      const user = await User.findById(userId);

      if (!user) {
        return res.status(404).json({ 
          error: 'User not found' 
        });
      }

      // User.toJSON automatically removes password
      res.status(200).json({ 
        user: user.toJSON() 
      });
    } catch (error) {
      console.error('Error fetching current user:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }

  // Logout user
  static async logout(req, res) {
    try {
      res.clearCookie('token', getAuthCookieClearOptions());

      res.status(200).json({ 
        message: 'Logged out successfully' 
      });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({ error: 'Logout failed' });
    }
  }

  // Verify token (for frontend authentication checks)
  static async verifyToken(req, res) {
    // If we reach here, authMiddleware has already verified the token
    res.status(200).json({ 
      authenticated: true,
      user: req.user 
    });
  }

  // Delete account — User model post-hook cascades donations (userId + email)
  static async deleteAccount(req, res) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      await User.findByIdAndDelete(userId);

      res.clearCookie('token', getAuthCookieClearOptions());

      res.status(200).json({
        message: 'Account and your donation listings have been removed.',
      });
    } catch (error) {
      console.error('Delete account error:', error);
      res.status(500).json({ error: 'Could not delete account' });
    }
  }
}

module.exports = AuthController;