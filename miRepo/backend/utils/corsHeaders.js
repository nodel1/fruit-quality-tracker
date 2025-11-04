/**
 * Encabezados HTTP comunes utilizados para configurar CORS (Cross-Origin Resource Sharing)
 * y el tipo de contenido de las respuestas JSON.
 *
 * ⚠️ Notas importantes:
 * - `Access-Control-Allow-Origin`: actualmente configurado como `*` (todos los orígenes).
 *   Se recomienda sustituirlo por el dominio real de producción para mayor seguridad.
 * - `Access-Control-Allow-Headers`: incluye `ngrok-skip-browser-warning` solo para pruebas
 *   con Ngrok. Este valor debe eliminarse en entornos de producción.
 * - `Content-Type`: definido como `application/json` para indicar que la API devuelve datos JSON.
 *
 * @module corsHeaders
 * @type {Object.<string, string>}
 */
module.exports = {
  'Access-Control-Allow-Origin': '*', // ⚠️ Sustituir por el dominio correspondiente en producción
  'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS, DELETE',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, ngrok-skip-browser-warning', // ⚠️ Solo para pruebas con Ngrok
  'Content-Type': 'application/json',
};
