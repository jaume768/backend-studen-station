const User = require('../models/User');
const Post = require('../models/Post');
const cloudinary = require('../config/cloudinary');
const streamifier = require('streamifier');
const bcrypt = require('bcryptjs');

exports.getProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        const userObj = user.toObject();
        userObj.hasPassword = !!(user.password && user.password.trim() !== "");
        res.status(200).json(userObj);
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: error.message });
    }
};

exports.checkAvailability = async (req, res) => {
    const { username, email } = req.body;
    try {
        let errors = {};

        if (username) {
            const userByUsername = await User.findOne({ username });
            if (userByUsername) {
                errors.username = 'El nombre de usuario ya está en uso';
            }
        }

        if (email) {
            const userByEmail = await User.findOne({ email });
            if (userByEmail) {
                errors.email = 'El email ya está en uso';
            }
        }

        if (Object.keys(errors).length > 0) {
            return res.status(400).json({ errors });
        }

        return res.status(200).json({ message: 'Disponible' });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

exports.changePassword = async (req, res) => {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!newPassword || !confirmPassword) {
        return res
            .status(400)
            .json({ error: "Nueva contraseña y su confirmación son requeridas." });
    }
    if (newPassword !== confirmPassword) {
        return res.status(400).json({ error: "Las contraseñas nuevas no coinciden." });
    }
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ error: "Usuario no encontrado." });
        }
        if (user.googleId && (!user.password || user.password === "")) {
        } else {
            if (!currentPassword) {
                return res.status(400).json({ error: "La contraseña actual es requerida." });
            }
            const isMatch = await bcrypt.compare(currentPassword, user.password);
            if (!isMatch) {
                return res.status(400).json({ error: "La contraseña actual es incorrecta." });
            }
        }
        // Hasheamos la nueva contraseña y actualizamos el usuario
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        user.password = hashedPassword;
        await user.save();
        return res.status(200).json({ message: "Contraseña cambiada exitosamente." });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

exports.updateProfile = async (req, res) => {
    try {
        const updates = req.body;
        
        // Asegurarse de que los arrays estén definidos correctamente
        if (updates.professionalMilestones && !Array.isArray(updates.professionalMilestones)) {
            updates.professionalMilestones = [];
        }
        
        if (updates.companyTags && !Array.isArray(updates.companyTags)) {
            updates.companyTags = [];
        }
        
        // Limitar etiquetas a un máximo de 3
        if (Array.isArray(updates.companyTags) && updates.companyTags.length > 3) {
            updates.companyTags = updates.companyTags.slice(0, 3);
        }
        
        // Asegurarse de que offersPractices sea booleano
        if (updates.offersPractices !== undefined) {
            updates.offersPractices = Boolean(updates.offersPractices);
        }

        const user = await User.findByIdAndUpdate(req.user.id, updates, { new: true });
        res.status(200).json({ message: 'Perfil actualizado', user });
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: error.message });
    }
};

exports.updateProfilePicture = async (req, res) => {

    if (!req.file) {
        return res.status(400).json({ error: 'No file provided' });
    }

    try {
        const streamUpload = (req) => {
            return new Promise((resolve, reject) => {
                const stream = cloudinary.uploader.upload_stream(
                    { folder: 'profile_pictures' },
                    (error, result) => {
                        if (result) {
                            resolve(result);
                        } else {
                            reject(error);
                        }
                    }
                );
                streamifier.createReadStream(req.file.buffer).pipe(stream);
            });
        };

        const result = await streamUpload(req);

        const updatedUser = await User.findByIdAndUpdate(
            req.user.id,
            { 'profile.profilePicture': result.secure_url },
            { new: true }
        );

        res.status(200).json({ message: 'Foto actualizada', user: updatedUser });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
};

exports.deleteProfile = async (req, res) => {
    try {
        // Realizar soft-delete: marcar la cuenta como inactiva
        await User.findByIdAndUpdate(req.user.id, { isActive: false });
        res.status(200).json({ message: 'Usuario desactivado' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.addFavorite = async (req, res) => {
    const postId = req.params.postId;
    const { imageUrl } = req.body;
    
    if (!imageUrl) {
        return res.status(400).json({ error: 'Se requiere la URL de la imagen' });
    }
    
    try {
        const user = await User.findById(req.user.id);
        
        // Crear un nuevo favorito con la imagen específica
        const newFavorite = {
            postId,
            savedImage: imageUrl,
            savedAt: new Date()
        };
        
        // Añadir a favoritos (siempre como un nuevo elemento)
        user.favorites.push(newFavorite);
        await user.save();
        
        res.status(200).json({ message: 'Imagen guardada en favoritos', favorites: user.favorites });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.removeFavorite = async (req, res) => {
    const postId = req.params.postId;
    const { imageUrl } = req.body || {}; // Obtener la URL de la imagen si se proporciona
    
    try {
        const user = await User.findById(req.user.id);
        
        // Si se proporciona una URL de imagen específica, eliminar solo ese favorito
        if (imageUrl) {
            user.favorites = user.favorites.filter(fav => {
                if (typeof fav === 'object' && fav.postId && fav.savedImage) {
                    // Eliminar solo si coincide tanto el postId como la imagen
                    return !(fav.postId.toString() === postId && fav.savedImage === imageUrl);
                }
                return true; // Mantener otros tipos de favoritos
            });
        } else {
            // Si no se proporciona una imagen específica, eliminar todos los favoritos de ese post
            user.favorites = user.favorites.filter(fav => {
                if (typeof fav === 'object' && fav.postId) {
                    return fav.postId.toString() !== postId;
                }
                return fav.toString() !== postId;
            });
        }
        
        await user.save();
        res.status(200).json({ message: 'Imagen removida de favoritos', favorites: user.favorites });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getFavorites = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        
        // Procesar favoritos para incluir información completa del post
        const favorites = await Promise.all(user.favorites.map(async (fav) => {
            // Si es un objeto con savedImage
            if (typeof fav === 'object' && fav.savedImage) {
                const post = await Post.findById(fav.postId);
                if (!post) return null;
                
                return {
                    _id: fav._id || fav.postId, // Usar _id del favorito si existe, o postId como fallback
                    postId: fav.postId,
                    mainImage: fav.savedImage, // Usar la imagen guardada
                    savedImage: fav.savedImage, // Añadir explícitamente la imagen guardada
                    user: post.user,
                    title: post.title,
                    description: post.description,
                    createdAt: post.createdAt,
                    savedAt: fav.savedAt || new Date()
                };
            } 
            // Si es solo un ID (caso antiguo)
            else {
                const postId = typeof fav === 'object' ? fav.postId : fav;
                const post = await Post.findById(postId);
                if (!post) return null;
                
                const mainImage = post.images && post.images.length > 0 ? post.images[0] : null;
                
                return {
                    _id: fav._id || postId,
                    postId: postId,
                    mainImage: mainImage,
                    savedImage: mainImage, // Para mantener consistencia con el nuevo formato
                    user: post.user,
                    title: post.title,
                    description: post.description,
                    createdAt: post.createdAt,
                    savedAt: new Date()
                };
            }
        }));
        
        // Filtrar valores nulos (posts que podrían haber sido eliminados)
        const validFavorites = favorites.filter(fav => fav !== null);
        
        // Ordenar por fecha de guardado (más reciente primero)
        validFavorites.sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt));
        
        res.status(200).json({ favorites: validFavorites });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.saveOffer = async (req, res) => {
    const offerId = req.params.offerId;
    try {
        const user = await User.findById(req.user.id);
        if (!user.savedOffers.includes(offerId)) {
            user.savedOffers.push(offerId);
            await user.save();
        }
        res.status(200).json({ message: 'Oferta guardada', savedOffers: user.savedOffers });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.removeSavedOffer = async (req, res) => {
    const offerId = req.params.offerId;
    try {
        const user = await User.findById(req.user.id);
        user.savedOffers = user.savedOffers.filter(o => o.toString() !== offerId);
        await user.save();
        res.status(200).json({ message: 'Oferta eliminada de guardadas', savedOffers: user.savedOffers });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getSavedOffers = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).populate('savedOffers');
        res.status(200).json({ savedOffers: user.savedOffers });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getProfileByUsername = async (req, res) => {
    try {
        const { username } = req.params;
        const user = await User.findOne({ username }).select('-password');

        if (!user) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        // Verificar si el usuario autenticado sigue a este perfil (comparación con toString)
        let isFollowing = false;
        if (req.user) {
            const currentUser = await User.findById(req.user.id);
            if (currentUser) {
                isFollowing = currentUser.following.some(f => f.toString() === user._id.toString());
            }
        }

        // Contar seguidores y seguidos
        const followingCount = user.following ? user.following.length : 0;
        const followersCount = user.followers ? user.followers.length : 0;

        const userProfile = user.toObject();
        userProfile.isFollowing = isFollowing;
        userProfile.followingCount = followingCount;
        userProfile.followersCount = followersCount;

        res.status(200).json(userProfile);
    } catch (error) {
        console.error('Error al obtener perfil por username:', error);
        res.status(500).json({ error: error.message });
    }
};

// Seguir a un usuario
exports.followUser = async (req, res) => {
    try {
        const { userId } = req.params;

        // Verificar que el usuario a seguir existe
        const userToFollow = await User.findById(userId);
        if (!userToFollow) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        // Verificar que no se está intentando seguir a sí mismo
        if (userId === req.user.id) {
            return res.status(400).json({ error: 'No puedes seguirte a ti mismo' });
        }

        // Verificar si ya está siguiendo a este usuario (conversión a string)
        const currentUser = await User.findById(req.user.id);
        if (currentUser.following.some(f => f.toString() === userId)) {
            return res.status(400).json({ error: 'Ya estás siguiendo a este usuario' });
        }

        // Añadir al usuario a seguir en la lista de following del usuario actual
        await User.findByIdAndUpdate(req.user.id, {
            $push: { following: userId }
        });

        // Añadir al usuario actual en la lista de followers del usuario a seguir
        await User.findByIdAndUpdate(userId, {
            $push: { followers: req.user.id }
        });

        res.status(200).json({ message: 'Usuario seguido correctamente' });
    } catch (error) {
        console.error('Error al seguir usuario:', error);
        res.status(500).json({ error: error.message });
    }
};

// Dejar de seguir a un usuario
exports.unfollowUser = async (req, res) => {
    try {
        const { userId } = req.params;

        // Verificar que el usuario a dejar de seguir existe
        const userToUnfollow = await User.findById(userId);
        if (!userToUnfollow) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        // Verificar si realmente está siguiendo a este usuario (conversión a string)
        const currentUser = await User.findById(req.user.id);
        if (!currentUser.following.some(f => f.toString() === userId)) {
            return res.status(400).json({ error: 'No estás siguiendo a este usuario' });
        }

        // Eliminar al usuario de la lista de following del usuario actual
        await User.findByIdAndUpdate(req.user.id, {
            $pull: { following: userId }
        });

        // Eliminar al usuario actual de la lista de followers del usuario a dejar de seguir
        await User.findByIdAndUpdate(userId, {
            $pull: { followers: req.user.id }
        });

        res.status(200).json({ message: 'Has dejado de seguir al usuario correctamente' });
    } catch (error) {
        console.error('Error al dejar de seguir usuario:', error);
        res.status(500).json({ error: error.message });
    }
};

// Obtener la lista de usuarios que el usuario actual sigue
exports.getFollowing = async (req, res) => {
    try {
        // Parámetros para paginación
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        // Obtener el usuario con la lista de following y popula la información básica de cada usuario
        const user = await User.findById(req.user.id)
            .select('following')
            .populate({
                path: 'following',
                select: 'username fullName professionalTitle city country profile role',
                options: {
                    limit: limit,
                    skip: skip
                }
            });

        // Contar el total de usuarios seguidos para la paginación
        const count = await User.findById(req.user.id);
        const totalFollowing = count.following.length;

        res.status(200).json({
            following: user.following,
            totalFollowing,
            currentPage: page,
            totalPages: Math.ceil(totalFollowing / limit)
        });
    } catch (error) {
        console.error('Error al obtener usuarios seguidos:', error);
        res.status(500).json({ error: error.message });
    }
};

// Obtener la lista de usuarios que siguen al usuario actual
exports.getFollowers = async (req, res) => {
    try {
        // Parámetros para paginación
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        // Obtener el usuario con la lista de followers y popula la información básica de cada usuario
        const user = await User.findById(req.user.id)
            .select('followers')
            .populate({
                path: 'followers',
                select: 'username fullName professionalTitle city country profile role',
                options: {
                    limit: limit,
                    skip: skip
                }
            });

        // Contar el total de seguidores para la paginación
        const count = await User.findById(req.user.id);
        const totalFollowers = count.followers.length;

        res.status(200).json({
            followers: user.followers,
            totalFollowers,
            currentPage: page,
            totalPages: Math.ceil(totalFollowers / limit)
        });
    } catch (error) {
        console.error('Error al obtener seguidores:', error);
        res.status(500).json({ error: error.message });
    }
};

// Verificar si el usuario actual sigue a otro usuario
exports.checkFollow = async (req, res) => {
    try {
        const { userId } = req.params;
        const currentUser = await User.findById(req.user.id);
        // Convertir cada elemento a string para comparar correctamente
        const isFollowing = currentUser.following.some(f => f.toString() === userId);
        res.status(200).json({ isFollowing });
    } catch (error) {
        console.error('Error al verificar seguimiento:', error);
        res.status(500).json({ error: error.message });
    }
};

exports.searchUsers = async (req, res) => {
    try {
        const { term } = req.query;
        if (!term || term.length < 2) {
            return res.status(400).json({ message: 'El término de búsqueda debe tener al menos 2 caracteres' });
        }

        const users = await User.find({
            username: { $regex: term, $options: 'i' },
            isActive: true
        })
            .select('username profile.profilePicture')
            .limit(10);

        return res.status(200).json({
            users,
            message: 'Usuarios encontrados con éxito'
        });
    } catch (error) {
        console.error('Error buscando usuarios:', error);
        return res.status(500).json({ message: 'Error interno del servidor' });
    }
};

// Obtener usuarios creativos (con su último post)
exports.getCreatives = async (req, res) => {
    try {
        const { page = 1, limit = 9, country, category } = req.query;
        const pageNumber = parseInt(page);
        const limitNumber = parseInt(limit);
        const skip = (pageNumber - 1) * limitNumber;

        // Construir el filtro base
        let filter = { 
            isActive: true,
            professionalType: { $nin: [1, 2, 4] }
        };
        
        // Aplicar filtros adicionales si se proporcionan
        if (country) {
            filter.country = country;
        }
        
        // Buscar usuarios
        const users = await User.find(filter)
            .select('username fullName country professionalTitle profile.profilePicture skills')
            .skip(skip)
            .limit(limitNumber)
            .lean();
        
        // Contar el total de usuarios para la paginación
        const total = await User.countDocuments(filter);
        
        // Para cada usuario, buscar su último post
        const usersWithLastPost = await Promise.all(users.map(async (user) => {
            // Buscar el último post del usuario, filtrando por categoría si es necesario
            const postFilter = { user: user._id };
            if (category) {
                postFilter.categories = { $in: [category] };
            }
            
            const lastPost = await Post.findOne(postFilter)
                .sort({ createdAt: -1 })
                .select('mainImage title')
                .lean();
                
            return {
                ...user,
                lastPost: lastPost || null
            };
        }));
        
        // Filtrar usuarios que no tienen posts (siempre, no solo cuando hay categoría)
        const filteredUsers = usersWithLastPost.filter(user => user.lastPost);
        
        // Obtener países únicos para el filtro
        const countries = await User.distinct('country', { isActive: true });
        
        // Actualizar el contador total para reflejar solo usuarios con posts
        const filteredTotal = filteredUsers.length;
        
        res.status(200).json({
            creatives: filteredUsers,
            totalPages: Math.ceil(filteredTotal / limitNumber),
            currentPage: pageNumber,
            countries: countries.filter(c => c) // Filtrar valores nulos o vacíos
        });
    } catch (error) {
        console.error('Error al obtener creativos:', error);
        res.status(500).json({ error: 'Error al obtener creativos' });
    }
};

exports.uploadPdf = async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, error: 'No se ha proporcionado ningún archivo' });
    }

    const { type } = req.body;
    if (!type || (type !== 'cv' && type !== 'portfolio')) {
        return res.status(400).json({ success: false, error: 'Tipo de documento no válido' });
    }

    try {
        const streamUpload = (req) => {
            return new Promise((resolve, reject) => {
                const stream = cloudinary.uploader.upload_stream(
                    { 
                        folder: `user_documents/${type}`,
                        resource_type: 'auto',
                        format: 'pdf',
                        public_id: `${req.user.id}_${type}_${Date.now()}`,
                        transformation: { flags: "attachment" }
                    },
                    (error, result) => {
                        if (result) {
                            resolve(result);
                        } else {
                            reject(error);
                        }
                    }
                );
                streamifier.createReadStream(req.file.buffer).pipe(stream);
            });
        };

        const result = await streamUpload(req);
        
        // Usar directamente la URL segura proporcionada por Cloudinary
        const fileUrl = result.secure_url;
        
        // Actualizar el campo correspondiente en el usuario
        const updateField = type === 'cv' ? { cvUrl: fileUrl } : { portfolioUrl: fileUrl };
        
        const updatedUser = await User.findByIdAndUpdate(
            req.user.id,
            updateField,
            { new: true }
        );

        res.status(200).json({ 
            success: true, 
            fileUrl: fileUrl,
            message: `${type === 'cv' ? 'CV' : 'Portfolio'} subido correctamente` 
        });
    } catch (error) {
        console.error('Error al subir el archivo PDF:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};