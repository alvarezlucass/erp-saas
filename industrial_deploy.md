# Guía de Despliegue Industrial y Actualizaciones

Este documento detalla la estrategia para entregar el sistema Unifai a clientes locales y cómo gestionar el ciclo de vida del software (actualizaciones y personalizaciones).

## 1. Concepto: El Servidor Único (Hybrid mode)

Para simplificar la instalación, el backend ha sido configurado para servir el frontend. Esto significa que el cliente solo necesita acceder a un puerto (ej: `http://localhost:3001`).

### Flujo de Acceso
- **Online**: El cliente accede vía internet (Vercel/Supabase).
- **Offline**: El cliente accede a su servidor local vía red interna (LAN). Los datos se guardan en la DB local de PostgreSQL incluida en el Docker Compose.

---

## 2. Gestión de Versiones y Actualizaciones

Para escalar el producto a múltiples clientes sin perder el control de los "bugs" o "avances", seguiremos esta estructura:

### Ramas de Git (Estrategia sugerida)
- `main`: Versión estable "Core" que todos los clientes tienen.
- `client/[nombre-cliente]`: Ramas específicas para personalizaciones (ej: un logo distinto, un reporte extra).

### Proceso de Actualización
Cuando se arregla un bug en el `main` y se quiere llevar a todos los clientes:
1. Hacer un `merge` de `main` a las ramas `client/*`.
2. En el servidor del cliente, ejecutar:
   ```bash
   git pull
   docker-compose up --build -d
   ```
   *Nota: Docker se encarga de recompilar lo necesario y Prisma ejecutará las migraciones (`migrate deploy`) automáticamente al iniciar.*

---

## 3. Backups y Acceso a Datos

Dado que el cliente opera localmente, ustedes (Amanecer Indumentaria) necesitan acceso a la data para soporte.
- Se han incluido scripts en `scripts/backup_db.bat`.
- **Recomendación**: Programar una Tarea Programada en Windows para que este script se ejecute diariamente y suba el archivo `.sql` a un Google Drive o FTP de la empresa.

---

## 4. Diferencias entre Cliente On-Premise y SaaS (Cloud)

| Característica | Local (Offline/LAN) | Cloud (SaaS) |
|----------------|--------------------|--------------|
| **Base de Datos** | PostgreSQL (Docker) | Supabase |
| **Acceso** | IP Local (192.168.x.x) | URL unifai.app |
| **Resiliencia** | Alta (No depende de ISP) | Media (Depende de ISP) |
| **Actualización** | Pull manual/semi-auto | Automática con Push |

---

## 5. Switch de Emergencia (Hybrid Switch)

Si un cliente está configurado con **Supabase** (Online) y se queda sin internet, puede "cambiar" a su base local rápidamente modificando el archivo `.env`:

```bash
# Cambiar esto:
DATABASE_URL=postgresql://supabase-url...
# Por esto:
DATABASE_URL=postgresql://unifai_user:unifai_pass@db:5432/unifai_db
```

Esto requiere que se mantenga una sincronización periódica si se desea tener los mismos datos en ambos lados.
