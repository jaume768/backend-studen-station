const User = require('../models/User');
const Post = require('../models/Post');
const Offer = require('../models/Offer');
const EducationalOffer = require('../models/EducationalOffer');
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
        
        // Limitar el campo bio a 150 caracteres
        if (updates.bio) {
            updates.bio = updates.bio.substring(0, 150);
        }
        
        // Validar professionalTags
        if (updates.professionalTags) {
            if (!Array.isArray(updates.professionalTags)) {
                updates.professionalTags = [];
            } else if (updates.professionalTags.length > 3) {
                // Limitar a 3 etiquetas
                updates.professionalTags = updates.professionalTags.slice(0, 3);
            }
        }
        
        // Validar idiomas
        if (updates.languages) {
            if (!Array.isArray(updates.languages)) {
                updates.languages = [];
            } else if (updates.languages.length > 5) {
                // Limitar a 5 idiomas
                updates.languages = updates.languages.slice(0, 5);
            }
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

// Función para subir el CV
exports.uploadCV = async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No se proporcionó ningún archivo' });
    }

    try {
        // Verificamos si el usuario es una empresa (no puede subir CV)
        const user = await User.findById(req.user.id);
        if (user.professionalType === 1 || user.professionalType === 2 || user.professionalType === 4) {
            return res.status(403).json({ error: 'Las empresas no pueden subir CV' });
        }

        const streamUpload = (req) => {
            return new Promise((resolve, reject) => {
                const stream = cloudinary.uploader.upload_stream(
                    { 
                        folder: 'cvs',
                        resource_type: 'raw',
                        format: 'pdf'
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

        const updatedUser = await User.findByIdAndUpdate(
            req.user.id,
            { cvUrl: result.secure_url },
            { new: true }
        );

        res.status(200).json({ 
            message: 'CV subido correctamente', 
            cvUrl: result.secure_url,
            user: updatedUser 
        });
    } catch (error) {
        console.error('Error al subir CV:', error);
        res.status(500).json({ error: error.message });
    }
};

// Función para subir el Portfolio
exports.uploadPortfolio = async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No se proporcionó ningún archivo' });
    }

    try {
        // Verificamos si el usuario es una empresa (no puede subir Portfolio)
        const user = await User.findById(req.user.id);
        if (user.professionalType === 1 || user.professionalType === 2 || user.professionalType === 4) {
            return res.status(403).json({ error: 'Las empresas no pueden subir Portfolio' });
        }

        const streamUpload = (req) => {
            return new Promise((resolve, reject) => {
                const stream = cloudinary.uploader.upload_stream(
                    { 
                        folder: 'portfolios',
                        resource_type: 'raw',
                        format: 'pdf'
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

        const updatedUser = await User.findByIdAndUpdate(
            req.user.id,
            { portfolioUrl: result.secure_url },
            { new: true }
        );

        res.status(200).json({ 
            message: 'Portfolio subido correctamente', 
            portfolioUrl: result.secure_url,
            user: updatedUser 
        });
    } catch (error) {
        console.error('Error al subir Portfolio:', error);
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
        
        if (Array.isArray(user.favorites)) {
            user.favorites = user.favorites.filter(fav => {
                if (typeof fav === 'object' && fav.postId && fav.savedImage) {
                    return true;
                }
                return false;
            });
        } else {
            user.favorites = [];
        }
        
        const newFavorite = {
            postId,
            savedImage: imageUrl,
            savedAt: new Date()
        };   

        user.favorites.push(newFavorite);
        
        try {
            await user.save();
            res.status(200).json({ message: 'Imagen guardada en favoritos', favorites: user.favorites });
        } catch (saveError) {
            res.status(500).json({ error: saveError.message });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.removeFavorite = async (req, res) => {
    const postId = req.params.postId;
    const { imageUrl } = req.body || {};
    
    try {
        const user = await User.findById(req.user.id);
        
        if (imageUrl) {
            user.favorites = user.favorites.filter(fav => {
                if (typeof fav === 'object' && fav.postId && fav.savedImage) {
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
        const user = await User.findById(req.user.id);
        if (!user.savedOffers || !Array.isArray(user.savedOffers) || user.savedOffers.length === 0) {
            return res.status(200).json({ savedOffers: [] });
        }

        // Obtener detalles completos de las ofertas guardadas
        const offers = await Offer.find({ _id: { $in: user.savedOffers } });
        res.status(200).json({ savedOffers: offers });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getAppliedOffers = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        
        // Verificar si el usuario es de tipo creativo
        if (user.role !== 'Creativo') {
            return res.status(403).json({ error: 'Solo perfiles creativos pueden ver ofertas aplicadas' });
        }
        
        // Verificar si hay ofertas aplicadas
        if (!user.appliedOffers || !Array.isArray(user.appliedOffers) || user.appliedOffers.length === 0) {
            return res.status(200).json({ offers: [] });
        }

        // Obtener detalles completos de las ofertas aplicadas
        const offers = await Offer.find({ _id: { $in: user.appliedOffers } });
        res.status(200).json({ offers });
    } catch (error) {
        console.error('Error obteniendo ofertas aplicadas:', error);
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
                select: 'username fullName companyName professionalType professionalTitle city country profile role',
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
                select: 'username fullName companyName professionalType professionalTitle city country profile role',
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
        const { 
            page = 1, 
            limit = 9, 
            country, 
            category,
            search,
            city,
            school,
            skills,
            graduationYear,
            professionalProfile,
            software,
            availability,
            internships
        } = req.query;
        const pageNumber = parseInt(page);
        const limitNumber = parseInt(limit);
        const skip = (pageNumber - 1) * limitNumber;

        // Construir el filtro base
        let filter = { 
            isActive: true,
            professionalType: { $nin: [1, 2, 3, 4] }
        };
        
        // Aplicar filtros adicionales si se proporcionan
        if (search) {
            // Búsqueda por texto en varios campos
            filter.$or = [
                { username: { $regex: search, $options: 'i' } },
                { fullName: { $regex: search, $options: 'i' } },
                { professionalTitle: { $regex: search, $options: 'i' } },
                { biography: { $regex: search, $options: 'i' } }
            ];
        }
        
        if (country) {
            filter.country = { $regex: country, $options: 'i' };
        }
        
        if (city) {
            filter.city = { $regex: city, $options: 'i' };
        }
        
        if (school) {
            filter.$or = [
                { 'education.institution': { $regex: school, $options: 'i' } },
                { institution: { $regex: school, $options: 'i' } }
            ];
        }
        
        if (skills) {
            filter.skills = { $in: [new RegExp(skills, 'i')] };
        }
        
        if (graduationYear) {
            // Buscar en educación donde el año de finalización coincida
            filter['education.formationEnd'] = { 
                $gte: new Date(`${graduationYear}-01-01`), 
                $lte: new Date(`${graduationYear}-12-31`) 
            };
        }
        
        if (professionalProfile) {
            filter.professionalTitle = { $regex: professionalProfile, $options: 'i' };
        }
        
        if (software) {
            filter.software = { $in: [new RegExp(software, 'i')] };
        }
        
        if (availability) {
            // Mapear disponibilidad a los campos de contrato
            if (availability === 'Inmediata') {
                // Lógica para disponibilidad inmediata
            } else if (availability === '1 mes') {
                // Lógica para disponibilidad en 1 mes
            } else if (availability === '3 meses') {
                // Lógica para disponibilidad en 3 meses
            }
        }
        
        if (internships === 'true') {
            filter['contract.practicas'] = true;
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

// Obtener ofertas de trabajo de un usuario específico
exports.getUserOffers = async (req, res) => {
    try {
        const { userId } = req.params;
        
        if (!userId) {
            return res.status(400).json({ 
                success: false, 
                message: 'Se requiere el ID del usuario' 
            });
        }

        // Verificar si el usuario existe
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ 
                success: false, 
                message: 'Usuario no encontrado' 
            });
        }

        // Evitar mostrar ofertas de usuarios de tipo 4 (instituciones educativas)
        if (user.professionalType === 4) {
            return res.status(200).json({ 
                success: true, 
                offers: [] 
            });
        }

        // Buscar ofertas de trabajo del usuario
        const Offer = require('../models/Offer');
        const offers = await Offer.find({ publisher: userId })
            .sort({ publicationDate: -1 })
            .lean();
        
        return res.status(200).json({ 
            success: true, 
            offers 
        });
    } catch (error) {
        console.error('Error al obtener ofertas del usuario:', error);
        return res.status(500).json({ 
            success: false, 
            message: 'Error al obtener las ofertas del usuario', 
            error: error.message 
        });
    }
};

// Obtener ofertas educativas de un usuario específico
exports.getUserEducationalOffers = async (req, res) => {
    try {
        const { userId } = req.params;
        
        if (!userId) {
            return res.status(400).json({ 
                success: false, 
                message: 'Se requiere el ID del usuario' 
            });
        }

        // Verificar si el usuario existe
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ 
                success: false, 
                message: 'Usuario no encontrado' 
            });
        }

        // Solo mostrar ofertas educativas para usuarios de tipo 4 (instituciones educativas)
        if (user.professionalType !== 4) {
            return res.status(200).json({ 
                success: true, 
                offers: [] 
            });
        }

        // Buscar ofertas educativas del usuario
        const EducationalOffer = require('../models/EducationalOffer');
        const offers = await EducationalOffer.find({ publisher: userId })
            .sort({ publicationDate: -1 })
            .lean();
        
        return res.status(200).json({ 
            success: true, 
            offers 
        });
    } catch (error) {
        console.error('Error al obtener ofertas educativas del usuario:', error);
        return res.status(500).json({ 
            success: false, 
            message: 'Error al obtener las ofertas educativas del usuario', 
            error: error.message 
        });
    }
};

exports.searchAll = async (req, res) => {
    try {
        const { query, searchByFullName, searchByUsername, includePosts, includeUserPosts } = req.query;
        
        if (!query || query.length < 2) {
            return res.status(400).json({ message: 'La búsqueda debe tener al menos 2 caracteres' });
        }

        const regex = new RegExp(query, 'i');
        
        // Configurar condiciones de búsqueda para usuarios según parámetros
        let userSearchCriteria = [];
        
        // Siempre incluir estos campos en la búsqueda
        userSearchCriteria.push({ companyName: regex });
        userSearchCriteria.push({ professionalTitle: regex });
        userSearchCriteria.push({ biography: regex });
        
        // Incluir búsqueda por nombre completo si se solicita
        if (searchByFullName !== 'false') {
            userSearchCriteria.push({ fullName: regex });
        }
        
        // Incluir búsqueda por username si se solicita
        if (searchByUsername !== 'false') {
            userSearchCriteria.push({ username: regex });
        }

        // Búsqueda de usuarios
        const users = await User.find({
            $or: userSearchCriteria,
            isActive: true
        })
        .select('username fullName professionalTitle companyName role professionalType profile.profilePicture')
        .limit(10);
        
        // Obtener IDs de usuarios encontrados para buscar sus publicaciones
        const userIds = users.map(user => user._id);

        // Búsqueda de posts por contenido
        let postQueries = [
            { title: regex },
            { description: regex },
            { tags: regex }
        ];
        
        // Si se solicita incluir posts de usuarios encontrados
        if (includeUserPosts === 'true' && userIds.length > 0) {
            postQueries.push({ user: { $in: userIds } });
        }

        // Búsqueda de posts
        const posts = await Post.find({
            $or: postQueries
        })
        .populate('user', 'username fullName companyName profile.profilePicture')
        .select('title description mainImage createdAt')
        .sort({ createdAt: -1 })
        .limit(20); // Aumentamos el límite para mostrar más posts

        // Búsqueda de ofertas de trabajo
        const offers = await Offer.find({
            $or: [
                { position: regex },
                { companyName: regex },
                { description: regex },
                { city: regex },
                { tags: regex }
            ],
            status: 'accepted'
        })
        .select('companyName position city publicationDate companyLogo')
        .sort({ publicationDate: -1 })
        .limit(10);

        // Búsqueda de ofertas educativas
        const educationalOffers = await EducationalOffer.find({
            $or: [
                { programName: regex },
                { description: regex },
                { knowledgeArea: regex },
                { 'location.city': regex },
                { 'location.country': regex }
            ],
            status: 'accepted'
        })
        .select('programName studyType knowledgeArea modality startDate images')
        .sort({ publicationDate: -1 })
        .limit(10);

        return res.status(200).json({
            results: {
                users,
                posts,
                offers,
                educationalOffers
            },
            message: 'Búsqueda completada con éxito'
        });
    } catch (error) {
        console.error('Error en la búsqueda global:', error);
        return res.status(500).json({ message: 'Error interno del servidor' });
    }
};

// Check if a username exists
exports.checkUsernameExists = async (req, res) => {
    try {
        const { username } = req.params;
        
        if (!username) {
            return res.status(400).json({ message: 'Username is required' });
        }
        
        const user = await User.findOne({ username });
        
        return res.status(200).json({
            exists: !!user,
            message: user ? 'Username exists' : 'Username does not exist'
        });
    } catch (error) {
        console.error('Error checking username:', error);
        return res.status(500).json({ message: 'Server error', error: error.message });
    }
};