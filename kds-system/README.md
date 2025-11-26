# KDS v2.0 - Kitchen Display System

Sistema de visualizacion de ordenes para cocina con panel de administracion visual completo, soporte para botonera fisica e integracion con POS MAXPOINT.

---

## Descripcion del Proyecto

**KDS (Kitchen Display System)** es un sistema completo para la gestion y visualizacion de ordenes en cocinas de restaurantes. Consta de tres componentes principales:

| Componente | Descripcion |
|------------|-------------|
| **Backend** | API REST + WebSocket para gestion de ordenes, pantallas y configuracion |
| **KDS Frontend** | Interfaz de pantallas de cocina con soporte para botonera fisica |
| **Backoffice** | Panel de administracion visual para configuracion sin editar archivos |

### Caracteristicas Principales

- **Tiempo Real**: Actualizacion instantanea via WebSocket
- **Balanceo de Ordenes**: Distribucion automatica entre pantallas (Round Robin / Least Loaded)
- **Botonera Fisica**: Soporte para teclado numerico USB con combos de teclas
- **Modo Standby**: Activacion con combo i+g (3 segundos)
- **Configuracion Visual**: Colores, grid, tipografia desde Backoffice
- **Integracion MAXPOINT**: Polling automatico de ordenes desde POS
- **Docker**: Despliegue containerizado listo para produccion

---

## Diagrama de Alto Nivel

```
┌─────────────────────────────────────────────────────────────────────────┐
│                            ARQUITECTURA KDS v2.0                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│    ┌──────────────┐                          ┌──────────────────────┐   │
│    │   MAXPOINT   │     Polling SQL          │     Backoffice       │   │
│    │  (POS/TPV)   │ ──────────────────────▶  │   (Admin Panel)      │   │
│    │              │                          │                      │   │
│    └──────────────┘                          │  • Gestion Pantallas │   │
│                                              │  • Gestion Colas     │   │
│                         ┌────────────────┐   │  • Configuracion     │   │
│                         │                │   │  • Monitoreo         │   │
│                         │    Backend     │   └──────────┬───────────┘   │
│                         │   (Node.js)    │              │               │
│                         │                │◀─────────────┘               │
│                         │  • REST API    │              REST API        │
│    ┌──────────────┐     │  • WebSocket   │                              │
│    │  PostgreSQL  │◀───▶│  • Balanceo    │                              │
│    │              │     │  • Auth JWT    │                              │
│    └──────────────┘     └───────┬────────┘                              │
│                                 │                                        │
│    ┌──────────────┐             │ WebSocket                             │
│    │    Redis     │◀────────────┤                                        │
│    │   (Cache)    │             │                                        │
│    └──────────────┘             ▼                                        │
│                         ┌───────────────┐                                │
│                         │ KDS Frontend  │                                │
│                         │  (Pantallas)  │                                │
│                         │               │                                │
│                         │ ┌───────────┐ │    ┌──────────────────┐       │
│                         │ │ Pantalla 1│ │    │ Botonera Fisica  │       │
│                         │ │ (Pollos)  │◀├────│  USB Keyboard    │       │
│                         │ └───────────┘ │    │                  │       │
│                         │ ┌───────────┐ │    │ Teclas: 1,3,i,h  │       │
│                         │ │ Pantalla 2│ │    │ Combo: i+g (3s)  │       │
│                         │ │ (Pollos)  │ │    └──────────────────┘       │
│                         │ └───────────┘ │                                │
│                         │ ┌───────────┐ │                                │
│                         │ │ Pantalla 3│ │                                │
│                         │ │(Sanduches)│ │                                │
│                         │ └───────────┘ │                                │
│                         └───────────────┘                                │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Estructura del Repositorio

```
kds-system/
│
├── backend/                      # API Node.js/Express
│   ├── src/
│   │   ├── config/              # Configuracion (env, db, redis)
│   │   ├── controllers/         # Controladores REST
│   │   ├── routes/              # Definicion de rutas
│   │   └── services/            # Logica de negocio
│   ├── prisma/                  # Schema y migraciones
│   ├── package.json
│   └── README.md
│
├── kds-frontend/                 # Frontend pantallas (React)
│   ├── src/
│   │   ├── components/          # Componentes UI
│   │   ├── hooks/               # Custom hooks
│   │   ├── store/               # Estado (Zustand)
│   │   └── utils/               # Utilidades (ButtonController)
│   ├── package.json
│   └── README.md
│
├── backoffice/                   # Panel admin (React + Ant Design)
│   ├── src/
│   │   ├── components/          # Componentes UI
│   │   ├── pages/               # Paginas
│   │   ├── services/            # API client
│   │   └── store/               # Estado
│   ├── package.json
│   └── README.md
│
├── docs/                         # Documentacion
│   ├── ARQUITECTURA_KDS.md      # Arquitectura detallada
│   ├── BALANCEO_PANTALLAS.md    # Logica de balanceo
│   ├── BOTONERA.md              # Integracion botonera fisica
│   ├── CONFIGURACION_VISUAL.md  # Configuracion de apariencia
│   ├── DEPLOY_DOCKER.md         # Guia de despliegue Docker
│   ├── SEGURIDAD.md             # Guia de seguridad
│   └── CHANGELOG_KDS.md         # Historial de cambios
│
├── infra/                        # Infraestructura Docker
│   ├── docker-compose.yml       # Produccion
│   ├── docker-compose.dev.yml   # Desarrollo
│   ├── Dockerfile.backend
│   ├── Dockerfile.kds-frontend
│   ├── Dockerfile.backoffice
│   └── nginx/                   # Configuraciones Nginx
│
├── .gitignore                    # Archivos a ignorar en Git
├── .dockerignore                 # Archivos a ignorar en Docker build
├── .env.example                  # Plantilla de variables de entorno
├── config.example.json           # Referencia del sistema anterior
├── Makefile                      # Comandos utiles
└── README.md                     # Este archivo
```

---

## Como Arrancar el Proyecto

### Requisitos

- Docker 20.10+
- Docker Compose 2.0+
- (Opcional) Node.js 20+ para desarrollo local

### Inicio Rapido (Docker)

```bash
# 1. Clonar repositorio
git clone https://github.com/tu-usuario/kds-system.git
cd kds-system

# 2. Configurar variables de entorno
cp .env.example .env
# Editar .env con tus credenciales (ver SEGURIDAD.md)

# 3. Construir e iniciar
docker compose -f infra/docker-compose.yml build
docker compose -f infra/docker-compose.yml up -d

# 4. Inicializar base de datos
docker compose -f infra/docker-compose.yml exec backend npx prisma migrate deploy
docker compose -f infra/docker-compose.yml exec backend npx prisma db seed

# 5. Acceder a los servicios
# KDS Frontend: http://localhost:8080
# Backoffice:   http://localhost:8081 (admin@kds.local / admin123)
```

### Desarrollo Local

```bash
# 1. Iniciar solo infraestructura
docker compose -f infra/docker-compose.dev.yml up -d

# 2. En terminales separadas:

# Backend (puerto 3000)
cd backend && npm install && npm run dev

# KDS Frontend (puerto 5173)
cd kds-frontend && npm install && npm run dev

# Backoffice (puerto 5174)
cd backoffice && npm install && npm run dev
```

---

## Seguridad y Buenas Practicas

### Archivos que NUNCA deben subirse a Git

| Tipo | Ejemplos |
|------|----------|
| Variables de entorno | `.env`, `.env.local`, `.env.production` |
| Configuracion con credenciales | `config.txt`, `conf.txt` |
| Certificados | `*.pem`, `*.key`, `*.crt` |
| Credenciales | `credentials.json`, `secrets/` |
| Backups de BD | `*.sql`, `*.dump`, `*.bak` |

### Manejo de Credenciales

1. **Usar `.env.example`** como plantilla (sin valores reales)
2. **Crear `.env`** local con valores reales
3. **Verificar** que `.env` esta en `.gitignore`
4. **En produccion**, considerar gestores de secretos (Vault, AWS Secrets Manager)

### Documentacion Detallada

Ver [docs/SEGURIDAD.md](docs/SEGURIDAD.md) para:
- Guia completa de manejo de credenciales
- Generacion de passwords seguros
- Checklist de seguridad
- Migracion desde sistema anterior

---

## Versionamiento

Este proyecto usa [Semantic Versioning](https://semver.org/):

- **MAJOR**: Cambios incompatibles
- **MINOR**: Nuevas funcionalidades compatibles
- **PATCH**: Correcciones de bugs

### Historial de Cambios

Ver [docs/CHANGELOG_KDS.md](docs/CHANGELOG_KDS.md) para el historial completo de cambios.

### Version Actual: 2.0.0

Principales cambios respecto a v1.x:
- Backend migrado de ASP.NET Core a Node.js/Express
- Nuevo Backoffice visual (reemplaza edicion manual de config.txt)
- Containerizacion completa con Docker
- WebSocket para comunicacion en tiempo real
- Documentacion completa

---

## Stack Tecnologico

| Capa | Tecnologia |
|------|------------|
| **Backend** | Node.js 20, Express, TypeScript, Prisma |
| **KDS Frontend** | React 18, TypeScript, TailwindCSS, Zustand |
| **Backoffice** | React 18, TypeScript, Ant Design, Zustand |
| **Base de Datos** | PostgreSQL 15 |
| **Cache** | Redis 7 |
| **WebSocket** | Socket.IO |
| **Contenedores** | Docker, Docker Compose |
| **Web Server** | Nginx (para frontends) |

---

## Documentacion Adicional

| Documento | Descripcion |
|-----------|-------------|
| [ARQUITECTURA_KDS.md](docs/ARQUITECTURA_KDS.md) | Arquitectura tecnica detallada |
| [BALANCEO_PANTALLAS.md](docs/BALANCEO_PANTALLAS.md) | Logica de distribucion de ordenes |
| [BOTONERA.md](docs/BOTONERA.md) | Integracion con teclado fisico |
| [CONFIGURACION_VISUAL.md](docs/CONFIGURACION_VISUAL.md) | Personalizacion de pantallas |
| [DEPLOY_DOCKER.md](docs/DEPLOY_DOCKER.md) | Guia completa de despliegue |
| [SEGURIDAD.md](docs/SEGURIDAD.md) | Buenas practicas de seguridad |

---

## Comandos Utiles

```bash
# Ver todos los comandos disponibles
make help

# Desarrollo
make dev              # Iniciar infra de desarrollo
make start-backend    # Iniciar backend
make start-kds        # Iniciar KDS frontend
make start-bo         # Iniciar backoffice

# Produccion
make build            # Construir imagenes
make prod             # Iniciar produccion
make logs             # Ver logs

# Base de datos
make db-migrate       # Ejecutar migraciones
make db-seed          # Cargar datos iniciales
make db-studio        # Abrir Prisma Studio
```

---

## Licencia

Proyecto privado - Todos los derechos reservados.

---

## Soporte

Para soporte tecnico o reportar issues:
- Crear issue en este repositorio
- Contactar al equipo de desarrollo
