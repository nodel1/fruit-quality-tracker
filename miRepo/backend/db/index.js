const { Pool } = require('pg');

/**
 * Módulo de conexión y gestión de la base de datos PostgreSQL.
 *
 * Este módulo inicializa un pool de conexiones a PostgreSQL usando las variables
 * de entorno definidas (DB_USER, DB_HOST, DB_NAME, DB_PASSWORD, DB_PORT).
 * También exporta una función para inicializar la base de datos, creando las tablas
 * necesarias si no existen.
 */

const pool = new Pool({
  user: process.env.DB_USER,     // Usuario de la base de datos
  host: process.env.DB_HOST,     // Host del servidor PostgreSQL
  database: process.env.DB_NAME, // Nombre de la base de datos
  password: process.env.DB_PASSWORD, // Contraseña del usuario
  port: process.env.DB_PORT,     // Puerto de conexión
});

/**
 * Inicializa la base de datos verificando la conexión y creando
 * las tablas necesarias si no existen:
 *
 * - `lote`: tabla que representa un lote de fruta.
 * - `pallet`: tabla que almacena pallets asociados a un lote,
 *    incluyendo una imagen en formato binario (BYTEA).
 *
 * @async
 * @function initializeDatabase
 * @returns {Promise<void>} No retorna nada, pero genera las tablas si no existen.
 * @throws {Error} Lanza un error si la conexión o la creación de tablas falla.
 */
async function initializeDatabase() {
  try {
    await pool.query('SELECT 1'); // Prueba de conexión rápida

    // Crear tabla lote
    await pool.query(`
      CREATE TABLE IF NOT EXISTS lote (
        id VARCHAR(100) PRIMARY KEY,
        nombre VARCHAR(100) NOT NULL,
        especie VARCHAR(100) NOT NULL,
        variedad VARCHAR(100) NOT NULL
      );
    `);

    // Crear tabla pallet con referencia a lote
    await pool.query(`
      CREATE TABLE IF NOT EXISTS pallet (
        id SERIAL PRIMARY KEY,
        nombre VARCHAR(255) NOT NULL,
        imagen BYTEA NOT NULL,
        lote_id VARCHAR(100) NOT NULL REFERENCES lote(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('✅ Tablas verificadas/creadas correctamente');

  } catch (err) {
    console.error('❌ Error con PostgreSQL:', err.message);
    process.exit(1);
  }
}

module.exports = { pool, initializeDatabase };
