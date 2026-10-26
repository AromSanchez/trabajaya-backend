const { Pool } = require('pg')
const { faker } = require('@faker-js/faker')

const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
})

async function main() {
  console.log('🌱 Seeding new services, reports, and transactions on Render...')

  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL is not set')
    process.exit(1)
  }

  // Ensure connection
  await pool.connect()
  console.log('✅ Connected to database')

  // Get existing verified técnicos
  const tecnicosResult = await pool.query(`
    SELECT t.id, t."usuarioId" 
    FROM "Tecnico" t
    JOIN "Usuario" u ON t."usuarioId" = u.id
    WHERE u.rol = 'tecnico'
  `)
  const tecnicos = tecnicosResult.rows
  console.log(`📋 Found ${tecnicos.length} técnicos`)

  // Get existing clientes (rol = cliente en Usuario, no hay tabla Cliente separada)
  const clientesResult = await pool.query(`
    SELECT id 
    FROM "Usuario" 
    WHERE rol = 'cliente'
  `)
  const clientes = clientesResult.rows
  console.log(`📋 Found ${clientes.length} clientes`)

  // Get oficios (es un enum, no tabla - usamos valores existentes de técnicos)
  const oficiosResult = await pool.query(`
    SELECT DISTINCT oficio FROM "Tecnico" WHERE oficio IS NOT NULL
  `)
  const oficios = oficiosResult.rows.map(row => row.oficio)
  
  // Si no hay oficios, usamos valores por defecto
  if (oficios.length === 0) {
    oficios.push('electricidad', 'gasfiteria', 'carpinteria', 'albanileria', 'pintura')
  }
  console.log(`📋 Found ${oficios.length} oficios:`, oficios)

  if (tecnicos.length === 0 || clientes.length === 0) {
    console.warn('⚠️ No técnicos or clientes found. Seed requires existing users.')
    return
  }

  // Estados según el enum EstadoServicio
  const estadosValidos = ['pendiente', 'aceptado', 'completado', 'cancelado']
  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  // Create configurable number of services
  const serviceCount = 50
  console.log(`🚀 Creating ${serviceCount} services...`)

  for (let i = 0; i < serviceCount; i++) {
    const tecnico = tecnicos[Math.floor(Math.random() * tecnicos.length)]
    const cliente = clientes[Math.floor(Math.random() * clientes.length)]
    const oficio = oficios[Math.floor(Math.random() * oficios.length)]
    
    // Random date within last 30 days
    const randomTimestamp = thirtyDaysAgo.getTime() + Math.random() * (now.getTime() - thirtyDaysAgo.getTime())
    const fechaCreacion = new Date(randomTimestamp)
    const fechaActualizacion = new Date(randomTimestamp + Math.random() * 24 * 60 * 60 * 1000)

    // Determinar estado y si es cancelación tardía
    const estado = estadosValidos[Math.floor(Math.random() * estadosValidos.length)]
    const esCancelacionTardia = estado === 'cancelado' && Math.random() > 0.5

    // Precios en soles
    const preciosSoles = [50, 80, 100, 120, 150, 180, 200, 250, 300, 350, 400, 450, 500]
    const monto = preciosSoles[Math.floor(Math.random() * preciosSoles.length)]
    const precioAcordado = monto.toFixed(2)
    const direccion = faker.location.streetAddress().replace(/'/g, "''")
    const descripcion = faker.lorem.sentence().replace(/'/g, "''")

    // Create service (columnas correctas segun la tabla Servicio)
    const servicioResult = await pool.query(`
      INSERT INTO "Servicio" (
        "clienteId", "tecnicoId", descripcion, direccion, 
        "montoAcordado", estado, "fechaHora", distrito, "createdAt", "updatedAt"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id
    `, [
      cliente.id, tecnico.id, descripcion, direccion,
      precioAcordado, estado, fechaCreacion, 'trujillo', fechaCreacion, fechaActualizacion
    ])
    const servicioId = servicioResult.rows[0].id

    console.log(`  ✅ Servicio ${i + 1}/${serviceCount} created (ID: ${servicioId}, estado: ${estado})`)

    // Create a report linked to the service (only for non-pendiente services)
    if (estado !== 'pendiente') {
      // Categorías según el enum CategoriaReporte
      const categorias = ['no_se_presento', 'trabajo_deficiente', 'cobro_diferente', 'comportamiento_inapropiado', 'fraude']
      const categoria = categorias[Math.floor(Math.random() * categorias.length)]
      const descripcionReporte = faker.lorem.sentence().replace(/'/g, "''")
      
      await pool.query(`
        INSERT INTO "Reporte" (
          "servicioId", "reportanteId", "reportanteRol", "tipoObjetivo", "categoria", 
          comentario, "createdAt", "updatedAt"
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        servicioId, 
        cliente.id, 
        'cliente', 
        'tecnico', 
        categoria, 
        descripcionReporte, 
        fechaActualizacion,
        fechaActualizacion
      ])
    }

    // Create monetization transaction for completions or late cancellations
    if (estado === 'completado' || esCancelacionTardia) {
      const descripcionTransaccion = esCancelacionTardia
        ? 'Penalización por cancelación tardía'
        : 'Comisión por servicio completado'
      
      // Usar valores válidos del enum TipoTransaccion
      const tipoTransaccion = esCancelacionTardia ? 'descuento_credito' : 'comision_servicio'
      
      await pool.query(`
        INSERT INTO "TransaccionMonetizacion" ("tecnicoId", "monetizacionId", tipo, monto, descripcion, "createdAt")
        SELECT t.id, m.id, $1, $2, $3, $4
        FROM "Tecnico" t
        JOIN "MonetizacionTecnico" m ON t.id = m."tecnicoId"
        WHERE t.id = $5
      `, [
        tipoTransaccion,
        esCancelacionTardia ? '10' : (monto * 0.10).toFixed(2),
        descripcionTransaccion,
        fechaActualizacion,
        tecnico.id
      ])
    }
  }

  console.log('🎉 Seed completed successfully!')
}

main()
  .catch(e => {
    console.error('❌ Seed failed:', e.message)
    process.exit(1)
  })
  .finally(async () => {
    await pool.end()
  })