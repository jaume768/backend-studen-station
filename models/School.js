const mongoose = require('mongoose');

const SchoolSchema = new mongoose.Schema({
    name: { type: String, required: true },
    type: { type: String, enum: ['Pública', 'Privada'] },
    city: { type: String },
});

module.exports = mongoose.model('School', SchoolSchema);