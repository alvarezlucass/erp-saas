/*
  Warnings:

  - A unique constraint covering the columns `[codigoInterno]` on the table `insumos` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "insumos" ADD COLUMN "ancho" REAL;
ALTER TABLE "insumos" ADD COLUMN "codigoInterno" TEXT;
ALTER TABLE "insumos" ADD COLUMN "color" TEXT;
ALTER TABLE "insumos" ADD COLUMN "composicion" TEXT;
ALTER TABLE "insumos" ADD COLUMN "descripcion" TEXT;
ALTER TABLE "insumos" ADD COLUMN "gramaje" INTEGER;
ALTER TABLE "insumos" ADD COLUMN "stockMinimo" REAL DEFAULT 0;

-- CreateIndex
CREATE UNIQUE INDEX "insumos_codigoInterno_key" ON "insumos"("codigoInterno");
