@echo off
chcp 65001 >nul
set "SCRIPT_DIR=%~dp0"
for %%I in ("%SCRIPT_DIR%..\..") do set "INFRA_DIR=%%~fI"
set "COMPOSE_FILE=%INFRA_DIR%\docker-compose.yml"
set "CANONICAL_ENV=%INFRA_DIR%\environments\.env.docker"

echo Stopping EcoTrack core services...
docker compose --env-file "%CANONICAL_ENV%" -f "%COMPOSE_FILE%" --profile core down --remove-orphans

echo.
echo Services stopped.
echo.
echo To remove DB volume too: docker compose --env-file "%CANONICAL_ENV%" -f "%COMPOSE_FILE%" --profile core down -v
echo.
pause
