-- CreateEnum
CREATE TYPE "TipoObjetivoReporte" AS ENUM ('tecnico', 'cliente', 'resena');

-- CreateEnum
CREATE TYPE "CategoriaReporte" AS ENUM ('no_se_presento', 'no_estaba', 'trabajo_deficiente', 'cobro_diferente', 'comportamiento_inapropiado', 'fraude', 'contenido_inapropiado', 'otro');

-- CreateEnum
CREATE TYPE "EstadoReporte" AS ENUM ('pendiente', 'resuelto', 'descartado');

-- CreateTable
CREATE TABLE "Reporte" (
    "id" SERIAL NOT NULL,
    "servicioId" INTEGER NOT NULL,
    "reportanteId" INTEGER NOT NULL,
    "reportanteRol" "RolActor" NOT NULL,
    "tipoObjetivo" "TipoObjetivoReporte" NOT NULL,
    "objetivoUsuarioId" INTEGER,
    "objetivoResenaId" INTEGER,
    "categoria" "CategoriaReporte" NOT NULL,
    "comentario" TEXT,
    "estado" "EstadoReporte" NOT NULL DEFAULT 'pendiente',
    "resueltoPorId" INTEGER,
    "notaResolucion" TEXT,
    "resueltoAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Reporte_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Reporte_servicioId_idx" ON "Reporte"("servicioId");

-- CreateIndex
CREATE INDEX "Reporte_estado_idx" ON "Reporte"("estado");

-- CreateIndex
CREATE INDEX "Reporte_reportanteId_idx" ON "Reporte"("reportanteId");

-- AddForeignKey
ALTER TABLE "Reporte" ADD CONSTRAINT "Reporte_servicioId_fkey" FOREIGN KEY ("servicioId") REFERENCES "Servicio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reporte" ADD CONSTRAINT "Reporte_reportanteId_fkey" FOREIGN KEY ("reportanteId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reporte" ADD CONSTRAINT "Reporte_objetivoUsuarioId_fkey" FOREIGN KEY ("objetivoUsuarioId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reporte" ADD CONSTRAINT "Reporte_objetivoResenaId_fkey" FOREIGN KEY ("objetivoResenaId") REFERENCES "Resena"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reporte" ADD CONSTRAINT "Reporte_resueltoPorId_fkey" FOREIGN KEY ("resueltoPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
