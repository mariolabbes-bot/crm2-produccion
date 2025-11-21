const jwt = require('jsonwebtoken');

module.exports = function(roles = []) {
  if (typeof roles === 'string') {
    roles = [roles];
  }

  return (req, res, next) => {
    console.log('🔐 [AUTH] Inicio middleware - Path:', req.path, 'Auth header:', req.header('Authorization'));
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
      console.log('🔐 [AUTH] No token presente');
      return res.status(401).json({ msg: 'No token, authorization denied' });
    }

    try {
      const decoded = jwt.verify(rawToken, process.env.JWT_SECRET);
      req.user = decoded.user;
      console.log('🔐 [AUTH] Token decodificado usuario:', req.user);

      // Comparación case-insensitive para roles
      if (roles.length > 0) {
        const userRol = (req.user && req.user.rol) ? String(req.user.rol).toLowerCase() : '';
        const allowedRoles = roles.map(r => String(r).toLowerCase());
        console.log('🔐 [AUTH] Verificando rol. userRol:', userRol, 'allowed:', allowedRoles);
        
        if (!userRol || !allowedRoles.includes(userRol)) {
          console.log('🔐 [AUTH] Rol denegado');
          return res.status(403).json({ msg: 'Access denied. Insufficient permissions.' });
        }
      }

      console.log('🔐 [AUTH] OK, llamando next()');
      next();
    } catch (err) {
      console.log('🔐 [AUTH] Error verificando token:', err.message);
      res.status(401).json({ msg: 'Token is not valid' });
    }
  };
};