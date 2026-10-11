-- AlterTable
ALTER TABLE "Tecnico" ADD COLUMN     "calificacionPromedio" DOUBLE PRECISION,
ADD COLUMN     "serviciosCompletados" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "totalResenas" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "Resena" (
    "id" SERIAL NOT NULL,
    "servicioId" INTEGER NOT NULL,
    "clienteId" INTEGER NOT NULL,
    "tecnicoId" INTEGER NOT NULL,
    "calificacion" INTEGER NOT NULL,
    "comentario" TEXT,
    "oculta" BOOLEAN NOT NULL DEFAULT false,
    "motivoOcultamiento" TEXT,
    "ocultadaPorId" INTEGER,
    "ocultadaAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Resena_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Resena_servicioId_key" ON "Resena"("servicioId");

-- CreateIndex
CREATE INDEX "Resena_tecnicoId_oculta_idx" ON "Resena"("tecnicoId", "oculta");

-- AddForeignKey
ALTER TABLE "Resena" ADD CONSTRAINT "Resena_servicioId_fkey" FOREIGN KEY ("servicioId") REFERENCES "Servicio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Resena" ADD CONSTRAINT "Resena_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Resena" ADD CONSTRAINT "Resena_tecnicoId_fkey" FOREIGN KEY ("tecnicoId") REFERENCES "Tecnico"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Resena" ADD CONSTRAINT "Resena_ocultadaPorId_fkey" FOREIGN KEY ("ocultadaPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
