# KDS v2.0 - Guia de Despliegue con Docker

## Tabla de Contenidos

1. [Requisitos Previos](#requisitos-previos)
2. [Estructura de Archivos Docker](#estructura-de-archivos-docker)
3. [Arquitectura de Contenedores](#arquitectura-de-contenedores)
4. [Despliegue Rapido](#despliegue-rapido)
5. [Configuracion de Variables](#configuracion-de-variables)
6. [Comandos Docker Compose](#comandos-docker-compose)
7. [Desarrollo Local](#desarrollo-local)
8. [Produccion](#produccion)
9. [Troubleshooting](#troubleshooting)
10. [Actualizaciones](#actualizaciones)

---

## Requisitos Previos

### Software Requerido

| Software | Version Minima | Verificar |
|----------|----------------|-----------|
| Docker | 20.10+ | `docker --version` |
| Docker Compose | 2.0+ | `docker compose version` |
| Git | 2.30+ | `git --version` |

### Recursos de Hardware

| Ambiente | RAM | CPU | Disco |
|----------|-----|-----|-------|
| Desarrollo | 4GB | 2 cores | 10GB |
| Produccion | 8GB | 4 cores | 50GB |

---

## Estructura de Archivos Docker

```
kds-system/
├── infra/
│   ├── docker-compose.yml        # Produccion
│   ├── docker-compose.dev.yml    # Desarrollo
│   ├── Dockerfile.backend        # Backend Node.js
│   ├── Dockerfile.kds-frontend   # Frontend KDS
│   ├── Dockerfile.backoffice     # Backoffice
│   └── nginx/
│       ├── kds-frontend.conf     # Config Nginx KDS
│       └── backoffice.conf       # Config Nginx Backoffice
├── .env.example                  # Plantilla de variables
├── .dockerignore                 # Archivos a excluir del build
└── Makefile                      # Comandos utiles
```

---

## Arquitectura de Contenedores

```
┌─────────────────────────────────────────────────────────────────┐
│                       kds-network (bridge)                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────────┐ │
│  │   postgres   │  │    redis     │  │       backend          │ │
│  │   (5432)     │  │    (6379)    │  │       (3000)           │ │
│  │              │  │              │  │                        │ │
│  │  PostgreSQL  │  │  Redis 7    │  │  Node.js/Express       │ │
│  │  15-alpine   │  │  alpine     │  │  + Prisma + Socket.IO  │ │
│  └──────┬───────┘  └──────┬──────┘  └───────────┬────────────┘ │
│         │                 │                      │              │
│         └─────────────────┼──────────────────────┘              │
│                           │                                      │
│              ┌────────────┴────────────┐                        │
│              │                         │                         │
│  ┌───────────▼──────────┐  ┌──────────▼───────────┐            │
│  │    kds-frontend      │  │      backoffice      │            │
│  │       (8080)         │  │        (8081)        │            │
│  │                      │  │                      │            │
│  │  Nginx + React       │  │  Nginx + React       │            │
│  │  (Pantallas cocina)  │  │  (Panel admin)       │            │
│  └──────────────────────┘  └──────────────────────┘            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                    Puertos Expuestos:
                    • 3000  - API Backend
                    • 5432  - PostgreSQL
                    • 6379  - Redis
                    • 8080  - KDS Frontend
                    • 8081  - Backoffice
```

---

## Despliegue Rapido

### Paso 1: Clonar el Repositorio

```bash
git clone https://github.com/tu-usuario/kds-system.git
cd kds-system
```

### Paso 2: Configurar Variables de Entorno

```bash
# Copiar plantilla
cp .env.example .env

# Editar con tus valores
nano .env  # Linux/Mac
notepad .env  # Windows
```

**Variables minimas requeridas:**

```env
POSTGRES_PASSWORD=tu_password_seguro_aqui
REDIS_PASSWORD=otro_password_seguro
JWT_SECRET=string_aleatorio_muy_largo_minimo_32_caracteres
JWT_REFRESH_SECRET=otro_string_aleatorio_diferente
```

### Paso 3: Construir e Iniciar

```bash
# Construir imagenes (primera vez)
docker compose -f infra/docker-compose.yml build

# Iniciar todos los servicios
docker compose -f infra/docker-compose.yml up -d

# Verificar estado
docker compose -f infra/docker-compose.yml ps
```

### Paso 4: Inicializar Base de Datos

```bash
# Ejecutar migraciones de Prisma
docker compose -f infra/docker-compose.yml exec backend npx prisma migrate deploy

# Cargar datos iniciales (admin, colas, pantallas de ejemplo)
docker compose -f infra/docker-compose.yml exec backend npx prisma db seed
```

### Paso 5: Acceder a los Servicios

| Servicio | URL | Credenciales |
|----------|-----|--------------|
| KDS Frontend | http://localhost:8080 | (usa API key de pantalla) |
| Backoffice | http://localhost:8081 | admin@kds.local / admin123 |
| API | http://localhost:3000/api | (requiere JWT) |

---

## Configuracion de Variables

### Variables de Entorno Completas

Ver archivo `.env.example` para lista completa. Las mas importantes:

```env
# ===========================================
# BASE DE DATOS
# ===========================================
POSTGRES_USER=kds
POSTGRES_PASSWORD=        # REQUERIDO
POSTGRES_DB=kds
POSTGRES_PORT=5432

# ===========================================
# CACHE
# ===========================================
REDIS_PASSWORD=           # REQUERIDO
REDIS_PORT=6379

# ===========================================
# AUTENTICACION
# ===========================================
JWT_SECRET=               # REQUERIDO - min 32 chars
JWT_REFRESH_SECRET=       # REQUERIDO - diferente a JWT_SECRET

# ===========================================
# MAXPOINT (Opcional)
# ===========================================
MXP_ENABLED=false
MXP_SERVER=
MXP_DATABASE=MAXPOINT
MXP_USER=
MXP_PASSWORD=

# ===========================================
# PUERTOS
# ===========================================
BACKEND_PORT=3000
KDS_FRONTEND_PORT=8080
BACKOFFICE_PORT=8081
```

---

## Comandos Docker Compose

### Comandos Basicos

```bash
# Alias para simplificar (opcional)
alias dc="docker compose -f infra/docker-compose.yml"

# Iniciar servicios
docker compose -f infra/docker-compose.yml up -d

# Detener servicios
docker compose -f infra/docker-compose.yml down

# Ver estado
docker compose -f infra/docker-compose.yml ps

# Ver logs de todos los servicios
docker compose -f infra/docker-compose.yml logs -f

# Ver logs de un servicio especifico
docker compose -f infra/docker-compose.yml logs -f backend
docker compose -f infra/docker-compose.yml logs -f kds-frontend
docker compose -f infra/docker-compose.yml logs -f backoffice
```

### Comandos de Mantenimiento

```bash
# Reiniciar un servicio
docker compose -f infra/docker-compose.yml restart backend

# Reconstruir un servicio
docker compose -f infra/docker-compose.yml build backend
docker compose -f infra/docker-compose.yml up -d backend

# Escalar servicio (multiple instancias)
docker compose -f infra/docker-compose.yml up -d --scale backend=3

# Limpiar todo (CUIDADO: elimina datos)
docker compose -f infra/docker-compose.yml down -v --rmi all
```

### Comandos de Base de Datos

```bash
# Acceder a PostgreSQL
docker compose -f infra/docker-compose.yml exec postgres psql -U kds -d kds

# Backup
docker compose -f infra/docker-compose.yml exec postgres \
  pg_dump -U kds kds > backup_$(date +%Y%m%d).sql

# Restaurar
docker compose -f infra/docker-compose.yml exec -T postgres \
  psql -U kds kds < backup_20240101.sql

# Ejecutar migraciones
docker compose -f infra/docker-compose.yml exec backend \
  npx prisma migrate deploy
```

### Comandos de Redis

```bash
# Acceder a Redis CLI
docker compose -f infra/docker-compose.yml exec redis \
  redis-cli -a $REDIS_PASSWORD

# Limpiar cache
docker compose -f infra/docker-compose.yml exec redis \
  redis-cli -a $REDIS_PASSWORD FLUSHALL

# Ver keys
docker compose -f infra/docker-compose.yml exec redis \
  redis-cli -a $REDIS_PASSWORD KEYS "*"
```

---

## Desarrollo Local

Para desarrollo, solo necesitas levantar PostgreSQL y Redis. Los frontends y backend se ejecutan localmente con hot-reload.

### Iniciar Infraestructura de Desarrollo

```bash
# Solo PostgreSQL, Redis, Adminer y Redis Commander
docker compose -f infra/docker-compose.dev.yml up -d
```

### URLs de Desarrollo

| Servicio | URL | Descripcion |
|----------|-----|-------------|
| PostgreSQL | localhost:5432 | Base de datos |
| Redis | localhost:6379 | Cache |
| Adminer | http://localhost:8082 | GUI para PostgreSQL |
| Redis Commander | http://localhost:8083 | GUI para Redis |

### Ejecutar Aplicaciones Localmente

```bash
# Terminal 1: Backend
cd backend
npm install
cp .env.example .env  # Configurar DATABASE_URL, etc.
npm run dev

# Terminal 2: KDS Frontend
cd kds-frontend
npm install
npm run dev

# Terminal 3: Backoffice
cd backoffice
npm install
npm run dev
```

---

## Produccion

### Configuracion SSL/TLS

Para produccion, usar proxy reverso con SSL. Ejemplo con Nginx externo:

```nginx
# /etc/nginx/sites-available/kds.conf

# KDS Frontend
server {
    listen 443 ssl http2;
    server_name kds.tudominio.com;

    ssl_certificate /etc/letsencrypt/live/tudominio.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/tudominio.com/privkey.pem;

    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket
    location /socket.io/ {
        proxy_pass http://localhost:3000/socket.io/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 86400;
    }
}

# Backoffice
server {
    listen 443 ssl http2;
    server_name admin.kds.tudominio.com;

    ssl_certificate /etc/letsencrypt/live/tudominio.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/tudominio.com/privkey.pem;

    location / {
        proxy_pass http://localhost:8081;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }
}
```

### Backups Automaticos

```bash
# Crontab para backup diario a las 2am
0 2 * * * cd /opt/kds && docker compose -f infra/docker-compose.yml exec -T postgres pg_dump -U kds kds | gzip > /backups/kds_$(date +\%Y\%m\%d).sql.gz

# Retener solo ultimos 30 dias
0 3 * * * find /backups -name "kds_*.sql.gz" -mtime +30 -delete
```

### Monitoreo

Agregar servicios de monitoreo con docker-compose.override.yml:

```yaml
# infra/docker-compose.override.yml
version: '3.8'

services:
  prometheus:
    image: prom/prometheus:latest
    container_name: kds-prometheus
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
    ports:
      - "9090:9090"
    networks:
      - kds-network

  grafana:
    image: grafana/grafana:latest
    container_name: kds-grafana
    environment:
      GF_SECURITY_ADMIN_PASSWORD: ${GRAFANA_PASSWORD:-admin}
    volumes:
      - grafana_data:/var/lib/grafana
    ports:
      - "3001:3000"
    networks:
      - kds-network

volumes:
  grafana_data:
```

---

## Troubleshooting

### Error: Puerto en uso

```bash
# Ver que proceso usa el puerto
# Linux/Mac
lsof -i :3000
netstat -tulpn | grep 3000

# Windows
netstat -ano | findstr :3000

# Solucion: cambiar puerto en .env
BACKEND_PORT=3001
```

### Error: No puede conectar a base de datos

```bash
# Verificar que postgres esta corriendo
docker compose -f infra/docker-compose.yml ps postgres

# Ver logs de postgres
docker compose -f infra/docker-compose.yml logs postgres

# Verificar conectividad
docker compose -f infra/docker-compose.yml exec backend \
  sh -c "nc -zv postgres 5432"
```

### Error: Conexion a MAXPOINT rechazada

```bash
# Verificar desde contenedor backend
docker compose -f infra/docker-compose.yml exec backend \
  sh -c "nc -zv $MXP_SERVER 1433"

# Verificar credenciales en logs
docker compose -f infra/docker-compose.yml logs backend | grep -i mxp
```

### Error: Health check failing

```bash
# Ver estado detallado
docker inspect kds-backend | jq '.[0].State.Health'

# Probar endpoint manualmente
curl http://localhost:3000/api/health
```

### Limpiar y reiniciar completamente

```bash
# ADVERTENCIA: Esto elimina todos los datos
docker compose -f infra/docker-compose.yml down -v
docker system prune -af
docker compose -f infra/docker-compose.yml build --no-cache
docker compose -f infra/docker-compose.yml up -d
```

---

## Actualizaciones

### Actualizar a Nueva Version

```bash
# 1. Hacer backup
docker compose -f infra/docker-compose.yml exec postgres \
  pg_dump -U kds kds > backup_pre_update.sql

# 2. Detener servicios
docker compose -f infra/docker-compose.yml down

# 3. Obtener nueva version
git pull origin main

# 4. Reconstruir imagenes
docker compose -f infra/docker-compose.yml build --no-cache

# 5. Ejecutar migraciones
docker compose -f infra/docker-compose.yml up -d postgres redis
docker compose -f infra/docker-compose.yml exec backend \
  npx prisma migrate deploy

# 6. Iniciar todos los servicios
docker compose -f infra/docker-compose.yml up -d

# 7. Verificar
docker compose -f infra/docker-compose.yml ps
docker compose -f infra/docker-compose.yml logs --tail=50
```

### Rollback

```bash
# Detener
docker compose -f infra/docker-compose.yml down

# Volver a version anterior
git checkout v1.0.0  # o el tag/commit anterior

# Restaurar backup si es necesario
docker compose -f infra/docker-compose.yml up -d postgres
docker compose -f infra/docker-compose.yml exec -T postgres \
  psql -U kds kds < backup_pre_update.sql

# Reconstruir e iniciar
docker compose -f infra/docker-compose.yml build
docker compose -f infra/docker-compose.yml up -d
```

---

## Referencias

- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Prisma Migrations](https://www.prisma.io/docs/concepts/components/prisma-migrate)
- [Nginx Proxy Configuration](https://nginx.org/en/docs/http/ngx_http_proxy_module.html)
