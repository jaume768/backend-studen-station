const BlogPost = require('../models/BlogPost');

/**
 * Obtener todos los posts del blog publicados
 * Endpoint público que no requiere autenticación
 */
exports.getPublishedBlogPosts = async (req, res) => {
    try {
        const { category, limit = 10, page = 1 } = req.query;
        const skip = (page - 1) * limit;
        
        // Construir filtro
        const filter = { status: 'published' };
        
        // Filtrar por categoría si se especifica
        if (category && category !== 'all') {
            filter.category = category;
        }
        
        // Obtener posts publicados
        const posts = await BlogPost.find(filter)
            .sort({ publishedDate: -1 }) // Ordenar por fecha de publicación (más recientes primero)
            .skip(skip)
            .limit(parseInt(limit))
            .select('title excerpt image category author featured size tags publishedDate');
        
        // Obtener el total de posts para la paginación
        const total = await BlogPost.countDocuments(filter);
        
        res.status(200).json({
            success: true,
            count: posts.length,
            total,
            totalPages: Math.ceil(total / limit),
            currentPage: parseInt(page),
            data: posts
        });
    } catch (error) {
        console.error('Error al obtener posts del blog:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener los posts del blog',
            error: error.message
        });
    }
};

/**
 * Obtener un post específico del blog por ID
 * Endpoint público que no requiere autenticación
 */
exports.getBlogPostById = async (req, res) => {
    try {
        const post = await BlogPost.findOne({
            _id: req.params.id,
            status: 'published' // Solo devolver posts publicados
        });
        
        if (!post) {
            return res.status(404).json({
                success: false,
                message: 'Post no encontrado o no está publicado'
            });
        }
        
        res.status(200).json({
            success: true,
            data: post
        });
    } catch (error) {
        console.error('Error al obtener detalles del post:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener detalles del post',
            error: error.message
        });
    }
};

/**
 * Obtener posts destacados del blog
 * Endpoint público que no requiere autenticación
 */
exports.getFeaturedBlogPosts = async (req, res) => {
    try {
        const { limit = 5 } = req.query;
        
        const posts = await BlogPost.find({
            status: 'published',
            featured: true
        })
            .sort({ publishedDate: -1 })
            .limit(parseInt(limit))
            .select('title excerpt image category author featured size tags publishedDate');
        
        res.status(200).json({
            success: true,
            count: posts.length,
            data: posts
        });
    } catch (error) {
        console.error('Error al obtener posts destacados:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener los posts destacados',
            error: error.message
        });
    }
};

/**
 * Obtener posts por categoría
 * Endpoint público que no requiere autenticación
 */
exports.getBlogPostsByCategory = async (req, res) => {
    try {
        const { category } = req.params;
        const { limit = 10, page = 1 } = req.query;
        const skip = (page - 1) * limit;
        
        const filter = {
            status: 'published',
            category
        };
        
        const posts = await BlogPost.find(filter)
            .sort({ publishedDate: -1 })
            .skip(skip)
            .limit(parseInt(limit))
            .select('title excerpt image category author featured size tags publishedDate');
        
        const total = await BlogPost.countDocuments(filter);
        
        res.status(200).json({
            success: true,
            count: posts.length,
            total,
            totalPages: Math.ceil(total / limit),
            currentPage: parseInt(page),
            data: posts
        });
    } catch (error) {
        console.error('Error al obtener posts por categoría:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener los posts por categoría',
            error: error.message
        });
    }
};
