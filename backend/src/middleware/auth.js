const jwt = require('jsonwebtoken');

module.exports = function(roles = []) {
  if (typeof roles === 'string') {
    roles = [roles];
  }

  return (req, res, next) => {
    // Soportar token en Authorization: Bearer <token> o en query ?token=<token>
    let token = req.header('Authorization');
    let rawToken = null;

    if (token && token.toLowerCase().startsWith('bearer ')) {
      rawToken = token.split(' ')[1];
    }

    if (!rawToken && req.query && req.query.token) {
      rawToken = req.query.token;
    }

    if (!rawToken) {
      return res.status(401).json({ msg: 'No token, authorization denied' });
    }

    try {
      const decoded = jwt.verify(rawToken, process.env.JWT_SECRET);
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