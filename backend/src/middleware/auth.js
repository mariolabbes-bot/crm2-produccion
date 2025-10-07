const jwt = require('jsonwebtoken');

module.exports = function(roles = []) {
  if (typeof roles === 'string') {
    roles = [roles];
  }

  return (req, res, next) => {
    const token = req.header('Authorization');

    if (!token) {
      return res.status(401).json({ msg: 'No token, authorization denied' });
    }

    try {
      const decoded = jwt.verify(token.split(' ')[1], process.env.JWT_SECRET);
      req.user = decoded.user;

      if (roles.length && !roles.includes(req.user.rol)) {
        return res.status(403).json({ msg: 'Access denied. Insufficient permissions.' });
      }

      next();
    } catch (err) {
      res.status(401).json({ msg: 'Token is not valid' });
    }
  };
};