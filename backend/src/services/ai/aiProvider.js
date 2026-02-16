const axios = require('axios');

/**
 * Servicio Agrio de Proveedor IA
 * Permite cambiar entre OpenAI, Anthropic o Google Vertex mediante variables de entorno.
 */
class AIService {
    constructor() {
        this.provider = process.env.AI_PROVIDER || 'openai'; // 'openai', 'anthropic', 'gemini'
        this.apiKey = process.env.AI_API_KEY;

        if (!this.apiKey) {
            console.warn('⚠️ AI_API_KEY no configurada. El módulo IA no funcionará correctamente.');
        }
    }

    async generateResponse(messages, context = {}) {
        if (!this.apiKey) throw new Error('AI API Key missing');

        switch (this.provider) {
            case 'openai':
                return this._callOpenAI(messages, context);
            case 'anthropic':
                return this._callAnthropic(messages, context);
            case 'gemini':
                return this._callGemini(messages, context); // Placeholder
            default:
                throw new Error(`Proveedor IA no soportado: ${this.provider}`);
        }
    }

    async _callOpenAI(messages, context) {
        // Modelo por defecto eficiente (Flash/Mini equivalent)
        const model = context.model || 'gpt-4o-mini';

        try {
            const response = await axios.post('https://api.openai.com/v1/chat/completions', {
                model: model,
                messages: messages,
                max_tokens: context.max_tokens || 500,
                temperature: 0.7
            }, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                }
            });

            return {
                content: response.data.choices[0].message.content,
                usage: response.data.usage, // { prompt_tokens, completion_tokens }
                provider: 'openai',
                model: model
            };
        } catch (error) {
            console.error('❌ Error OpenAI:', error.response?.data || error.message);
            throw new Error('Error comunicando con servicio de IA');
        }
    }

    async _callAnthropic(messages, context) {
        // TODO: Implementar Anthropic Client
        throw new Error('Anthropic provider not yet implemented');
    }

    async _callGemini(messages, context) {
        // TODO: Implementar Google GenAI Client
        throw new Error('Gemini provider not yet implemented');
    }
}

module.exports = new AIService();
