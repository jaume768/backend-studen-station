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

router.delete('/profile', ensureAuthenticated, userController.deleteProfile);
router.get('/favorites', ensureAuthenticated, userController.getFavorites);

router.post('/favorites/:postId', ensureAuthenticated, userController.addFavorite);
router.delete('/favorites/:postId', ensureAuthenticated, userController.removeFavorite);

router.post('/saved-offers/:offerId', ensureAuthenticated, userController.saveOffer);
router.delete('/saved-offers/:offerId', ensureAuthenticated, userController.removeSavedOffer);
router.get('/saved-offers', ensureAuthenticated, userController.getSavedOffers);

module.exports = router;