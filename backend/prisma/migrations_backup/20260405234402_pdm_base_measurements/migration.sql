-- CreateTable
CREATE TABLE "medidas_base_categorias" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "categoriaId" TEXT NOT NULL,
    "talle" TEXT NOT NULL,
    "puntoId" TEXT NOT NULL,
    "valorCm" REAL NOT NULL,
    CONSTRAINT "medidas_base_categorias_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "categorias_productos" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "medidas_base_categorias_puntoId_fkey" FOREIGN KEY ("puntoId") REFERENCES "puntos_medicion" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "medidas_base_categorias_categoriaId_talle_puntoId_key" ON "medidas_base_categorias"("categoriaId", "talle", "puntoId");
