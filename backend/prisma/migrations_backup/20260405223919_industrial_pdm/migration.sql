/*
  Warnings:

  - Added the required column `actualizadoEn` to the `productos` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "productos_talles" ADD COLUMN "referenciaMolderia" TEXT;

-- CreateTable
CREATE TABLE "producto_bordados" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productoId" TEXT NOT NULL,
    "bordadoId" TEXT NOT NULL,
    "posicion" TEXT,
    CONSTRAINT "producto_bordados_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "productos" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "producto_bordados_bordadoId_fkey" FOREIGN KEY ("bordadoId") REFERENCES "bordados" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "bordados" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "puntadas" INTEGER NOT NULL DEFAULT 0,
    "precioPorMillar" REAL NOT NULL DEFAULT 0,
    "costoPonchado" REAL NOT NULL DEFAULT 0,
    "marginTerceros" REAL NOT NULL DEFAULT 30,
    "fotoUrl" TEXT,
    "archivoMatrizUrl" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_categorias_productos" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "dibujoUrl" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "parentId" TEXT,
    CONSTRAINT "categorias_productos_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "categorias_productos" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_categorias_productos" ("activo", "descripcion", "dibujoUrl", "id", "nombre") SELECT "activo", "descripcion", "dibujoUrl", "id", "nombre" FROM "categorias_productos";
DROP TABLE "categorias_productos";
ALTER TABLE "new_categorias_productos" RENAME TO "categorias_productos";
CREATE UNIQUE INDEX "categorias_productos_nombre_key" ON "categorias_productos"("nombre");
CREATE TABLE "new_insumos_productos" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productoId" TEXT NOT NULL,
    "insumoId" TEXT NOT NULL,
    "cantidad" REAL NOT NULL,
    "consumoVariable" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "insumos_productos_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "productos" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "insumos_productos_insumoId_fkey" FOREIGN KEY ("insumoId") REFERENCES "insumos" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_insumos_productos" ("cantidad", "id", "insumoId", "productoId") SELECT "cantidad", "id", "insumoId", "productoId" FROM "insumos_productos";
DROP TABLE "insumos_productos";
ALTER TABLE "new_insumos_productos" RENAME TO "insumos_productos";
CREATE UNIQUE INDEX "insumos_productos_productoId_insumoId_key" ON "insumos_productos"("productoId", "insumoId");
CREATE TABLE "new_productos" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nombre" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tipo" TEXT NOT NULL DEFAULT 'FABRICADO',
    "categoriaId" TEXT,
    "proveedorId" TEXT,
    "costoCompra" REAL,
    "actualizadoEn" DATETIME NOT NULL,
    CONSTRAINT "productos_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "categorias_productos" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "productos_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "proveedores" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_productos" ("activo", "categoriaId", "costoCompra", "creadoEn", "id", "nombre", "proveedorId", "tipo") SELECT "activo", "categoriaId", "costoCompra", "creadoEn", "id", "nombre", "proveedorId", "tipo" FROM "productos";
DROP TABLE "productos";
ALTER TABLE "new_productos" RENAME TO "productos";
CREATE UNIQUE INDEX "productos_nombre_key" ON "productos"("nombre");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "bordados_nombre_key" ON "bordados"("nombre");
