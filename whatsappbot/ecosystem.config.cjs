module.exports = {
  apps: [
    {
      name: 'whatsapp-bot',
      script: './dist/app.js',
      // Opciones para facilitar la gestión
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      // Variables de entorno para el bot
      env: {
        NODE_ENV: 'production',
        // Puerto en el que correrá el bot
        PORT: 3008,
        // URI de conexión a tu base de datos MongoDB
        MONGO_DB_URI: 'mongodb://localhost:27017',
        // Nombre de la base de datos que usará el bot
        MONGO_DB_NAME: 'whatsapp-bot-db',
      },
    },
  ],
};
