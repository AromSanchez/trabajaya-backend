-- AlterTable
ALTER TABLE "Tecnico" ADD COLUMN     "disponible" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "especialidades" TEXT[] DEFAULT ARRAY[]::TEXT[];
