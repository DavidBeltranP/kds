# API REST - Distribuidor KDS

## Descripción General

El Distribuidor KDS expone una API REST que permite a las pantallas de cocina (Kitchen Display System) obtener su configuración y recibir las comandas asignadas. La API está construida sobre ASP.NET Core 6.0.

## Archivos de Referencia

Los archivos fuente que implementan esta funcionalidad se encuentran en la carpeta `files/`:

| Archivo | Descripción |
|---------|-------------|
| [`files/ComandasController.cs`](files/ComandasController.cs) | Controlador del endpoint POST /comandas |
| [`files/PantallaController.cs`](files/PantallaController.cs) | Controlador del endpoint GET /config |
| [`files/ScreenManager.cs`](files/ScreenManager.cs) | Gestión de comandas y acciones de pantalla |
| [`files/ConfigMaker.cs`](files/ConfigMaker.cs) | Singleton de configuración del sistema |
| [`files/Comanda.cs`](files/Comanda.cs) | Modelo de datos de comanda |
| [`files/Configuracion.cs`](files/Configuracion.cs) | Modelo de configuración del sistema |
| [`files/Acciones.cs`](files/Acciones.cs) | Modelo de acciones del usuario |

## Configuración Base

- **Framework**: ASP.NET Core 6.0
- **Puerto por defecto**: Configurable en `config.txt`
- **Formato de respuesta**: JSON
- **CORS**: Habilitado para todos los orígenes

---

## Endpoints

### 1. Obtener Configuración de Pantalla

```
GET /config
```

#### Descripción
Retorna la configuración específica de la pantalla que realiza la solicitud. El sistema identifica automáticamente la pantalla mediante su dirección IP.

#### Headers Requeridos
Ninguno específico. El sistema utiliza `HttpContext.Connection.RemoteIpAddress` para identificar la pantalla.

#### Respuesta Exitosa (200 OK)

```json
{
  "appearance": {
    "columns": 4,
    "fontSize": "medium",
    "theme": "dark"
  },
  "preferences": {
    "soundEnabled": true,
    "alertTime": 300,
    "autoRefresh": 5000
  },
  "pantalla": {
    "nombre": "Pantalla-Cocina-1",
    "ip": "192.168.1.100",
    "cola": "COCINA",
    "imprime": true,
    "impresoraNombre": "EPSON-TM-T20",
    "impresoraIP": "192.168.1.200",
    "impresoraPuerto": 9100
  }
}
```

#### Comportamiento Especial

- **Pantallas Espejo**: Si la pantalla está configurada como espejo (`reflejoDeIP`), el sistema redirige automáticamente a la configuración de la pantalla original.
- **Localhost**: Las solicitudes desde `127.0.0.1` o `::1` se traducen a la IP real del servidor.

#### Flujo Interno

1. Extrae IP del cliente desde `RemoteIpAddress`
2. Convierte IPv6 localhost a IPv4 si es necesario
3. Verifica si es pantalla espejo → redirige a IP oficial
4. Consulta `ConfigMaker.configuracionPantalla(ip)`
5. Retorna JSON con la configuración

---

### 2. Obtener y Actualizar Comandas

```
POST /comandas
```

#### Descripción
Endpoint principal para la interacción de las pantallas con el sistema. Permite:
- Recibir la lista de comandas asignadas a la pantalla
- Enviar acciones del usuario sobre las comandas (marcar como listas, reimprimir, etc.)

#### Request Body

```json
{
  "userActions": [
    {
      "idComanda": "ORD-2024-001",
      "accion": "COMPLETAR",
      "timestamp": "2024-01-15T10:30:00Z"
    },
    {
      "idComanda": "ORD-2024-002",
      "accion": "REIMPRIMIR",
      "timestamp": "2024-01-15T10:31:00Z"
    }
  ]
}
```

#### Acciones Disponibles

| Acción | Descripción |
|--------|-------------|
| `COMPLETAR` | Marca la comanda como terminada |
| `REIMPRIMIR` | Solicita reimpresión del ticket |
| `CANCELAR` | Cancela la comanda |
| `RECUPERAR` | Recupera una comanda cancelada |

#### Respuesta Exitosa (200 OK)

```json
{
  "comandas": [
    {
      "id": "ORD-2024-003",
      "orderId": "12345",
      "createdAt": "2024-01-15T10:25:00Z",
      "channel": {
        "id": 1,
        "name": "MOSTRADOR",
        "type": "LOCAL"
      },
      "cashRegister": {
        "cashier": "Juan Pérez",
        "name": "CAJA-01"
      },
      "customer": {
        "name": "Cliente General"
      },
      "products": [
        {
          "productId": "P001",
          "name": "Combo Original",
          "amount": 2,
          "category": "COMBOS",
          "content": [
            "Sin mayonesa",
            "Extra picante"
          ],
          "products": [
            {
              "productId": "SP001",
              "name": "Papas Grandes",
              "amount": 2,
              "content": ["Con sal"]
            }
          ]
        }
      ],
      "otrosDatos": {
        "turno": "A001",
        "llamarPor": "Juan",
        "nroCheque": "00125",
        "Fecha": "15/01/2024",
        "Direccion": ""
      },
      "impresion": {
        "estado": "PENDIENTE"
      }
    }
  ],
  "contador": {
    "Combo Original": 5,
    "Papas Grandes": 8,
    "Refresco": 12
  }
}
```

#### Flujo Interno

1. Extrae IP del cliente
2. Verifica pantalla espejo → obtiene IP oficial
3. Activa la pantalla en `ScreenChecker`
4. Procesa `userActions` mediante `ScreenManager.ActualizarComanda()`
5. Obtiene comandas de `bdKDS2` (memoria)
6. Aplica filtros configurados para la pantalla
7. Genera estructura de contador de productos
8. Serializa y retorna JSON

---

## Modelo de Datos

### Comanda

```
Comanda
├── id: string              // Identificador único interno
├── orderId: string         // ID de la orden en el POS
├── createdAt: datetime     // Fecha/hora de creación
├── channel                 // Canal de venta
│   ├── id: int
│   ├── name: string
│   └── type: string
├── cashRegister            // Información de caja
│   ├── cashier: string
│   └── name: string
├── customer                // Cliente
│   └── name: string
├── products[]              // Lista de productos
│   ├── productId: string
│   ├── name: string
│   ├── amount: int
│   ├── category: string
│   ├── content: string[]   // Modificadores/notas
│   └── products[]          // Subproductos
├── otrosDatos              // Datos adicionales
│   ├── turno: string
│   ├── llamarPor: string
│   ├── nroCheque: string
│   ├── Fecha: string
│   └── Direccion: string
└── impresion               // Estado de impresión
    └── estado: string
```

### ConfigPantalla

```
ConfigPantalla
├── appearance              // Configuración visual
│   ├── columns: int
│   ├── fontSize: string
│   └── theme: string
├── preferences             // Preferencias de comportamiento
│   ├── soundEnabled: bool
│   ├── alertTime: int
│   └── autoRefresh: int
└── pantalla                // Datos de la pantalla
    ├── nombre: string
    ├── ip: string
    ├── cola: string
    ├── imprime: bool
    ├── impresoraNombre: string
    ├── impresoraIP: string
    └── impresoraPuerto: int
```

---

## Identificación de Pantallas

El sistema identifica las pantallas mediante su dirección IP. El proceso es:

1. **Extracción de IP**: Se obtiene de `HttpContext.Connection.RemoteIpAddress`
2. **Normalización**:
   - IPv6 mapped (`::ffff:192.168.1.1`) → IPv4 (`192.168.1.1`)
   - Localhost (`127.0.0.1`, `::1`) → IP real del servidor
3. **Pantallas Espejo**: Si `reflejoDeIP` está configurado, se usa la IP de la pantalla principal

---

## Filtros de Comandas

Las pantallas pueden tener filtros configurados que determinan qué comandas visualizan:

### Tipos de Filtro

| Tipo | Descripción |
|------|-------------|
| `CANAL` | Filtra por canal de venta |
| `PRODUCTO` | Filtra por productos específicos |
| `CATEGORIA` | Filtra por categoría de producto |

### Aplicación de Filtros

Los filtros se aplican en `ScreenManager.AplicarFiltro()` al momento de retornar las comandas. Una comanda se muestra si cumple con TODOS los filtros configurados.

---

## Manejo de Errores

### Códigos de Estado HTTP

| Código | Descripción |
|--------|-------------|
| `200` | Operación exitosa |
| `400` | Request malformado |
| `404` | Pantalla no encontrada en configuración |
| `500` | Error interno del servidor |

### Respuesta de Error

```json
{
  "error": true,
  "message": "Descripción del error",
  "code": "ERROR_CODE"
}
```

---

## Ejemplo de Integración

### JavaScript/Fetch

```javascript
// Obtener configuración
const config = await fetch('http://servidor:puerto/config')
  .then(res => res.json());

// Obtener comandas con acciones
const response = await fetch('http://servidor:puerto/comandas', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    userActions: [
      { idComanda: 'ORD-001', accion: 'COMPLETAR' }
    ]
  })
});

const data = await response.json();
```

### C#/HttpClient

```csharp
using var client = new HttpClient();

// Obtener configuración
var config = await client.GetFromJsonAsync<ConfigPantalla>(
    "http://servidor:puerto/config");

// Enviar acciones y obtener comandas
var acciones = new {
    userActions = new[] {
        new { idComanda = "ORD-001", accion = "COMPLETAR" }
    }
};

var response = await client.PostAsJsonAsync(
    "http://servidor:puerto/comandas",
    acciones);

var comandas = await response.Content.ReadFromJsonAsync<ComandasResponse>();
```

---

## Polling Recomendado

Las pantallas deben realizar polling al endpoint `/comandas` para mantener la lista actualizada:

- **Intervalo recomendado**: 3-5 segundos
- **Mantiene activa la pantalla**: Cada request actualiza el timestamp en `ScreenChecker`
- **Timeout de inactividad**: Configurable en el sistema (pantallas sin request se marcan como inactivas)

---

## Consideraciones de Seguridad

- La API no implementa autenticación nativa
- Se recomienda uso en red privada/VPN
- CORS está habilitado para todos los orígenes (configurar según necesidad en producción)
- Las conexiones a base de datos usan `TrustServerCertificate=true`
