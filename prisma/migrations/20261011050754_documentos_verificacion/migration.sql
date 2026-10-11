-- CreateEnum
CREATE TYPE "TipoDocumentoVerificacion" AS ENUM ('dni_frente', 'dni_reverso', 'selfie', 'cul', 'certificado_oficio');

-- CreateEnum
CREATE TYPE "EstadoDocumento" AS ENUM ('pendiente', 'aprobado', 'observado');

-- AlterEnum
ALTER TYPE "EstadoVerificacion" ADD VALUE 'en_revision';

-- AlterTable
ALTER TABLE "Tecnico" ADD COLUMN     "documentosEnviadosAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "DocumentoVerificacion" (
    "id" SERIAL NOT NULL,
    "tecnicoId" INTEGER NOT NULL,
    "tipo" "TipoDocumentoVerificacion" NOT NULL,
    "publicId" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "formato" TEXT NOT NULL,
    "nombreOriginal" TEXT NOT NULL,
    "bytes" INTEGER NOT NULL,
    "estado" "EstadoDocumento" NOT NULL DEFAULT 'pendiente',
    "comentarioAdmin" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentoVerificacion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DocumentoVerificacion_tecnicoId_idx" ON "DocumentoVerificacion"("tecnicoId");

-- AddForeignKey
ALTER TABLE "DocumentoVerificacion" ADD CONSTRAINT "DocumentoVerificacion_tecnicoId_fkey" FOREIGN KEY ("tecnicoId") REFERENCES "Tecnico"("id") ON DELETE CASCADE ON UPDATE CASCADE;
