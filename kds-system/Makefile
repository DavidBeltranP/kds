# =============================================================================
# KDS System - Makefile
# =============================================================================
# Comandos utiles para desarrollo y despliegue
# =============================================================================

.PHONY: help dev dev-down prod build down logs clean db-migrate db-seed db-reset install

# Variables
COMPOSE_DEV = docker compose -f infra/docker-compose.dev.yml
COMPOSE_PROD = docker compose -f infra/docker-compose.yml

# =============================================================================
# AYUDA
# =============================================================================
help:
	@echo ""
	@echo "╔═══════════════════════════════════════════════════════════════════╗"
	@echo "║                    KDS System - Comandos                          ║"
	@echo "╚═══════════════════════════════════════════════════════════════════╝"
	@echo ""
	@echo "DESARROLLO:"
	@echo "  make dev            Iniciar PostgreSQL, Redis, Adminer, Redis Commander"
	@echo "  make dev-down       Detener servicios de desarrollo"
	@echo "  make install        Instalar dependencias de todos los proyectos"
	@echo "  make start-backend  Iniciar backend en desarrollo (puerto 3000)"
	@echo "  make start-kds      Iniciar KDS frontend en desarrollo (puerto 5173)"
	@echo "  make start-bo       Iniciar Backoffice en desarrollo (puerto 5174)"
	@echo "  make quick-start    Configuracion rapida de desarrollo"
	@echo ""
	@echo "PRODUCCION:"
	@echo "  make build          Construir imagenes Docker"
	@echo "  make prod           Iniciar todos los servicios"
	@echo "  make down           Detener todos los servicios"
	@echo "  make logs           Ver logs de todos los servicios"
	@echo "  make logs-backend   Ver logs solo del backend"
	@echo "  make logs-kds       Ver logs solo del KDS frontend"
	@echo "  make logs-bo        Ver logs solo del Backoffice"
	@echo ""
	@echo "BASE DE DATOS:"
	@echo "  make db-migrate     Ejecutar migraciones de Prisma"
	@echo "  make db-seed        Cargar datos iniciales"
	@echo "  make db-reset       Reset completo de la base de datos"
	@echo "  make db-studio      Abrir Prisma Studio (GUI)"
	@echo "  make db-backup      Crear backup de la base de datos"
	@echo ""
	@echo "MANTENIMIENTO:"
	@echo "  make clean          Limpiar contenedores, imagenes y volumenes"
	@echo "  make status         Ver estado de los servicios"
	@echo "  make health         Verificar health de los servicios"
	@echo ""

# =============================================================================
# DESARROLLO
# =============================================================================
dev:
	@echo "Iniciando servicios de desarrollo..."
	$(COMPOSE_DEV) up -d
	@echo ""
	@echo "✅ Servicios iniciados:"
	@echo "   PostgreSQL:      localhost:5432 (kds_dev / kds_dev_password)"
	@echo "   Redis:           localhost:6379"
	@echo "   Adminer:         http://localhost:8082"
	@echo "   Redis Commander: http://localhost:8083"
	@echo ""

dev-down:
	@echo "Deteniendo servicios de desarrollo..."
	$(COMPOSE_DEV) down

dev-logs:
	$(COMPOSE_DEV) logs -f

# =============================================================================
# PRODUCCION
# =============================================================================
prod:
	@echo "Iniciando servicios de produccion..."
	$(COMPOSE_PROD) up -d
	@echo ""
	@echo "✅ Servicios iniciados:"
	@echo "   Backend:      http://localhost:3000"
	@echo "   KDS Frontend: http://localhost:8080"
	@echo "   Backoffice:   http://localhost:8081"
	@echo ""

build:
	@echo "Construyendo imagenes Docker..."
	$(COMPOSE_PROD) build --no-cache

build-backend:
	$(COMPOSE_PROD) build --no-cache backend

build-kds:
	$(COMPOSE_PROD) build --no-cache kds-frontend

build-bo:
	$(COMPOSE_PROD) build --no-cache backoffice

down:
	@echo "Deteniendo servicios de produccion..."
	$(COMPOSE_PROD) down

restart:
	$(COMPOSE_PROD) restart

logs:
	$(COMPOSE_PROD) logs -f

logs-backend:
	$(COMPOSE_PROD) logs -f backend

logs-kds:
	$(COMPOSE_PROD) logs -f kds-frontend

logs-bo:
	$(COMPOSE_PROD) logs -f backoffice

status:
	$(COMPOSE_PROD) ps

health:
	@echo "Verificando health de servicios..."
	@curl -s http://localhost:3000/api/health || echo "Backend: No responde"
	@echo ""

# =============================================================================
# BASE DE DATOS
# =============================================================================
db-migrate:
	@echo "Ejecutando migraciones..."
	cd backend && npx prisma migrate deploy

db-migrate-dev:
	@echo "Creando migracion de desarrollo..."
	cd backend && npx prisma migrate dev

db-seed:
	@echo "Cargando datos iniciales..."
	cd backend && npx prisma db seed

db-reset:
	@echo "⚠️  ADVERTENCIA: Esto eliminara todos los datos"
	@read -p "¿Continuar? [y/N] " confirm && [ "$$confirm" = "y" ]
	cd backend && npx prisma migrate reset --force

db-studio:
	@echo "Abriendo Prisma Studio..."
	cd backend && npx prisma studio

db-backup:
	@echo "Creando backup..."
	@mkdir -p backups
	$(COMPOSE_PROD) exec -T postgres pg_dump -U kds kds > backups/kds_$$(date +%Y%m%d_%H%M%S).sql
	@echo "✅ Backup creado en backups/"

db-generate:
	cd backend && npx prisma generate

# =============================================================================
# INSTALACION DE DEPENDENCIAS
# =============================================================================
install:
	@echo "Instalando dependencias..."
	cd backend && npm install
	cd kds-frontend && npm install
	cd backoffice && npm install
	@echo "✅ Dependencias instaladas"

install-backend:
	cd backend && npm install

install-kds:
	cd kds-frontend && npm install

install-bo:
	cd backoffice && npm install

# =============================================================================
# SERVIDORES DE DESARROLLO
# =============================================================================
start-backend:
	@echo "Iniciando backend en modo desarrollo..."
	cd backend && npm run dev

start-kds:
	@echo "Iniciando KDS frontend en modo desarrollo..."
	cd kds-frontend && npm run dev

start-bo:
	@echo "Iniciando Backoffice en modo desarrollo..."
	cd backoffice && npm run dev

# =============================================================================
# INICIO RAPIDO
# =============================================================================
quick-start: dev install db-migrate db-seed
	@echo ""
	@echo "╔═══════════════════════════════════════════════════════════════════╗"
	@echo "║                 ✅ Sistema listo para desarrollo                  ║"
	@echo "╚═══════════════════════════════════════════════════════════════════╝"
	@echo ""
	@echo "Ejecutar en terminales separadas:"
	@echo "  Terminal 1: make start-backend"
	@echo "  Terminal 2: make start-kds"
	@echo "  Terminal 3: make start-bo"
	@echo ""
	@echo "URLs:"
	@echo "  Backend:    http://localhost:3000"
	@echo "  KDS:        http://localhost:5173"
	@echo "  Backoffice: http://localhost:5174"
	@echo ""

# =============================================================================
# LIMPIEZA
# =============================================================================
clean:
	@echo "⚠️  Esto eliminara todos los contenedores, imagenes y volumenes"
	@read -p "¿Continuar? [y/N] " confirm && [ "$$confirm" = "y" ]
	$(COMPOSE_PROD) down -v --rmi all 2>/dev/null || true
	$(COMPOSE_DEV) down -v --rmi all 2>/dev/null || true
	docker system prune -f
	@echo "✅ Limpieza completada"

clean-images:
	docker rmi $$(docker images -q kds-*) 2>/dev/null || true

clean-volumes:
	docker volume rm $$(docker volume ls -q | grep kds) 2>/dev/null || true

# =============================================================================
# UTILIDADES
# =============================================================================
shell-backend:
	$(COMPOSE_PROD) exec backend sh

shell-postgres:
	$(COMPOSE_PROD) exec postgres psql -U kds -d kds

shell-redis:
	$(COMPOSE_PROD) exec redis redis-cli

# Verificar configuracion
check-env:
	@echo "Verificando archivo .env..."
	@test -f .env && echo "✅ .env existe" || echo "❌ .env no existe - ejecutar: cp .env.example .env"
	@test -f .env && grep -q "POSTGRES_PASSWORD=." .env && echo "✅ POSTGRES_PASSWORD configurado" || echo "❌ POSTGRES_PASSWORD vacio"
	@test -f .env && grep -q "REDIS_PASSWORD=." .env && echo "✅ REDIS_PASSWORD configurado" || echo "❌ REDIS_PASSWORD vacio"
	@test -f .env && grep -q "JWT_SECRET=." .env && echo "✅ JWT_SECRET configurado" || echo "❌ JWT_SECRET vacio"
