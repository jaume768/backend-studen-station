const mongoose = require('mongoose');

const FolderSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    items: [{
        postId: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', required: true },
        imageUrl: { type: String, required: true },
        addedAt: { type: Date, default: Date.now }
    }],
    posts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Post' }], 
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Folder', FolderSchema);
