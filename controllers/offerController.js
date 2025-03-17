const Offer = require('../models/Offer');
const cloudinary = require('../config/cloudinary');
const streamifier = require('streamifier');

/**
 * Crear una nueva oferta.
 * Sólo los usuarios con rol "Profesional" podrán crear ofertas.
 */
exports.createOffer = async (req, res) => {
    try {
        if (req.user.role !== 'Profesional') {
            return res.status(403).json({ 
                message: "No tienes permiso para crear ofertas. Solo los usuarios con rol Profesional pueden crear ofertas.",
                userRole: req.user.role 
            });
        }

        let companyLogo = null;
        if (req.file) {
            try {
                const result = await new Promise((resolve, reject) => {
                    const stream = cloudinary.uploader.upload_stream(
                        { folder: 'company_logos' },
                        (error, result) => {
                            if (result) resolve(result);
                            else reject(error);
                        }
                    );
                    streamifier.createReadStream(req.file.buffer).pipe(stream);
                });
                companyLogo = result.secure_url;
            } catch (uploadError) {
                console.error('Error al subir el logo:', uploadError);
            }
        }

        const offerData = {
            companyName: req.body.companyName,
            position: req.body.position,
            city: req.body.city,
            jobType: req.body.jobType,
            locationType: req.body.locationType,
            isExternal: req.body.isExternal === 'true',
            externalLink: req.body.externalLink,
            description: req.body.description,
            requiredProfile: req.body.requiredProfile,
            tags: req.body.tags ? JSON.parse(req.body.tags) : [],
            publisher: req.user.id,
            status: 'pending',
            companyLogo
        };

        const newOffer = new Offer(offerData);
        await newOffer.save();
        
        res.status(201).json({ message: "Oferta creada", offer: newOffer });
    } catch (error) {
        console.error('Error en createOffer:', error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * Obtener los detalles de una oferta por su ID.
 */
exports.getOffer = async (req, res) => {
    try {
        const offer = await Offer.findById(req.params.id)
            .populate('publisher', 'fullName companyName');
        if (!offer) return res.status(404).json({ message: "Oferta no encontrada." });
        res.status(200).json({ offer });
    } catch (error) {
        console.error('Error en getOffer:', error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * Actualizar una oferta.
 * Sólo el usuario que publicó la oferta (publisher) puede editarla.
 */
exports.updateOffer = async (req, res) => {
    try {
        const offer = await Offer.findById(req.params.id);
        if (!offer) return res.status(404).json({ message: "Oferta no encontrada." });

        // Verificar que el usuario sea el publicador de la oferta
        if (offer.publisher.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: "No tienes permiso para actualizar esta oferta." });
        }

        // Evitamos que se actualice el estado desde este endpoint (si así lo deseamos)
        if (req.body.status) delete req.body.status;

        const updatedOffer = await Offer.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.status(200).json({ message: "Oferta actualizada", offer: updatedOffer });
    } catch (error) {
        console.error('Error en updateOffer:', error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * Eliminar una oferta.
 * Sólo el publicador de la oferta puede eliminarla.
 */
exports.deleteOffer = async (req, res) => {
    try {
        const offer = await Offer.findById(req.params.id);
        if (!offer) return res.status(404).json({ message: "Oferta no encontrada." });

        if (offer.publisher.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: "No tienes permiso para eliminar esta oferta." });
        }

        await Offer.findByIdAndDelete(req.params.id);
        res.status(200).json({ message: "Oferta eliminada" });
    } catch (error) {
        console.error('Error en deleteOffer:', error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * Listar todas las ofertas que hayan sido revisadas,
 * con soporte para filtros (por ciudad, etiquetas) y paginación.
 */
exports.getAllOffers = async (req, res) => {
    try {
        const { page = 1, limit = 10, city, tags } = req.query;
        const query = { status: "accepted" };

        if (city) query.city = city;
        if (tags) {
            query.tags = { $in: tags.split(',').map(t => t.trim()) };
        }

        const offers = await Offer.find(query)
            .skip((page - 1) * limit)
            .limit(parseInt(limit))
            .populate('publisher', 'fullName companyName');

        const total = await Offer.countDocuments(query);
        res.status(200).json({ total, offers });
    } catch (error) {
        console.error('Error en getAllOffers:', error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * Obtener ofertas que aún no han sido revisadas.
 * Este endpoint probablemente se use en un área restringida (por ejemplo, para el equipo de revisión).
 */
exports.getUnreviewedOffers = async (req, res) => {
    try {
        const offers = await Offer.find({ status: "pending" })
            .populate('publisher', 'fullName companyName');
        res.status(200).json({ offers });
    } catch (error) {
        console.error('Error en getUnreviewedOffers:', error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * Buscar ofertas por un término en campos como nombre de empresa, puesto o descripción.
 */
exports.searchOffers = async (req, res) => {
    try {
        const { query: searchQuery, page = 1, limit = 10 } = req.query;
        const query = {
            status: "accepted",
            $or: [
                { companyName: { $regex: searchQuery, $options: 'i' } },
                { position: { $regex: searchQuery, $options: 'i' } },
                { description: { $regex: searchQuery, $options: 'i' } }
            ]
        };

        const offers = await Offer.find(query)
            .skip((page - 1) * limit)
            .limit(parseInt(limit))
            .populate('publisher', 'fullName companyName');

        const total = await Offer.countDocuments(query);
        res.status(200).json({ total, offers });
    } catch (error) {
        console.error('Error en searchOffers:', error);
        res.status(500).json({ error: error.message });
    }
};

exports.acceptOffer = async (req, res) => {
    try {
        const offer = await Offer.findById(req.params.id);
        if (!offer) {
            return res.status(404).json({ message: "Oferta no encontrada." });
        }

        offer.status = "accepted";
        await offer.save();
        res.status(200).json({ message: "Oferta aceptada", offer });
    } catch (error) {
        console.error('Error en acceptOffer:', error);
        res.status(500).json({ error: error.message });
    }
};

exports.cancelOffer = async (req, res) => {
    try {
        const offer = await Offer.findById(req.params.id);
        if (!offer) {
            return res.status(404).json({ message: "Oferta no encontrada." });
        }

        offer.status = "cancelled";
        await offer.save();
        res.status(200).json({ message: "Oferta cancelada", offer });
    } catch (error) {
        console.error('Error en cancelOffer:', error);
        res.status(500).json({ error: error.message });
    }
};
