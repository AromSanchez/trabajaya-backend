-- CreateEnum
CREATE TYPE "EstadoServicio" AS ENUM ('pendiente', 'aceptado', 'completado', 'rechazado', 'cancelado', 'expirado');

-- CreateEnum
CREATE TYPE "RolActor" AS ENUM ('cliente', 'tecnico', 'admin', 'sistema');

-- CreateTable
CREATE TABLE "Configuracion" (
    "clave" TEXT NOT NULL,
    "valor" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Configuracion_pkey" PRIMARY KEY ("clave")
);

-- CreateTable
CREATE TABLE "Servicio" (
    "id" SERIAL NOT NULL,
    "clienteId" INTEGER NOT NULL,
    "tecnicoId" INTEGER NOT NULL,
    "descripcion" TEXT NOT NULL,
    "fechaHora" TIMESTAMP(3) NOT NULL,
    "distrito" "Distrito" NOT NULL,
    "direccion" TEXT NOT NULL,
    "estado" "EstadoServicio" NOT NULL DEFAULT 'pendiente',
    "motivoRechazo" TEXT,
    "canceladoPorId" INTEGER,
    "canceladoPorRol" "RolActor",
    "motivoCancelacion" TEXT,
    "cancelacionTardia" BOOLEAN NOT NULL DEFAULT false,
    "completadoPorId" INTEGER,
    "completadoPorRol" "RolActor",
    "comisionPorcentaje" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "aceptadoAt" TIMESTAMP(3),
    "completadoAt" TIMESTAMP(3),
    "canceladoAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Servicio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FotoServicio" (
    "id" SERIAL NOT NULL,
    "servicioId" INTEGER NOT NULL,
    "publicId" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "formato" TEXT NOT NULL,
    "bytes" INTEGER NOT NULL,
    "nombreOriginal" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FotoServicio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HistorialServicio" (
    "id" SERIAL NOT NULL,
    "servicioId" INTEGER NOT NULL,
    "actorId" INTEGER,
    "actorRol" "RolActor" NOT NULL,
    "estadoAnterior" "EstadoServicio",
    "estadoNuevo" "EstadoServicio" NOT NULL,
    "motivo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HistorialServicio_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Servicio_clienteId_idx" ON "Servicio"("clienteId");

-- CreateIndex
CREATE INDEX "Servicio_tecnicoId_idx" ON "Servicio"("tecnicoId");

-- CreateIndex
CREATE INDEX "Servicio_estado_idx" ON "Servicio"("estado");

-- CreateIndex
CREATE INDEX "FotoServicio_servicioId_idx" ON "FotoServicio"("servicioId");

-- CreateIndex
CREATE INDEX "HistorialServicio_servicioId_idx" ON "HistorialServicio"("servicioId");

-- AddForeignKey
ALTER TABLE "Servicio" ADD CONSTRAINT "Servicio_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Servicio" ADD CONSTRAINT "Servicio_tecnicoId_fkey" FOREIGN KEY ("tecnicoId") REFERENCES "Tecnico"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Servicio" ADD CONSTRAINT "Servicio_canceladoPorId_fkey" FOREIGN KEY ("canceladoPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Servicio" ADD CONSTRAINT "Servicio_completadoPorId_fkey" FOREIGN KEY ("completadoPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FotoServicio" ADD CONSTRAINT "FotoServicio_servicioId_fkey" FOREIGN KEY ("servicioId") REFERENCES "Servicio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HistorialServicio" ADD CONSTRAINT "HistorialServicio_servicioId_fkey" FOREIGN KEY ("servicioId") REFERENCES "Servicio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HistorialServicio" ADD CONSTRAINT "HistorialServicio_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
