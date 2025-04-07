const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { ensureAuthenticated, ensureAdmin } = require('../middlewares/auth');
const multer = require('multer');
const storage = multer.memoryStorage();

// Configuración de Multer sin restricciones de tipo de archivo
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 500 * 1024 * 1024, // Aumentado a 10MB para permitir imágenes más grandes
  },
});

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
router.put('/offers/:offerId/status', adminController.updateOfferStatus);

// Gestión de ofertas educativas
router.get('/educational-offers', adminController.getAllEducationalOffers);
router.get('/educational-offers/:offerId', adminController.getEducationalOfferDetails);
router.put('/educational-offers/:offerId', adminController.updateEducationalOffer);
router.delete('/educational-offers/:offerId', adminController.deleteEducationalOffer);
router.put('/educational-offers/:offerId/status', adminController.updateEducationalOfferStatus);

// Gestión de posts
router.get('/posts', adminController.getAllPosts);
router.get('/posts/:postId', adminController.getPostDetails);
router.post('/posts', upload.array('images', 10), adminController.createPost);
router.put('/posts/:postId', upload.array('images', 10), adminController.updatePost);
router.delete('/posts/:postId', adminController.deletePost);
router.put('/posts/:postId/staff-pick', adminController.updatePostStaffPick);

// Gestión de posts de blog
router.get('/blog', adminController.getAllBlogPosts);
router.get('/blog/:postId', adminController.getBlogPostDetails);
router.post('/blog', upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'images', maxCount: 10 }
]), adminController.createBlogPost);
router.put('/blog/:postId', upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'images', maxCount: 10 }
]), adminController.updateBlogPost);
router.delete('/blog/:postId', adminController.deleteBlogPost);
router.put('/blog/:postId/status', adminController.updateBlogPostStatus);

// Gestión de escuelas/instituciones
router.get('/schools', adminController.getAllSchools);
router.get('/schools/:schoolId', adminController.getSchoolDetails);
router.post('/schools', adminController.createSchool);
router.put('/schools/:schoolId', adminController.updateSchool);
router.delete('/schools/:schoolId', adminController.deleteSchool);

// Dashboard
router.get('/stats', adminController.getDashboardStats);

// Creación de administradores (sólo accesible por otros administradores)
router.post('/create-admin', adminController.createAdmin);

// Perfil de administrador
router.get('/profile', adminController.getAdminProfile);
router.put('/profile', adminController.updateAdminProfile);
router.put('/change-password', adminController.updateAdminPassword);

module.exports = router;
