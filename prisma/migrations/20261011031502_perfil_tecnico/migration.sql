-- CreateEnum
CREATE TYPE "Oficio" AS ENUM ('gasfiteria', 'electricidad', 'carpinteria', 'albanileria', 'pintura');

-- CreateEnum
CREATE TYPE "Distrito" AS ENUM ('trujillo', 'el_porvenir', 'florencia_de_mora', 'huanchaco', 'la_esperanza', 'laredo', 'moche', 'poroto', 'salaverry', 'simbal', 'victor_larco_herrera');

-- AlterTable
ALTER TABLE "Tecnico" ADD COLUMN     "aniosExperiencia" INTEGER,
ADD COLUMN     "descripcion" TEXT,
ADD COLUMN     "disponibilidad" JSONB,
ADD COLUMN     "distritos" "Distrito"[],
ADD COLUMN     "oficio" "Oficio";
