/*
  Warnings:

  - You are about to drop the column `direccion` on the `proveedores` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_proveedores" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nombre" TEXT NOT NULL,
    "razonSocial" TEXT,
    "cuit" TEXT,
    "dirLegalCalle" TEXT,
    "dirLegalNro" TEXT,
    "dirLegalPiso" TEXT,
    "dirLegalCiudad" TEXT,
    "dirLegalProvincia" TEXT,
    "dirLegalCP" TEXT,
    "dirRealCalle" TEXT,
    "dirRealNro" TEXT,
    "dirRealPiso" TEXT,
    "dirRealCiudad" TEXT,
    "dirRealProvincia" TEXT,
    "dirRealCP" TEXT,
    "formaPago" TEXT,
    "diasPago" INTEGER DEFAULT 0,
    "tiempoEntrega" TEXT,
    "medioPedido" TEXT,
    "telefono" TEXT,
    "email" TEXT,
    "contactoNombre" TEXT,
    "rubro" TEXT,
    "notas" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" DATETIME NOT NULL
);
INSERT INTO "new_proveedores" ("activo", "actualizadoEn", "contactoNombre", "creadoEn", "cuit", "email", "id", "nombre", "notas", "razonSocial", "rubro", "telefono") SELECT "activo", "actualizadoEn", "contactoNombre", "creadoEn", "cuit", "email", "id", "nombre", "notas", "razonSocial", "rubro", "telefono" FROM "proveedores";
DROP TABLE "proveedores";
ALTER TABLE "new_proveedores" RENAME TO "proveedores";
CREATE UNIQUE INDEX "proveedores_nombre_key" ON "proveedores"("nombre");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
