const http = require('http');
const headers = require('./utils/corsHeaders');
const { initializeDatabase } = require('./db');
const handleImagenesRoutes = require('./routes/imagenesBack');
const handleStaticRoutes = require('./routes/static');
const handleLotesRoutes = require('./routes/lotes');

/**
 * Servidor HTTP principal de la aplicación.
 *
 * - Aplica encabezados CORS a todas las respuestas.
 * - Gestiona las rutas de imágenes, archivos estáticos y lotes.
 * - Maneja las solicitudes `OPTIONS` (preflight) devolviendo 204.
 * - Devuelve un error 404 en caso de rutas no encontradas.
 *
 * @function
 * @param {*} req - Objeto de la petición HTTP.
 * @param {*} res - Objeto de la respuesta HTTP.
 */
const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, headers);
    return res.end();
  }

  if (handleImagenesRoutes(req, res)) return;
  if (handleStaticRoutes(req, res)) return;
  if (handleLotesRoutes(req, res)) return;

  res.writeHead(404, headers);
  res.end(JSON.stringify({ error: 'Ruta no encontrada' }));
});

/**
 * Inicializa la base de datos y arranca el servidor HTTP.
 * El puerto se obtiene de la variable de entorno `PORT`
 * o, en su defecto, del valor por defecto `3000`.
 *
 * @async
 * @function
 */
initializeDatabase().then(() => {
  const PORT = process.env.PORT || 3000;
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor activo en http://localhost:${PORT}`);
  });
});
