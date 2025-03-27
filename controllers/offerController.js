const Offer = require('../models/Offer');
const EducationalOffer = require('../models/EducationalOffer');
const User = require('../models/User');
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
        // Verificación de permisos basada en el professionalType
        const allowedTypes = [4]; // Solo centros educativos (tipo 4) pueden crear ofertas educativas
        if (!allowedTypes.includes(req.user.professionalType)) {
            return res.status(403).json({ 
                message: "No tienes permiso para crear ofertas educativas. Solo los centros educativos pueden crear ofertas educativas.",
                professionalType: req.user.professionalType 
            });
        }

        // Validación de datos entrantes
        const requiredFields = ['institutionName', 'programName', 'educationType', 'city', 'country', 'modality', 'duration'];
        const missingFields = requiredFields.filter(field => !req.body[field]);
        
        if (missingFields.length > 0) {
            return res.status(400).json({
                message: "Faltan campos obligatorios",
                missingFields: missingFields
            });
        }

        // Validación de tipos de datos
        if (req.body.duration && (isNaN(req.body.duration) || parseInt(req.body.duration) <= 0)) {
            return res.status(400).json({
                message: "La duración debe ser un número positivo"
            });
        }

        if (req.body.credits && (isNaN(req.body.credits) || parseInt(req.body.credits) <= 0)) {
            return res.status(400).json({
                message: "Los créditos deben ser un número positivo"
            });
        }

        // Validación de URL
        if (req.body.websiteUrl && !/^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([\w .-]*)*\/?$/.test(req.body.websiteUrl)) {
            return res.status(400).json({
                message: "La URL del sitio web no es válida"
            });
        }

        // Función para convertir nombre de mes a número
        const monthNameToNumber = (monthName) => {
            const months = {
                "Enero": 1, "Febrero": 2, "Marzo": 3, "Abril": 4, "Mayo": 5, "Junio": 6,
                "Julio": 7, "Agosto": 8, "Septiembre": 9, "Octubre": 10, "Noviembre": 11, "Diciembre": 12
            };
            return months[monthName] || null;
        };

        // Procesamiento de imágenes
        let headerImageUrl = null;
        if (req.files && req.files.headerImage) {
            try {
                // Validación del tamaño y tipo de imagen
                const file = req.files.headerImage[0];
                const maxSize = 5 * 1024 * 1024; // 5MB
                const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
                
                if (file.size > maxSize) {
                    return res.status(400).json({
                        message: "La imagen es demasiado grande. Máximo 5MB permitido."
                    });
                }
                
                if (!allowedTypes.includes(file.mimetype)) {
                    return res.status(400).json({
                        message: "Tipo de archivo no permitido. Solo se aceptan JPG, PNG y GIF."
                    });
                }

                // Subir imagen a Cloudinary
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
                
                headerImageUrl = result.secure_url;
            } catch (uploadError) {
                console.error('Error al subir la imagen:', uploadError);
                return res.status(500).json({
                    message: "Error al procesar la imagen. Inténtalo de nuevo más tarde."
                });
            }
        }

        // Convertir nombres de meses a números
        let enrollmentStartMonth = null;
        if (req.body.enrollmentStartMonth) {
            enrollmentStartMonth = monthNameToNumber(req.body.enrollmentStartMonth);
            if (!enrollmentStartMonth) {
                return res.status(400).json({
                    message: "Mes de inicio de inscripción no válido"
                });
            }
        }

        let enrollmentEndMonth = null;
        if (req.body.enrollmentEndMonth) {
            enrollmentEndMonth = monthNameToNumber(req.body.enrollmentEndMonth);
            if (!enrollmentEndMonth) {
                return res.status(400).json({
                    message: "Mes de fin de inscripción no válido"
                });
            }
        }

        let schoolYearStartMonth = null;
        if (req.body.schoolYearStartMonth) {
            schoolYearStartMonth = monthNameToNumber(req.body.schoolYearStartMonth);
            if (!schoolYearStartMonth) {
                return res.status(400).json({
                    message: "Mes de inicio del año escolar no válido"
                });
            }
        }

        let schoolYearEndMonth = null;
        if (req.body.schoolYearEndMonth) {
            schoolYearEndMonth = monthNameToNumber(req.body.schoolYearEndMonth);
            if (!schoolYearEndMonth) {
                return res.status(400).json({
                    message: "Mes de fin del año escolar no válido"
                });
            }
        }

        // Construcción de los datos para guardar en la base de datos
        const educationalOfferData = {
            institutionName: req.body.institutionName,
            programName: req.body.programName,
            educationType: req.body.educationType,
            modality: req.body.modality,
            morningSchedule: req.body.morningSchedule === 'true',
            duration: req.body.duration,
            credits: req.body.credits || undefined,
            internships: req.body.internships === 'true',
            erasmus: req.body.erasmus === 'true',
            bilingualEducation: req.body.bilingualEducation === 'true',
            location: {
                city: req.body.city,
                country: req.body.country
            },
            enrollmentPeriod: {
                startDate: req.body.enrollmentStartDate ? {
                    day: parseInt(req.body.enrollmentStartDate),
                    month: enrollmentStartMonth
                } : undefined,
                endDate: req.body.enrollmentEndDate ? {
                    day: parseInt(req.body.enrollmentEndDate),
                    month: enrollmentEndMonth
                } : undefined
            },
            schoolYear: {
                startMonth: schoolYearStartMonth,
                endMonth: schoolYearEndMonth
            },
            websiteUrl: req.body.websiteUrl || undefined,
            description: req.body.description || undefined,
            headerImage: headerImageUrl,
            requirements: req.body.requirements ? JSON.parse(req.body.requirements) : [],
            publisher: req.user.id,
            status: 'pending',
            publicationDate: new Date()
        };

        // Limpieza de datos: eliminar campos undefined o null
        for (const key in educationalOfferData) {
            if (educationalOfferData[key] === undefined || educationalOfferData[key] === null) {
                delete educationalOfferData[key];
            } else if (typeof educationalOfferData[key] === 'object' && !Array.isArray(educationalOfferData[key])) {
                // Limpiar objetos anidados
                for (const nestedKey in educationalOfferData[key]) {
                    if (educationalOfferData[key][nestedKey] === undefined || educationalOfferData[key][nestedKey] === null) {
                        delete educationalOfferData[key][nestedKey];
                    }
                }
                // Si el objeto queda vacío, eliminarlo
                if (Object.keys(educationalOfferData[key]).length === 0) {
                    delete educationalOfferData[key];
                }
            }
        }

        const newEducationalOffer = new EducationalOffer(educationalOfferData);
        
        try {
            await newEducationalOffer.save();
        } catch (validationError) {
            console.error('Error de validación:', validationError);
            // Manejar errores de validación específicos de Mongoose
            if (validationError.name === 'ValidationError') {
                const errors = {};
                for (const field in validationError.errors) {
                    errors[field] = validationError.errors[field].message;
                }
                return res.status(400).json({
                    message: "Error de validación",
                    errors
                });
            }
            throw validationError;
        }
        
        res.status(201).json({ 
            message: "Oferta educativa creada con éxito", 
            educationalOffer: newEducationalOffer 
        });
    } catch (error) {
        console.error('Error en createEducationalOffer:', error);
        res.status(500).json({ 
            message: "Error al crear la oferta educativa",
            error: process.env.NODE_ENV === 'development' ? error.message : "Error interno del servidor"
        });
    }
};

/**
 * Obtener los detalles de una oferta por su ID.
 */
exports.getOffer = async (req, res) => {
    try {
        const offer = await Offer.findById(req.params.id).populate('publisher', 'fullName companyName username');
        if (!offer) {
            return res.status(404).json({ message: "Oferta no encontrada." });
        }
        res.status(200).json({ offer });
    } catch (error) {
        console.error('Error en getOffer:', error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * Obtener los detalles de una oferta educativa por su ID.
 */
exports.getEducationalOffer = async (req, res) => {
    try {
        const offer = await EducationalOffer.findById(req.params.id).populate('publisher', 'fullName companyName username');
        if (!offer) {
            return res.status(404).json({ message: "Oferta educativa no encontrada." });
        }
        res.status(200).json({ offer });
    } catch (error) {
        console.error('Error en getEducationalOffer:', error);
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
        const user = await User.findById(userId);
        
        const offers = await Offer.find({ 
            companyName: user.companyName
        }).sort({ publicationDate: -1 });
        
        const educationalOffers = await EducationalOffer.find({ 
            institutionName: user.companyName
        }).sort({ publicationDate: -1 });
        
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

exports.getUserOffersByUsername = async (req, res) => {
    try {
        const { username } = req.params;
        
        const user = await User.findOne({ username });
        
        const offers = await Offer.find({ 
            companyName: user.companyName,
            status: "accepted"
        }).sort({ publicationDate: -1 });
    
        return res.status(200).json({ 
            success: true, 
            offers: offers 
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

/**
 * Obtener ofertas educativas publicadas por el usuario autenticado
 */
exports.getUserEducationalOffers = async (req, res) => {
    try {
        const userId = req.user.id;
        
        // Buscar ofertas educativas donde el usuario es el publicador
        const educationalOffers = await EducationalOffer.find({ publisher: userId })
            .lean();
        
        return res.status(200).json({ 
            success: true, 
            offers: educationalOffers 
        });
    } catch (error) {
        console.error('Error al obtener ofertas educativas del usuario:', error);
        return res.status(500).json({ 
            success: false, 
            message: 'Error al obtener las ofertas educativas del usuario', 
            error: error.message 
        });
    }
};

/**
 * Obtener todas las ofertas educativas.
 */
exports.getAllEducationalOffers = async (req, res) => {
    try {
        const { status = 'all' } = req.query;
        
        // Construir la consulta según el estado solicitado
        let query = {};
        if (status !== 'all') {
            query.status = status;
        }
        
        // Buscar todas las ofertas educativas que coincidan con la consulta
        const offers = await EducationalOffer.find(query)
            .sort({ publicationDate: -1 })
            .populate('publisher', 'username fullName companyName profilePicture')
            .lean();

        res.status(200).json({
            success: true,
            offers
        });
    } catch (error) {
        console.error('Error al obtener las ofertas educativas:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener las ofertas educativas',
            error: error.message
        });
    }
};

/**
 * Obtener todas las ofertas educativas agrupadas por institución
 */
exports.getEducationalOffersByInstitution = async (req, res) => {
    try {
        // Obtener todas las ofertas educativas (incluyendo pending)
        const offers = await EducationalOffer.find({ status: "accepted" })
            .populate({
                path: 'publisher',
                select: 'username companyName profile professionalType city country'
            })
            .sort({ publicationDate: -1 });
        
        // Agrupar por institución
        const institutionsMap = new Map();
        
        offers.forEach(offer => {
            if (!offer.publisher) return; // Ignorar ofertas sin publisher
            
            const institutionId = offer.publisher._id.toString();
            
            if (!institutionsMap.has(institutionId)) {
                institutionsMap.set(institutionId, {
                    _id: institutionId,
                    name: offer.publisher.companyName || offer.institutionName,
                    username: offer.publisher.username,
                    logo: offer.publisher.profile?.profilePicture || null,
                    location: {
                        city: offer.publisher.city || offer.location?.city || 'No especificada',
                        country: offer.publisher.country || offer.location?.country || 'No especificado'
                    },
                    type: offer.publisher.professionalType === 4 ? 'public' : 'private',
                    programs: []
                });
            }
            
            // Agregar programa a la institución
            institutionsMap.get(institutionId).programs.push({
                _id: offer._id,
                programName: offer.programName,
                educationType: offer.educationType,
                modality: offer.modality,
                duration: offer.duration,
                description: offer.description,
                internships: offer.internships,
                erasmus: offer.erasmus,
                bilingualEducation: offer.bilingualEducation,
                headerImage: offer.headerImage,
                status: offer.status
            });
        });
        
        // Convertir el Map a un array
        const institutions = Array.from(institutionsMap.values());
        
        return res.status(200).json({
            success: true,
            institutions: institutions
        });
    } catch (error) {
        console.error('Error al obtener ofertas educativas por institución:', error);
        return res.status(500).json({
            success: false,
            message: 'Error al obtener las ofertas educativas por institución',
            error: error.message
        });
    }
};

/**
 * Obtener ofertas educativas publicadas por un usuario específico
 */
exports.getEducationalOffersByUser = async (req, res) => {
    try {
        const { username } = req.params;
        
        // Buscar el usuario por su nombre de usuario
        const user = await User.findOne({ username });
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "Usuario no encontrado"
            });
        }

        // Verificar si el usuario es una institución educativa (tipo 4)
        if (user.professionalType !== 4) {
            return res.status(200).json({
                success: true,
                offers: []
            });
        }
        const offers = await EducationalOffer.find({ institutionName: user.companyName })
            .sort({ publicationDate: -1 });
        
        return res.status(200).json({
            success: true,
            offers: offers
        });
    } catch (error) {
        console.error('Error al obtener ofertas educativas por usuario:', error);
        return res.status(500).json({
            success: false,
            message: 'Error al obtener las ofertas educativas del usuario',
            error: error.message
        });
    }
};


/**
 * Obtener ofertas educativas publicadas por un usuario externo
 */
exports.getEducationalOffersByUserExternal = async (req, res) => {
    try {
        const { username } = req.params;
        
        // Buscar el usuario por su nombre de usuario
        const user = await User.findOne({ username });
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "Usuario no encontrado"
            });
        }

        // Verificar si el usuario es una institución educativa (tipo 4)
        if (user.professionalType !== 4) {
            return res.status(200).json({
                success: true,
                offers: []
            });
        }
        const offers = await EducationalOffer.find({ institutionName: user.companyName, status: "accepted" })
            .sort({ publicationDate: -1 });
        
        return res.status(200).json({
            success: true,
            offers: offers
        });
    } catch (error) {
        console.error('Error al obtener ofertas educativas por usuario:', error);
        return res.status(500).json({
            success: false,
            message: 'Error al obtener las ofertas educativas del usuario',
            error: error.message
        });
    }
};
