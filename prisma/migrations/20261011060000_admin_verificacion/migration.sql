-- AlterEnum
ALTER TYPE "EstadoVerificacion" RENAME VALUE 'aprobado' TO 'verificado';
ALTER TYPE "EstadoVerificacion" ADD VALUE 'suspendido';

-- CreateTable
CREATE TABLE "HistorialVerificacion" (
    "id" SERIAL NOT NULL,
    "tecnicoId" INTEGER NOT NULL,
    "adminId" INTEGER NOT NULL,
    "estadoAnterior" "EstadoVerificacion" NOT NULL,
    "estadoNuevo" "EstadoVerificacion" NOT NULL,
    "comentario" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HistorialVerificacion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HistorialVerificacion_tecnicoId_idx" ON "HistorialVerificacion"("tecnicoId");

-- AddForeignKey
ALTER TABLE "HistorialVerificacion" ADD CONSTRAINT "HistorialVerificacion_tecnicoId_fkey" FOREIGN KEY ("tecnicoId") REFERENCES "Tecnico"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HistorialVerificacion" ADD CONSTRAINT "HistorialVerificacion_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
