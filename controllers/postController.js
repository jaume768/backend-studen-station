const Post = require('../models/Post');
const cloudinary = require('../config/cloudinary');

exports.createPost = async (req, res) => {
    try {
        let imageUrl = '';
        if (req.file) {
            const result = await cloudinary.uploader.upload(req.file.path, { folder: 'posts' });
            imageUrl = result.secure_url;
        }
        let tags = [];
        if (req.body.tags) {
            if (typeof req.body.tags === 'string') {
                tags = req.body.tags.split(',').map(tag => tag.trim());
            } else if (Array.isArray(req.body.tags)) {
                tags = req.body.tags;
            }
        }
        const newPost = new Post({
            user: req.user.id,
            description: req.body.description,
            imageUrl,
            tags,
        });
        await newPost.save();
        res.status(201).json({ message: 'Post creado', post: newPost });
    } catch (error) {
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