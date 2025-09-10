// middlewares/authorizeRole.js
/**
 * Usage: authorizeRole('moderator','admin')
 */
module.exports = function authorizeRole(...allowedRoles) {
  return (req, res, next) => {
    try {
      if (!req.user) return res.status(401).json({ message: 'No token provided' });
      if (!allowedRoles.includes(req.user.role)) {
        return res.status(403).json({ message: 'Forbidden: insufficient role' });
      }
      next();
    } catch (err) {
      console.error('authorizeRole error', err);
      res.status(500).json({ message: 'Server error' });
    }
  };
};
