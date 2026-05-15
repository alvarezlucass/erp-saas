#!/bin/bash
# Script de Backup para Unifai - Despliegue Industrial

# Configuración
BACKUP_DIR="./backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
DB_CONTAINER_NAME="unifai-db-1" # Nombre por defecto generado por Docker Compose
DB_NAME="unifai_db"
DB_USER="unifai_user"

# Crear directorio si no existe
mkdir -p $BACKUP_DIR

echo "📦 Iniciando backup de la base de datos..."

# Ejecutar pg_dump dentro del contenedor
docker exec $DB_CONTAINER_NAME pg_dump -U $DB_USER $DB_NAME > $BACKUP_DIR/unifai_backup_$TIMESTAMP.sql

if [ $? -eq 0 ]; then
    echo "✅ Backup completado exitosamente: $BACKUP_DIR/unifai_backup_$TIMESTAMP.sql"
    # Opcional: Limpiar backups antiguos (mantener los 7 mas recientes)
    ls -t $BACKUP_DIR/unifai_backup_*.sql | tail -n +8 | xargs -I {} rm -- {}
else
    echo "❌ Error al generar el backup."
    exit 1
fi
