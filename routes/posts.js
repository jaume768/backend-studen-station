const express = require('express');
const router = express.Router();
const postController = require('../controllers/postController');
const { ensureAuthenticated } = require('../middlewares/auth');
const multer = require('multer');
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Crear post (con o sin imagen)
router.post('/', ensureAuthenticated, upload.array('images'), postController.createPost);

router.get('/home', postController.getRandomPosts);

router.get('/tags/:tag', postController.getPostsByTag);

router.get('/:id', ensureAuthenticated, postController.getPostById);

router.put('/:id', ensureAuthenticated, upload.single('image'), postController.updatePost);

router.delete('/:id', ensureAuthenticated, postController.deletePost);

router.get('/staff-picks', postController.getStaffPicks);
router.put('/:id/staff-pick', ensureAuthenticated, postController.addStaffPick);
router.delete('/:id/staff-pick', ensureAuthenticated, postController.removeStaffPick);

router.get('/search', ensureAuthenticated, postController.searchPosts);

module.exports = router;