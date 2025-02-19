const User = require('../models/User');
const bcrypt = require('bcryptjs');
const passport = require('passport');
const cloudinary = require('../config/cloudinary');
const jwt = require('jsonwebtoken');

const SibApiV3Sdk = require('sib-api-v3-sdk');
const defaultClient = SibApiV3Sdk.ApiClient.instance;
defaultClient.authentications['api-key'].apiKey = process.env.BREVO_API_KEY;

const pendingRegistrations = {};
const pendingResetRequests = {};

const generateVerificationCode = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

const sendResetEmail = (email, resetCode) => {
    const tranEmailApi = new SibApiV3Sdk.TransactionalEmailsApi();
    const sender = { email: "tu-email@dominio.com", name: "Study" };
    const receivers = [{ email }];
    tranEmailApi.sendTransacEmail({
        sender,
        to: receivers,
        subject: "Restablece tu contraseña",
        htmlContent: `<p>Tu código para restablecer la contraseña es: <strong>${resetCode}</strong></p>`,
    })
        .then((data) => {
            console.log('Email de reset enviado:', data);
        })
        .catch((error) => {
            console.error('Error al enviar email de reset:', error);
        });
};

exports.forgotPassword = async (req, res) => {
    const { email } = req.body;
    if (!email) {
        return res.status(400).json({ error: "El email es requerido." });
    }
    const user = await User.findOne({ email });
    if (!user) {
        return res.status(400).json({ error: "No se encontró un usuario con ese email." });
    }
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    pendingResetRequests[email] = {
        code: resetCode,
        expires: Date.now() + 3600000
    };

    sendResetEmail(email, resetCode);
    return res.status(200).json({ message: "Email enviado con instrucciones para restablecer la contraseña." });
};

exports.verifyForgotCode = async (req, res) => {
    const { email, code } = req.body;
    if (!email || !code) {
        return res.status(400).json({ error: "Email y código son requeridos." });
    }
    const pending = pendingResetRequests[email];
    if (!pending) {
        return res.status(400).json({ error: "No hay solicitud pendiente para este email." });
    }
    if (pending.code !== code) {
        return res.status(400).json({ error: "Código incorrecto." });
    }
    if (pending.expires < Date.now()) {
        delete pendingResetRequests[email];
        return res.status(400).json({ error: "El código ha expirado." });
    }
    return res.status(200).json({ message: "Código verificado. Puedes restablecer tu contraseña." });
};

exports.resetPassword = async (req, res) => {
    const { email, code, newPassword } = req.body;
    if (!email || !code || !newPassword) {
        return res.status(400).json({ error: "Email, código y nueva contraseña son requeridos." });
    }
    const pending = pendingResetRequests[email];
    if (!pending) {
        return res.status(400).json({ error: "No hay solicitud pendiente para este email." });
    }
    if (pending.code !== code) {
        return res.status(400).json({ error: "Código incorrecto." });
    }
    if (pending.expires < Date.now()) {
        delete pendingResetRequests[email];
        return res.status(400).json({ error: "El código ha expirado." });
    }
    try {
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await User.findOneAndUpdate({ email }, { password: hashedPassword });
        delete pendingResetRequests[email];
        return res.status(200).json({ message: "Contraseña actualizada exitosamente." });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

const sendVerificationEmail = (email, verificationCode) => {
    const tranEmailApi = new SibApiV3Sdk.TransactionalEmailsApi();
    const sender = { email: "jaumefernandezsunyer12@gmail.com", name: "Study" };
    const receivers = [{ email }];
    tranEmailApi.sendTransacEmail({
        sender,
        to: receivers,
        subject: "Tu código de verificación",
        htmlContent: `<p>Tu código de verificación es: <strong>${verificationCode}</strong></p>`,
    })
        .then((data) => {
            console.log('Email enviado correctamente:', data);
        })
        .catch((error) => {
            console.error('Error al enviar email:', error);
        });
};

exports.sendVerificationCodePreRegistration = async (req, res) => {
    const { username, email, password, confirmPassword, acceptedTerms } = req.body;
    if (!username || !email || !password || !confirmPassword || !acceptedTerms) {
        return res.status(400).json({ error: "Completa todos los campos." });
    }
    if (password !== confirmPassword) {
        return res.status(400).json({ error: "Las contraseñas no coinciden." });
    }
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
        return res.status(400).json({ error: "El usuario ya existe." });
    }
    const verificationCode = generateVerificationCode();
    pendingRegistrations[email] = {
        data: req.body,
        code: verificationCode,
        expires: Date.now() + 3600000
    };

    sendVerificationEmail(email, verificationCode);

    return res.status(200).json({ message: "Código de verificación enviado." });
};

exports.verifyCodePreRegistration = async (req, res) => {
    const { email, code } = req.body;
    const pending = pendingRegistrations[email];
    if (!pending) {
        return res.status(400).json({ error: "No hay registro pendiente para este email." });
    }
    if (pending.code !== code) {
        return res.status(400).json({ error: "Código incorrecto." });
    }
    if (pending.expires < Date.now()) {
        delete pendingRegistrations[email];
        return res.status(400).json({ error: "El código ha expirado." });
    }
    const { username, email: regEmail, password, acceptedTerms, ...rest } = pending.data;
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({
        username,
        email: regEmail,
        password: hashedPassword,
        isVerified: true,
    });
    await newUser.save();
    delete pendingRegistrations[email];

    const token = jwt.sign({ id: newUser._id, email: newUser.email }, process.env.JWT_SECRET, { expiresIn: '7d' });
    return res.status(200).json({ message: "Usuario registrado exitosamente.", token, user: newUser });
};

exports.resendCodePreRegistration = async (req, res) => {
    const { email } = req.body;
    const pending = pendingRegistrations[email];
    if (!pending) {
        return res.status(400).json({ error: "No hay registro pendiente para este email." });
    }
    const newCode = generateVerificationCode();
    pendingRegistrations[email].code = newCode;
    pendingRegistrations[email].expires = Date.now() + 3600000;
    sendVerificationEmail(email, newCode);
    return res.status(200).json({ message: "Código reenviado exitosamente." });
};

exports.register = async (req, res) => {
    const {
        username,
        fullName,
        email,
        password,
        role,              // 'Creativo' o 'Profesional'
        dateOfBirth,
        country,
        city,
        referralSource,
        termsAccepted,
        // Campos específicos de Creativos
        creativeType,
        formationType,
        institution,
        creativeOther,
        brandName,
        // Campos específicos de Profesionales
        professionalType,
        companyName,
        foundingYear,
        productServiceType,
        sector,
        employeeRange,
        institutionName,
        institutionType,
        agencyName,
        agencyServices,
        website,
        // Datos opcionales adicionales
        portfolio,
        instagram,
        linkedin,
        googleId  // Opcional: si viene, es registro desde Google
    } = req.body;

    let profilePictureUrl = '';
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'La foto de perfil es obligatoria.' });
        }
        const result = await cloudinary.uploader.upload(req.file.path, { folder: 'profile_pictures' });
        profilePictureUrl = result.secure_url;

        // Verificar si el usuario ya existe
        const existingUser = await User.findOne({ $or: [{ email }, { username }] });
        if (existingUser) {
            return res.status(400).json({ message: 'El usuario ya existe.' });
        }

        let hashedPassword = '';
        if (password) {
            hashedPassword = await bcrypt.hash(password, 10);
        }

        // Si viene googleId, es un registro vía Google y se activa automáticamente.
        const isGoogleRegistration = googleId ? true : false;

        const newUser = new User({
            username,
            fullName,
            email,
            password: hashedPassword,
            googleId: googleId || undefined,
            role,
            dateOfBirth,
            country,
            city,
            referralSource,
            termsAccepted,
            // Datos específicos para Creativos
            creativeType,
            formationType,
            institution,
            creativeOther,
            brandName,
            // Datos específicos para Profesionales
            professionalType,
            companyName,
            foundingYear,
            productServiceType,
            sector,
            employeeRange,
            institutionName,
            institutionType,
            agencyName,
            agencyServices,
            website,
            profile: {
                profilePicture: profilePictureUrl,
                portfolio,
                socialLinks: {
                    instagram,
                    linkedin
                }
            },
            // Si es registro vía Google se marca como verificado
            isVerified: isGoogleRegistration ? true : false,
            isActive: true
        });

        await newUser.save();

        if (!newUser.isVerified) {
            // Generar un token de verificación (válido, por ejemplo, por 1 día)
            const verificationToken = jwt.sign({ id: newUser._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
            sendVerificationEmail(newUser.email, verificationToken);
            res.status(201).json({ message: 'Usuario registrado. Por favor verifica tu email.', user: newUser });
        } else {
            res.status(201).json({ message: 'Usuario registrado correctamente', user: newUser });
        }
    } catch (error) {
        console.log(error.message);
        res.status(500).json({ error: error.message });
    }
};

exports.login = (req, res, next) => {
    passport.authenticate('local', (err, user, info) => {
        if (err) { return next(err); }
        if (!user) {
            return res.status(400).json({ message: info.message });
        }
        // Verificar que la cuenta esté activa y verificada
        if (!user.isActive) return res.status(403).json({ message: 'Cuenta inactiva.' });
        if (!user.isVerified) return res.status(403).json({ message: 'Cuenta no verificada.' });

        // Generar un token JWT (válido, por ejemplo, por 1 día)
        const token = jwt.sign({ id: user._id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '7d' });
        return res.status(200).json({ message: 'Login exitoso', token, user });
    })(req, res, next);
};

exports.googleCallback = (req, res) => {
    const token = jwt.sign({ id: req.user._id, email: req.user.email }, process.env.JWT_SECRET, { expiresIn: '7d' });

    if (req.user.profileCompleted) {
        return res.redirect(`https://frontend-student-station-production.up.railway.app/ControlPanel?token=${token}`);
    } else {
        return res.redirect(`https://frontend-student-station-production.up.railway.app/complete-registration?token=${token}`);
    }
};

exports.logout = (req, res) => {
    req.logout();
    res.status(200).json({ message: 'Sesión cerrada' });
};
