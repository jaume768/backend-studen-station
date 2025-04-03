const User = require('../models/User');
const Offer = require('../models/Offer');
const EducationalOffer = require('../models/EducationalOffer');
const Post = require('../models/Post');

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
        const { status, search, creator, limit = 10, page = 1 } = req.query;
        const skip = (page - 1) * limit;
        
        // Construir filtro
        const filter = {};
        
        if (status) {
            filter.status = status;
        }
        
        if (creator) {
            filter.creator = creator;
        }
        
        // Buscar por título o contenido
        if (search) {
            filter.$or = [
                { title: { $regex: search, $options: 'i' } },
                { content: { $regex: search, $options: 'i' } }
            ];
        }
        
        // Obtener resultados paginados
        const posts = await Post.find(filter)
            .limit(parseInt(limit))
            .skip(skip)
            .sort({ createdAt: -1 })
            .populate('creator', 'username fullName profile.profilePicture');
            
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
