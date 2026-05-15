@echo off
set TIMESTAMP=%date:~10,4%%date:~4,2%%date:~7,2%_%time:~0,2%%time:~3,2%%time:~6,2%
set TIMESTAMP=%TIMESTAMP: =0%
set BACKUP_DIR=.\backups
set DB_CONTAINER_NAME=unifai-db-1
set DB_NAME=unifai_db
set DB_USER=unifai_user

if not exist %BACKUP_DIR% mkdir %BACKUP_DIR%

echo 📦 Iniciando backup de la base de datos...

docker exec %DB_CONTAINER_NAME% pg_dump -U %DB_USER% %DB_NAME% > %BACKUP_DIR%\unifai_backup_%TIMESTAMP%.sql

if %ERRORLEVEL% EQU 0 (
    echo ✅ Backup completado exitosamente: %BACKUP_DIR%\unifai_backup_%TIMESTAMP%.sql
) else (
    echo ❌ Error al generar el backup.
)
pause
