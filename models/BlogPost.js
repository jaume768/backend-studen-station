const mongoose = require('mongoose');

const BlogPostSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    content: {
        type: String,
        required: true
    },
    excerpt: {
        type: String,
        required: true,
        trim: true
    },
    image: {
        type: String,
        required: true
    },
    additionalImages: {
        type: [String],
        default: []
    },
    category: {
        type: String,
        enum: ['fashion', 'designers', 'industry', 'education', 'events', 'other'],
        default: 'other'
    },
    author: {
        type: String,
        required: true,
        trim: true
    },
    featured: {
        type: Boolean,
        default: false
    },
    size: {
        type: String,
        enum: ['small-blog', 'medium-blog', 'large-blog'],
        default: 'medium-blog'
    },
    tags: {
        type: [String],
        default: []
    },
    publishedDate: {
        type: Date,
        default: Date.now
    },
    status: {
        type: String,
        enum: ['draft', 'published', 'archived'],
        default: 'published'
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, {
    timestamps: true
});

// Índices para mejorar el rendimiento de búsqueda
BlogPostSchema.index({ title: 'text', excerpt: 'text', content: 'text' });
BlogPostSchema.index({ category: 1 });
BlogPostSchema.index({ featured: 1 });
BlogPostSchema.index({ status: 1 });
BlogPostSchema.index({ publishedDate: -1 });

module.exports = mongoose.model('BlogPost', BlogPostSchema);
