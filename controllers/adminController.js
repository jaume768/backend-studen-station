const User = require('../models/User');
const Offer = require('../models/Offer');
const EducationalOffer = require('../models/EducationalOffer');
const Post = require('../models/Post');

/**
 * Obtener todos los usuarios con posibilidad de filtrado
 */
exports.getAllUsers = async (req, res) => {
    try {
        const { role, search, limit = 20, page = 1 } = req.query;
        const skip = (page - 1) * limit;
        
        // Construir filtro
        const filter = {};
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
            message: 'Usuario actualizado correctamente',
            user: updatedUser
        });
    } catch (error) {
        console.error('Error al actualizar usuario:', error);
        res.status(500).json({ success: false, message: 'Error al actualizar el usuario' });
    }
};

/**
 * Eliminar usuario
 */
exports.deleteUser = async (req, res) => {
    try {
        const { userId } = req.params;
        
        // Verificar que el usuario existe
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
        }
        
        // Eliminar usuario
        await User.findByIdAndDelete(userId);
        
        res.json({
            success: true,
            message: 'Usuario eliminado correctamente'
        });
    } catch (error) {
        console.error('Error al eliminar usuario:', error);
        res.status(500).json({ success: false, message: 'Error al eliminar el usuario' });
    }
};

/**
 * Obtener todas las ofertas de trabajo con filtros
 */
exports.getAllOffers = async (req, res) => {
    try {
        const { status, search, publisher, limit = 20, page = 1 } = req.query;
        const skip = (page - 1) * limit;
        
        // Construir filtro
        const filter = {};
        if (status) {
            filter.status = status;
        }
        
        if (publisher) {
            filter.publisher = publisher;
        }
        
        // Buscar por título, descripción o empresa
        if (search) {
            filter.$or = [
                { position: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
                { companyName: { $regex: search, $options: 'i' } }
            ];
        }
        
        // Obtener resultados paginados
        const offers = await Offer.find(filter)
            .populate('publisher', 'username name companyName')
            .limit(parseInt(limit))
            .skip(skip)
            .sort({ createdAt: -1 });
            
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
 * Obtener todas las ofertas educativas con filtros
 */
exports.getAllEducationalOffers = async (req, res) => {
    try {
        const { status, search, publisher, limit = 20, page = 1 } = req.query;
        const skip = (page - 1) * limit;
        
        // Construir filtro
        const filter = {};
        if (status) {
            filter.status = status;
        }
        
        if (publisher) {
            filter.publisher = publisher;
        }
        
        // Buscar por título, descripción o institución
        if (search) {
            filter.$or = [
                { title: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
                { institutionName: { $regex: search, $options: 'i' } }
            ];
        }
        
        // Obtener resultados paginados
        const offers = await EducationalOffer.find(filter)
            .populate('publisher', 'username name companyName institutionName')
            .limit(parseInt(limit))
            .skip(skip)
            .sort({ createdAt: -1 });
            
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
 * Obtener todos los posts con filtros
 */
exports.getAllPosts = async (req, res) => {
    try {
        const { status, search, creator, limit = 20, page = 1 } = req.query;
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
            .populate('creator', 'username name avatar')
            .limit(parseInt(limit))
            .skip(skip)
            .sort({ createdAt: -1 });
            
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
 * Obtener estadísticas generales para el dashboard
 */
exports.getDashboardStats = async (req, res) => {
    try {
        // Usuarios
        const totalUsers = await User.countDocuments();
        const totalCreativos = await User.countDocuments({ role: 'Creativo' });
        const totalProfesionales = await User.countDocuments({ role: 'Profesional' });
        
        // Ofertas
        const totalOffers = await Offer.countDocuments();
        const activeOffers = await Offer.countDocuments({ status: 'activa' });
        
        // Ofertas educativas
        const totalEducationalOffers = await EducationalOffer.countDocuments();
        
        // Posts
        const totalPosts = await Post.countDocuments();
        
        // Usuarios nuevos en los últimos 30 días
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const newUsers = await User.countDocuments({ createdAt: { $gte: thirtyDaysAgo } });
        
        res.json({
            success: true,
            stats: {
                usuarios: {
                    total: totalUsers,
                    creativos: totalCreativos,
                    profesionales: totalProfesionales,
                    nuevos30Dias: newUsers
                },
                ofertas: {
                    total: totalOffers,
                    activas: activeOffers
                },
                ofertasEducativas: {
                    total: totalEducationalOffers
                },
                posts: {
                    total: totalPosts
                }
            }
        });
    } catch (error) {
        console.error('Error al obtener estadísticas del dashboard:', error);
        res.status(500).json({ success: false, message: 'Error al obtener las estadísticas' });
    }
};

/**
 * Crear un nuevo usuario administrador
 */
exports.createAdmin = async (req, res) => {
    try {
        const { username, email, password, fullName } = req.body;
        
        // Verificar si ya existe un usuario con ese email o username
        const existingUser = await User.findOne({ 
            $or: [{ email }, { username }]
        });
        
        if (existingUser) {
            return res.status(400).json({ 
                success: false, 
                message: 'El correo electrónico o nombre de usuario ya está en uso' 
            });
        }
        
        // Importar bcrypt para hashear la contraseña
        const bcrypt = require('bcryptjs');
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        
        // Crear nuevo usuario administrador
        const newAdmin = new User({
            username,
            email,
            password: hashedPassword,
            fullName,
            role: 'Admin',
            isAdmin: true,
            isVerified: true
        });
        
        await newAdmin.save();
        
        res.status(201).json({
            success: true,
            message: 'Usuario administrador creado correctamente',
            user: {
                _id: newAdmin._id,
                username: newAdmin.username,
                email: newAdmin.email,
                role: newAdmin.role
            }
        });
    } catch (error) {
        console.error('Error al crear usuario administrador:', error);
        res.status(500).json({ success: false, message: 'Error al crear el usuario administrador' });
    }
};
