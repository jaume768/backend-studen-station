const mongoose = require('mongoose');

const OfferSchema = new mongoose.Schema({
    // Usuario que publica la oferta (solo profesionales podrán publicarla)
    publisher: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    // Datos básicos de la oferta
    companyName: { type: String, required: true },
    position: { type: String, required: true },
    publicationDate: { type: Date, default: Date.now },
    city: { type: String, required: true },
    jobType: { type: String, enum: ['Trabajo', 'Prácticas'], required: true },

    // Modalidad de la oferta:
    // Si es externa se redirige (isExternal: true) y se guarda el enlace externo,
    // si es interna se muestran todos los detalles
    isExternal: { type: Boolean, required: true, default: false },
    externalLink: { type: String }, // Sólo si isExternal es true

    // Datos para ofertas internas:
    companyLogo: { type: String }, // URL de la imagen principal
    website: { type: String },
    description: { type: String },
    requiredProfile: { type: String },
    contractType: { type: String },
    workingHours: { type: String },

    // Etiquetas para filtrar (por ejemplo: "oferta de trabajo", "prácticas", etc)
    tags: [{ type: String }],

    // Estado de la oferta: 'pending', 'accepted' o 'cancelled'
    status: { type: String, enum: ['pending', 'accepted', 'cancelled'], default: 'pending' }
});

module.exports = mongoose.model('Offer', OfferSchema);
