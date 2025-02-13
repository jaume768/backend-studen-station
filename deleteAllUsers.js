// deleteAllUsers.js

// Cargar variables de entorno
require('dotenv').config();

// Importar Mongoose y el modelo de Usuario
const mongoose = require('mongoose');
const User = require('./models/User'); // Ajusta la ruta según la ubicación de tu modelo

// Conectar a MongoDB usando la URI almacenada en las variables de entorno
const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/tu_basededatos';

mongoose.connect(mongoURI)
    .then(async () => {
        console.log('Conectado a MongoDB');

        try {
            // Eliminar todos los usuarios
            const result = await User.deleteMany({});
            console.log(`Usuarios eliminados: ${result.deletedCount}`);
        } catch (error) {
            console.error('Error eliminando usuarios:', error);
        } finally {
            // Cerrar la conexión a la base de datos
            mongoose.connection.close(() => {
                console.log('Conexión a MongoDB cerrada');
                process.exit(0);
            });
        }
    })
    .catch(err => {
        console.error('Error conectando a MongoDB:', err);
        process.exit(1);
    });
