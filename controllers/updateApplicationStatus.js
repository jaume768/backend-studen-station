/**
 * Actualizar el estado de una aplicación a una oferta.
 * Solo el publicador de la oferta puede actualizar el estado de las aplicaciones.
 */
exports.updateApplicationStatus = async (req, res) => {
    try {
        const { id, applicationId } = req.params;
        const { status } = req.body;
        
        // Validar que se proporciona un estado válido
        const validStatuses = ['pending', 'reviewed', 'accepted', 'rejected'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ 
                success: false, 
                message: 'El estado proporcionado no es válido' 
            });
        }

        // Buscar la oferta
        const offer = await Offer.findById(id);
        
        if (!offer) {
            return res.status(404).json({ 
                success: false, 
                message: 'Oferta no encontrada' 
            });
        }

        // Verificar que el usuario autenticado es el publicador de la oferta o un administrador
        if (offer.publisher.toString() !== req.user.id && req.user.role !== 'Admin') {
            return res.status(403).json({ 
                success: false, 
                message: 'No tienes permiso para actualizar el estado de esta aplicación' 
            });
        }

        // Buscar la aplicación en la oferta
        const applicationIndex = offer.applications.findIndex(
            app => app._id.toString() === applicationId
        );

        if (applicationIndex === -1) {
            return res.status(404).json({ 
                success: false, 
                message: 'Aplicación no encontrada en esta oferta' 
            });
        }

        // Actualizar el estado de la aplicación
        offer.applications[applicationIndex].status = status;
        
        // Si el estado es 'reviewed', 'accepted' o 'rejected', marcar como revisado
        if (['reviewed', 'accepted', 'rejected'].includes(status)) {
            offer.applications[applicationIndex].reviewedAt = new Date();
        }

        await offer.save();

        res.json({ 
            success: true, 
            message: 'Estado de la aplicación actualizado correctamente',
            application: offer.applications[applicationIndex]
        });
    } catch (error) {
        console.error('Error al actualizar el estado de la aplicación:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error al actualizar el estado de la aplicación' 
        });
    }
};
