const { PrismaClient } = require('@prisma/client')
const { PrismaPg } = require('@prisma/adapter-pg')
const { Pool } = require('pg')

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function test() {
  console.log('Conectando con Prisma...')
  try {
    // Query simple para probar
    const result = await prisma.$queryRaw`SELECT 1 as test`
    console.log('✅ Prisma funciona:', result)
  } catch (err) {
    console.error('❌ Error Prisma:', err.message)
  } finally {
    await pool.end()
  }
}

test()