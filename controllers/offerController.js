const Offer = require('../models/Offer');
const EducationalOffer = require('../models/EducationalOffer');
const cloudinary = require('../config/cloudinary');
const streamifier = require('streamifier');

/**
 * Crear una nueva oferta.
 * Solo los usuarios con professionalType 1, 2 o 3 pueden crear ofertas de trabajo.
 */
exports.createOffer = async (req, res) => {
    try {
        const allowedTypes = [1, 2, 3, 5];
        if (!allowedTypes.includes(req.user.professionalType)) {
            return res.status(403).json({ 
                message: "No tienes permiso para crear ofertas de trabajo. Solo los profesionales de tipo 1, 2 o 3 pueden crear ofertas.",
                professionalType: req.user.professionalType 
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
            companyLogo,
            publicationDate: new Date()
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
 * Crear una nueva oferta educativa.
 * Solo los usuarios con professionalType 4 pueden crear ofertas educativas.
 */
exports.createEducationalOffer = async (req, res) => {
    try {
        if (req.user.professionalType !== 4) {
            return res.status(403).json({ 
                message: "No tienes permiso para crear ofertas educativas. Solo los profesionales de tipo 3 pueden crear ofertas educativas.",
                professionalType: req.user.professionalType 
            });
        }

        let images = [];
        if (req.files && req.files.length > 0) {
            try {
                for (const file of req.files) {
                    const result = await new Promise((resolve, reject) => {
                        const stream = cloudinary.uploader.upload_stream(
                            { folder: 'educational_offers' },
                            (error, result) => {
                                if (result) resolve(result);
                                else reject(error);
                            }
                        );
                        streamifier.createReadStream(file.buffer).pipe(stream);
                    });
                    images.push({
                        url: result.secure_url,
                        type: file.fieldname === 'banner' ? 'banner' : 'gallery'
                    });
                }
            } catch (uploadError) {
                console.error('Error al subir imágenes:', uploadError);
            }
        }

        let brochureUrl = null;
        if (req.files && req.files.brochure) {
            try {
                const result = await new Promise((resolve, reject) => {
                    const stream = cloudinary.uploader.upload_stream(
                        { 
                            folder: 'educational_offers/brochures',
                            resource_type: 'raw'
                        },
                        (error, result) => {
                            if (result) resolve(result);
                            else reject(error);
                        }
                    );
                    streamifier.createReadStream(req.files.brochure[0].buffer).pipe(stream);
                });
                brochureUrl = result.secure_url;
            } catch (uploadError) {
                console.error('Error al subir el folleto:', uploadError);
            }
        }

        const educationalOfferData = {
            programName: req.body.programName,
            studyType: req.body.studyType,
            knowledgeArea: req.body.knowledgeArea,
            modality: req.body.modality,
            duration: {
                value: req.body.durationValue,
                unit: req.body.durationUnit
            },
            startDate: new Date(req.body.startDate),
            endDate: req.body.endDate ? new Date(req.body.endDate) : undefined,
            location: req.body.modality !== 'Online' ? {
                city: req.body.city,
                country: req.body.country,
                address: req.body.address
            } : undefined,
            price: req.body.price ? {
                amount: req.body.price,
                currency: req.body.currency || 'EUR'
            } : undefined,
            requirements: req.body.requirements ? JSON.parse(req.body.requirements) : [],
            description: req.body.description,
            brochureUrl,
            images,
            socialLinks: {
                facebook: req.body.facebook,
                instagram: req.body.instagram,
                twitter: req.body.twitter,
                linkedin: req.body.linkedin,
                website: req.body.website
            },
            schedule: req.body.schedule,
            language: req.body.language,
            availableSeats: req.body.availableSeats,
            publisher: req.user.id,
            status: 'pending',
            publicationDate: new Date()
        };

        const newEducationalOffer = new EducationalOffer(educationalOfferData);
        await newEducationalOffer.save();
        
        res.status(201).json({ 
            message: "Oferta educativa creada", 
            educationalOffer: newEducationalOffer 
        });
    } catch (error) {
        console.error('Error en createEducationalOffer:', error);
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

/**
 * Obtener ofertas publicadas por el usuario autenticado
 */
exports.getUserOffers = async (req, res) => {
    try {
        const userId = req.user.id;
        console.log('Buscando ofertas para el usuario:', userId);
        
        // Buscar ofertas de trabajo donde el usuario es el publicador
        const offers = await Offer.find({ publisher: userId })
            .sort({ publicationDate: -1 })
            .lean();

        // Buscar ofertas educativas donde el usuario es el publicador
        const educationalOffers = await EducationalOffer.find({ publisher: userId })
            .sort({ publicationDate: -1 })
            .lean();
        
        // Combinar los dos tipos de ofertas y ordenar por fecha de publicación
        const allOffers = [...offers, ...educationalOffers].sort((a, b) => 
            new Date(b.publicationDate) - new Date(a.publicationDate)
        );
        
        return res.status(200).json({ 
            success: true, 
            offers: allOffers 
        });
    } catch (error) {
        console.error('Error al obtener ofertas del usuario:', error);
        return res.status(500).json({ 
            success: false, 
            message: 'Error al obtener las ofertas del usuario', 
            error: error.message 
        });
    }
};
