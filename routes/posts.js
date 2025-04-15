const express = require('express');
const router = express.Router();
const postController = require('../controllers/postController');
const { ensureAuthenticated } = require('../middlewares/auth');
const multer = require('multer');
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Crear post (con o sin imagen)
router.post('/', ensureAuthenticated, upload.array('images'), postController.createPost);

// Obtener posts de usuario
router.get('/user', ensureAuthenticated, postController.getUserPosts);

// Obtener posts por nombre de usuario
router.get('/user/:username', postController.getPostsByUsername);

// Obtener posts aleatorios
router.get('/home', postController.getRandomPosts);

// Obtener posts aleatorios excluyendo un post específico
router.get('/random', postController.getRandomPostsExcluding);

// Obtener posts para el explorador (sin autenticación)
router.get('/explorer', postController.getExplorerPosts);

// Obtener posts por tag
router.get('/tags/:tag', postController.getPostsByTag);

// *** Colocar rutas específicas antes de las rutas con parámetros genéricos ***
// Obtener posts seleccionados por el staff (sin autenticación)
router.get('/staff-picks', postController.getStaffPicks);

// Buscar posts (protegido)
router.get('/search', ensureAuthenticated, postController.searchPosts);

// Rutas que requieren un ID (estas se definen después para evitar conflictos)
router.get('/:id', ensureAuthenticated, postController.getPostById);
router.put('/:id', ensureAuthenticated, upload.single('image'), postController.updatePost);
router.delete('/:id', ensureAuthenticated, postController.deletePost);

// Agregar o quitar post de staff picks (protegido)
router.put('/:id/staff-pick', ensureAuthenticated, postController.addStaffPick);
router.delete('/:id/staff-pick', ensureAuthenticated, postController.removeStaffPick);

module.exports = router;