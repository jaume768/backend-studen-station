const express = require('express');
const router = express.Router();
const offerController = require('../controllers/offerController');
const { ensureAuthenticated } = require('../middlewares/auth');

// Los endpoints que no usan parámetros en la URL deben definirse primero
router.get('/unreviewed', ensureAuthenticated, offerController.getUnreviewedOffers);
router.get('/search', offerController.searchOffers);
router.get('/', offerController.getAllOffers);

// Endpoints que usan un ID (se definen después para evitar conflictos con rutas fijas)
router.post('/', ensureAuthenticated, offerController.createOffer);
router.get('/:id', offerController.getOffer);
router.put('/:id', ensureAuthenticated, offerController.updateOffer);
router.delete('/:id', ensureAuthenticated, offerController.deleteOffer);

module.exports = router;