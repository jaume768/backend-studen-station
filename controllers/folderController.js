const Folder = require('../models/Folder');
const User = require('../models/User');

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
        const folders = await Folder.find({ user: req.user.id });
        res.status(200).json({ folders });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.addPostToFolder = async (req, res) => {
    const { folderId, postId, imageUrl } = req.body;
    
    if (!folderId || !postId || !imageUrl) {
        return res.status(400).json({ message: 'Se requieren folderId, postId e imageUrl' });
    }
    
    try {
        const folder = await Folder.findOne({ _id: folderId, user: req.user.id });
        if (!folder) return res.status(404).json({ message: 'Carpeta no encontrada' });
        
        // Verificar si esta imagen específica ya está en la carpeta
        const imageExists = folder.items.some(item => 
            item.postId.toString() === postId && item.imageUrl === imageUrl
        );
        
        if (!imageExists) {
            // Añadir a la carpeta
            folder.items.push({
                postId,
                imageUrl,
                addedAt: new Date()
            });
            
            // Mantener compatibilidad con el campo posts
            if (!folder.posts.includes(postId)) {
                folder.posts.push(postId);
            }
            
            await folder.save();
            
            // Eliminar de favoritos si está configurado
            const user = await User.findById(req.user.id);
            user.favorites = user.favorites.filter(fav => {
                if (typeof fav === 'object' && fav.postId && fav.savedImage) {
                    // Eliminar solo si coincide tanto el postId como la imagen
                    return !(fav.postId.toString() === postId && fav.savedImage === imageUrl);
                }
                return true; // Mantener otros tipos de favoritos
            });
            await user.save();
        }
        
        res.status(200).json({ 
            folder,
            message: 'Imagen añadida a la carpeta y eliminada de favoritos'
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.removePostFromFolder = async (req, res) => {
    const { folderId, postId, imageUrl } = req.body;
    
    if (!folderId || !postId) {
        return res.status(400).json({ message: 'Se requieren folderId y postId' });
    }
    
    try {
        const folder = await Folder.findOne({ _id: folderId, user: req.user.id });
        if (!folder) return res.status(404).json({ message: 'Carpeta no encontrada' });
        
        // Eliminar la imagen específica de la carpeta
        if (imageUrl) {
            folder.items = folder.items.filter(item => 
                !(item.postId.toString() === postId && item.imageUrl === imageUrl)
            );
            
            // Si no quedan imágenes de este post, eliminarlo de posts también
            const hasOtherImagesFromPost = folder.items.some(item => 
                item.postId.toString() === postId
            );
            
            if (!hasOtherImagesFromPost) {
                folder.posts = folder.posts.filter(id => id.toString() !== postId);
            }
            
            // Añadir de vuelta a favoritos
            const user = await User.findById(req.user.id);
            const newFavorite = {
                postId,
                savedImage: imageUrl,
                savedAt: new Date()
            };
            user.favorites.push(newFavorite);
            await user.save();
        } 
        // Compatibilidad con la versión anterior
        else {
            folder.posts = folder.posts.filter(id => id.toString() !== postId);
            folder.items = folder.items.filter(item => item.postId.toString() !== postId);
        }
        
        await folder.save();
        
        res.status(200).json({ 
            folder,
            message: imageUrl ? 'Imagen eliminada de la carpeta y devuelta a favoritos' : 'Post eliminado de la carpeta'
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getFolderById = async (req, res) => {
    try {
        const folder = await Folder.findOne({ _id: req.params.id, user: req.user.id });
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
        const folder = await Folder.findOne({ _id: req.params.id, user: req.user.id });
        if (!folder) return res.status(404).json({ message: 'Carpeta no encontrada' });
        
        // Devolver todas las imágenes a favoritos
        const user = await User.findById(req.user.id);
        
        for (const item of folder.items) {
            const newFavorite = {
                postId: item.postId,
                savedImage: item.imageUrl,
                savedAt: new Date()
            };
            user.favorites.push(newFavorite);
        }
        
        await user.save();
        
        // Eliminar la carpeta
        await Folder.findByIdAndDelete(req.params.id);
        
        res.status(200).json({ message: 'Carpeta eliminada y todas las imágenes devueltas a favoritos' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
