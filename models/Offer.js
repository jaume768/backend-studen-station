const mongoose = require('mongoose');

const OfferSchema = new mongoose.Schema({
    // Usuario que publica la oferta (solo profesionales podrán publicarla)
    publisher: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    // Datos básicos de la oferta
    companyName: { type: String, required: true },
    position: { type: String, required: true },
    publicationDate: { type: Date, default: Date.now },
    city: { type: String, required: true },
    
    // Tipo de trabajo y modalidad
    jobType: { type: String, enum: ['Prácticas', 'Tiempo completo', 'Tiempo parcial'], required: true },
    locationType: { type: String, enum: ['Presencial', 'Remoto', 'Híbrido'], required: true },

    // Modalidad de la oferta
    isExternal: { type: Boolean, required: true, default: false },
    externalLink: { type: String }, // Requerido si isExternal es true

    // Datos comunes para todas las ofertas
    companyLogo: { type: String }, // URL del logo en Cloudinary
    description: { type: String, required: true },
    requiredProfile: { type: String, required: true },

    // Etiquetas para filtrar
    tags: [{ type: String }],

    // Preguntas extra para los candidatos
    extraQuestions: [{
        question: {
            type: String,
            trim: true
        },
        responseType: {
            type: String,
            enum: ['text', 'number', 'boolean', 'url'],
            default: 'text'
        }
    }],

    // Aplicaciones de usuarios a la oferta
    applications: [{
        user: { 
            type: mongoose.Schema.Types.ObjectId, 
            ref: 'User' 
        },
        answers: [{
            question: { type: String },
            responseType: { type: String },
            answer: { type: mongoose.Schema.Types.Mixed }
        }],
        status: { 
            type: String, 
            enum: ['pending', 'reviewed', 'accepted', 'rejected'], 
            default: 'pending'
        },
        appliedAt: { 
            type: Date, 
            default: Date.now 
        }
    }],

    // Estado de la oferta: 'pending', 'accepted' o 'cancelled'
    status: { type: String, enum: ['pending', 'accepted', 'cancelled'], default: 'accepted' }
});

module.exports = mongoose.model('Offer', OfferSchema);
