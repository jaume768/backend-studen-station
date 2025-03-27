const mongoose = require('mongoose');

const educationalOfferSchema = new mongoose.Schema({
    institutionName: {
        type: String,
        required: true,
        trim: true
    },
    programName: {
        type: String,
        required: true,
        trim: true
    },
    educationType: {
        type: String,
        required: true,
        enum: ['Grado', 'Máster', 'FP', 'Curso', 'Taller', 'Certificación', 'Otro'],
        trim: true
    },
    modality: {
        type: String,
        required: true,
        enum: ['Presencial', 'Online', 'Híbrido'],
        trim: true
    },
    morningSchedule: {
        type: Boolean,
        default: false
    },
    duration: {
        type: Number,
        required: true,
        min: 1
    },
    credits: {
        type: Number,
        min: 1
    },
    internships: {
        type: Boolean,
        default: false
    },
    erasmus: {
        type: Boolean,
        default: false
    },
    bilingualEducation: {
        type: Boolean,
        default: false
    },
    location: {
        city: {
            type: String,
            required: true,
            trim: true
        },
        country: {
            type: String,
            required: true,
            trim: true
        }
    },
    enrollmentPeriod: {
        startDate: {
            day: {
                type: Number,
                min: 1,
                max: 31
            },
            month: {
                type: Number,
                min: 1,
                max: 12
            }
        },
        endDate: {
            day: {
                type: Number,
                min: 1,
                max: 31
            },
            month: {
                type: Number,
                min: 1,
                max: 12
            }
        }
    },
    schoolYear: {
        startMonth: {
            type: Number,
            min: 1,
            max: 12
        },
        endMonth: {
            type: Number,
            min: 1,
            max: 12
        }
    },
    websiteUrl: {
        type: String,
        validate: {
            validator: function(v) {
                return !v || /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/.test(v);
            },
            message: props => `${props.value} no es una URL válida`
        }
    },
    description: {
        type: String,
        trim: true
    },
    headerImage: {
        type: String
    },
    requirements: {
        type: [String],
        default: []
    },
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
    publisher: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'accepted', 'rejected'],
        default: 'accepted'
    },
    publicationDate: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Índices para mejorar el rendimiento de búsqueda
educationalOfferSchema.index({ programName: 'text', institutionName: 'text', 'location.city': 'text' });
educationalOfferSchema.index({ 'location.country': 1, 'location.city': 1 });
educationalOfferSchema.index({ educationType: 1 });
educationalOfferSchema.index({ modality: 1 });
educationalOfferSchema.index({ status: 1 });
educationalOfferSchema.index({ publisher: 1 });

const EducationalOffer = mongoose.model('EducationalOffer', educationalOfferSchema);

module.exports = EducationalOffer;
