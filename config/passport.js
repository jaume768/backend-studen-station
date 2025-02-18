const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');
const bcrypt = require('bcryptjs');

passport.use(new LocalStrategy(
    { usernameField: 'email', passReqToCallback: true },
    async (req, email, password, done) => {
        try {
            const user = await User.findOne({ $or: [{ email }, { username: email }] });
            if (!user) {
                return done(null, false, { message: 'Usuario no encontrado' });
            }
            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) {
                return done(null, false, { message: 'Contraseña incorrecta' });
            }
            return done(null, user);
        } catch (error) {
            return done(error);
        }
    }
));

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL,
},
    async (accessToken, refreshToken, profile, done) => {
        try {
            let user = await User.findOne({ email: profile.emails[0].value });
            if (user) {
                if (!user.googleId) {
                    user.googleId = profile.id;
                    user.isVerified = true;
                    await user.save();
                }
            } else {
                user = new User({
                    googleId: profile.id,
                    email: profile.emails[0].value,
                    username: profile.displayName,
                    profile: {
                        profilePicture: profile.photos && profile.photos.length > 0 ? profile.photos[0].value : ''
                    },
                    isVerified: true,
                    profileCompleted: false
                });
                await user.save();
            }
            return done(null, user);
        } catch (error) {
            return done(error);
        }
    }
));

passport.serializeUser((user, done) => {
    done(null, user.id);
});
passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (error) {
        done(error, null);
    }
});

module.exports = passport;
