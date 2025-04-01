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
router.delete('/users/:userId/permanent', adminController.hardDeleteUser); // Eliminación permanente
router.put('/users/:userId/deactivate', adminController.softDeleteUser); // Soft delete
router.put('/users/:userId/restore', adminController.restoreUser); // Restaurar usuario

// Gestión de ofertas de trabajo
router.get('/offers', adminController.getAllOffers);
router.get('/offers/:offerId', adminController.getOfferDetails);
router.put('/offers/:offerId', adminController.updateOffer);
router.delete('/offers/:offerId', adminController.deleteOffer);

// Gestión de ofertas educativas
router.get('/educational-offers', adminController.getAllEducationalOffers);
router.get('/educational-offers/:offerId', adminController.getEducationalOfferDetails);
router.put('/educational-offers/:offerId', adminController.updateEducationalOffer);
router.delete('/educational-offers/:offerId', adminController.deleteEducationalOffer);

// Gestión de posts
router.get('/posts', adminController.getAllPosts);

// Gestión de escuelas/instituciones
router.get('/schools', adminController.getAllSchools);

// Dashboard
router.get('/stats', adminController.getDashboardStats);

// Creación de administradores (sólo accesible por otros administradores)
router.post('/create-admin', adminController.createAdmin);

module.exports = router;
