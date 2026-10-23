-- CreateEnum
CREATE TYPE "TipoMonetizacion" AS ENUM ('creditos', 'mensualidad');

-- CreateEnum
CREATE TYPE "TipoTransaccion" AS ENUM ('compra_creditos', 'activacion_plan', 'descuento_credito', 'comision_servicio', 'cambio_modelo');

-- CreateTable
CREATE TABLE "MonetizacionTecnico" (
    "id" SERIAL NOT NULL,
    "tecnicoId" INTEGER NOT NULL,
    "tipo" "TipoMonetizacion",
    "creditosRestantes" INTEGER NOT NULL DEFAULT 0,
    "planVenceAt" TIMESTAMP(3),
    "paqueteId" TEXT,
    "planId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MonetizacionTecnico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransaccionMonetizacion" (
    "id" SERIAL NOT NULL,
    "tecnicoId" INTEGER NOT NULL,
    "monetizacionId" INTEGER NOT NULL,
    "tipo" "TipoTransaccion" NOT NULL,
    "monto" DECIMAL(10,2),
    "creditos" INTEGER,
    "descripcion" TEXT,
    "referenciaId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TransaccionMonetizacion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MonetizacionTecnico_tecnicoId_key" ON "MonetizacionTecnico"("tecnicoId");

-- CreateIndex
CREATE INDEX "TransaccionMonetizacion_tecnicoId_idx" ON "TransaccionMonetizacion"("tecnicoId");

-- CreateIndex
CREATE INDEX "TransaccionMonetizacion_monetizacionId_idx" ON "TransaccionMonetizacion"("monetizacionId");

-- CreateIndex
CREATE INDEX "TransaccionMonetizacion_tipo_idx" ON "TransaccionMonetizacion"("tipo");

-- CreateIndex
CREATE INDEX "TransaccionMonetizacion_createdAt_idx" ON "TransaccionMonetizacion"("createdAt");

-- AddForeignKey
ALTER TABLE "MonetizacionTecnico" ADD CONSTRAINT "MonetizacionTecnico_tecnicoId_fkey" FOREIGN KEY ("tecnicoId") REFERENCES "Tecnico"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransaccionMonetizacion" ADD CONSTRAINT "TransaccionMonetizacion_tecnicoId_fkey" FOREIGN KEY ("tecnicoId") REFERENCES "Tecnico"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransaccionMonetizacion" ADD CONSTRAINT "TransaccionMonetizacion_monetizacionId_fkey" FOREIGN KEY ("monetizacionId") REFERENCES "MonetizacionTecnico"("id") ON DELETE CASCADE ON UPDATE CASCADE;
