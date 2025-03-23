const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { ensureAuthenticated } = require('../middlewares/auth');
const multer = require('multer');

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Obtener perfil del usuario autenticado
router.get('/profile', ensureAuthenticated, userController.getProfile);

router.post('/check-availability', userController.checkAvailability);

// Actualizar perfil
router.put('/profile', ensureAuthenticated, userController.updateProfile);
router.get('/profile/:username', userController.getProfileByUsername);
router.put('/change-password', ensureAuthenticated, userController.changePassword);

router.put('/profile-picture', ensureAuthenticated, upload.single('file'), userController.updateProfilePicture);

// Nueva ruta para subir archivos PDF
router.post('/upload-pdf', ensureAuthenticated, upload.single('file'), userController.uploadPdf);

router.delete('/profile', ensureAuthenticated, userController.deleteProfile);

router.get('/favorites', ensureAuthenticated, userController.getFavorites);
router.post('/favorites/:postId', ensureAuthenticated, userController.addFavorite);
router.delete('/favorites/:postId', ensureAuthenticated, userController.removeFavorite);

router.post('/saved-offers/:offerId', ensureAuthenticated, userController.saveOffer);
router.delete('/saved-offers/:offerId', ensureAuthenticated, userController.removeSavedOffer);
router.get('/saved-offers', ensureAuthenticated, userController.getSavedOffers);

// Rutas para seguir/dejar de seguir usuarios
router.post('/follow/:userId', ensureAuthenticated, userController.followUser);
router.delete('/follow/:userId', ensureAuthenticated, userController.unfollowUser);
router.get('/following', ensureAuthenticated, userController.getFollowing);
router.get('/followers', ensureAuthenticated, userController.getFollowers);
router.get('/check-follow/:userId', ensureAuthenticated, userController.checkFollow);
router.get('/searchUsers', ensureAuthenticated, userController.searchUsers);
router.get('/creatives', userController.getCreatives);

// Rutas para obtener ofertas de un usuario específico
router.get('/:userId/offers', userController.getUserOffers);
router.get('/:userId/educational-offers', userController.getUserEducationalOffers);

module.exports = router;