const aiAccessMiddleware = (req, res, next) => {
    try {
        const user = req.user;

        if (!user) {
            return res.status(401).json({ msg: 'No autorizado' });
        }

        // Verificar si el usuario tiene features definidos
        const features = user.features || {};
        const aiModule = features.ai_module;

        // Si no tiene el módulo activado explícitamente
        if (!aiModule || !aiModule.enabled) {
            return res.status(403).json({
                msg: 'Módulo de IA no contratado o desactivado',
                code: 'AI_MODULE_DISABLED'
            });
        }

        // Verificar límites (Rate Limiting básico)
        // TODO: Implementar conteo real usando Redis
        if (aiModule.daily_limit && aiModule.used_today >= aiModule.daily_limit) {
            return res.status(429).json({
                msg: 'Límite diario de IA alcanzado',
                code: 'AI_LIMIT_EXCEEDED'
            });
        }

        // Inyectar config del plan en el request para uso posterior
        req.aiConfig = aiModule;
        next();

    } catch (err) {
        console.error('Error en middleware IA:', err);
        res.status(500).json({ msg: 'Error interno validando acceso IA' });
    }
};

module.exports = aiAccessMiddleware;
