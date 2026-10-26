const { Pool } = require('pg')

const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
})

async function test() {
  console.log('Conectando...')
  try {
    const res = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `)
    console.log('✅ Tablas encontradas:', res.rows.length)
    res.rows.forEach(row => {
      console.log('  -', row.table_name)
    })
    await pool.end()
  } catch (err) {
    console.error('❌ Error:', err.message)
    await pool.end()
  }
}

test()