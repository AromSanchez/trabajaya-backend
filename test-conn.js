const { Pool } = require('pg')

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
})

async function test() {
  console.log('Conectando...')
  try {
    const res = await pool.query('SELECT NOW()')
    console.log('✅ Conexión exitosa:', res.rows[0])
    await pool.end()
  } catch (err) {
    console.error('❌ Error:', err.message)
    await pool.end()
  }
}

test()