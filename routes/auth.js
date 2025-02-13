const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const passport = require('passport');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

// Registro
router.post('/register', upload.single('profilePicture'), authController.register);

// Login local
router.post('/login', authController.login);

// Login con Google
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

// Callback de Google
router.get('/google/callback', passport.authenticate('google', { failureRedirect: '/login' }), authController.googleCallback);

router.post('/send-verification-code-pre-registration', authController.sendVerificationCodePreRegistration);

// Endpoint para verificar el código y crear el usuario
router.post('/verify-code-pre-registration', authController.verifyCodePreRegistration);

// Endpoint para reenviar el código
router.post('/resend-code-pre-registration', authController.resendCodePreRegistration);

// Logout
router.get('/logout', authController.logout);

module.exports = router;