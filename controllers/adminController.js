const User = require('../models/User');
const Offer = require('../models/Offer');
const EducationalOffer = require('../models/EducationalOffer');
const Post = require('../models/Post');
const BlogPost = require('../models/BlogPost');
const School = require('../models/School'); // Agregar modelo de escuela
const cloudinary = require('../config/cloudinary');
const streamifier = require('streamifier');

/**
 * Obtener todos los usuarios con posibilidad de filtrado
 */
exports.getAllUsers = async (req, res) => {
    try {
        const { role, search, status, limit = 10, page = 1 } = req.query;
        const skip = (page - 1) * limit;
        
        // Construir filtro
        const filter = {};
        
        // Por defecto, mostrar usuarios activos a menos que se solicite específicamente inactivos
        if (status === 'inactive') {
            filter.isActive = false;
        } else if (status === 'all') {
            // No filtrar por isActive si se quieren ver todos
        } else {
            filter.isActive = true; // Por defecto, mostrar solo activos
        }
        
        if (role) {
            filter.role = role;
        }
        
        // Buscar por nombre de usuario, correo o nombre completo
        if (search) {
            filter.$or = [
                { username: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { fullName: { $regex: search, $options: 'i' } },
                { companyName: { $regex: search, $options: 'i' } }
            ];
        }
        
        // Obtener resultados paginados
        const users = await User.find(filter)
            .select('-password') // Excluir contraseña
            .limit(parseInt(limit))
            .skip(skip)
            .sort({ createdAt: -1 });
            
        // Obtener conteo total para paginación
        const total = await User.countDocuments(filter);
        
        res.json({
            success: true,
            users,
            pagination: {
                total,
                page: parseInt(page),
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Error al obtener usuarios:', error);
        res.status(500).json({ success: false, message: 'Error al obtener los usuarios' });
    }
};

/**
 * Obtener detalles de un usuario específico
 */
exports.getUserDetails = async (req, res) => {
    try {
        const { userId } = req.params;
        
        const user = await User.findById(userId)
            .select('-password');
            
        if (!user) {
            return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
        }
        
        res.json({
            success: true,
            user
        });
    } catch (error) {
        console.error('Error al obtener detalles del usuario:', error);
        res.status(500).json({ success: false, message: 'Error al obtener los detalles del usuario' });
    }
};

/**
 * Actualizar usuario (incluyendo su rol)
 */
exports.updateUser = async (req, res) => {
    try {
        const { userId } = req.params;
        const updates = req.body;
        
        // Verificar que el usuario existe
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
        }
        
        // No permitir actualizar la contraseña a través de esta ruta
        delete updates.password;
        
        // Actualizar usuario
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { $set: updates },
            { new: true }
        ).select('-password');
        
        res.json({
            success: true,
            user: updatedUser,
            message: 'Usuario actualizado correctamente'
        });
    } catch (error) {
        console.error('Error al actualizar usuario:', error);
        res.status(500).json({ success: false, message: 'Error al actualizar el usuario' });
    }
};

/**
 * Soft delete usuario (cambiar isActive a false)
 */
exports.softDeleteUser = async (req, res) => {
    try {
        const { userId } = req.params;
        
        // Verificar que el usuario existe
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
        }
        
        // Soft delete (cambiar isActive a false)
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { isActive: false },
            { new: true }
        ).select('-password');
        
        res.json({
            success: true,
            user: updatedUser,
            message: 'Usuario desactivado correctamente'
        });
    } catch (error) {
        console.error('Error al desactivar usuario:', error);
        res.status(500).json({ success: false, message: 'Error al desactivar el usuario' });
    }
};

/**
 * Restaurar usuario (cambiar isActive a true)
 */
exports.restoreUser = async (req, res) => {
    try {
        const { userId } = req.params;
        
        // Verificar que el usuario existe
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
        }
        
        // Restaurar usuario (cambiar isActive a true)
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { isActive: true },
            { new: true }
        ).select('-password');
        
        res.json({
            success: true,
            user: updatedUser,
            message: 'Usuario restaurado correctamente'
        });
    } catch (error) {
        console.error('Error al restaurar usuario:', error);
        res.status(500).json({ success: false, message: 'Error al restaurar el usuario' });
    }
};

/**
 * Hard delete usuario (eliminación permanente - solo para administradores)
 */
exports.hardDeleteUser = async (req, res) => {
    try {
        const { userId } = req.params;
        
        // Verificar que el usuario existe
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
        }
        
        // Hard delete (eliminación permanente)
        await User.findByIdAndDelete(userId);
        
        res.json({
            success: true,
            message: 'Usuario eliminado permanentemente'
        });
    } catch (error) {
        console.error('Error al eliminar permanentemente usuario:', error);
        res.status(500).json({ success: false, message: 'Error al eliminar permanentemente el usuario' });
    }
};

/**
 * Obtener todas las ofertas de trabajo con filtros
 */
exports.getAllOffers = async (req, res) => {
    try {
        const { status, search, publisher, limit = 10, page = 1 } = req.query;
        const skip = (page - 1) * limit;
        
        // Construir filtro
        const filter = {};
        
        if (status) {
            filter.status = status;
        }
        
        if (publisher) {
            filter.publisher = publisher;
        }
        
        // Buscar por título, empresa, descripción o ubicación
        if (search) {
            filter.$or = [
                { position: { $regex: search, $options: 'i' } },
                { companyName: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
                { city: { $regex: search, $options: 'i' } }
            ];
        }
        
        // Obtener resultados paginados
        const offers = await Offer.find(filter)
            .limit(parseInt(limit))
            .skip(skip)
            .sort({ publicationDate: -1 })
            .populate('publisher', 'username companyName');
            
        // Obtener conteo total para paginación
        const total = await Offer.countDocuments(filter);
        
        res.json({
            success: true,
            offers,
            pagination: {
                total,
                page: parseInt(page),
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Error al obtener ofertas:', error);
        res.status(500).json({ success: false, message: 'Error al obtener las ofertas' });
    }
};

/**
 * Obtener detalles de una oferta de trabajo
 */
exports.getOfferDetails = async (req, res) => {
    try {
        const { offerId } = req.params;
        
        const offer = await Offer.findById(offerId)
            .populate('publisher', 'username companyName email');
            
        if (!offer) {
            return res.status(404).json({ success: false, message: 'Oferta no encontrada' });
        }
        
        res.json({
            success: true,
            offer
        });
    } catch (error) {
        console.error('Error al obtener detalles de la oferta:', error);
        res.status(500).json({ success: false, message: 'Error al obtener los detalles de la oferta' });
    }
};

/**
 * Actualizar oferta de trabajo
 */
exports.updateOffer = async (req, res) => {
    try {
        const { offerId } = req.params;
        const updates = req.body;
        
        // Verificar que la oferta existe
        const offer = await Offer.findById(offerId);
        if (!offer) {
            return res.status(404).json({ success: false, message: 'Oferta no encontrada' });
        }
        
        // Actualizar oferta
        const updatedOffer = await Offer.findByIdAndUpdate(
            offerId,
            { $set: updates },
            { new: true }
        );
        
        res.json({
            success: true,
            offer: updatedOffer,
            message: 'Oferta actualizada correctamente'
        });
    } catch (error) {
        console.error('Error al actualizar oferta:', error);
        res.status(500).json({ success: false, message: 'Error al actualizar la oferta' });
    }
};

/**
 * Eliminar oferta de trabajo
 */
exports.deleteOffer = async (req, res) => {
    try {
        const { offerId } = req.params;
        
        // Verificar que la oferta existe
        const offer = await Offer.findById(offerId);
        if (!offer) {
            return res.status(404).json({ success: false, message: 'Oferta no encontrada' });
        }
        
        // Eliminar oferta
        await Offer.findByIdAndDelete(offerId);
        
        res.json({
            success: true,
            message: 'Oferta eliminada correctamente'
        });
    } catch (error) {
        console.error('Error al eliminar oferta:', error);
        res.status(500).json({ success: false, message: 'Error al eliminar la oferta' });
    }
};

/**
 * Obtener todas las ofertas educativas con filtros
 */
exports.getAllEducationalOffers = async (req, res) => {
    try {
        const { status, search, publisher, limit = 10, page = 1 } = req.query;
        const skip = (page - 1) * limit;
        
        // Construir filtro
        const filter = {};
        
        if (status) {
            filter.status = status;
        }
        
        if (publisher) {
            filter.publisher = publisher;
        }
        
        // Buscar por título, institución, descripción o ubicación
        if (search) {
            filter.$or = [
                { title: { $regex: search, $options: 'i' } },
                { institutionName: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
                { location: { $regex: search, $options: 'i' } }
            ];
        }
        
        // Obtener resultados paginados
        const offers = await EducationalOffer.find(filter)
            .limit(parseInt(limit))
            .skip(skip)
            .sort({ publicationDate: -1 })
            .populate('publisher', 'username institutionName');
            
        // Obtener conteo total para paginación
        const total = await EducationalOffer.countDocuments(filter);
        
        res.json({
            success: true,
            offers,
            pagination: {
                total,
                page: parseInt(page),
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Error al obtener ofertas educativas:', error);
        res.status(500).json({ success: false, message: 'Error al obtener las ofertas educativas' });
    }
};

/**
 * Obtener detalles de una oferta educativa
 */
exports.getEducationalOfferDetails = async (req, res) => {
    try {
        const { offerId } = req.params;
        
        const offer = await EducationalOffer.findById(offerId)
            .populate('publisher', 'username institutionName email');
            
        if (!offer) {
            return res.status(404).json({ success: false, message: 'Oferta educativa no encontrada' });
        }
        
        res.json({
            success: true,
            offer
        });
    } catch (error) {
        console.error('Error al obtener detalles de la oferta educativa:', error);
        res.status(500).json({ success: false, message: 'Error al obtener los detalles de la oferta educativa' });
    }
};

/**
 * Actualizar oferta educativa
 */
exports.updateEducationalOffer = async (req, res) => {
    try {
        const { offerId } = req.params;
        const updates = req.body;
        
        // Verificar que la oferta existe
        const offer = await EducationalOffer.findById(offerId);
        if (!offer) {
            return res.status(404).json({ success: false, message: 'Oferta educativa no encontrada' });
        }
        
        // Actualizar oferta
        const updatedOffer = await EducationalOffer.findByIdAndUpdate(
            offerId,
            { $set: updates },
            { new: true }
        );
        
        res.json({
            success: true,
            offer: updatedOffer,
            message: 'Oferta educativa actualizada correctamente'
        });
    } catch (error) {
        console.error('Error al actualizar oferta educativa:', error);
        res.status(500).json({ success: false, message: 'Error al actualizar la oferta educativa' });
    }
};

/**
 * Eliminar oferta educativa
 */
exports.deleteEducationalOffer = async (req, res) => {
    try {
        const { offerId } = req.params;
        
        // Verificar que la oferta existe
        const offer = await EducationalOffer.findById(offerId);
        if (!offer) {
            return res.status(404).json({ success: false, message: 'Oferta educativa no encontrada' });
        }
        
        // Eliminar oferta
        await EducationalOffer.findByIdAndDelete(offerId);
        
        res.json({
            success: true,
            message: 'Oferta educativa eliminada correctamente'
        });
    } catch (error) {
        console.error('Error al eliminar oferta educativa:', error);
        res.status(500).json({ success: false, message: 'Error al eliminar la oferta educativa' });
    }
};

/**
 * Obtener todos los posts con filtros
 */
exports.getAllPosts = async (req, res) => {
    try {
        const { status, search, userId, limit = 10, page = 1 } = req.query;
        const skip = (page - 1) * limit;
        
        // Construir filtro
        const filter = {};
        
        if (status) {
            filter.status = status;
        }
        
        if (userId) {
            filter.user = userId;
        }
        
        // Buscar por título o descripción
        if (search) {
            filter.$or = [
                { title: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }
        
        // Obtener resultados paginados
        const posts = await Post.find(filter)
            .limit(parseInt(limit))
            .skip(skip)
            .sort({ createdAt: -1 })
            .populate('user', 'username fullName profilePicture');
            
        // Obtener conteo total para paginación
        const total = await Post.countDocuments(filter);
        
        res.json({
            success: true,
            posts,
            pagination: {
                total,
                page: parseInt(page),
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Error al obtener posts:', error);
        res.status(500).json({ success: false, message: 'Error al obtener los posts' });
    }
};

/**
 * Obtener escuelas/instituciones con filtros
 */
exports.getAllSchools = async (req, res) => {
    try {
        const { search, country, limit = 10, page = 1 } = req.query;
        const skip = (page - 1) * limit;
        
        // Construir filtro
        const filter = { role: "Profesional", professionalType: { $in: [4] } }; // Las instituciones tienen professionalType = 4
        
        if (country) {
            filter.country = country;
        }
        
        // Buscar por nombre o ubicación
        if (search) {
            filter.$or = [
                { companyName: { $regex: search, $options: 'i' } },
                { city: { $regex: search, $options: 'i' } },
                { country: { $regex: search, $options: 'i' } }
            ];
        }
        
        // Obtener resultados paginados - Usamos el modelo User porque las instituciones son usuarios profesionales
        const schools = await User.find(filter)
            .select('-password')
            .limit(parseInt(limit))
            .skip(skip)
            .sort({ companyName: 1 });
            
        // Obtener conteo total para paginación
        const total = await User.countDocuments(filter);
        
        // Para cada escuela, contar sus programas educativos
        const schoolsWithCounts = await Promise.all(schools.map(async (school) => {
            const programCount = await EducationalOffer.countDocuments({ publisher: school._id });
            
            return {
                _id: school._id,
                name: school.companyName || school.fullName,
                logo: school.profile?.profilePicture,
                city: school.city,
                country: school.country,
                website: school.social?.sitioWeb,
                programCount,
                email: school.email
            };
        }));
        
        res.json({
            success: true,
            schools: schoolsWithCounts,
            pagination: {
                total,
                page: parseInt(page),
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Error al obtener escuelas:', error);
        res.status(500).json({ success: false, message: 'Error al obtener las escuelas' });
    }
};

/**
 * Obtener estadísticas generales para el dashboard
 */
exports.getDashboardStats = async (req, res) => {
    try {
        // Contar usuarios por rol
        const usersByRole = await User.aggregate([
            { $group: { _id: "$role", count: { $sum: 1 } } }
        ]);
        
        // Contar usuarios activos vs inactivos
        const usersByStatus = await User.aggregate([
            { $group: { _id: "$isActive", count: { $sum: 1 } } }
        ]);
        
        // Contar ofertas por estado
        const offersByStatus = await Offer.aggregate([
            { $group: { _id: "$status", count: { $sum: 1 } } }
        ]);
        
        // Contar ofertas educativas por estado
        const educationalOffersByStatus = await EducationalOffer.aggregate([
            { $group: { _id: "$status", count: { $sum: 1 } } }
        ]);
        
        // Contar posts
        const postsCount = await Post.countDocuments();
        
        // Usuarios nuevos en el último mes
        const lastMonth = new Date();
        lastMonth.setMonth(lastMonth.getMonth() - 1);
        
        const newUsersCount = await User.countDocuments({
            createdAt: { $gte: lastMonth }
        });
        
        // Ofertas nuevas en el último mes
        const newOffersCount = await Offer.countDocuments({
            publicationDate: { $gte: lastMonth }
        });
        
        res.json({
            success: true,
            stats: {
                usuarios: {
                    total: await User.countDocuments(),
                    nuevos30Dias: newUsersCount,
                    creativos: usersByRole.find(item => item._id === 'Creativo')?.count || 0,
                    profesionales: usersByRole.find(item => item._id === 'Profesional')?.count || 0,
                    admin: usersByRole.find(item => item._id === 'Admin')?.count || 0,
                    activos: usersByStatus.find(item => item._id === true)?.count || 0,
                    inactivos: usersByStatus.find(item => item._id === false)?.count || 0
                },
                ofertas: {
                    total: await Offer.countDocuments(),
                    nuevas30Dias: newOffersCount,
                    activas: offersByStatus.find(item => item._id === 'accepted')?.count || 0,
                    pendientes: offersByStatus.find(item => item._id === 'pending')?.count || 0,
                    canceladas: offersByStatus.find(item => item._id === 'cancelled')?.count || 0
                },
                ofertasEducativas: {
                    total: await EducationalOffer.countDocuments(),
                    activas: educationalOffersByStatus.find(item => item._id === 'accepted')?.count || 0,
                    pendientes: educationalOffersByStatus.find(item => item._id === 'pending')?.count || 0,
                    rechazadas: educationalOffersByStatus.find(item => item._id === 'rejected')?.count || 0
                },
                posts: {
                    total: postsCount
                }
            }
        });
    } catch (error) {
        console.error('Error al obtener estadísticas:', error);
        res.status(500).json({ success: false, message: 'Error al obtener las estadísticas del dashboard' });
    }
};

/**
 * Crear un nuevo usuario administrador
 */
exports.createAdmin = async (req, res) => {
    try {
        const { username, email, password, fullName } = req.body;
        
        // Verificar si el usuario ya existe
        const existingUser = await User.findOne({
            $or: [{ email }, { username }]
        });
        
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'El usuario ya existe con ese email o nombre de usuario'
            });
        }
        
        // Crear nuevo usuario con rol de Admin
        const newAdmin = new User({
            username,
            email,
            fullName,
            password, // Se encriptará en el middleware pre-save
            role: 'Admin',
            isAdmin: true,
            isActive: true,
            isVerified: true,
            profileCompleted: true
        });
        
        await newAdmin.save();
        
        res.status(201).json({
            success: true,
            message: 'Administrador creado correctamente',
            admin: {
                _id: newAdmin._id,
                username: newAdmin.username,
                email: newAdmin.email,
                fullName: newAdmin.fullName,
                role: newAdmin.role
            }
        });
    } catch (error) {
        console.error('Error al crear administrador:', error);
        res.status(500).json({ success: false, message: 'Error al crear el administrador' });
    }
};

/**
 * Actualizar el estado de una oferta de trabajo.
 * Solo los administradores pueden acceder a esta función.
 */
exports.updateOfferStatus = async (req, res) => {
    try {
        const { offerId } = req.params;
        const { status } = req.body;
        
        // Validar que el estado es válido según el modelo
        const validStatuses = ['pending', 'accepted', 'cancelled'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Estado no válido. Los estados permitidos son: pending, accepted, cancelled'
            });
        }

        // Buscar la oferta por ID
        const offer = await Offer.findById(offerId);
        if (!offer) {
            return res.status(404).json({
                success: false,
                message: 'Oferta no encontrada'
            });
        }

        // Actualizar el estado
        offer.status = status;
        await offer.save();

        res.json({
            success: true,
            message: 'Estado de la oferta actualizado correctamente',
            offer: {
                _id: offer._id,
                title: offer.position,
                status: offer.status
            }
        });
    } catch (error) {
        console.error('Error al actualizar el estado de la oferta:', error);
        res.status(500).json({
            success: false,
            message: 'Error del servidor al actualizar el estado de la oferta',
            error: error.message
        });
    }
};

/**
 * Actualizar el estado de una oferta educativa.
 * Solo los administradores pueden acceder a esta función.
 */
exports.updateEducationalOfferStatus = async (req, res) => {
    try {
        const { offerId } = req.params;
        const { status } = req.body;
        
        // Validar que el estado es válido según el modelo
        const validStatuses = ['pending', 'accepted', 'rejected'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Estado no válido. Los estados permitidos son: pending, accepted, rejected'
            });
        }

        // Buscar la oferta educativa por ID
        const offer = await EducationalOffer.findById(offerId);
        if (!offer) {
            return res.status(404).json({
                success: false,
                message: 'Oferta educativa no encontrada'
            });
        }

        // Actualizar el estado
        offer.status = status;
        await offer.save();

        res.json({
            success: true,
            message: 'Estado de la oferta educativa actualizado correctamente',
            offer: {
                _id: offer._id,
                title: offer.programName,
                status: offer.status
            }
        });
    } catch (error) {
        console.error('Error al actualizar el estado de la oferta educativa:', error);
        res.status(500).json({
            success: false,
            message: 'Error del servidor al actualizar el estado de la oferta educativa',
            error: error.message
        });
    }
};

/**
 * Eliminar oferta educativa
 */
exports.deleteEducationalOffer = async (req, res) => {
    try {
        const { offerId } = req.params;
        
        // Verificar que la oferta existe
        const offer = await EducationalOffer.findById(offerId);
        if (!offer) {
            return res.status(404).json({ success: false, message: 'Oferta educativa no encontrada' });
        }
        
        // Eliminar oferta
        await EducationalOffer.findByIdAndDelete(offerId);
        
        res.json({
            success: true,
            message: 'Oferta educativa eliminada correctamente'
        });
    } catch (error) {
        console.error('Error al eliminar oferta educativa:', error);
        res.status(500).json({ success: false, message: 'Error al eliminar la oferta educativa' });
    }
};

/**
 * Obtener todos los posts del blog con posibilidad de filtrado
 */
exports.getAllBlogPosts = async (req, res) => {
    try {
        const { status, category, featured, search, limit = 10, page = 1 } = req.query;
        const skip = (page - 1) * limit;
        
        // Construir filtro
        const filter = {};
        
        if (status) filter.status = status;
        if (category) filter.category = category;
        if (featured) filter.featured = featured === 'true';
        
        // Buscar por título, extracto o contenido
        if (search) {
            filter.$or = [
                { title: { $regex: search, $options: 'i' } },
                { excerpt: { $regex: search, $options: 'i' } },
                { content: { $regex: search, $options: 'i' } },
                { author: { $regex: search, $options: 'i' } }
            ];
        }
        
        // Obtener resultados paginados
        const blogPosts = await BlogPost.find(filter)
            .populate('createdBy', 'fullName username')
            .limit(parseInt(limit))
            .skip(skip)
            .sort({ publishedDate: -1 });
            
        // Obtener conteo total para paginación
        const total = await BlogPost.countDocuments(filter);
        
        res.json({
            success: true,
            blogPosts,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Error al obtener posts del blog:', error);
        res.status(500).json({ success: false, message: 'Error al obtener posts del blog' });
    }
};

/**
 * Crear un nuevo post para el blog
 */
exports.createBlogPost = async (req, res) => {
    try {
        let imageUrl = '';
        if (req.file) {
            const streamUpload = (file) => {
                return new Promise((resolve, reject) => {
                    const stream = cloudinary.uploader.upload_stream(
                        { folder: 'blog_posts' },
                        (error, result) => {
                            if (result) resolve(result);
                            else reject(error);
                        }
                    );
                    streamifier.createReadStream(file.buffer).pipe(stream);
                });
            };
            const result = await streamUpload(req.file);
            imageUrl = result.secure_url;
        } else if (req.body.imageUrl) {
            // Permitir URL de imagen externa
            imageUrl = req.body.imageUrl;
        } else {
            return res.status(400).json({ success: false, message: 'Se requiere una imagen para el post' });
        }
        
        // Procesar etiquetas
        const tags = req.body.tags
            ? (typeof req.body.tags === 'string'
                ? req.body.tags.split(',').map((tag) => tag.trim())
                : req.body.tags)
            : [];

        // Crear el nuevo post
        const newBlogPost = new BlogPost({
            title: req.body.title,
            content: req.body.content,
            excerpt: req.body.excerpt,
            image: imageUrl,
            category: req.body.category,
            author: req.body.author,
            featured: req.body.featured === 'true',
            size: req.body.size || 'medium-blog',
            tags,
            status: req.body.status || 'published',
            createdBy: req.user.id
        });
        
        await newBlogPost.save();
        
        res.status(201).json({
            success: true,
            message: 'Post de blog creado exitosamente',
            blogPost: newBlogPost
        });
    } catch (error) {
        console.error('Error al crear post de blog:', error);
        // Mensaje más descriptivo para errores de validación
        if (error.name === 'ValidationError') {
            const errorMessages = Object.keys(error.errors).map(key => {
                return `${error.errors[key].path}: ${error.errors[key].message}`;
            }).join(', ');
            return res.status(400).json({ 
                success: false, 
                message: `Error de validación: ${errorMessages}`, 
                details: error.errors 
            });
        }
        res.status(500).json({ success: false, message: 'Error al crear el post de blog', error: error.message });
    }
};

/**
 * Obtener detalles de un post del blog
 */
exports.getBlogPostDetails = async (req, res) => {
    try {
        const { postId } = req.params;
        
        const blogPost = await BlogPost.findById(postId)
            .populate('createdBy', 'fullName username');
            
        if (!blogPost) {
            return res.status(404).json({ success: false, message: 'Post de blog no encontrado' });
        }
        
        res.json({
            success: true,
            blogPost
        });
    } catch (error) {
        console.error('Error al obtener detalles del post de blog:', error);
        res.status(500).json({ success: false, message: 'Error al obtener detalles del post de blog' });
    }
};

/**
 * Actualizar un post del blog
 */
exports.updateBlogPost = async (req, res) => {
    try {
        const { postId } = req.params;
        
        // Verificar que el post existe
        const blogPost = await BlogPost.findById(postId);
        if (!blogPost) {
            return res.status(404).json({ success: false, message: 'Post de blog no encontrado' });
        }
        
        // Procesar imagen si se proporciona una nueva
        let imageUrl = blogPost.image; // Mantener la imagen actual por defecto
        if (req.file) {
            const streamUpload = (file) => {
                return new Promise((resolve, reject) => {
                    const stream = cloudinary.uploader.upload_stream(
                        { folder: 'blog_posts' },
                        (error, result) => {
                            if (result) resolve(result);
                            else reject(error);
                        }
                    );
                    streamifier.createReadStream(file.buffer).pipe(stream);
                });
            };
            const result = await streamUpload(req.file);
            imageUrl = result.secure_url;
        } else if (req.body.imageUrl && req.body.imageUrl !== blogPost.image) {
            // Actualizar con URL externa si es diferente
            imageUrl = req.body.imageUrl;
        }
        
        // Procesar etiquetas
        const tags = req.body.tags
            ? (typeof req.body.tags === 'string'
                ? req.body.tags.split(',').map((tag) => tag.trim())
                : req.body.tags)
            : blogPost.tags;
            
        // Actualizar el post
        const updatedBlogPost = await BlogPost.findByIdAndUpdate(
            postId,
            {
                title: req.body.title || blogPost.title,
                content: req.body.content || blogPost.content,
                excerpt: req.body.excerpt || blogPost.excerpt,
                image: imageUrl,
                category: req.body.category || blogPost.category,
                author: req.body.author || blogPost.author,
                featured: req.body.featured === 'true' || (req.body.featured !== 'false' && blogPost.featured),
                size: req.body.size || blogPost.size,
                tags,
                status: req.body.status || blogPost.status
            },
            { new: true, runValidators: true }
        );
        
        res.json({
            success: true,
            message: 'Post de blog actualizado exitosamente',
            blogPost: updatedBlogPost
        });
    } catch (error) {
        console.error('Error al actualizar post de blog:', error);
        res.status(500).json({ success: false, message: 'Error al actualizar el post de blog', error: error.message });
    }
};

/**
 * Eliminar un post del blog
 */
exports.deleteBlogPost = async (req, res) => {
    try {
        const { postId } = req.params;
        
        // Verificar que el post existe
        const blogPost = await BlogPost.findById(postId);
        if (!blogPost) {
            return res.status(404).json({ success: false, message: 'Post de blog no encontrado' });
        }
        
        // Eliminar el post
        await BlogPost.findByIdAndDelete(postId);
        
        res.json({
            success: true,
            message: 'Post de blog eliminado exitosamente'
        });
    } catch (error) {
        console.error('Error al eliminar post de blog:', error);
        res.status(500).json({ success: false, message: 'Error al eliminar el post de blog' });
    }
};

/**
 * Actualizar el estado de un post del blog (publicado, borrador, archivado)
 */
exports.updateBlogPostStatus = async (req, res) => {
    try {
        const { postId } = req.params;
        const { status } = req.body;
        
        // Validar que el estado es válido
        const validStatuses = ['draft', 'published', 'archived'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Estado no válido. Los estados permitidos son: draft, published, archived'
            });
        }
        
        // Verificar que el post existe
        const blogPost = await BlogPost.findById(postId);
        if (!blogPost) {
            return res.status(404).json({ success: false, message: 'Post de blog no encontrado' });
        }
        
        // Actualizar el estado
        blogPost.status = status;
        await blogPost.save();
        
        res.json({
            success: true,
            message: 'Estado del post de blog actualizado exitosamente',
            status: blogPost.status
        });
    } catch (error) {
        console.error('Error al actualizar el estado del post de blog:', error);
        res.status(500).json({ success: false, message: 'Error al actualizar el estado del post de blog' });
    }
};

/**
 * Obtener detalles de un post específico
 */
exports.getPostDetails = async (req, res) => {
    try {
        const { postId } = req.params;
        
        const post = await Post.findById(postId)
            .populate('user', 'username fullName email profilePicture');
            
        if (!post) {
            return res.status(404).json({ success: false, message: 'Post no encontrado' });
        }
        
        res.json({
            success: true,
            post
        });
    } catch (error) {
        console.error('Error al obtener detalles del post:', error);
        res.status(500).json({ success: false, message: 'Error al obtener los detalles del post' });
    }
};

/**
 * Crear un nuevo post
 */
exports.createPost = async (req, res) => {
    try {
        const { title, description, tags, peopleTags, userId, staffPick } = req.body;
        
        // Verificar que el usuario existe
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
        }
        
        // Manejar subida de imágenes
        const uploadedImages = [];
        let mainImage = '';
        
        if (req.files && req.files.length > 0) {
            // Subir cada imagen a Cloudinary
            for (const file of req.files) {
                try {
                    // Crear stream de datos para Cloudinary
                    let streamUpload = (file) => {
                        return new Promise((resolve, reject) => {
                            let stream = cloudinary.uploader.upload_stream(
                                {
                                    folder: "posts",
                                    resource_type: "image"
                                },
                                (error, result) => {
                                    if (result) {
                                        resolve(result);
                                    } else {
                                        reject(error);
                                    }
                                }
                            );
                            streamifier.createReadStream(file.buffer).pipe(stream);
                        });
                    };
                    
                    const result = await streamUpload(file);
                    uploadedImages.push(result.secure_url);
                    
                    // Primera imagen subida será la principal si no hay una específica
                    if (!mainImage) {
                        mainImage = result.secure_url;
                    }
                } catch (err) {
                    console.error('Error al subir imagen:', err);
                }
            }
        }
        
        if (uploadedImages.length === 0) {
            return res.status(400).json({ success: false, message: 'Se requiere al menos una imagen para el post' });
        }
        
        // Crear el post
        const newPost = new Post({
            user: userId,
            title,
            description,
            images: uploadedImages,
            mainImage,
            tags: tags || [],
            peopleTags: peopleTags || [],
            staffPick: staffPick || false
        });
        
        await newPost.save();
        
        res.status(201).json({
            success: true,
            post: newPost,
            message: 'Post creado correctamente'
        });
    } catch (error) {
        console.error('Error al crear post:', error);
        res.status(500).json({ success: false, message: 'Error al crear el post' });
    }
};

/**
 * Actualizar un post existente
 */
exports.updatePost = async (req, res) => {
    try {
        const { postId } = req.params;
        const { title, description, tags, peopleTags, staffPick } = req.body;
        
        // Verificar que el post existe
        const post = await Post.findById(postId);
        if (!post) {
            return res.status(404).json({ success: false, message: 'Post no encontrado' });
        }
        
        // Preparar objeto de actualización
        const updates = {
            title,
            description,
            tags: tags || post.tags,
            peopleTags: peopleTags || post.peopleTags,
            staffPick: staffPick !== undefined ? staffPick : post.staffPick
        };
        
        // Procesar nuevas imágenes si se proporcionan
        if (req.files && req.files.length > 0) {
            const uploadedImages = [];
            
            // Subir cada imagen a Cloudinary
            for (const file of req.files) {
                try {
                    // Crear stream de datos para Cloudinary
                    let streamUpload = (file) => {
                        return new Promise((resolve, reject) => {
                            let stream = cloudinary.uploader.upload_stream(
                                {
                                    folder: "posts",
                                    resource_type: "image"
                                },
                                (error, result) => {
                                    if (result) {
                                        resolve(result);
                                    } else {
                                        reject(error);
                                    }
                                }
                            );
                            streamifier.createReadStream(file.buffer).pipe(stream);
                        });
                    };
                    
                    const result = await streamUpload(file);
                    uploadedImages.push(result.secure_url);
                } catch (err) {
                    console.error('Error al subir imagen:', err);
                }
            }
            
            if (uploadedImages.length > 0) {
                updates.images = [...post.images, ...uploadedImages];
                // Actualizar mainImage si no había ninguna previamente
                if (!post.mainImage && uploadedImages.length > 0) {
                    updates.mainImage = uploadedImages[0];
                }
            }
        }
        
        // Si se proporciona una imagen específica como principal
        if (req.body.mainImage) {
            // Verificar que la imagen existe en las imágenes del post
            if (updates.images && updates.images.includes(req.body.mainImage)) {
                updates.mainImage = req.body.mainImage;
            } else if (post.images.includes(req.body.mainImage)) {
                updates.mainImage = req.body.mainImage;
            }
        }
        
        // Actualizar post
        const updatedPost = await Post.findByIdAndUpdate(
            postId,
            { $set: updates },
            { new: true }
        ).populate('user', 'username fullName email profilePicture');
        
        res.json({
            success: true,
            post: updatedPost,
            message: 'Post actualizado correctamente'
        });
    } catch (error) {
        console.error('Error al actualizar post:', error);
        res.status(500).json({ success: false, message: 'Error al actualizar el post' });
    }
};

/**
 * Eliminar un post
 */
exports.deletePost = async (req, res) => {
    try {
        const { postId } = req.params;
        
        // Verificar que el post existe
        const post = await Post.findById(postId);
        if (!post) {
            return res.status(404).json({ success: false, message: 'Post no encontrado' });
        }
        
        // Eliminar post
        await Post.findByIdAndDelete(postId);
        
        res.json({
            success: true,
            message: 'Post eliminado correctamente'
        });
    } catch (error) {
        console.error('Error al eliminar post:', error);
        res.status(500).json({ success: false, message: 'Error al eliminar el post' });
    }
};

/**
 * Actualizar el estado de staff pick de un post
 */
exports.updatePostStaffPick = async (req, res) => {
    try {
        const { postId } = req.params;
        const { staffPick } = req.body;
        
        // Verificar que el post existe
        const post = await Post.findById(postId);
        if (!post) {
            return res.status(404).json({ success: false, message: 'Post no encontrado' });
        }
        
        // Actualizar staffPick
        const updatedPost = await Post.findByIdAndUpdate(
            postId,
            { staffPick },
            { new: true }
        ).populate('user', 'username fullName email profilePicture');
        
        res.json({
            success: true,
            post: updatedPost,
            message: `Post ${staffPick ? 'destacado' : 'quitado de destacados'} correctamente`
        });
    } catch (error) {
        console.error('Error al actualizar estado de staff pick:', error);
        res.status(500).json({ success: false, message: 'Error al actualizar el estado de staff pick' });
    }
};

/**
 * Crear una nueva escuela
 */
exports.createSchool = async (req, res) => {
    try {
        const { name, type, city } = req.body;
        
        // Validar datos obligatorios
        if (!name) {
            return res.status(400).json({ success: false, message: 'El nombre de la escuela es obligatorio' });
        }
        
        // Verificar si ya existe una escuela con el mismo nombre
        const existingSchool = await School.findOne({ name });
        if (existingSchool) {
            return res.status(400).json({ success: false, message: 'Ya existe una escuela con este nombre' });
        }
        
        // Crear nueva escuela
        const newSchool = new School({
            name,
            type,
            city
        });
        
        await newSchool.save();
        
        res.status(201).json({
            success: true,
            school: newSchool,
            message: 'Escuela creada correctamente'
        });
    } catch (error) {
        console.error('Error al crear escuela:', error);
        res.status(500).json({ success: false, message: 'Error al crear la escuela' });
    }
};

/**
 * Obtener detalles de una escuela
 */
exports.getSchoolDetails = async (req, res) => {
    try {
        const { schoolId } = req.params;
        
        const school = await User.findById(schoolId.toString());
        
        if (!school) {
            return res.status(404).json({ success: false, message: 'Escuela no encontrada' });
        }
        
        res.json({
            success: true,
            school
        });
    } catch (error) {
        console.error('Error al obtener detalles de escuela:', error);
        res.status(500).json({ success: false, message: 'Error al obtener los detalles de la escuela' });
    }
};

/**
 * Actualizar una escuela
 */
exports.updateSchool = async (req, res) => {
    try {
        const { schoolId } = req.params;
        const { name, type, city } = req.body;
        
        // Verificar que la escuela existe
        const school = await User.findById(schoolId);
        if (!school) {
            return res.status(404).json({ success: false, message: 'Escuela no encontrada' });
        }
        
        // Validar nombre obligatorio
        if (!name) {
            return res.status(400).json({ success: false, message: 'El nombre de la escuela es obligatorio' });
        }
        
        // Verificar si el nombre ya existe (si está cambiando el nombre)
        if (name !== school.name) {
            const existingSchool = await School.findOne({ name });
            if (existingSchool) {
                return res.status(400).json({ success: false, message: 'Ya existe una escuela con este nombre' });
            }
        }
        
        // Actualizar escuela
        const updatedSchool = await User.findByIdAndUpdate(
            schoolId.toString(),
            { 
                name,
                type,
                city
            },
            { new: true }
        );
        
        res.json({
            success: true,
            school: updatedSchool,
            message: 'Escuela actualizada correctamente'
        });
    } catch (error) {
        console.error('Error al actualizar escuela:', error);
        res.status(500).json({ success: false, message: 'Error al actualizar la escuela' });
    }
};

/**
 * Eliminar una escuela
 */
exports.deleteSchool = async (req, res) => {
    try {
        const { schoolId } = req.params;
        
        // Verificar que la escuela existe
        const school = await User.findById(schoolId.toString());
        if (!school) {
            return res.status(404).json({ success: false, message: 'Escuela no encontrada' });
        }
        
        // TODO: Verificar si la escuela tiene ofertas educativas asociadas
        // y decidir si implementar borrado en cascada o prevenir el borrado
        
        // Eliminar escuela
        await User.findByIdAndDelete(schoolId);
        
        res.json({
            success: true,
            message: 'Escuela eliminada correctamente'
        });
    } catch (error) {
        console.error('Error al eliminar escuela:', error);
        res.status(500).json({ success: false, message: 'Error al eliminar la escuela' });
    }
};

/**
 * Actualizar la contraseña del administrador actualmente autenticado
 */
exports.updateAdminPassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const adminId = req.user._id;

        // Buscar el admin por ID
        const admin = await User.findById(adminId);
        if (!admin) {
            return res.status(404).json({ success: false, message: 'Administrador no encontrado' });
        }

        // Verificar que el usuario sea realmente un administrador
        if (admin.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Solo los administradores pueden realizar esta acción' });
        }

        // Verificar que la contraseña actual sea correcta
        const bcrypt = require('bcryptjs');
        const isMatch = await bcrypt.compare(currentPassword, admin.password);
        if (!isMatch) {
            return res.status(400).json({ success: false, message: 'La contraseña actual es incorrecta' });
        }

        // Hashear la nueva contraseña
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        // Actualizar la contraseña
        admin.password = hashedPassword;
        await admin.save();

        res.json({
            success: true,
            message: 'Contraseña actualizada correctamente'
        });
    } catch (error) {
        console.error('Error al actualizar contraseña del administrador:', error);
        res.status(500).json({ success: false, message: 'Error al actualizar la contraseña' });
    }
};

/**
 * Obtener el perfil del administrador actual
 */
exports.getAdminProfile = async (req, res) => {
    try {
        const adminId = req.user._id;
        
        const admin = await User.findById(adminId)
            .select('-password');
            
        if (!admin) {
            return res.status(404).json({ success: false, message: 'Administrador no encontrado' });
        }
        
        res.json({
            success: true,
            admin
        });
    } catch (error) {
        console.error('Error al obtener perfil del administrador:', error);
        res.status(500).json({ success: false, message: 'Error al obtener el perfil' });
    }
};

/**
 * Actualizar la información del perfil del administrador actual
 */
exports.updateAdminProfile = async (req, res) => {
    try {
        const adminId = req.user._id;
        const { fullName, email } = req.body;
        
        // Verificar que el administrador existe
        const admin = await User.findById(adminId);
        if (!admin) {
            return res.status(404).json({ success: false, message: 'Administrador no encontrado' });
        }
        
        // Actualizar información
        const updatedAdmin = await User.findByIdAndUpdate(
            adminId,
            { 
                $set: { 
                    fullName: fullName || admin.fullName,
                    email: email || admin.email
                } 
            },
            { new: true }
        ).select('-password');
        
        res.json({
            success: true,
            admin: updatedAdmin,
            message: 'Perfil actualizado correctamente'
        });
    } catch (error) {
        console.error('Error al actualizar perfil del administrador:', error);
        res.status(500).json({ success: false, message: 'Error al actualizar el perfil' });
    }
};
