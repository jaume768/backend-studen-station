const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    fullName: { type: String },
    email: { type: String, required: true, unique: true },
    password: { type: String }, // Puede quedar vacío en registro con Google
    googleId: { type: String },
    role: { type: String, enum: ['Creativo', 'Profesional'] },
    dateOfBirth: { type: Date },
    country: { type: String },
    city: { type: String },
    referralSource: { type: String }, // ¿Cómo nos has conocido?
    termsAccepted: { type: Boolean },
    biography: { type: String },
    professionalTitle: { type: String, default: "" },

    // Campos específicos para Creativos
    // creativeType: 1 (Estudiantes), 2 (Graduados), 3 (Estilistas), 4 (Diseñador de marca propia), 5 (Otro)
    creativeType: { type: Number },
    formationType: { type: String },     // Para estudiantes: “por tu cuenta” o “por una escuela/universidad”
    institution: { type: String },         // Para graduados: nombre de la escuela o institución
    creativeOther: { type: String },       // Para “Otro” (simple almacenamiento del texto)
    brandName: { type: String },           // Para “Diseñador de marca propia”

    // Campos específicos para Profesionales
    // professionalType: 1 (Pequeña marca), 2 (Empresa mediana-grande), 3 (Instituciones), 4 (Agencia), 5 (Otra)
    professionalType: { type: Number },
    companyName: { type: String },
    foundingYear: { type: Number },          // Año de fundación (marca, empresa, agencia)
    productServiceType: { type: String },    // Para Pequeña marca: tipo de productos o servicios
    sector: { type: String },                // Para Empresa mediana-grande: sector o industria
    employeeRange: { type: String },         // Para Empresa mediana-grande y Agencia: rango de empleados (ej. "1-10", "11-50", etc.)
    institutionName: { type: String },       // Para Instituciones: nombre de la institución
    institutionType: { type: String },       // Para Instituciones: tipo de institución
    agencyName: { type: String },            // Para Agencia: nombre de la compañía o agencia
    agencyServices: { type: String },        // Para Agencia: servicios que ofrece (puede ser una lista en cadena)
    website: { type: String },               // Enlace web o sitio (común para ambos tipos)
    showNameCompany: { type: Boolean },
    showFoundingYearCompany: { type: Boolean },

    // Información de perfil
    profile: {
        profilePicture: { type: String },
        portfolio: { type: String }, // URL del portfolio o web (opcional)
        socialLinks: {
            instagram: { type: String },
            linkedin: { type: String }
        }
    },
    // URLs para archivos PDF
    cvUrl: { type: String }, // URL del CV en PDF
    portfolioUrl: { type: String }, // URL del portfolio en PDF
    education: [
        {
            institution: { type: String },
            otherInstitution: { type: String },
            formationName: { type: String },
            formationStart: { type: Date },
            formationEnd: { type: Date },
            currentlyEnrolled: { type: Boolean }
        }
    ],
    skills: { type: [String], default: [] },
    software: { type: [String], default: [] },
    contract: {
        practicas: { type: Boolean, default: false },
        tiempoCompleto: { type: Boolean, default: false },
        parcial: { type: Boolean, default: false }
    },
    locationType: {
        presencial: { type: Boolean, default: false },
        remoto: { type: Boolean, default: false },
        hibrido: { type: Boolean, default: false }
    },
    social: {
        emailContacto: { type: String, default: "" },
        sitioWeb: { type: String, default: "" },
        instagram: { type: String, default: "" },
        linkedin: { type: String, default: "" },
        behance: { type: String, default: "" },
        tumblr: { type: String, default: "" },
        youtube: { type: String, default: "" },
        pinterest: { type: String, default: "" }
    },

    professionalFormation: [
        {
            trainingName: { type: String },
            institution: { type: String },
            trainingStart: { type: Date },
            trainingEnd: { type: Date },
            currentlyInProgress: { type: Boolean }
        }
    ],


    // Indica si el usuario completó su perfil en el dashboard (lo que se "publica" en el buscador)
    profileCompleted: { type: Boolean, default: false },
    favorites: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Post' }],
    createdAt: { type: Date, default: Date.now },
    isVerified: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    savedOffers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Offer' }],
    // Seguidos y seguidores
    following: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    followers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
});

module.exports = mongoose.model('User', UserSchema);
