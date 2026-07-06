import { Client } from 'pg';
import * as fs from 'fs';

const connectionString = 'postgresql://postgres:VvJmBf-VBJ3v2uS@db.sdbauortmlqyojnkaylr.supabase.co:5432/postgres';

const sql = `
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  v_empresa_id uuid;
  v_modulos text[];
BEGIN
  -- 1. Insertar el usuario en public.usuarios
  INSERT INTO public.usuarios (id, email, nombre, "passwordHash", activo, "debeCambiarPassword")
  VALUES (
    new.id, 
    new.email, 
    coalesce(new.raw_user_meta_data->>'nombre', 'Nuevo Usuario'), 
    'auth-managed', 
    true, 
    false
  );

  -- 2. Si vienen datos de la empresa, crear empresa y membresía
  IF new.raw_user_meta_data->>'nombreEmpresa' IS NOT NULL THEN
    v_empresa_id := gen_random_uuid();
    
    -- Convertir el JSON array de modulos a TEXT[]
    SELECT array_agg(value::text) INTO v_modulos
    FROM jsonb_array_elements_text(new.raw_user_meta_data->'modulos');

    INSERT INTO public.empresas (id, nombre, "razonSocial", cuit, modulos, activa)
    VALUES (
      v_empresa_id,
      new.raw_user_meta_data->>'nombreEmpresa',
      new.raw_user_meta_data->>'nombreEmpresa',
      new.raw_user_meta_data->>'cuit',
      coalesce(v_modulos, ARRAY[]::text[]),
      true
    );

    INSERT INTO public.membresias (id, "usuarioId", "empresaId", rol, permisos)
    VALUES (
      gen_random_uuid(),
      new.id,
      v_empresa_id,
      'SUPER_ADMIN',
      ARRAY['TODO']
    );
  END IF;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
`;

async function run() {
  const client = new Client({ 
    connectionString,
    ssl: { rejectUnauthorized: false }
  });
  try {
    await client.connect();
    await client.query(sql);
    console.log("Trigger updated successfully!");
  } catch (err) {
    console.error("Error executing SQL:", err);
  } finally {
    await client.end();
  }
}

run();
