const fs = require('fs');
const path = require('path');
const formidable = require('formidable');
const { pool } = require('../db');
const headers = require('../utils/corsHeaders');

/**
 * Módulo que maneja las rutas de subida, obtención y eliminación de imágenes.
 *
 * Funcionalidades:
 * - Subida de una sola imagen (`POST /api/upload`)
 * - Subida de múltiples imágenes (`POST /api/upload-multiple`)
 * - Obtener imágenes por lote (`GET /api/imagenes?lote_id=...`)
 * - Obtener imagen individual por ID (`GET /api/imagenes/:id`)
 * - Eliminar imagen por ID (`DELETE /api/imagenes/:id`)
 */

const uploadDir = path.join(__dirname, '..', 'uploads');
// Asegura que el directorio de subida exista
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

/**
 * Maneja todas las rutas relacionadas con la gestión de imágenes.
 *
 * Rutas soportadas:
 * - `OPTIONS`: Respuestas preflight de CORS.
 * - `POST /api/upload`: Subida de una sola imagen.
 * - `POST /api/upload-multiple`: Subida de múltiples imágenes asociadas a un lote.
 * - `GET /api/imagenes?lote_id=...`: Devuelve todas las imágenes de un lote en base64.
 * - `GET /api/imagenes/:id`: Devuelve la imagen binaria original por su ID.
 * - `DELETE /api/imagenes/:id`: Elimina una imagen por su ID.
 *
 * @param {*} req - Objeto de la petición HTTP
 * @param {*} res - Objeto de la respuesta HTTP
 * @returns {boolean} True si la ruta fue procesada, false en caso contrario.
 */
function handleImagenesRoutes(req, res) {
  // --- Manejo de CORS (preflight) ---
  if (req.method === 'OPTIONS') {
    res.writeHead(204, headers);
    res.end();
    return true;
  }

  // --- Subida de una sola imagen ---
  if (req.method === 'POST' && req.url === '/api/upload') {
    const form = new formidable.IncomingForm({
      uploadDir,
      keepExtensions: true,
      maxFileSize: 5 * 1024 * 1024 // Límite de 5 MB
    });

    form.parse(req, async (err, fields, files) => {
      const file = files.imagen?.[0];

      if (err || !file) {
        res.writeHead(400, headers);
        return res.end(JSON.stringify({ error: 'Error procesando archivo' }));
      }

      // Generar nombre único para la imagen
      const ext = path.extname(file.originalFilename || '');
      const base = "img";
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(2, 6);
      const nombre = `${base}-${timestamp}-${random}${ext}`;

      try {
        const buffer = fs.readFileSync(file.filepath);
        await pool.query(
          'INSERT INTO pallet (nombre, imagen, lote_id) VALUES ($1, $2, $3)',
          [nombre, buffer, "uvas-1752667444299-599"] // TODO: hacer dinámico el lote_id
        );
        res.writeHead(200, headers);
        res.end(JSON.stringify({ message: 'Imagen subida con éxito', nombre }));
      } catch (e) {
        res.writeHead(500, headers);
        res.end(JSON.stringify({ error: 'Error en la base de datos' }));
      } finally {
        fs.unlink(file.filepath, () => {}); // Eliminar archivo temporal
      }
    });
    return true;
  }

  // --- Subida de múltiples imágenes ---
  if (req.method === 'POST' && req.url === '/api/upload-multiple') {
    const form = new formidable.IncomingForm({
      uploadDir,
      keepExtensions: true,
      maxFileSize: 5 * 1024 * 1024,
      multiples: true // Permitir múltiples archivos
    });

    form.parse(req, async (err, fields, files) => {
      if (err) {
        res.writeHead(400, headers);
        return res.end(JSON.stringify({ error: 'Error procesando archivos' }));
      }

      // Normalizar lista de imágenes
      let imageFiles = [];
      if (files.imagenes) {
        imageFiles = Array.isArray(files.imagenes) ? files.imagenes : [files.imagenes];
      }

      if (imageFiles.length === 0) {
        res.writeHead(400, headers);
        return res.end(JSON.stringify({ error: 'No se encontraron imágenes' }));
      }

      const results = [];
      const errors = [];

      for (const file of imageFiles) {
        try {
          const ext = path.extname(file.originalFilename || '');
          const base = "img";
          const timestamp = Date.now();
          const random = Math.random().toString(36).substring(2, 6);
          const nombre = `${base}-${timestamp}-${random}${ext}`;

          const buffer = fs.readFileSync(file.filepath);
          const loteIdRaw = fields.lote_id;

          if (!loteIdRaw) {
            res.writeHead(400, headers);
            return res.end(JSON.stringify({ error: 'Falta el campo lote_id en el formulario' }));
          }

          const loteId = Array.isArray(loteIdRaw) ? loteIdRaw[0] : loteIdRaw;

          await pool.query(
            'INSERT INTO pallet (nombre, imagen, lote_id) VALUES ($1, $2, $3)',
            [nombre, buffer, loteId]
          );

          results.push({
            nombre: nombre,
            originalName: file.originalFilename,
            status: 'success'
          });

          fs.unlink(file.filepath, () => {});
        } catch (error) {
          errors.push({
            originalName: file.originalFilename,
            error: error.message || 'Error procesando la imagen'
          });
        }

        // Asegurar limpieza de archivo temporal
        fs.unlink(file.filepath, () => {});
      }

      // Respuesta final
      if (errors.length === 0) {
        res.writeHead(200, headers);
        res.end(JSON.stringify({
          message: `${results.length} imágenes subidas correctamente`,
          results: results,
          success: true
        }));
      } else if (results.length > 0) {
        res.writeHead(207, headers); // Multi-Status
        res.end(JSON.stringify({
          message: `${results.length} imágenes subidas, ${errors.length} fallidas`,
          results: results,
          errors: errors,
          success: false
        }));
      } else {
        res.writeHead(500, headers);
        res.end(JSON.stringify({
          error: 'Falló la subida de todas las imágenes',
          errors: errors,
          success: false
        }));
      }
    });
    return true;
  }

  // --- Obtener imágenes ---
  if (req.method === 'GET' && req.url.startsWith('/api/imagenes')) {
    (async () => {
      const urlObj = new URL(req.url, `http://${req.headers.host}`);
      const pathname = urlObj.pathname;
      const loteId = urlObj.searchParams.get('lote_id');

      // Caso: GET /api/imagenes?lote_id=...
      if (pathname === '/api/imagenes' && loteId) {
        try {
          const result = await pool.query(
            'SELECT id, nombre, imagen FROM pallet WHERE lote_id = $1 ORDER BY id DESC',
            [loteId]
          );

          const images = result.rows.map(row => ({
            id: row.id,
            nombre: row.nombre,
            imagen: row.imagen.toString('base64') // devolver como base64
          }));

          res.writeHead(200, headers);
          res.end(JSON.stringify({ success: true, images }));
        } catch (error) {
          res.writeHead(500, headers);
          res.end(JSON.stringify({ error: 'Error al recuperar imágenes', success: false }));
        }
        return;
      }

      // Caso: GET /api/imagenes/:id
      const parts = pathname.split('/');
      const idStr = parts[parts.length - 1];
      const imageId = parseInt(idStr, 10);

      if (isNaN(imageId)) {
        res.writeHead(400, headers);
        res.end(JSON.stringify({ error: 'ID inválido', success: false }));
        return;
      }

      try {
        const result = await pool.query(
          'SELECT imagen, nombre FROM pallet WHERE id = $1',
          [imageId]
        );

        if (result.rows.length === 0) {
          res.writeHead(404, headers);
          res.end(JSON.stringify({ error: 'Imagen no encontrada', success: false }));
        } else {
          res.writeHead(200, {
            'Content-Type': 'image/jpeg',
            'Cache-Control': 'public, max-age=31536000',
            'Content-Disposition': `inline; filename="${result.rows[0].nombre}"`
          });
          res.end(result.rows[0].imagen);
        }
      } catch (error) {
        res.writeHead(500, headers);
        res.end(JSON.stringify({ error: 'Error en la base de datos', success: false }));
      }
    })();

    return true;
  }

  // --- Eliminar imagen ---
  if (req.method === 'DELETE' && req.url.startsWith('/api/imagenes/')) {
    const id = parseInt(req.url.split('/').pop(), 10);
    if (isNaN(id)) {
      res.writeHead(400, headers);
      res.end(JSON.stringify({ error: 'ID inválido' }));
      return true;
    }

    pool.query('DELETE FROM pallet WHERE id = $1', [id])
      .then(result => {
        if (result.rowCount === 0) {
          res.writeHead(404, headers);
          res.end(JSON.stringify({ error: 'Imagen no encontrada' }));
        } else {
          res.writeHead(204, headers);
          res.end();
        }
      })
      .catch(err => {
        res.writeHead(500, headers);
        res.end(JSON.stringify({ error: 'Error en la base de datos' }));
      });

    return true;
  }

  return false; // Ruta no manejada
}

module.exports = handleImagenesRoutes;
