const mongoose = require('mongoose');

const magazineSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'El nombre de la revista es obligatorio'],
        trim: true
    },
    image: {
        type: String,
        required: [true, 'La imagen de la revista es obligatoria']
    },
    price: {
        type: Number,
        required: [true, 'El precio de la revista es obligatorio'],
        min: [0, 'El precio no puede ser negativo']
    },
    link: {
        type: String,
        trim: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true
});

const Magazine = mongoose.model('Magazine', magazineSchema);

module.exports = Magazine;
