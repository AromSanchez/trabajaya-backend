const { Pool } = require('pg')

const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
})

async function test() {
  console.log('Conectando...')
  try {
    const res = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'Servicio'
      ORDER BY ordinal_position
    `)
    console.log('✅ Columnas de Servicio:')
    res.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type}`)
    })
    await pool.end()
  } catch (err) {
    console.error('❌ Error:', err.message)
    await pool.end()
  }
}

test()