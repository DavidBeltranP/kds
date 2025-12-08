# Arquitectura del Sistema KDS

## Visión General

El sistema KDS (Kitchen Display System) es una solución completa para la gestión de órdenes en cocina, diseñada para integrarse con sistemas POS (MAXPOINT) y distribuir órdenes entre múltiples pantallas de visualización.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           KDS SYSTEM ARCHITECTURE                           │
└─────────────────────────────────────────────────────────────────────────────┘

                              ┌──────────────────┐
                              │    MAXPOINT      │
                              │   (POS System)   │
                              │   SQL Server     │
                              └────────┬─────────┘
                                       │ Polling
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                               BACKEND (Node.js/Express)                      │
│                                   Puerto: 3000                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐    │
│  │   Routes    │  │ Controllers │  │  Services   │  │   Middlewares   │    │
│  │  /api/*     │─▶│  auth       │─▶│  auth       │  │  auth.middleware│    │
│  │             │  │  queue      │  │  order      │  │  error.middleware│   │
│  │             │  │  config     │  │  screen     │  └─────────────────┘    │
│  │             │  │             │  │  balancer   │                         │
│  │             │  │             │  │  websocket  │                         │
│  │             │  │             │  │  polling    │                         │
│  │             │  │             │  │  printer    │                         │
│  │             │  │             │  │  mxp        │                         │
│  └─────────────┘  └─────────────┘  └─────────────┘                         │
│                                          │                                  │
│                           ┌──────────────┴──────────────┐                   │
│                           ▼                              ▼                  │
│                    ┌─────────────┐              ┌─────────────┐             │
│                    │ PostgreSQL  │              │    Redis    │             │
│                    │ (Prisma ORM)│              │ Cache/PubSub│             │
│                    │ Puerto: 5432│              │ Puerto: 6379│             │
│                    └─────────────┘              └─────────────┘             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                    │                                         │
                    │ WebSocket (Socket.io)                   │
                    ▼                                         ▼
┌──────────────────────────────────┐    ┌──────────────────────────────────┐
│       KDS FRONTEND (React)       │    │      BACKOFFICE (React)          │
│         Puerto: 8080             │    │        Puerto: 8081              │
├──────────────────────────────────┤    ├──────────────────────────────────┤
│                                  │    │                                  │
│  ┌────────────────────────────┐  │    │  ┌────────────────────────────┐  │
│  │       Components           │  │    │  │        Pages               │  │
│  │  - Header                  │  │    │  │  - Dashboard               │  │
│  │  - Footer                  │  │    │  │  - Screens                 │  │
│  │  - OrderCard               │  │    │  │  - Queues                  │  │
│  │  - OrderGrid               │  │    │  │  - Orders                  │  │
│  │  - StandbyScreen           │  │    │  │  - Appearance              │  │
│  └────────────────────────────┘  │    │  │  - Users                   │  │
│                                  │    │  │  - Settings                │  │
│  ┌────────────────────────────┐  │    │  └────────────────────────────┘  │
│  │        Services            │  │    │                                  │
│  │  - socket.ts (WebSocket)   │  │    │  ┌────────────────────────────┐  │
│  └────────────────────────────┘  │    │  │     Components             │  │
│                                  │    │  │  - ScreenPreview           │  │
│  ┌────────────────────────────┐  │    │  │  - PDF Reports             │  │
│  │        Store (Zustand)     │  │    │  └────────────────────────────┘  │
│  │  - configStore.ts          │  │    │                                  │
│  └────────────────────────────┘  │    │  ┌────────────────────────────┐  │
│                                  │    │  │     Store (Zustand)        │  │
└──────────────────────────────────┘    │  │  - authStore.ts            │  │
                                        │  └────────────────────────────┘  │
                                        └──────────────────────────────────┘
```

---

## Modelo de Datos

El sistema utiliza PostgreSQL con Prisma ORM. A continuación se muestra el diagrama de entidad-relación:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            DATABASE SCHEMA                                   │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│    User      │     │    Queue     │     │   Screen     │
├──────────────┤     ├──────────────┤     ├──────────────┤
│ id           │     │ id           │◄────│ queueId      │
│ email        │     │ name         │     │ id           │
│ password     │     │ distribution │     │ name         │
│ name         │     │ active       │     │ ip           │
│ role (enum)  │     └──────┬───────┘     │ status       │
│ active       │            │             │ apiKey       │
└──────────────┘            │             └───────┬──────┘
       │                    │                     │
       │            ┌───────┴───────┐             │
       │            ▼               ▼             │
       │    ┌──────────────┐ ┌──────────────┐     │
       │    │QueueChannel  │ │ QueueFilter  │     │
       │    ├──────────────┤ ├──────────────┤     │
       │    │ channel      │ │ pattern      │     │
       │    │ color        │ │ suppress     │     │
       │    │ priority     │ └──────────────┘     │
       │    └──────────────┘                      │
       │                                          │
       │         ┌────────────────────────────────┼────────────────┐
       │         │                                │                │
       │         ▼                                ▼                ▼
       │  ┌──────────────┐                ┌──────────────┐  ┌──────────────┐
       │  │  Appearance  │                │  Preference  │  │KeyboardConfig│
       │  ├──────────────┤                ├──────────────┤  ├──────────────┤
       │  │ fontSize     │                │ showClientData│ │ combos       │
       │  │ theme        │                │ showIdentifier│ │ power key    │
       │  │ colors...    │                │ pagination   │  │ navigation   │
       │  └──────┬───────┘                └──────────────┘  └──────────────┘
       │         │
       │         ├──────────────┬──────────────┐
       │         ▼              ▼              │
       │  ┌──────────────┐ ┌──────────────┐    │
       │  │  CardColor   │ │ChannelColor │    │
       │  ├──────────────┤ ├──────────────┤    │
       │  │ color        │ │ channel      │    │
       │  │ minutes      │ │ color        │    │
       │  └──────────────┘ └──────────────┘    │
       │                                       │
       │    ┌──────────────┐            ┌──────┴───────┐
       │    │    Order     │◄───────────│              │
       │    ├──────────────┤            │              │
       │    │ externalId   │            │              │
       │    │ channel      │            │              │
       │    │ status       │            │              │
       │    └──────┬───────┘            │              │
       │           │                    │              │
       │           ▼                    │              │
       │    ┌──────────────┐     ┌──────┴───────┐      │
       │    │  OrderItem   │     │  Heartbeat   │      │
       │    ├──────────────┤     ├──────────────┤      │
       │    │ name         │     │ timestamp    │      │
       │    │ quantity     │     └──────────────┘      │
       │    │ modifier     │                           │
       │    └──────────────┘                           │
       │                                               │
       ▼                                               ▼
┌──────────────┐                              ┌──────────────┐
│  AuditLog    │                              │   Printer    │
├──────────────┤                              ├──────────────┤
│ action       │                              │ ip           │
│ entity       │                              │ port         │
│ oldValue     │                              │ enabled      │
│ newValue     │                              └──────────────┘
└──────────────┘
```

### Entidades Principales

| Entidad | Descripción |
|---------|-------------|
| **User** | Usuarios del sistema (Admin, Operator, Viewer) |
| **Queue** | Colas de órdenes con tipo de distribución |
| **QueueChannel** | Canales asociados a cada cola (ej: Drive-Thru, Mostrador) |
| **QueueFilter** | Filtros para suprimir/mostrar productos específicos |
| **Screen** | Pantallas KDS físicas |
| **Appearance** | Configuración visual por pantalla |
| **Preference** | Preferencias de visualización por pantalla |
| **KeyboardConfig** | Configuración de botonera/teclado por pantalla |
| **Order** | Órdenes provenientes de MAXPOINT |
| **OrderItem** | Ítems individuales de cada orden |
| **Printer** | Impresoras asociadas a pantallas |
| **GeneralConfig** | Configuración global del sistema |
| **AuditLog** | Registro de auditoría |

---

## Flujo de Datos

### 1. Ingreso de Órdenes

```
MAXPOINT ──(polling)──▶ Backend ──(balancer)──▶ Screen Assignment
                            │
                            ▼
                       PostgreSQL
                            │
                            ▼
                  WebSocket Broadcast
                            │
                  ┌─────────┴─────────┐
                  ▼                   ▼
            KDS Screen 1        KDS Screen 2 ...
```

1. El servicio de **polling** consulta periódicamente la base de datos de MAXPOINT
2. Las nuevas órdenes son procesadas por el **balancer** para asignarlas a pantallas
3. Se persisten en PostgreSQL
4. Se notifica a las pantallas KDS vía WebSocket

### 2. Gestión de Pantallas

```
Screen ──(heartbeat)──▶ Backend ──▶ Redis (status cache)
                            │
                            ▼
                  Status Update Event
                            │
                            ▼
                       Backoffice
```

1. Cada pantalla KDS envía heartbeats periódicos
2. El backend actualiza el estado en Redis
3. Los cambios de estado se propagan al Backoffice

### 3. Auto-Redistribución

Cuando una pantalla se desconecta:

```
Screen Offline ──▶ Backend detects ──▶ Redistribute orders
                                            │
                                            ▼
                                  Assign to active screens
```

Las órdenes pendientes se redistribuyen automáticamente entre las pantallas activas.

---

## Estructura de Carpetas

```
kds-system/
├── backend/                    # API Node.js/Express
│   ├── prisma/                # Schema y migraciones
│   │   ├── schema.prisma      # Definición del modelo de datos
│   │   └── migrations/        # Historial de migraciones
│   └── src/
│       ├── config/            # Configuración
│       │   ├── env.ts         # Variables de entorno
│       │   ├── database.ts    # Conexión PostgreSQL
│       │   └── redis.ts       # Conexión Redis
│       ├── controllers/       # Controladores HTTP
│       │   ├── auth.controller.ts
│       │   ├── queue.controller.ts
│       │   └── config.controller.ts
│       ├── middlewares/       # Middlewares
│       │   ├── auth.middleware.ts
│       │   └── error.middleware.ts
│       ├── routes/            # Definición de rutas API
│       │   └── index.ts
│       ├── services/          # Lógica de negocio
│       │   ├── auth.service.ts
│       │   ├── balancer.service.ts
│       │   ├── order.service.ts
│       │   ├── polling.service.ts
│       │   ├── printer.service.ts
│       │   ├── screen.service.ts
│       │   ├── mxp.service.ts
│       │   └── websocket.service.ts
│       ├── utils/             # Utilidades
│       │   └── logger.ts
│       └── index.ts           # Entry point
│
├── kds-frontend/              # Pantallas KDS (React + Vite)
│   └── src/
│       ├── components/        # Componentes React
│       │   ├── Header/
│       │   ├── Footer/
│       │   ├── OrderCard/
│       │   ├── OrderGrid/
│       │   └── StandbyScreen/
│       ├── hooks/             # Custom hooks
│       ├── services/          # Servicios
│       │   └── socket.ts      # Cliente WebSocket
│       ├── store/             # Estado global
│       │   └── configStore.ts
│       ├── styles/            # Estilos CSS
│       ├── types/             # Tipos TypeScript
│       └── main.tsx           # Entry point
│
├── backoffice/                # Panel Admin (React + Vite)
│   └── src/
│       ├── components/        # Componentes React
│       │   └── ScreenPreview/ # Vista previa de pantallas
│       ├── pages/             # Páginas
│       │   ├── Dashboard/
│       │   ├── Screens/
│       │   ├── Queues/
│       │   ├── Orders/
│       │   ├── Appearance/
│       │   ├── Users/
│       │   └── Settings/
│       ├── hooks/             # Custom hooks
│       ├── services/          # API calls
│       ├── store/             # Estado global
│       │   └── authStore.ts
│       ├── styles/            # Estilos CSS
│       ├── types/             # Tipos TypeScript
│       └── main.tsx           # Entry point
│
├── infra/                     # Infraestructura
│   ├── docker-compose.yml     # Orquestación de servicios
│   ├── Dockerfile.backend
│   ├── Dockerfile.kds-frontend
│   ├── Dockerfile.backoffice
│   └── nginx/                 # Configuración Nginx
│
└── docs/                      # Documentación
```

---

## Stack Tecnológico

| Capa | Tecnología | Versión |
|------|------------|---------|
| **Runtime** | Node.js | 18+ |
| **Backend Framework** | Express | 4.x |
| **Lenguaje** | TypeScript | 5.x |
| **Base de Datos** | PostgreSQL | 15 |
| **ORM** | Prisma | 5.x |
| **Cache/PubSub** | Redis | 7 |
| **WebSocket** | Socket.io | 4.x |
| **Frontend Framework** | React | 18.x |
| **Build Tool** | Vite | 5.x |
| **State Management** | Zustand | 4.x |
| **Contenedores** | Docker + Docker Compose | - |
| **Reverse Proxy** | Nginx | Alpine |

---

## Servicios del Backend

### auth.service.ts
Maneja autenticación JWT, login, refresh tokens y gestión de usuarios.

### balancer.service.ts
Distribuye órdenes entre pantallas según el tipo de cola:
- **DISTRIBUTED**: Balanceo round-robin entre pantallas activas
- **SINGLE**: Todas las órdenes a una sola pantalla

### order.service.ts
CRUD de órdenes, cambios de estado, y gestión del ciclo de vida.

### screen.service.ts
Gestión de pantallas: registro, heartbeats, estado online/offline.

### websocket.service.ts
Comunicación en tiempo real con Socket.io:
- Eventos de nuevas órdenes
- Actualizaciones de estado
- Heartbeats de pantallas

### polling.service.ts
Consulta periódica a MAXPOINT para obtener nuevas órdenes.

### printer.service.ts
Impresión de tickets vía TCP/IP.

### mxp.service.ts
Conexión y consultas a SQL Server (MAXPOINT).

---

## Puertos por Defecto

| Servicio | Puerto |
|----------|--------|
| Backend API | 3000 |
| PostgreSQL | 5432 |
| Redis | 6379 |
| KDS Frontend | 8080 |
| Backoffice | 8081 |

---

## Variables de Entorno

Principales variables configurables (ver `.env.example` para lista completa):

```env
# Base de datos
DATABASE_URL=postgresql://user:pass@localhost:5432/kds

# Redis
REDIS_URL=redis://:password@localhost:6379

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=15m

# MAXPOINT
MXP_SERVER=192.168.1.100
MXP_DATABASE=MAXPOINT
MXP_USER=user
MXP_PASSWORD=pass
MXP_POLLING_INTERVAL=3000

# Heartbeat
HEARTBEAT_INTERVAL=10000
HEARTBEAT_TIMEOUT=30000
```

---

## Funcionalidades Implementadas

- [x] Sistema base KDS con backoffice
- [x] Vista previa de pantallas en tiempo real
- [x] Dashboard con reportes PDF
- [x] Gestión de usuarios (ADMIN, OPERATOR, VIEWER)
- [x] Auto-redistribución de órdenes cuando una pantalla se desconecta
- [x] Botonera con soporte para combos y power toggle
- [x] Sincronización de estado en tiempo real
- [x] Configuración de apariencia por pantalla
- [x] Filtros de productos por cola
- [x] Sistema de auditoría
