-- Habilitar RLS en todas las tablas principales
ALTER TABLE "empresas" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "usuarios" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "membresias" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "insumos" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "productos" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "clientes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "proveedores" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "presupuestos" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "comprobantes" ENABLE ROW LEVEL SECURITY;

-- 1. Política para Empresas: un usuario solo puede ver su empresa activa
CREATE POLICY "Ver empresa propia" ON "empresas"
FOR SELECT USING (
  id IN (
    SELECT "empresaId" FROM "membresias" 
    WHERE "usuarioId"::text = auth.uid()::text
  )
);

-- 2. Política para Insumos: solo ver y modificar insumos de tu empresa
CREATE POLICY "Insumos acceso total empresa" ON "insumos"
FOR ALL USING (
  "empresaId" IN (
    SELECT "empresaId" FROM "membresias" 
    WHERE "usuarioId"::text = auth.uid()::text
  )
);

-- 3. Política para Productos: solo ver y modificar productos de tu empresa
-- (Asumiendo que productos tiene empresaId, si no lo tiene, deberás agregarlo o vincularlo vía categoría/proveedor)
-- Nota: Asegúrate de que las tablas tengan la columna empresaId para RLS.

-- Trigger para sincronizar auth.users con public.usuarios
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.usuarios (id, email, nombre, "passwordHash")
  VALUES (new.id, new.email, coalesce(new.raw_user_meta_data->>'nombre', 'Nuevo Usuario'), '');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
