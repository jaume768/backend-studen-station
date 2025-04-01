const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { ensureAuthenticated, ensureAdmin } = require('../middlewares/auth');

// Todas las rutas de administración requieren autenticación y rol de administrador
router.use(ensureAuthenticated, ensureAdmin);

// Gestión de usuarios
router.get('/users', adminController.getAllUsers);
router.get('/users/:userId', adminController.getUserDetails);
router.put('/users/:userId', adminController.updateUser);
router.delete('/users/:userId', adminController.deleteUser);

// Gestión de ofertas de trabajo
router.get('/offers', adminController.getAllOffers);

// Gestión de ofertas educativas
router.get('/educational-offers', adminController.getAllEducationalOffers);

// Gestión de posts
router.get('/posts', adminController.getAllPosts);

// Dashboard
router.get('/stats', adminController.getDashboardStats);

// Creación de administradores (sólo accesible por otros administradores)
router.post('/create-admin', adminController.createAdmin);

module.exports = router;
