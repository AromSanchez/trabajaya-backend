-- AlterTable
ALTER TABLE "Tecnico" ADD COLUMN "verificadoAt" TIMESTAMP(3);

-- Backfill: fecha de la última vez que cada técnico pasó a 'verificado'
UPDATE "Tecnico" t
SET "verificadoAt" = sub."createdAt"
FROM (
  SELECT DISTINCT ON ("tecnicoId") "tecnicoId", "createdAt"
  FROM "HistorialVerificacion"
  WHERE "estadoNuevo" = 'verificado'
  ORDER BY "tecnicoId", "createdAt" DESC
) sub
WHERE t.id = sub."tecnicoId";
