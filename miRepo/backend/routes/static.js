const fs = require('fs');
const path = require('path');

/**
 * Maneja las rutas estáticas de la aplicación.
 *
 * Soporta las siguientes rutas:
 * - GET /              → Devuelve el archivo index.html
 * - GET /index.html    → Devuelve el archivo index.html
 * - GET /image-detail.html → Devuelve el archivo image-detail.html
 *
 * @param {*} req - Objeto de la petición HTTP
 * @param {*} res - Objeto de la respuesta HTTP
 * @returns {boolean} Indica si la ruta fue procesada (true) o no (false)
 */
function handleStaticRoutes(req, res) {
  // Ruta principal o index.html
  if (req.method === 'GET' && (req.url === '/' || req.url === '/index.html')) {
    const htmlPath = path.join(__dirname, '..', 'index.html');
    return sendFile(htmlPath, 'text/html', res);
  }

  // Página de detalle de imagen
  if (req.method === 'GET' && req.url.startsWith('/image-detail.html')) {
    const htmlPath = path.join(__dirname, '..', 'image-detail.html');
    return sendFile(htmlPath, 'text/html', res);
  }

  // Si no coincide con ninguna ruta estática
  return false;
}

/**
 * Envía un archivo estático al cliente.
 *
 * @param {string} filepath - Ruta absoluta del archivo a enviar
 * @param {string} contentType - Tipo de contenido (MIME type)
 * @param {ServerResponse} res - Objeto de la respuesta HTTP
 * @returns {boolean} Indica si la respuesta fue enviada correctamente
 */
function sendFile(filepath, contentType, res) {
  if (fs.existsSync(filepath)) {
    // Si el archivo existe, se lee y envía con el tipo de contenido adecuado
    const content = fs.readFileSync(filepath);
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
  } else {
    // Si el archivo no existe, devolver un error 404 en formato JSON
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Archivo no encontrado' }));
  }
  return true;
}

module.exports = handleStaticRoutes;
