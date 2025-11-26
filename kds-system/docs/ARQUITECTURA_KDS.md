# ARQUITECTURA KDS v2.0

## 1. Visión General

El sistema KDS (Kitchen Display System) v2.0 es una solución completa para la gestión de comandas en cocina, compuesta por tres componentes principales:

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                            KDS SYSTEM v2.0                                       │
│                                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐   │
│  │   BACKOFFICE │    │  KDS BACKEND │    │ KDS FRONTEND │    │  PostgreSQL  │   │
│  │    (React)   │◄──►│  (Node.js)   │◄──►│   (React)    │    │    + Redis   │   │
│  │   Puerto 80  │    │  Puerto 3000 │    │  Puerto 8080 │    │  5432/6379   │   │
│  └──────────────┘    └──────────────┘    └──────────────┘    └──────────────┘   │
│                             │                                        ▲          │
│                             │                                        │          │
│                             └────────────────────────────────────────┘          │
│                                                                                  │
│                      ┌──────────────────────────────────────┐                   │
│                      │         MAXPOINT (SQL Server)         │                   │
│                      │            Base de datos POS          │                   │
│                      └──────────────────────────────────────┘                   │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## 2. Stack Tecnológico

### 2.1 Backend (API)
| Componente | Tecnología | Versión |
|------------|------------|---------|
| Runtime | Node.js | 20 LTS |
| Framework | Express.js | 4.18+ |
| Lenguaje | TypeScript | 5.x |
| ORM | Prisma | 5.x |
| Base de Datos | PostgreSQL | 15 |
| Cache/PubSub | Redis | 7 |
| WebSockets | Socket.IO | 4.x |
| Validación | Zod | 3.x |
| Auth | JWT | - |

### 2.2 Frontend KDS
| Componente | Tecnología | Versión |
|------------|------------|---------|
| Framework | React | 18.x |
| Lenguaje | TypeScript | 5.x |
| Estado | Zustand | 4.x |
| Estilos | TailwindCSS | 3.x |
| WebSockets | Socket.IO Client | 4.x |
| Build | Vite | 5.x |

### 2.3 Backoffice
| Componente | Tecnología | Versión |
|------------|------------|---------|
| Framework | React | 18.x |
| Lenguaje | TypeScript | 5.x |
| UI Kit | Ant Design | 5.x |
| Estado | Zustand | 4.x |
| Router | React Router | 6.x |
| Build | Vite | 5.x |

## 3. Arquitectura de Componentes

### 3.1 Backend - Módulos

```
backend/
├── src/
│   ├── config/           # Configuración de la aplicación
│   │   ├── database.ts   # Conexión PostgreSQL
│   │   ├── redis.ts      # Conexión Redis
│   │   ├── mxp.ts        # Conexión MAXPOINT
│   │   └── env.ts        # Variables de entorno
│   │
│   ├── controllers/      # Controladores REST
│   │   ├── auth.controller.ts
│   │   ├── screen.controller.ts
│   │   ├── queue.controller.ts
│   │   ├── order.controller.ts
│   │   ├── config.controller.ts
│   │   └── button.controller.ts
│   │
│   ├── services/         # Lógica de negocio
│   │   ├── mxp.service.ts         # Lectura de MAXPOINT
│   │   ├── balancer.service.ts    # Balanceo de pantallas
│   │   ├── order.service.ts       # Gestión de órdenes
│   │   ├── screen.service.ts      # Estado de pantallas
│   │   ├── printer.service.ts     # Impresión TCP
│   │   └── websocket.service.ts   # Comunicación real-time
│   │
│   ├── models/           # Modelos Prisma
│   ├── middlewares/      # Middlewares Express
│   ├── routes/           # Definición de rutas
│   ├── utils/            # Utilidades
│   └── types/            # Tipos TypeScript
│
├── prisma/
│   └── schema.prisma     # Esquema de base de datos
│
└── Dockerfile
```

### 3.2 KDS Frontend - Módulos

```
kds-frontend/
├── src/
│   ├── components/
│   │   ├── OrderCard/        # Tarjeta de orden
│   │   ├── OrderGrid/        # Grid de órdenes
│   │   ├── Header/           # Encabezado
│   │   ├── Footer/           # Pie con contadores
│   │   ├── StandbyScreen/    # Pantalla de standby
│   │   └── Pagination/       # Paginación
│   │
│   ├── hooks/
│   │   ├── useOrders.ts      # Hook de órdenes
│   │   ├── useWebSocket.ts   # Hook de WebSocket
│   │   ├── useKeyboard.ts    # Hook de botonera
│   │   └── useConfig.ts      # Hook de configuración
│   │
│   ├── services/
│   │   ├── api.ts            # Cliente API
│   │   └── socket.ts         # Cliente WebSocket
│   │
│   ├── store/
│   │   ├── orderStore.ts     # Estado de órdenes
│   │   ├── configStore.ts    # Estado de config
│   │   └── screenStore.ts    # Estado de pantalla
│   │
│   └── utils/
│       ├── buttonController.ts  # Controlador de botonera
│       └── timeUtils.ts         # Utilidades de tiempo
│
└── Dockerfile
```

### 3.3 Backoffice - Módulos

```
backoffice/
├── src/
│   ├── pages/
│   │   ├── Login/            # Autenticación
│   │   ├── Dashboard/        # Panel principal
│   │   ├── Screens/          # Gestión de pantallas
│   │   ├── Queues/           # Gestión de colas
│   │   ├── Appearance/       # Configuración visual
│   │   ├── Keyboard/         # Configuración botonera
│   │   └── Settings/         # Configuración general
│   │
│   ├── components/
│   │   ├── Layout/           # Layout principal
│   │   ├── ColorPicker/      # Selector de colores
│   │   ├── ScreenPreview/    # Vista previa
│   │   └── Forms/            # Formularios
│   │
│   └── services/
│       └── api.ts            # Cliente API
│
└── Dockerfile
```

## 4. Comunicación entre Componentes

### 4.1 Protocolos

```
┌─────────────┐         REST/HTTP          ┌─────────────┐
│  Backoffice │◄─────────────────────────►│   Backend   │
└─────────────┘                            └──────┬──────┘
                                                  │
                                           WebSocket
                                           (Socket.IO)
                                                  │
                                           ┌──────▼──────┐
                                           │ KDS Frontend│
                                           │  (Screens)  │
                                           └─────────────┘
```

### 4.2 Eventos WebSocket

| Evento | Dirección | Descripción |
|--------|-----------|-------------|
| `screen:register` | Client → Server | Registro de pantalla |
| `screen:heartbeat` | Client → Server | Heartbeat cada 5s |
| `orders:update` | Server → Client | Actualización de órdenes |
| `config:update` | Server → Client | Cambio de configuración |
| `screen:standby` | Bidireccional | Modo standby on/off |
| `order:finish` | Client → Server | Finalizar orden |
| `order:undo` | Client → Server | Deshacer finalización |

## 5. Flujo de Datos

### 5.1 Lectura de Comandas (Polling)

```
┌─────────────┐    SQL cada 2s     ┌─────────────┐
│  MAXPOINT   │◄──────────────────►│   Backend   │
│  (SQL Srv)  │                    │  (Node.js)  │
└─────────────┘                    └──────┬──────┘
                                          │
                                    1. Leer comandas
                                    2. Aplicar filtros
                                    3. Calcular balanceo
                                    4. Emitir por WebSocket
                                          │
                        ┌─────────────────┼─────────────────┐
                        ▼                 ▼                 ▼
                  ┌──────────┐      ┌──────────┐      ┌──────────┐
                  │Pantalla 1│      │Pantalla 2│      │Pantalla 3│
                  │  LINEAS  │      │  LINEAS  │      │ SANDUCHE │
                  └──────────┘      └──────────┘      └──────────┘
```

### 5.2 Configuración en Tiempo Real

```
┌─────────────┐    POST /config    ┌─────────────┐
│  Backoffice │──────────────────►│   Backend   │
└─────────────┘                    └──────┬──────┘
                                          │
                                    1. Validar config
                                    2. Guardar en BD
                                    3. Publicar en Redis
                                    4. Emitir config:update
                                          │
                                          ▼
                                   ┌─────────────┐
                                   │   Pantallas │
                                   │ (Auto-apply)│
                                   └─────────────┘
```

## 6. Balanceo de Pantallas

### 6.1 Algoritmo de Balanceo

```typescript
interface BalanceStrategy {
  // Round-robin entre pantallas activas de la misma cola
  distributeOrders(orders: Order[], activeScreens: Screen[]): Map<string, Order[]>;
}
```

### 6.2 Reglas de Balanceo

1. **Solo pantallas activas**: El balanceo solo considera pantallas con heartbeat reciente (< 10s)
2. **Por cola**: Cada cola tiene su propio balanceo independiente
3. **Distribución equitativa**: Round-robin para distribuir carga
4. **Fallback**: Si una pantalla se apaga, sus órdenes se redistribuyen

### 6.3 Estados de Pantalla

```
┌─────────┐     heartbeat ok      ┌─────────┐
│ OFFLINE │──────────────────────►│  ONLINE │
└────┬────┘                       └────┬────┘
     │                                 │
     │      timeout > 10s              │ power off (botonera)
     │◄────────────────────────────────┤
     │                                 │
     │                            ┌────▼────┐
     └───────────────────────────►│ STANDBY │
              power on            └─────────┘
```

## 7. Seguridad

### 7.1 Autenticación

- **Backoffice**: JWT con refresh tokens
- **KDS Frontend**: API Key por pantalla
- **WebSocket**: Token de sesión

### 7.2 Autorización

| Rol | Permisos |
|-----|----------|
| admin | Todo |
| operator | Ver dashboard, cambiar colores |
| viewer | Solo lectura |

## 8. Persistencia

### 8.1 PostgreSQL (Datos permanentes)
- Configuraciones
- Pantallas
- Colas
- Usuarios
- Logs de auditoría

### 8.2 Redis (Datos volátiles)
- Estado de pantallas activas
- Órdenes en proceso
- Caché de configuración
- Pub/Sub para sincronización

## 9. Docker

### 9.1 Servicios

```yaml
services:
  postgres:     # Base de datos principal
  redis:        # Cache y PubSub
  backend:      # API Node.js
  kds-frontend: # Frontend para pantallas
  backoffice:   # Panel de administración
```

### 9.2 Redes

```
kds-network (bridge)
├── postgres:5432
├── redis:6379
├── backend:3000
├── kds-frontend:8080
└── backoffice:80
```

## 10. Escalabilidad

El sistema está diseñado para escalar horizontalmente:

- **Backend**: Múltiples instancias detrás de load balancer
- **Redis**: Cluster para alta disponibilidad
- **PostgreSQL**: Réplicas de lectura si es necesario
- **Frontend**: CDN para assets estáticos
