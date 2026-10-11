-- CreateEnum
CREATE TYPE "TipoNotificacion" AS ENUM ('solicitud_nueva', 'solicitud_aceptada', 'solicitud_rechazada', 'servicio_completado', 'servicio_cancelado', 'mensaje_nuevo', 'resena_recibida', 'propuesta_nueva', 'propuesta_aceptada', 'propuesta_rechazada', 'verificacion_aprobada', 'verificacion_observada', 'verificacion_rechazada', 'verificacion_suspendida', 'reporte_resuelto', 'reporte_descartado');

-- CreateTable
CREATE TABLE "Favorito" (
    "id" SERIAL NOT NULL,
    "clienteId" INTEGER NOT NULL,
    "tecnicoId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Favorito_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notificacion" (
    "id" SERIAL NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "tipo" "TipoNotificacion" NOT NULL,
    "titulo" TEXT NOT NULL,
    "mensaje" TEXT,
    "datos" JSONB,
    "leida" BOOLEAN NOT NULL DEFAULT false,
    "leidaAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notificacion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Favorito_clienteId_idx" ON "Favorito"("clienteId");

-- CreateIndex
CREATE UNIQUE INDEX "Favorito_clienteId_tecnicoId_key" ON "Favorito"("clienteId", "tecnicoId");

-- CreateIndex
CREATE INDEX "Notificacion_usuarioId_leida_idx" ON "Notificacion"("usuarioId", "leida");

-- CreateIndex
CREATE INDEX "Notificacion_usuarioId_createdAt_idx" ON "Notificacion"("usuarioId", "createdAt");

-- AddForeignKey
ALTER TABLE "Favorito" ADD CONSTRAINT "Favorito_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Favorito" ADD CONSTRAINT "Favorito_tecnicoId_fkey" FOREIGN KEY ("tecnicoId") REFERENCES "Tecnico"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notificacion" ADD CONSTRAINT "Notificacion_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;
