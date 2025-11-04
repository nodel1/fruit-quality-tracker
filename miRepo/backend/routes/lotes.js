const { pool } = require('../db');
const headers = require('../utils/corsHeaders');

/**
 * Maneja las rutas relacionadas con la entidad "lote".
 *
 * Soporta las siguientes operaciones:
 * - POST   /api/lote        → Crear un nuevo lote
 * - GET    /api/lote        → Listar todos los lotes
 * - GET    /api/lote/:id    → Obtener un lote por su ID
 * - PUT    /api/lote/:id    → Modificar un lote existente
 * - DELETE /api/lote/:id    → Eliminar un lote
 *
 * @param {*} req - Objeto de la petición HTTP
 * @param {*} res - Objeto de la respuesta HTTP
 * @returns {boolean} Indica si la ruta fue procesada (true) o no (false)
 */
function handleloteRoutes(req, res) {
  // Crear un nuevo lote
  if (req.method === 'POST' && req.url === '/api/lote') {
    let body = '';

    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const { nombre, especie, variedad } = JSON.parse(body);

        // Validación de campos obligatorios
        if (!nombre || !especie || !variedad) {
          res.writeHead(400, headers);
          return res.end(JSON.stringify({
            error: 'Nombre, especie y variedad son obligatorios',
            campos_faltantes: {
              nombre: !nombre,
              especie: !especie,
              variedad: !variedad
            }
          }));
        }

        // Generar un ID único basado en timestamp + aleatorio
        const uniqueSuffix = `${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        const id = `${nombre}-${uniqueSuffix}`;

        // Verificar si el ID ya existe en la base de datos
        const existe = await pool.query(
          'SELECT 1 FROM lote WHERE id = $1',
          [id]
        );

        if (existe.rows.length > 0) {
          res.writeHead(409, headers);
          return res.end(JSON.stringify({
            error: 'Ya existe un lote con este ID',
            id_conflicto: id
          }));
        }

        // Insertar el nuevo lote en la base de datos
        const result = await pool.query(
          'INSERT INTO lote (id, nombre, especie, variedad) VALUES ($1, $2, $3, $4) RETURNING *',
          [id, nombre, especie, variedad]
        );

        res.writeHead(201, headers);
        res.end(JSON.stringify({
          message: 'Lote creado correctamente',
          id: id,
          lote: result.rows[0]
        }));
      } catch (e) {
        console.error('❌ Error en la creación del lote:', e);
        res.writeHead(500, headers);
        res.end(JSON.stringify({
          error: 'Error interno al crear el lote',
          details: process.env.NODE_ENV === 'development' ? e.message : undefined
        }));
      }
    });
    return true;
  }

  // Listar todos los lotes
  if (req.method === 'GET' && (req.url === '/api/lote' || req.url === '/api/lote/')) {
    pool.query('SELECT id, nombre, especie, variedad FROM lote')
      .then(result => {
        res.writeHead(200, headers);
        res.end(JSON.stringify(result.rows));
      })
      .catch(err => {
        console.error('❌ Error listando lotes:', err);
        res.writeHead(500, headers);
        res.end(JSON.stringify({ error: 'Error en la base de datos' }));
      });
    return true;
  }

  // Obtener un lote por ID
  if (req.method === 'GET' && req.url.startsWith('/api/lote/')) {
    const id = req.url.split('/')[3];
    pool.query('SELECT id, nombre, especie, variedad FROM lote WHERE id = $1', [id])
      .then(result => {
        if (result.rows.length === 0) {
          res.writeHead(404, headers);
          res.end(JSON.stringify({ error: 'Lote no encontrado' }));
        } else {
          res.writeHead(200, headers);
          res.end(JSON.stringify(result.rows[0]));
        }
      })
      .catch(err => {
        console.error('❌ Error obteniendo lote:', err);
        res.writeHead(500, headers);
        res.end(JSON.stringify({ error: 'Error en la base de datos' }));
      });
    return true;
  }

  // Eliminar un lote por ID
  if (req.method === 'DELETE' && req.url.startsWith('/api/lote/')) {
    const id = req.url.split('/')[3];

    pool.query('DELETE FROM lote WHERE id = $1 RETURNING *', [id])
      .then(result => {
        if (result.rowCount === 0) {
          res.writeHead(404, headers);
          res.end(JSON.stringify({ error: 'Lote no encontrado' }));
        } else {
          res.writeHead(200, headers);
          res.end(JSON.stringify({ message: 'Lote eliminado correctamente' }));
        }
      })
      .catch(err => {
        res.writeHead(500, headers);
        res.end(JSON.stringify({ error: 'Error al eliminar el lote' }));
      });
    return true;
  }

  // Modificar un lote existente
  if (req.method === 'PUT' && req.url.startsWith('/api/lote/')) {
    const id = req.url.split('/')[3];
    let body = '';

    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const { nombre, especie, variedad } = JSON.parse(body);

        // Validación de campos obligatorios
        if (!nombre || !especie || !variedad) {
          res.writeHead(400, headers);
          return res.end(JSON.stringify({
            error: 'Nombre, especie y variedad son obligatorios',
            campos_faltantes: {
              nombre: !nombre,
              especie: !especie,
              variedad: !variedad
            }
          }));
        }

        // Verificar si el lote existe antes de actualizar
        const existe = await pool.query(
          'SELECT 1 FROM lote WHERE id = $1',
          [id]
        );

        if (existe.rows.length === 0) {
          res.writeHead(404, headers);
          return res.end(JSON.stringify({ error: 'Lote no encontrado' }));
        }

        // Actualizar los datos del lote
        const result = await pool.query(
          'UPDATE lote SET nombre = $1, especie = $2, variedad = $3 WHERE id = $4 RETURNING *',
          [nombre, especie, variedad, id]
        );

        res.writeHead(200, headers);
        res.end(JSON.stringify({
          message: 'Lote modificado correctamente',
          lote: result.rows[0]
        }));
      } catch (e) {
        console.error('❌ Error en la modificación del lote:', e);
        res.writeHead(500, headers);
        res.end(JSON.stringify({
          error: 'Error interno al modificar el lote',
          details: process.env.NODE_ENV === 'development' ? e.message : undefined
        }));
      }
    });
    return true;
  }

  // Si ninguna ruta coincide, devolver false
  return false;
}

module.exports = handleloteRoutes;
