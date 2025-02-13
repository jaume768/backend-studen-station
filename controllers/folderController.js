const Folder = require('../models/Folder');

exports.createFolder = async (req, res) => {
    const { name } = req.body;
    try {
        const folder = new Folder({ user: req.user.id, name });
        await folder.save();
        res.status(201).json({ folder });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getFolders = async (req, res) => {
    try {
        const folders = await Folder.find({ user: req.user.id }).populate('posts');
        res.status(200).json({ folders });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.addPostToFolder = async (req, res) => {
    const { folderId, postId } = req.body;
    try {
        const folder = await Folder.findOne({ _id: folderId, user: req.user.id });
        if (!folder) return res.status(404).json({ message: 'Carpeta no encontrada' });
        if (!folder.posts.includes(postId)) {
            folder.posts.push(postId);
            await folder.save();
        }
        res.status(200).json({ folder });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.removePostFromFolder = async (req, res) => {
    const { folderId, postId } = req.body;
    try {
        const folder = await Folder.findOne({ _id: folderId, user: req.user.id });
        if (!folder) return res.status(404).json({ message: 'Carpeta no encontrada' });
        folder.posts = folder.posts.filter(id => id.toString() !== postId);
        await folder.save();
        res.status(200).json({ folder });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getFolderById = async (req, res) => {
    try {
        const folder = await Folder.findOne({ _id: req.params.id, user: req.user.id }).populate('posts');
        if (!folder) return res.status(404).json({ message: 'Carpeta no encontrada' });
        res.status(200).json({ folder });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.updateFolder = async (req, res) => {
    try {
        const updatedFolder = await Folder.findOneAndUpdate(
            { _id: req.params.id, user: req.user.id },
            { name: req.body.name },
            { new: true }
        );
        if (!updatedFolder) return res.status(404).json({ message: 'Carpeta no encontrada' });
        res.status(200).json({ message: 'Carpeta actualizada', folder: updatedFolder });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.deleteFolder = async (req, res) => {
    try {
        const folder = await Folder.findOneAndDelete({ _id: req.params.id, user: req.user.id });
        if (!folder) return res.status(404).json({ message: 'Carpeta no encontrada' });
        res.status(200).json({ message: 'Carpeta eliminada' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
