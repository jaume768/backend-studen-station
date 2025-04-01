const jwt = require('jsonwebtoken');

exports.ensureAuthenticated = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({ message: 'No autorizado, no hay token' });
    }
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ message: 'Token inválido' });
    }
};

exports.ensureAdmin = (req, res, next) => {
    // Verificar que el usuario está autenticado
    if (!req.user) {
        return res.status(401).json({ message: 'No autorizado, se requiere autenticación' });
    }
    
    // Verificar que el usuario es un administrador
    if (req.user.role !== 'Admin' && !req.user.isAdmin) {
        return res.status(403).json({ message: 'Acceso denegado, se requieren permisos de administrador' });
    }
    
    next();
};
