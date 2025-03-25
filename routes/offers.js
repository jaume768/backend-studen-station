const express = require('express');
const router = express.Router();
const offerController = require('../controllers/offerController');
const { ensureAuthenticated } = require('../middlewares/auth');
const multer = require('multer');
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Los endpoints que no usan parámetros en la URL deben definirse primero
router.get('/unreviewed', ensureAuthenticated, offerController.getUnreviewedOffers);
router.get('/search', offerController.searchOffers);
router.get('/user', ensureAuthenticated, offerController.getUserOffers);
router.get('/educational-offers/user', ensureAuthenticated, offerController.getUserEducationalOffers);
router.get('/', offerController.getAllOffers);

// Endpoints para ofertas de trabajo
router.post('/create', ensureAuthenticated, upload.single('logo'), offerController.createOffer);

// Endpoints para ofertas educativas
router.post('/educational', ensureAuthenticated, upload.fields([
    { name: 'headerImage', maxCount: 1 }
]), offerController.createEducationalOffer);
router.get('/educational/:id', offerController.getEducationalOffer);
router.get('/educational', offerController.getAllEducationalOffers);

// Obtener oferta por ID
router.get('/:id', offerController.getOffer);

// Actualizar oferta
router.put('/:id', ensureAuthenticated, offerController.updateOffer);

// Eliminar oferta
router.delete('/:id', ensureAuthenticated, offerController.deleteOffer);

module.exports = router;