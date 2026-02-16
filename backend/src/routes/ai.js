const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const aiAccess = require('../middleware/aiAccess');
const aiService = require('../services/ai/aiProvider');

// @route   POST /api/ai/chat
// @desc    Chat general con el asistente
// @access  Private + AI Enabled
router.post('/chat', [auth, aiAccess], async (req, res) => {
    try {
        const { message, context } = req.body;

        if (!message) {
            return res.status(400).json({ msg: 'El mensaje es requerido' });
        }

        // Construir contexto base
        const systemPrompt = `Eres un asistente experto en ventas y gestión comercial para el CRM de la empresa.
        Tu tono es profesional pero cercano. 
        El usuario es ${req.user.name} (${req.user.role}).`;

        const messages = [
            { role: "system", content: systemPrompt },
            // TODO: Agregar historial de conversación si se envía
            { role: "user", content: message }
        ];

        const response = await aiService.generateResponse(messages);

        // TODO: Registrar uso en BD para conteo de tokens/costos

        res.json(response);

    } catch (err) {
        console.error('Error en /api/ai/chat:', err);
        res.status(500).json({ msg: 'Error al procesar la solicitud con IA' });
    }
});

// @route   POST /api/ai/analyze/sales
// @desc    Analizar datos de ventas proporcionados
// @access  Private + AI Enabled
router.post('/analyze/sales', [auth, aiAccess], async (req, res) => {
    try {
        const { salesData, query } = req.body;

        if (!salesData || !Array.isArray(salesData)) {
            return res.status(400).json({ msg: 'Datos de ventas requeridos y deben ser un array' });
        }

        const systemPrompt = `Actúa como un analista de datos senior. 
        Analiza el siguiente dataset de ventas JSON y responde a la consulta del usuario.
        Identifica tendencias, anomalías y oportunidades.
        Sé conciso y directo.`;

        const userPrompt = `Consulta: ${query || "Dame un resumen ejecutivo de estos datos."}
        
        Datos:
        ${JSON.stringify(salesData.slice(0, 50))} 
        (Muestra parcial por limitaciones de tokens, asume representatividad)`;
        // Nota: En producción, usar RAG o sumarizar primero si son muchos datos.

        const messages = [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
        ];

        const response = await aiService.generateResponse(messages, { model: 'gpt-4o-mini' });

        res.json(response);

    } catch (err) {
        console.error('Error en /api/ai/analyze:', err);
        res.status(500).json({ msg: 'Error al analizar datos' });
    }
});

module.exports = router;
