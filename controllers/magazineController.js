const Magazine = require('../models/Magazine');

/**
 * Obtener todas las revistas activas (endpoint público)
 */
exports.getActiveMagazines = async (req, res) => {
    try {
        // Solo recuperamos las revistas activas
        const magazines = await Magazine.find({ isActive: true })
            .sort({ createdAt: -1 }) // Ordenadas por fecha de creación (más recientes primero)
            .select('name image price link createdAt'); // Seleccionamos solo los campos necesarios
        
        res.status(200).json({
            success: true,
            count: magazines.length,
            data: magazines
        });
    } catch (error) {
        console.error('Error al obtener revistas:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener las revistas',
            error: error.message
        });
    }
};

/**
 * Obtener detalles de una revista específica (endpoint público)
 */
exports.getMagazineDetails = async (req, res) => {
    try {
        const magazine = await Magazine.findOne({ 
            _id: req.params.id,
            isActive: true // Solo revistas activas
        });
        
        if (!magazine) {
            return res.status(404).json({
                success: false,
                message: 'Revista no encontrada o no está activa'
            });
        }
        
        res.status(200).json({
            success: true,
            data: magazine
        });
    } catch (error) {
        console.error('Error al obtener detalles de la revista:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener detalles de la revista',
            error: error.message
        });
    }
};
