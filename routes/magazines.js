const express = require('express');
const router = express.Router();
const magazineController = require('../controllers/magazineController');

// Rutas públicas para revistas (no requieren autenticación)
router.get('/', magazineController.getActiveMagazines);
router.get('/:id', magazineController.getMagazineDetails);

module.exports = router;
