# KDS v2.0 - Configuracion Visual y Apariencia

## Resumen

El sistema KDS v2.0 permite configurar completamente la apariencia visual de cada pantalla de forma individual desde el Backoffice, sin necesidad de editar archivos de configuracion.

## Acceso a la Configuracion

1. Iniciar sesion en el Backoffice (http://localhost:8081)
2. Navegar a **Pantallas** en el menu lateral
3. Seleccionar una pantalla y hacer clic en **Configurar**
4. Ir a la pestana **Apariencia**

O acceder directamente desde:
- Menu lateral > **Apariencia**
- Seleccionar la pantalla a configurar

## Parametros de Configuracion

### Colores

| Parametro | Descripcion | Valor por defecto |
|-----------|-------------|-------------------|
| `backgroundColor` | Color de fondo de la pantalla | `#1a1a2e` |
| `headerColor` | Color de la cabecera | `#16213e` |
| `cardColor` | Color de las tarjetas de ordenes | `#0f3460` |
| `textColor` | Color del texto principal | `#e94560` |
| `accentColor` | Color de acentos y detalles | `#533483` |

### Layout

| Parametro | Descripcion | Rango | Defecto |
|-----------|-------------|-------|---------|
| `columns` | Columnas del grid | 1-8 | 4 |
| `rows` | Filas del grid | 1-6 | 3 |
| `fontSize` | Tamano de fuente | small/medium/large/xlarge | medium |

### Opciones de Visualizacion

| Parametro | Descripcion | Defecto |
|-----------|-------------|---------|
| `showTimer` | Mostrar tiempo transcurrido | true |
| `showOrderNumber` | Mostrar numero de orden | true |
| `animationEnabled` | Habilitar animaciones | true |

## Ejemplos de Configuracion

### Tema Oscuro (Por defecto)

```json
{
  "backgroundColor": "#1a1a2e",
  "headerColor": "#16213e",
  "cardColor": "#0f3460",
  "textColor": "#e94560",
  "accentColor": "#533483",
  "fontSize": "medium",
  "columns": 4,
  "rows": 3,
  "showTimer": true,
  "showOrderNumber": true,
  "animationEnabled": true
}
```

### Tema Claro

```json
{
  "backgroundColor": "#f5f5f5",
  "headerColor": "#1890ff",
  "cardColor": "#ffffff",
  "textColor": "#333333",
  "accentColor": "#52c41a",
  "fontSize": "medium",
  "columns": 4,
  "rows": 3
}
```

### Alta Visibilidad (Cocinas ruidosas)

```json
{
  "backgroundColor": "#000000",
  "headerColor": "#ff0000",
  "cardColor": "#1a1a1a",
  "textColor": "#ffffff",
  "accentColor": "#ffff00",
  "fontSize": "xlarge",
  "columns": 3,
  "rows": 2
}
```

### Grid Compacto (Muchas ordenes)

```json
{
  "columns": 6,
  "rows": 4,
  "fontSize": "small",
  "showTimer": false
}
```

## Calculo de Ordenes Visibles

```
Ordenes visibles = columns x rows
```

Ejemplos:
- 4x3 = 12 ordenes por pagina
- 6x4 = 24 ordenes por pagina
- 3x2 = 6 ordenes por pagina (alta visibilidad)

## Paginacion

Cuando hay mas ordenes que las visibles en el grid:
- Se crea paginacion automatica
- Footer muestra "Pagina X/Y"
- Navegacion con botonera fisica o teclado:
  - Tecla `3` = Siguiente pagina
  - Tecla `h` = Pagina anterior

## Aplicacion en Tiempo Real

Los cambios de configuracion se aplican **en tiempo real** via WebSocket:

1. Usuario guarda configuracion en Backoffice
2. Backend emite evento `config:update`
3. Pantalla KDS recibe nuevo config
4. UI se actualiza automaticamente

**No es necesario reiniciar la pantalla.**

## Presets Predefinidos

En el Backoffice se incluyen presets rapidos:

| Preset | Descripcion |
|--------|-------------|
| Default Dark | Tema oscuro equilibrado |
| High Contrast | Alto contraste para ambientes luminosos |
| Compact | Grid compacto para muchas ordenes |
| Large Display | Texto grande para pantallas alejadas |

## API de Configuracion

### Obtener Configuracion

```http
GET /api/screens/:id/config
Authorization: Bearer {token}
```

Response:
```json
{
  "id": "screen-1",
  "name": "Pantalla Pollos 1",
  "appearance": {
    "backgroundColor": "#1a1a2e",
    "headerColor": "#16213e",
    "cardColor": "#0f3460",
    "textColor": "#e94560",
    "accentColor": "#533483",
    "fontSize": "medium",
    "columns": 4,
    "rows": 3,
    "showTimer": true,
    "showOrderNumber": true,
    "animationEnabled": true
  },
  "keyboardConfig": {
    "enabled": true,
    "finishKey": "1",
    "nextPageKey": "3",
    "prevPageKey": "h",
    "standbyCombo": ["i", "g"],
    "standbyHoldTime": 3000
  }
}
```

### Actualizar Apariencia

```http
PUT /api/screens/:id/appearance
Authorization: Bearer {token}
Content-Type: application/json

{
  "backgroundColor": "#000000",
  "textColor": "#ffffff",
  "columns": 3,
  "rows": 2
}
```

## Diagrama de Flujo

```
┌─────────────────┐
│   Backoffice    │
│ (Configuracion) │
└────────┬────────┘
         │ PUT /api/screens/:id/appearance
         ▼
┌─────────────────┐
│     Backend     │
│   (API + WS)    │
└────────┬────────┘
         │ WebSocket: config:update
         ▼
┌─────────────────┐
│  KDS Frontend   │
│   (Pantalla)    │
└─────────────────┘
         │
         ▼
   Actualizacion
   Visual Inmediata
```

## Consideraciones de Usabilidad

### Contraste de Colores

Para maxima legibilidad:
- Diferencia minima de luminosidad entre fondo y texto: 4.5:1
- Evitar colores muy saturados para el fondo
- Usar colores de acento para resaltar informacion importante

### Tamano de Fuente por Distancia

| Distancia | Tamano Recomendado |
|-----------|-------------------|
| < 1m | small |
| 1-2m | medium |
| 2-3m | large |
| > 3m | xlarge |

### Grid por Volumen de Ordenes

| Ordenes/hora | Grid Recomendado |
|--------------|------------------|
| < 30 | 3x2 (6 visibles) |
| 30-60 | 4x3 (12 visibles) |
| 60-100 | 5x3 (15 visibles) |
| > 100 | 6x4 (24 visibles) |
