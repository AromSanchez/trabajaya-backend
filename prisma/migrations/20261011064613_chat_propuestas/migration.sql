-- CreateEnum
CREATE TYPE "EstadoPropuesta" AS ENUM ('pendiente', 'aceptada', 'rechazada');

-- AlterTable
ALTER TABLE "Servicio" ADD COLUMN     "alcanceAcordado" TEXT,
ADD COLUMN     "montoAcordado" DECIMAL(10,2);

-- CreateTable
CREATE TABLE "Mensaje" (
    "id" SERIAL NOT NULL,
    "servicioId" INTEGER NOT NULL,
    "autorId" INTEGER NOT NULL,
    "autorRol" "RolActor" NOT NULL,
    "contenido" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Mensaje_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Propuesta" (
    "id" SERIAL NOT NULL,
    "servicioId" INTEGER NOT NULL,
    "monto" DECIMAL(10,2) NOT NULL,
    "alcance" TEXT NOT NULL,
    "estado" "EstadoPropuesta" NOT NULL DEFAULT 'pendiente',
    "creadaPorId" INTEGER NOT NULL,
    "respondidaPorId" INTEGER,
    "motivoRechazo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Propuesta_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Mensaje_servicioId_createdAt_idx" ON "Mensaje"("servicioId", "createdAt");

-- CreateIndex
CREATE INDEX "Propuesta_servicioId_idx" ON "Propuesta"("servicioId");

-- AddForeignKey
ALTER TABLE "Mensaje" ADD CONSTRAINT "Mensaje_servicioId_fkey" FOREIGN KEY ("servicioId") REFERENCES "Servicio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mensaje" ADD CONSTRAINT "Mensaje_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Propuesta" ADD CONSTRAINT "Propuesta_servicioId_fkey" FOREIGN KEY ("servicioId") REFERENCES "Servicio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Propuesta" ADD CONSTRAINT "Propuesta_creadaPorId_fkey" FOREIGN KEY ("creadaPorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Propuesta" ADD CONSTRAINT "Propuesta_respondidaPorId_fkey" FOREIGN KEY ("respondidaPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
