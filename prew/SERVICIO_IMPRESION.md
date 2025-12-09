# Servicio de Impresión - Distribuidor KDS

## Descripción General

El servicio de impresión del Distribuidor KDS permite generar tickets físicos de las comandas mediante impresoras térmicas. Soporta múltiples métodos de conexión y genera tickets con formato ESC/POS incluyendo códigos QR.

## Archivos de Referencia

Los archivos fuente que implementan esta funcionalidad se encuentran en la carpeta `files/`:

| Archivo | Descripción |
|---------|-------------|
| [`files/Impresion.cs`](files/Impresion.cs) | Clase principal del servicio de impresión |
| [`files/ScreenManager.cs`](files/ScreenManager.cs) | Orquestación de impresión desde acciones |
| [`files/Comanda.cs`](files/Comanda.cs) | Modelo de datos de comanda para impresión |
| [`files/tComanda.cs`](files/tComanda.cs) | Modelo de comanda en memoria |
| [`files/Configuracion.cs`](files/Configuracion.cs) | Configuración de impresoras |
| [`files/LogProcesos.cs`](files/LogProcesos.cs) | Sistema de logs para seguimiento |

---

## Arquitectura del Servicio

### Ubicación del Código
- **Archivo principal**: `KDS/Modulos/Impresion.cs` → [`files/Impresion.cs`](files/Impresion.cs)
- **Namespace**: `grupoKFC.Core.DistribuidorKDS.CD.Modulos`

### Dependencias
- `System.Net.Sockets` - Conexión TCP/IP directa
- `System.Text` - Codificación de caracteres
- `System.Drawing` - Generación de imágenes QR
- `QRCoder` - Biblioteca para códigos QR

---

## Métodos de Impresión

El sistema soporta dos métodos de impresión:

### 1. Impresión TCP/IP Directa (ESC/POS)

Conexión directa a la impresora térmica mediante socket TCP.

```
Protocolo: TCP/IP
Puerto típico: 9100
Formato: ESC/POS (Epson Standard Code)
```

#### Flujo de Impresión Directa

1. Establece conexión TCP con la impresora
2. Envía comandos ESC/POS para formato
3. Transmite datos del ticket línea por línea
4. Genera y envía imagen QR como bitmap
5. Envía comando de corte de papel
6. Cierra conexión

### 2. Impresión vía API HTTP

Delegación de impresión a un servicio externo.

```
Método: POST
Endpoint: http://{ipImpresora}:{puerto}/api/ImpresionTickets/Impresion
Content-Type: application/json
```

#### Payload de Impresión HTTP

```json
{
  "comanda": {
    "id": "ORD-001",
    "orderId": "12345",
    "products": [...],
    "otrosDatos": {...}
  },
  "configuracion": {
    "columnas": 42,
    "impresora": "EPSON-TM-T20"
  }
}
```

---

## Métodos Principales

### ImprimirComanda()

Actualiza el estado de impresión en la base de datos MXP.

```csharp
public void ImprimirComanda(
    string idOrden,
    string nombreImpresora,
    string ipImpresora
)
```

#### Parámetros

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `idOrden` | string | ID único de la orden |
| `nombreImpresora` | string | Nombre identificador de la impresora |
| `ipImpresora` | string | Dirección IP de la impresora |

#### Operaciones en Base de Datos

1. **Actualiza `Detalle_Orden_Pedido`**:
   - Registra nombre de impresora
   - Registra IP de impresora
   - Marca como impreso

2. **Actualiza `Canal_Movimiento`**:
   - Establece estado = 51 (impreso)

#### Reintentos
- Configurado con reintentos automáticos en caso de fallo de conexión

---

### ImprimirComandaDetalle()

Método principal para impresión física del ticket.

```csharp
public void ImprimirComandaDetalle(
    Comanda comanda,
    string datos,
    string ipImpresora,
    int puerto,
    int columnas
)
```

#### Parámetros

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `comanda` | Comanda | Objeto completo de la comanda |
| `datos` | string | JSON serializado de la comanda |
| `ipImpresora` | string | IP de la impresora térmica |
| `puerto` | int | Puerto TCP (típicamente 9100) |
| `columnas` | int | Ancho del papel en caracteres |

#### Estructura del Ticket Impreso

```
┌─────────────────────────────────┐
│ [CANAL DE VENTA]                │  ← Negrita, centrado
│ TURNO: A001 / TX: 00125         │
├─────────────────────────────────┤
│ Cajero: Juan Pérez              │
│ Fecha: 15/01/2024 10:30         │
│ Llamar por: CLIENTE             │
├─────────────────────────────────┤
│ Dirección: Av. Principal 123    │  ← Solo si aplica
├─────────────────────────────────┤
│ 2x Combo Original               │  ← Cantidad + Producto
│    • Sin mayonesa               │  ← Modificadores (content)
│    • Extra picante              │
│    └─ 2x Papas Grandes          │  ← Subproductos
│       • Con sal                 │
│                                 │
│ 1x Refresco Grande              │
│    • Sin hielo                  │
├─────────────────────────────────┤
│         [CÓDIGO QR]             │  ← Número de cheque
│                                 │
│      CHEQUE: 00125              │  ← Negrita, grande
├─────────────────────────────────┤
│ REIMPRESIÓN: 1                  │  ← Solo si es reimpresión
└─────────────────────────────────┘
          ✂ CORTE
```

---

## Formato ESC/POS

### Códigos de Control Utilizados

El sistema utiliza comandos ESC/POS estándar para formato:

#### Inicialización
```
ESC @ (0x1B 0x40) - Reiniciar impresora
```

#### Tipografía

| Código | Comando ESC/POS | Efecto |
|--------|-----------------|--------|
| `<b>` | `ESC E 1` | Negrita ON |
| `</b>` | `ESC E 0` | Negrita OFF |
| `<i>` | `ESC 4 1` | Cursiva ON |
| `</i>` | `ESC 4 0` | Cursiva OFF |
| `<u>` | `ESC - 1` | Subrayado ON |
| `</u>` | `ESC - 0` | Subrayado OFF |

#### Tamaños de Fuente

| Fuente | Comando | Descripción |
|--------|---------|-------------|
| Fuente 0 | `GS ! 0x00` | Normal |
| Fuente 1 | `GS ! 0x01` | Ancho doble |
| Fuente 2 | `GS ! 0x10` | Alto doble |
| Fuente 3 | `GS ! 0x11` | Ancho y alto doble |

#### Alineación

| Alineación | Comando |
|------------|---------|
| Izquierda | `ESC a 0` |
| Centro | `ESC a 1` |
| Derecha | `ESC a 2` |

#### Corte de Papel
```
GS V 66 0 (0x1D 0x56 0x42 0x00) - Corte parcial con avance
```

---

## Generación de Código QR

### Proceso de Generación

1. Utiliza la biblioteca `QRCoder`
2. Genera QR con el número de cheque
3. Convierte a imagen bitmap
4. Escala según configuración
5. Convierte a formato ESC/POS bitmap

### Configuración QR

```csharp
QRCodeGenerator.ECCLevel.Q  // Nivel de corrección de errores
pixelsPerModule: 4          // Tamaño de módulos
```

### Comando ESC/POS para Imagen

```
GS v 0 (0x1D 0x76 0x30) - Imprimir imagen raster
+ Parámetros de ancho/alto
+ Datos de bitmap
```

---

## Configuración de Impresoras

### Estructura de Configuración por Pantalla

```json
{
  "pantallas": [
    {
      "nombre": "Pantalla-Cocina-1",
      "ip": "192.168.1.100",
      "imprime": true,
      "impresoraNombre": "EPSON-TM-T20",
      "impresoraIP": "192.168.1.200",
      "impresoraPuerto": 9100,
      "columnas": 42
    }
  ]
}
```

### Parámetros de Impresora

| Parámetro | Tipo | Descripción | Valor típico |
|-----------|------|-------------|--------------|
| `imprime` | bool | Habilita impresión | true/false |
| `impresoraNombre` | string | Identificador | "EPSON-TM-T20" |
| `impresoraIP` | string | IP de la impresora | "192.168.1.200" |
| `impresoraPuerto` | int | Puerto TCP | 9100 |
| `columnas` | int | Ancho en caracteres | 42, 48, 32 |

### Anchos de Papel Comunes

| Modelo | Ancho (mm) | Columnas |
|--------|------------|----------|
| 58mm | 58 | 32 |
| 80mm | 80 | 42-48 |

---

## Impresión Automática (Sin Pantallas Activas)

### Escenario

Cuando no hay pantallas activas en una cola, el sistema puede imprimir automáticamente las comandas.

### Flujo

1. `DistribuidorPantallas.AsignarPantalla()` detecta cola sin pantallas activas
2. Registra evento "Sin Pantallas Activas"
3. Crea instancia de `Impresion()`
4. Ejecuta `ImprimirComandaDetalle()` con impresora de la cola
5. Marca comanda como cerrada via `SP_ComandaCerrarSinPantallas`

### Configuración

La impresora utilizada se toma de la primera pantalla configurada en la cola, o de una impresora por defecto del sistema.

---

## Reimpresión

### Contador de Reimpresiones

El sistema mantiene un contador de reimpresiones por comanda en la entidad `tComanda`:

```csharp
public int Reimpresion { get; set; }  // Contador en tComanda
```

### Indicación en Ticket

Cuando `Reimpresion > 0`, el ticket incluye:

```
═══════════════════════════════════
        REIMPRESIÓN: {N}
═══════════════════════════════════
```

### Proceso de Reimpresión

1. Usuario envía acción `REIMPRIMIR` via POST /comandas
2. `ScreenManager` incrementa contador de reimpresión
3. Se ejecuta `ImprimirComandaDetalle()`
4. Se actualiza base de datos MXP

---

## Métodos Auxiliares

### CodigosFormato()

Convierte tags de formato a códigos ESC/POS.

```csharp
private byte[] CodigosFormato(string formato)
// "<b>" → ESC E 1
// "</b>" → ESC E 0
// etc.
```

### ConvertirEnRenglones()

Convierte texto a bytes con saltos de línea apropiados.

```csharp
private byte[] ConvertirEnRenglones(string texto)
```

### separarDescripcion()

Divide líneas largas según el ancho de columnas disponible.

```csharp
private List<string> separarDescripcion(string descripcion, int columnas)
```

### quitarTildes()

Normaliza caracteres especiales para compatibilidad con impresoras.

```csharp
private string quitarTildes(string texto)
// á → a, é → e, ñ → n, etc.
```

### StringToByteArray()

Convierte cadenas hexadecimales a arrays de bytes.

```csharp
private byte[] StringToByteArray(string hex)
// "1B40" → { 0x1B, 0x40 }
```

---

## Manejo de Errores

### Errores de Conexión TCP

```csharp
try
{
    TcpClient client = new TcpClient();
    client.Connect(ipImpresora, puerto);
    // ...
}
catch (SocketException ex)
{
    LogProcesos.Instance.Escribir(
        $"ERROR: No se pudo conectar a impresora {ipImpresora}:{puerto}"
    );
}
```

### Timeout de Conexión

- Timeout de conexión: 5 segundos
- Timeout de escritura: 30 segundos

### Logging

Todos los errores se registran en el sistema de logs:
- Ubicación: `{App}/logs/log YYYY-MM-DD.txt`
- Nivel: ERROR

---

## Compatibilidad de Impresoras

### Impresoras Probadas

| Marca | Modelo | Compatibilidad |
|-------|--------|----------------|
| Epson | TM-T20 | ✅ Completa |
| Epson | TM-T88V | ✅ Completa |
| Star | TSP100 | ✅ Completa |
| Bixolon | SRP-350 | ✅ Completa |

### Requisitos de Impresora

- Soporte protocolo ESC/POS
- Conexión de red TCP/IP
- Puerto de impresión accesible (típicamente 9100)
- Capacidad de impresión de imágenes raster (para QR)

---

## Ejemplo de Implementación

### Impresión Manual desde Código

```csharp
// Crear instancia de impresión
var impresion = new Impresion();

// Obtener comanda
var comanda = bdKDS2.Instance.ObtenerComanda(idOrden);

// Configuración de impresora
string ipImpresora = "192.168.1.200";
int puerto = 9100;
int columnas = 42;

// Ejecutar impresión
impresion.ImprimirComandaDetalle(
    comanda,
    JsonConvert.SerializeObject(comanda),
    ipImpresora,
    puerto,
    columnas
);

// Actualizar estado en base de datos
impresion.ImprimirComanda(
    comanda.id,
    "EPSON-TM-T20",
    ipImpresora
);
```

### Verificación de Conectividad

```csharp
public bool VerificarImpresora(string ip, int puerto)
{
    try
    {
        using var client = new TcpClient();
        var result = client.BeginConnect(ip, puerto, null, null);
        var success = result.AsyncWaitHandle.WaitOne(TimeSpan.FromSeconds(2));

        if (success && client.Connected)
        {
            client.EndConnect(result);
            return true;
        }
        return false;
    }
    catch
    {
        return false;
    }
}
```

---

## Consideraciones de Red

### Configuración de Firewall

Asegurar que el puerto de la impresora (típicamente 9100) esté accesible:

```
Protocolo: TCP
Puerto: 9100 (o el configurado)
Dirección: IP de la impresora
```

### Latencia

- Latencia recomendada: < 50ms
- La impresión puede fallar con latencias altas o conexiones inestables

### VLAN / Segmentación

Si las impresoras están en una VLAN diferente, asegurar enrutamiento apropiado entre el servidor KDS y las impresoras.

---

## Solución de Problemas

### Impresora no responde

1. Verificar conectividad: `ping {IP_IMPRESORA}`
2. Verificar puerto: `telnet {IP_IMPRESORA} 9100`
3. Revisar configuración de red de la impresora
4. Verificar que no haya otro proceso ocupando la impresora

### Caracteres incorrectos

1. Verificar codificación (el sistema usa normalización de tildes)
2. Verificar configuración de code page de la impresora
3. Usar método `quitarTildes()` para caracteres problemáticos

### QR no imprime

1. Verificar que la impresora soporte impresión de imágenes raster
2. Verificar que la biblioteca QRCoder esté correctamente referenciada
3. Revisar logs para errores de generación de imagen

### Corte no funciona

1. Algunos modelos requieren comandos de corte diferentes
2. Verificar configuración física del cortador
3. Probar comando de corte manual desde herramienta de diagnóstico
