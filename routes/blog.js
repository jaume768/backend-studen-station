const express = require('express');
const router = express.Router();
const blogController = require('../controllers/blogController');

// Rutas públicas para el blog (no requieren autenticación)
router.get('/', blogController.getPublishedBlogPosts);
router.get('/featured', blogController.getFeaturedBlogPosts);
router.get('/category/:category', blogController.getBlogPostsByCategory);
router.get('/:id', blogController.getBlogPostById);

module.exports = router;
