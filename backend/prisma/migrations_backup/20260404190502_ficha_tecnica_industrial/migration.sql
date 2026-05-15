/*
  Warnings:

  - You are about to drop the column `categoria` on the `productos` table. All the data in the column will be lost.

*/
-- CreateTable
CREATE TABLE "categorias_productos" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "dibujoUrl" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true
);

-- CreateTable
CREATE TABLE "curvas_talles" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nombre" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "talles_items" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "curvaId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "talles_items_curvaId_fkey" FOREIGN KEY ("curvaId") REFERENCES "curvas_talles" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "puntos_medicion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nombre" TEXT NOT NULL,
    "categoriaId" TEXT,
    CONSTRAINT "puntos_medicion_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "categorias_productos" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "medidas_talles" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productoId" TEXT NOT NULL,
    "talle" TEXT NOT NULL,
    "puntoId" TEXT NOT NULL,
    "valorCm" REAL NOT NULL,
    CONSTRAINT "medidas_talles_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "productos" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "medidas_talles_puntoId_fkey" FOREIGN KEY ("puntoId") REFERENCES "puntos_medicion" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "imagenes_productos" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productoId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "etiqueta" TEXT NOT NULL,
    "posicion" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "imagenes_productos_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "productos" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_productos" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nombre" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tipo" TEXT NOT NULL DEFAULT 'FABRICADO',
    "categoriaId" TEXT,
    "proveedorId" TEXT,
    "costoCompra" REAL,
    CONSTRAINT "productos_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "categorias_productos" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "productos_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "proveedores" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_productos" ("activo", "costoCompra", "creadoEn", "id", "nombre", "proveedorId", "tipo") SELECT "activo", "costoCompra", "creadoEn", "id", "nombre", "proveedorId", "tipo" FROM "productos";
DROP TABLE "productos";
ALTER TABLE "new_productos" RENAME TO "productos";
CREATE UNIQUE INDEX "productos_nombre_key" ON "productos"("nombre");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "categorias_productos_nombre_key" ON "categorias_productos"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "curvas_talles_nombre_key" ON "curvas_talles"("nombre");
