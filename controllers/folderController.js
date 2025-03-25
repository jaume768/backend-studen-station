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
        // Usar findById en lugar de findOne para mejor rendimiento
        const folder = await Folder.findById(folderId);
        
        // Verificar que la carpeta existe y pertenece al usuario
        if (!folder) {
            return res.status(404).json({ message: 'Carpeta no encontrada' });
        }
        
        if (folder.user.toString() !== req.user.id) {
            return res.status(403).json({ message: 'No tienes permiso para modificar esta carpeta' });
        }
        
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
            
            // Primero, eliminamos cualquier objeto favorito que coincida con el postId y la imagen
            await User.findByIdAndUpdate(
                req.user.id,
                { 
                    $pull: { 
                        favorites: { 
                            postId: postId,
                            savedImage: imageUrl 
                        } 
                    } 
                }
            );
            
            // Luego, comprobamos si hay favoritos que son simplemente el id (sin ser objetos)
            // Este paso es más seguro que intentar usar $or con tipos diferentes
            const user = await User.findById(req.user.id);
            
            if (user && Array.isArray(user.favorites)) {
                // Filtramos cualquier favorito que sea un string o ObjectId que coincida con postId
                const updatedFavorites = user.favorites.filter(fav => {
                    if (fav === null || fav === undefined) return false;
                    
                    // Si es un objeto con postId y savedImage, ya fue filtrado por la operación anterior
                    if (typeof fav === 'object' && fav.postId) return true;
                    
                    // Si es un string o un ObjectId, comparamos su toString con postId
                    return fav.toString() !== postId;
                });
                
                // Solo actualizamos si hay cambios
                if (updatedFavorites.length !== user.favorites.length) {
                    user.favorites = updatedFavorites;
                    await user.save();
                }
            }
        }
        
        res.status(200).json({ 
            folder,
            message: 'Imagen añadida a la carpeta y eliminada de favoritos'
        });
    } catch (error) {
        console.error('Error en addPostToFolder:', error);
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
        
        if (imageUrl) {
            folder.items = folder.items.filter(item => 
                !(item.postId.toString() === postId && item.imageUrl === imageUrl)
            );
            
            const hasOtherImagesFromPost = folder.items.some(item => 
                item.postId.toString() === postId
            );
            
            if (!hasOtherImagesFromPost) {
                folder.posts = folder.posts.filter(id => id.toString() !== postId);
            }
            
            await folder.save();
            
            const user = await User.findById(req.user.id);
            
            const alreadyInFavorites = user.favorites.some(fav => {
                if (typeof fav === 'object' && fav.postId && fav.savedImage) {
                    return fav.postId.toString() === postId && fav.savedImage === imageUrl;
                }
                return false;
            });
            
            if (!alreadyInFavorites) {
                user.favorites.push({
                    postId,
                    savedImage: imageUrl,
                    savedAt: new Date()
                });
                await user.save();
            }
            
            res.status(200).json({ 
                folder,
                message: 'Imagen eliminada de la carpeta y añadida a favoritos'
            });
        } else {
            folder.items = folder.items.filter(item => item.postId.toString() !== postId);
            folder.posts = folder.posts.filter(id => id.toString() !== postId);
            await folder.save();
            res.status(200).json({ folder });
        }
    } catch (error) {
        console.error('Error en removePostFromFolder:', error);
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
    const { name } = req.body;
    try {
        const folder = await Folder.findOneAndUpdate(
            { _id: req.params.id, user: req.user.id },
            { name },
            { new: true }
        );
        if (!folder) return res.status(404).json({ message: 'Carpeta no encontrada' });
        res.status(200).json({ folder });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.deleteFolder = async (req, res) => {
    try {
        const folder = await Folder.findOne({ _id: req.params.id, user: req.user.id });
        if (!folder) return res.status(404).json({ message: 'Carpeta no encontrada' });
        
        if (folder.items && folder.items.length > 0) {
            const user = await User.findById(req.user.id);
            
            for (const item of folder.items) {
                const alreadyInFavorites = user.favorites.some(fav => {
                    if (typeof fav === 'object' && fav.postId && fav.savedImage) {
                        return fav.postId.toString() === item.postId.toString() && 
                               fav.savedImage === item.imageUrl;
                    }
                    return false;
                });
                
                if (!alreadyInFavorites) {
                    user.favorites.push({
                        postId: item.postId,
                        savedImage: item.imageUrl,
                        savedAt: new Date()
                    });
                }
            }
            
            await user.save();
        }
        
        await Folder.findByIdAndDelete(req.params.id);
        
        res.status(200).json({ message: 'Carpeta eliminada correctamente' });
    } catch (error) {
        console.error('Error en deleteFolder:', error);
        res.status(500).json({ error: error.message });
    }
};
