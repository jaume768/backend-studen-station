const Post = require('../models/Post');
const cloudinary = require('../config/cloudinary');
const streamifier = require('streamifier');
const mongoose = require('mongoose');

exports.createPost = async (req, res) => {
    try {
        let imageUrls = [];
        if (req.files && req.files.length > 0) {
            // Procesamos cada imagen
            for (const file of req.files) {
                const streamUpload = (file) => {
                    return new Promise((resolve, reject) => {
                        const stream = cloudinary.uploader.upload_stream(
                            { folder: 'posts' },
                            (error, result) => {
                                if (result) resolve(result);
                                else reject(error);
                            }
                        );
                        streamifier.createReadStream(file.buffer).pipe(stream);
                    });
                };
                const result = await streamUpload(file);
                imageUrls.push(result.secure_url);
            }
        }
        // Procesar etiquetas y demás datos enviados (convertir de JSON)
        const peopleTags = req.body.peopleTags ? JSON.parse(req.body.peopleTags) : [];
        const imageTags = req.body.imageTags ? JSON.parse(req.body.imageTags) : {};
        // Para etiquetas simples (si las usas), podrías hacer algo similar:
        const tags = req.body.tags
            ? (typeof req.body.tags === 'string'
                ? req.body.tags.split(',').map((tag) => tag.trim())
                : req.body.tags)
            : [];

        const newPost = new Post({
            user: req.user.id,
            title: req.body.title,
            description: req.body.description,
            images: imageUrls,
            mainImage: imageUrls[0] || '', // La primera imagen como principal
            tags,
            peopleTags,
            imageTags,
        });
        await newPost.save();
        res.status(201).json({ message: 'Post creado', post: newPost });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getUserPosts = async (req, res) => {
    try {
        const userId = req.user.id || req.user._id;
        console.log(userId);
        const posts = await Post.find({ user: userId }).sort({ createdAt: -1 });
        res.status(200).json({ posts });
    } catch (error) {
        console.log("Error en getUserPosts:", error);
        res.status(500).json({ error: error.message });
    }
};

exports.getRandomPosts = async (req, res) => {
    const limit = parseInt(req.query.limit) || 20;
    try {
        const posts = await Post.aggregate([{ $sample: { size: limit } }]);
        // Se hace un populate manual de los posts obtenidos
        const postsWithUser = await Post.populate(posts, { path: 'user', select: 'fullName city' });
        res.status(200).json({ posts: postsWithUser });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getPostsByTag = async (req, res) => {
    const { tag } = req.params;
    const limit = parseInt(req.query.limit) || 20;
    const page = parseInt(req.query.page) || 1;
    try {
        const posts = await Post.find({ tags: tag })
            .skip((page - 1) * limit)
            .limit(limit)
            .populate('user');
        res.status(200).json({ posts });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getPostById = async (req, res) => {
    try {
        const post = await Post.findById(req.params.id).populate('user');
        if (!post) return res.status(404).json({ message: 'Post no encontrado' });
        res.status(200).json({ post });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Actualizar un post
exports.updatePost = async (req, res) => {
    try {
        const updateData = { description: req.body.description };

        if (req.file) {
            const result = await cloudinary.uploader.upload(req.file.path, { folder: 'posts' });
            updateData.imageUrl = result.secure_url;
        }

        if (req.body.tags) {
            let tags = [];
            if (typeof req.body.tags === 'string') {
                tags = req.body.tags.split(',').map(tag => tag.trim());
            } else if (Array.isArray(req.body.tags)) {
                tags = req.body.tags;
            }
            updateData.tags = tags;
        }

        const post = await Post.findOneAndUpdate(
            { _id: req.params.id, user: req.user.id },
            updateData,
            { new: true }
        );

        if (!post) return res.status(404).json({ message: 'Post no encontrado o no autorizado' });
        res.status(200).json({ message: 'Post actualizado', post });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.deletePost = async (req, res) => {
    try {
        const post = await Post.findOneAndDelete({ _id: req.params.id, user: req.user.id });
        if (!post) return res.status(404).json({ message: 'Post no encontrado o no autorizado' });
        res.status(200).json({ message: 'Post eliminado' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getStaffPicks = async (req, res) => {
    try {
        const posts = await Post.find({ staffPick: true }).populate('user');
        res.status(200).json({ posts });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.addStaffPick = async (req, res) => {
    try {
        const post = await Post.findByIdAndUpdate(
            req.params.id,
            { staffPick: true },
            { new: true }
        );
        if (!post) return res.status(404).json({ message: "Post no encontrado" });
        res.status(200).json({ message: "Post marcado como Staff Pick", post });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.removeStaffPick = async (req, res) => {
    try {
        const post = await Post.findByIdAndUpdate(
            req.params.id,
            { staffPick: false },
            { new: true }
        );
        if (!post) return res.status(404).json({ message: "Post no encontrado" });
        res.status(200).json({ message: "Post removido de Staff Picks", post });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.searchPosts = async (req, res) => {
    const { query } = req.query;
    const limit = parseInt(req.query.limit) || 20;
    const page = parseInt(req.query.page) || 1;
    try {
        const regex = new RegExp(query, 'i'); // Búsqueda insensible a mayúsculas/minúsculas
        const posts = await Post.find({
            $or: [
                { description: regex },
                { tags: regex }
            ]
        })
            .skip((page - 1) * limit)
            .limit(limit)
            .populate('user');

        const total = await Post.countDocuments({
            $or: [
                { description: regex },
                { tags: regex }
            ]
        });

        res.status(200).json({ total, posts });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Obtener posts por nombre de usuario
exports.getPostsByUsername = async (req, res) => {
    try {
        const { username } = req.params;

        // Primero, obtenemos el ID del usuario basado en su nombre de usuario
        const User = require('../models/User');
        const user = await User.findOne({ username });

        if (!user) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        // Luego, buscamos todos los posts de ese usuario
        const posts = await Post.find({ user: user._id }).sort({ createdAt: -1 });

        res.status(200).json({ posts });
    } catch (error) {
        console.error('Error al obtener posts por nombre de usuario:', error);
        res.status(500).json({ error: error.message });
    }
};

// Obtener imágenes aleatorias de posts
exports.getRandomPostImages = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        // Obtener posts con múltiples imágenes
        const posts = await Post.find({ images: { $exists: true, $ne: [] } })
            .populate({
                path: 'user',
                select: 'username profile city country'
            })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit * 2); // Obtenemos más posts para tener suficientes imágenes

        // Generar un array de objetos imagen con información del post asociado
        let postImages = [];

        posts.forEach(post => {
            // Para cada imagen en el post, crear un objeto con la imagen y los datos del post
            post.images.forEach(imageUrl => {
                postImages.push({
                    imageUrl,
                    postId: post._id,
                    postTitle: post.title,
                    user: {
                        username: post.user.username,
                        profilePicture: post.user.profile?.profilePicture || null,
                        city: post.user.city || null,
                        country: post.user.country || null
                    },
                    peopleTags: post.peopleTags || []
                });
            });
        });

        // Aleatorizar el orden de las imágenes
        postImages = postImages.sort(() => Math.random() - 0.5);

        // Limitar al número solicitado
        postImages = postImages.slice(0, limit);

        // Determinar si hay más páginas
        const totalImages = await Post.aggregate([
            { $match: { images: { $exists: true, $ne: [] } } },
            { $project: { imageCount: { $size: "$images" } } },
            { $group: { _id: null, total: { $sum: "$imageCount" } } }
        ]);

        const totalCount = totalImages.length > 0 ? totalImages[0].total : 0;
        const hasMore = totalCount > skip + postImages.length;

        res.status(200).json({
            images: postImages,
            page,
            hasMore,
            totalCount
        });
    } catch (error) {
        console.error("Error al obtener imágenes aleatorias:", error);
        res.status(500).json({ error: error.message });
    }
};

exports.getExplorerPosts = async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 20;
        // Convertir el parámetro 'exclude' en un arreglo de ObjectId (si existe)
        const excludeIds = req.query.exclude
            ? req.query.exclude.split(',').map(id => new mongoose.Types.ObjectId(id.trim()))
            : [];

        // Solicitar una muestra mayor para compensar posibles duplicados
        const sampleSize = limit * 2;

        // Obtener posts aleatorios que tengan imágenes y que no estén en excludeIds
        let posts = await Post.aggregate([
            {
                $match: {
                    images: { $exists: true, $ne: [] },
                    _id: { $nin: excludeIds }
                }
            },
            { $sample: { size: sampleSize } }
        ]);

        // Tomar solo los primeros "limit" posts de la muestra obtenida
        posts = posts.slice(0, limit);

        // Poblar la información del usuario asociado
        posts = await Post.populate(posts, {
            path: 'user',
            select: 'username profile city country'
        });

        // Construir el arreglo de objetos imagen a partir de cada post
        let postImages = [];
        posts.forEach(post => {
            post.images.forEach(imageUrl => {
                postImages.push({
                    imageUrl,
                    postId: post._id,
                    postTitle: post.title,
                    user: {
                        username: post.user.username,
                        profilePicture: (post.user.profile && post.user.profile.profilePicture) || null,
                        city: post.user.city || null,
                        country: post.user.country || null
                    },
                    peopleTags: post.peopleTags || []
                });
            });
        });

        // Contar los posts restantes que no estén en excludeIds para saber si hay más
        const totalPosts = await Post.countDocuments({
            images: { $exists: true, $ne: [] },
            _id: { $nin: excludeIds }
        });
        const hasMore = totalPosts > posts.length;

        res.status(200).json({
            images: postImages,
            page: 1, // Al usar $sample la paginación tradicional no se aplica
            hasMore,
            totalCount: totalPosts
        });
    } catch (error) {
        console.error("Error al obtener imágenes para el explorador:", error);
        res.status(500).json({ error: error.message });
    }
};