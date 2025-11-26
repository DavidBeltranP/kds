# BALANCEO DE PANTALLAS KDS

## 1. Introducción

El sistema de balanceo es uno de los componentes más críticos del KDS. Su función principal es distribuir equitativamente las comandas entre las pantallas que comparten la misma cola de trabajo.

## 2. Conceptos Clave

### 2.1 Cola (Queue)

Una cola agrupa canales de venta y define qué productos se muestran:

```typescript
interface Queue {
  id: string;
  name: string;           // "LINEAS", "SANDUCHE"
  distribution: 'D' | 'S'; // D=Distribuida, S=Single
  channels: string[];      // Canales de venta
  filters: string[];       // Filtros de productos
}
```

### 2.2 Pantalla (Screen)

```typescript
interface Screen {
  id: string;
  name: string;
  ip: string;
  queueId: string;
  status: 'ONLINE' | 'OFFLINE' | 'STANDBY';
  lastHeartbeat: Date;
}
```

### 2.3 Orden (Order)

```typescript
interface Order {
  id: string;
  externalId: string;    // ID de MAXPOINT
  channel: string;       // Canal de venta
  items: OrderItem[];
  createdAt: Date;
  assignedScreenId?: string;
}
```

## 3. Algoritmo de Balanceo

### 3.1 Diagrama de Flujo

```
┌─────────────────────────────────────────────────────────────────┐
│                    CICLO DE BALANCEO                            │
│                    (cada 2 segundos)                            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                 ┌────────────────────────┐
                 │  1. Leer nuevas órdenes │
                 │     de MAXPOINT         │
                 └───────────┬────────────┘
                              │
                              ▼
                 ┌────────────────────────┐
                 │  2. Obtener pantallas   │
                 │     activas por cola    │
                 └───────────┬────────────┘
                              │
                              ▼
                 ┌────────────────────────┐
                 │  3. Aplicar filtros     │
                 │     por cola            │
                 └───────────┬────────────┘
                              │
                              ▼
                 ┌────────────────────────┐
                 │  4. Distribuir órdenes  │
                 │     (Round-Robin)       │
                 └───────────┬────────────┘
                              │
                              ▼
                 ┌────────────────────────┐
                 │  5. Emitir a pantallas  │
                 │     vía WebSocket       │
                 └────────────────────────┘
```

### 3.2 Implementación Round-Robin

```typescript
class BalancerService {
  private screenIndex: Map<string, number> = new Map();

  distributeOrders(
    orders: Order[],
    screens: Screen[],
    queue: Queue
  ): Map<string, Order[]> {
    const result = new Map<string, Order[]>();
    const activeScreens = screens.filter(s => s.status === 'ONLINE');

    if (activeScreens.length === 0) {
      return result;
    }

    // Inicializar resultado
    activeScreens.forEach(s => result.set(s.id, []));

    // Obtener índice actual para esta cola
    let currentIndex = this.screenIndex.get(queue.id) || 0;

    // Distribuir órdenes
    for (const order of orders) {
      // Aplicar filtros de cola
      if (!this.passesFilters(order, queue.filters)) {
        continue;
      }

      // Asignar a pantalla actual
      const screen = activeScreens[currentIndex % activeScreens.length];
      result.get(screen.id)!.push(order);

      // Avanzar índice
      currentIndex++;
    }

    // Guardar índice para siguiente ciclo
    this.screenIndex.set(queue.id, currentIndex);

    return result;
  }

  private passesFilters(order: Order, filters: string[]): boolean {
    if (filters.length === 0) return true;

    return order.items.some(item =>
      filters.some(filter =>
        item.name.toLowerCase().includes(filter.toLowerCase())
      )
    );
  }
}
```

## 4. Gestión de Estado de Pantallas

### 4.1 Heartbeat

Cada pantalla envía un heartbeat cada 5 segundos:

```typescript
// Cliente (KDS Frontend)
setInterval(() => {
  socket.emit('screen:heartbeat', {
    screenId: config.screenId,
    timestamp: Date.now()
  });
}, 5000);

// Servidor (Backend)
socket.on('screen:heartbeat', async (data) => {
  await screenService.updateHeartbeat(data.screenId);
  await redis.setex(
    `screen:${data.screenId}:alive`,
    10, // TTL 10 segundos
    'true'
  );
});
```

### 4.2 Detección de Pantalla Inactiva

```typescript
class ScreenService {
  async getActiveScreens(queueId: string): Promise<Screen[]> {
    const screens = await prisma.screen.findMany({
      where: { queueId }
    });

    const activeScreens: Screen[] = [];

    for (const screen of screens) {
      const isAlive = await redis.get(`screen:${screen.id}:alive`);
      if (isAlive) {
        activeScreens.push(screen);
      }
    }

    return activeScreens;
  }
}
```

### 4.3 Transiciones de Estado

```
                    ┌───────────────────────────────────────┐
                    │         DIAGRAMA DE ESTADOS           │
                    └───────────────────────────────────────┘

    ┌─────────┐                                      ┌─────────┐
    │ OFFLINE │◄────────── timeout (10s) ───────────│ ONLINE  │
    └────┬────┘                                      └────┬────┘
         │                                                │
         │  heartbeat                                     │
         │  recibido                                      │ botonera
         │                                                │ (i + g)
         │                                                │ 3 segundos
         │                                                ▼
         │                                           ┌─────────┐
         └──────────────────────────────────────────►│ STANDBY │
                     heartbeat recibido              └────┬────┘
                                                          │
                                                          │ botonera
                                                          │ (i + g)
                                                          │
                                                          ▼
                                                     ┌─────────┐
                                                     │ ONLINE  │
                                                     └─────────┘
```

## 5. Escenarios de Balanceo

### 5.1 Escenario Normal (2 Pantallas Activas)

```
Cola LINEAS: Pantalla1 (ONLINE) + Pantalla2 (ONLINE)

Órdenes entrantes: O1, O2, O3, O4, O5, O6

Distribución:
- Pantalla1: O1, O3, O5
- Pantalla2: O2, O4, O6
```

### 5.2 Escenario con Pantalla Apagada

```
Cola LINEAS: Pantalla1 (ONLINE) + Pantalla2 (STANDBY)

Órdenes entrantes: O1, O2, O3, O4, O5, O6

Distribución:
- Pantalla1: O1, O2, O3, O4, O5, O6
- Pantalla2: (ninguna - está en STANDBY)
```

### 5.3 Escenario de Recuperación

```
Estado inicial:
- Pantalla1: O1, O2, O3 (ONLINE)
- Pantalla2: (STANDBY)

Pantalla2 vuelve a ONLINE:

Nuevas órdenes: O4, O5, O6

Distribución:
- Pantalla1: O1, O2, O3, O4, O6
- Pantalla2: O5
```

## 6. Reglas de Negocio

### 6.1 Reglas de Asignación

1. **Una orden, una pantalla**: Cada orden se asigna a exactamente una pantalla
2. **Persistencia**: Una vez asignada, la orden permanece en esa pantalla hasta ser finalizada
3. **Filtros de cola**: Las órdenes solo van a pantallas cuya cola acepte los productos

### 6.2 Reglas de Balanceo

1. **Solo pantallas activas**: El balanceo ignora pantallas OFFLINE o STANDBY
2. **Distribución equitativa**: Round-robin para carga balanceada
3. **Independencia por cola**: Cada cola tiene su propio contador de round-robin

### 6.3 Reglas de STANDBY

1. **STANDBY no es OFFLINE**: La pantalla sigue enviando heartbeat pero no recibe órdenes
2. **Transición suave**: Al salir de STANDBY, la pantalla empieza a recibir nuevas órdenes
3. **Órdenes existentes**: Las órdenes ya asignadas permanecen (no se redistribuyen)

## 7. API de Balanceo

### 7.1 Endpoints

```
GET  /api/queues/:queueId/balance-status
POST /api/screens/:screenId/standby
POST /api/screens/:screenId/activate
GET  /api/screens/:screenId/orders
```

### 7.2 WebSocket Events

```typescript
// Servidor emite cuando hay cambios en el balanceo
socket.to(screenId).emit('orders:update', {
  orders: Order[],
  totalInQueue: number,
  activeScreensInQueue: number
});

// Cliente informa cambio de estado
socket.emit('screen:status', {
  screenId: string,
  status: 'ONLINE' | 'STANDBY'
});
```

## 8. Monitoreo

### 8.1 Métricas

- Órdenes por pantalla (promedio, máximo)
- Tiempo de asignación
- Pantallas activas por cola
- Tasa de heartbeat

### 8.2 Logs

```
[BALANCER] 2025-11-25 10:30:00 - Queue LINEAS: 2 active screens
[BALANCER] 2025-11-25 10:30:00 - Distributed 6 orders: P1=3, P2=3
[BALANCER] 2025-11-25 10:30:05 - Screen P2 went STANDBY
[BALANCER] 2025-11-25 10:30:05 - Queue LINEAS: 1 active screen
[BALANCER] 2025-11-25 10:30:10 - Distributed 4 orders: P1=4
```

## 9. Configuración

### 9.1 Parámetros Configurables

```typescript
interface BalancerConfig {
  heartbeatInterval: number;    // ms, default: 5000
  heartbeatTimeout: number;     // ms, default: 10000
  pollInterval: number;         // ms, default: 2000
  redistributeOnReactivate: boolean; // default: false
}
```

### 9.2 Configuración por Cola

```typescript
interface QueueBalanceConfig {
  queueId: string;
  strategy: 'round-robin' | 'least-loaded';
  maxOrdersPerScreen: number;
  priorityChannels: string[];
}
```

## 10. Troubleshooting

### 10.1 Problemas Comunes

| Problema | Causa Probable | Solución |
|----------|----------------|----------|
| Órdenes no llegan | Heartbeat no se recibe | Verificar conexión WebSocket |
| Desbalanceo | Pantalla con alta latencia | Revisar red de la pantalla |
| Órdenes duplicadas | Reconexión durante asignación | Verificar idempotencia |

### 10.2 Comandos de Diagnóstico

```bash
# Ver estado de pantallas en Redis
redis-cli keys "screen:*:alive"

# Ver contador de round-robin
redis-cli get "balancer:queue:LINEAS:index"

# Ver órdenes asignadas
redis-cli smembers "screen:P1:orders"
```
