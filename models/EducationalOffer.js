const mongoose = require('mongoose');

const educationalOfferSchema = new mongoose.Schema({
    programName: {
        type: String,
        required: true,
        trim: true
    },
    studyType: {
        type: String,
        required: true,
        enum: ['Grado', 'Máster', 'Curso', 'Certificación', 'Taller', 'Diplomado']
    },
    knowledgeArea: {
        type: String,
        required: true,
        trim: true
    },
    modality: {
        type: String,
        required: true,
        enum: ['Presencial', 'Online', 'Híbrida']
    },
    duration: {
        value: {
            type: Number,
            required: true
        },
        unit: {
            type: String,
            required: true,
            enum: ['horas', 'meses', 'años']
        }
    },
    startDate: {
        type: Date,
        required: true
    },
    endDate: {
        type: Date
    },
    location: {
        city: String,
        country: String,
        address: String
    },
    price: {
        amount: Number,
        currency: {
            type: String,
            default: 'EUR'
        }
    },
    requirements: {
        type: [String],
        default: []
    },
    description: {
        type: String,
        required: true
    },
    brochureUrl: String,
    images: [{
        url: String,
        type: {
            type: String,
            enum: ['banner', 'gallery'],
            default: 'gallery'
        }
    }],
    socialLinks: {
        facebook: String,
        instagram: String,
        twitter: String,
        linkedin: String,
        website: String
    },
    schedule: {
        type: String,
        enum: ['mañana', 'tarde', 'noche', 'fin de semana'],
        required: true
    },
    language: {
        type: String,
        required: true
    },
    availableSeats: {
        type: Number,
        min: 0
    },
    publisher: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'accepted', 'rejected'],
        default: 'pending'
    },
    publicationDate: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('EducationalOffer', educationalOfferSchema);
