const mongoose = require('mongoose');

const PostSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    description: { type: String },
    images: { type: [String], required: true },
    mainImage: { type: String, required: true },
    tags: [{ type: String }],
    peopleTags: { type: [{ name: String, role: String }], default: [] },
    imageTags: { type: Map, of: [String], default: {} },
    staffPick: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Post', PostSchema);