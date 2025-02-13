const express = require('express');
const router = express.Router();
const folderController = require('../controllers/folderController');
const { ensureAuthenticated } = require('../middlewares/auth');

// Crear carpeta
router.post('/', ensureAuthenticated, folderController.createFolder);

// Listar carpetas del usuario
router.get('/', ensureAuthenticated, folderController.getFolders);

// Agregar post a carpeta
router.post('/add', ensureAuthenticated, folderController.addPostToFolder);

// Remover post de carpeta
router.post('/remove', ensureAuthenticated, folderController.removePostFromFolder);

router.get('/:id', ensureAuthenticated, folderController.getFolderById);

router.put('/:id', ensureAuthenticated, folderController.updateFolder);

router.delete('/:id', ensureAuthenticated, folderController.deleteFolder);


module.exports = router;