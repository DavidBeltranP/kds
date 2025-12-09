# Guía de Implementación - API e Impresión KDS

Esta guía proporciona instrucciones paso a paso para implementar el API REST y el servicio de impresión del sistema KDS en una nueva rama o proyecto.

---

## Índice

1. [Requisitos Previos](#1-requisitos-previos)
2. [Estructura de Archivos](#2-estructura-de-archivos)
3. [Implementación del API](#3-implementación-del-api)
4. [Implementación del Servicio de Impresión](#4-implementación-del-servicio-de-impresión)
5. [Modelos de Datos](#5-modelos-de-datos)
6. [Configuración](#6-configuración)
7. [Dependencias y NuGet](#7-dependencias-y-nuget)
8. [Orden de Implementación](#8-orden-de-implementación)
9. [Pruebas](#9-pruebas)

---

## 1. Requisitos Previos

### Framework
- .NET 6.0 o superior
- ASP.NET Core Web API

### Paquetes NuGet Requeridos
```xml
<PackageReference Include="Microsoft.Data.SqlClient" Version="5.x" />
<PackageReference Include="System.Text.Json" Version="6.x" />
```

### Base de Datos
- SQL Server con las bases KDS y MXP configuradas
- Stored Procedures requeridos (ver sección 6)

---

## 2. Estructura de Archivos

Crear la siguiente estructura en el nuevo proyecto:

```
NuevoProyecto/
├── Controllers/
│   ├── ComandasController.cs      ← desde files/ComandasController.cs
│   └── PantallaController.cs      ← desde files/PantallaController.cs
│
├── Entidades/
│   ├── Comanda.cs                 ← desde files/Comanda.cs
│   ├── Configuracion.cs           ← desde files/Configuracion.cs
│   ├── tComanda.cs                ← desde files/tComanda.cs
│   ├── tDistribucion.cs           ← desde files/tDistribucion.cs
│   └── Acciones.cs                ← desde files/Acciones.cs
│
├── Interfaces/
│   └── IConector.cs               ← desde files/IConector.cs
│
├── Repositorios/
│   └── ConectorSQL.cs             ← desde files/ConectorSQL.cs
│
├── Modulos/
│   ├── Impresion.cs               ← desde files/Impresion.cs
│   ├── ScreenManager.cs           ← desde files/ScreenManager.cs
│   ├── ConfigMaker.cs             ← desde files/ConfigMaker.cs
│   ├── ScreenChecker.cs           ← desde files/ScreenChecker.cs
│   ├── bdKDS2.cs                  ← desde files/bdKDS2.cs
│   └── LogProcesos.cs             ← desde files/LogProcesos.cs
│
└── Program.cs
```

---

## 3. Implementación del API

### Paso 3.1: Configurar Program.cs

```csharp
var builder = WebApplication.CreateBuilder(args);

// Agregar servicios
builder.Services.AddControllers();

// Configurar CORS
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

var app = builder.Build();

app.UseCors();
app.MapControllers();

// Inicializar configuración (antes de app.Run)
// ConfigReader.leerArchivo();  // Si se usa archivo config.txt
// ConfigMaker.Instance.leerBaseDatos(conexionKDS);

app.Run();
```

### Paso 3.2: Implementar PantallaController

**Archivo:** `Controllers/PantallaController.cs`
**Referencia:** [`files/PantallaController.cs`](files/PantallaController.cs)

```csharp
[ApiController]
[Route("")]
public class PantallaController : ControllerBase
{
    [HttpGet("config")]
    public async Task<IActionResult> Index()
    {
        var remoteIpAddress = Request.HttpContext.Connection.RemoteIpAddress;
        string ipOficial = ConfigMaker.Instance.EsPantallaEspejo(remoteIpAddress.ToString());
        string resultado = ConfigMaker.Instance.configuracionPantalla(ipOficial);
        return Ok(resultado);
    }
}
```

**Dependencias:**
- `ConfigMaker` - Singleton de configuración

### Paso 3.3: Implementar ComandasController

**Archivo:** `Controllers/ComandasController.cs`
**Referencia:** [`files/ComandasController.cs`](files/ComandasController.cs)

```csharp
[ApiController]
[Route("")]
public class ComandasController : ControllerBase
{
    [HttpPost("comandas")]
    public IActionResult ListarComandas([FromBody] Acciones listaComandas)
    {
        ScreenManager screenManager = new ScreenManager();
        var remoteIpAddress = Request.HttpContext.Connection.RemoteIpAddress;

        string IPAddress = remoteIpAddress.ToString();
        if (remoteIpAddress.ToString() == "::1")
        {
            IPAddress = ConfigMaker.Instance.configVisible.ipPropia;
        }

        string ipOficial = ConfigMaker.Instance.EsPantallaEspejo(IPAddress);
        screenManager.ActualizarComanda(listaComandas.userActions, ipOficial);
        string resultados = screenManager.MostrarComandas(ipOficial);

        if (resultados == null)
            resultados = "[]";

        return Ok(resultados);
    }
}
```

**Dependencias:**
- `ScreenManager` - Gestión de comandas
- `ConfigMaker` - Configuración
- `Acciones` - Modelo de entrada

---

## 4. Implementación del Servicio de Impresión

### Paso 4.1: Implementar clase Impresion

**Archivo:** `Modulos/Impresion.cs`
**Referencia:** [`files/Impresion.cs`](files/Impresion.cs)

#### Métodos principales a implementar:

##### 4.1.1 ImprimirComanda (Actualización BD)

```csharp
public int ImprimirComanda(string idComanda, string nombreImpresora, string ipImpresora)
{
    // 1. Conectar a base MXP
    IConector conector = new ConectorSQL();
    conector.sesionConexion(conexionMXP.ip, conexionMXP.usuario,
                            conexionMXP.clave, conexionMXP.catalogo);

    // 2. Actualizar Detalle_Orden_Pedido
    conector.consultaDatos("ordenId", SqlDbType.VarChar, idComanda);
    ((ConectorSQL)conector).query = @"UPDATE Detalle_Orden_Pedido
        SET dop_impresion = -1, dop_estado = 1 ...";
    conector.consultaResultados();

    // 3. Actualizar Canal_Movimiento
    ((ConectorSQL)conector).query = @"UPDATE Canal_Movimiento
        SET imp_impresora = @nombreImpresora, imp_float1 = 51 ...";
    conector.consultaResultados();

    return 1;
}
```

##### 4.1.2 ImprimirComandaDetalle (TCP/IP ESC/POS)

```csharp
public void ImprimirComandaDetalle(tComanda comandaResultado, Comanda unaComanda,
    string ipImpresora, int puerto, int columnasDetalles, string fuenteDetalles)
{
    // 1. Crear socket TCP
    Socket miSocket = new Socket(AddressFamily.InterNetwork,
                                  SocketType.Stream, ProtocolType.Tcp);
    IPEndPoint miDireccion = new IPEndPoint(IPAddress.Parse(ipImpresora), puerto);
    miSocket.Connect(miDireccion);

    // 2. Enviar cabecera (canal, turno, cajero, fecha)
    byte[] titulo = CodigosFormato(Tipografias.Fuente3)
        .Concat(ConvertirEnRenglones($"CANAL: {unaComanda.channel.name}"))
        .ToArray();
    miSocket.Send(titulo, SocketFlags.None);

    // 3. Enviar productos
    foreach (Product item in unaComanda.products)
    {
        // Formatear y enviar cada línea
    }

    // 4. Generar y enviar QR
    byte[] qr = GenerarCodigoQR(unaComanda.otrosDatos.nroCheque);
    miSocket.Send(qr, SocketFlags.None);

    // 5. Cortar papel
    byte[] corte = StringToByteArray("1b6d00");
    miSocket.Send(corte, SocketFlags.None);

    miSocket.Close();
}
```

##### 4.1.3 imprimirComandaNetCore (HTTP API)

```csharp
public async Task imprimirComandaNetCore(string nrocheque, string comanda,
    string ipImpresora, int puerto)
{
    var cliente = new HttpClient();
    var url = $"http://{ipImpresora}:{puerto}/api/ImpresionTickets/Impresion";
    var contenido = new StringContent(comanda, Encoding.UTF8, "application/json");
    var respuesta = await cliente.PostAsync(url, contenido);
}
```

### Paso 4.2: Códigos ESC/POS

Implementar el enum y método de códigos de formato:

```csharp
enum Tipografias
{
    Fuente0, NegritaOn, NegritaOFF, CursivaON, CursivaOFF,
    SubrayadoON, SubrayadoOFF, Fuente1, Fuente2, Fuente3
}

static byte[] CodigosFormato(Tipografias tipografia)
{
    string codigo = tipografia switch
    {
        Tipografias.NegritaOn => "1B4501",
        Tipografias.NegritaOFF => "1B4500",
        Tipografias.Fuente0 => "1D2100",    // Normal
        Tipografias.Fuente1 => "1D2111",    // Ancho+Alto doble
        Tipografias.Fuente2 => "1D2110",    // Alto doble
        Tipografias.Fuente3 => "1D2101",    // Ancho doble
        _ => ""
    };
    return StringToByteArray(codigo);
}
```

### Paso 4.3: Métodos auxiliares requeridos

```csharp
// Convertir hex string a bytes
public static byte[] StringToByteArray(String hex)
{
    int NumberChars = hex.Length / 2;
    byte[] bytes = new byte[NumberChars];
    for (int i = 0; i < NumberChars; i++)
        bytes[i] = Convert.ToByte(hex.Substring(i * 2, 2), 16);
    return bytes;
}

// Convertir texto a bytes con salto de línea
static byte[] ConvertirEnRenglones(string cadena)
{
    return Encoding.UTF8.GetBytes(cadena)
        .Concat(StringToByteArray("1B6400"))
        .ToArray();
}

// Quitar tildes para compatibilidad
private string quitarTildes(string cadena)
{
    return cadena
        .Replace("á", "a").Replace("é", "e").Replace("í", "i")
        .Replace("ó", "o").Replace("ú", "u")
        .Replace("Á", "A").Replace("É", "E").Replace("Í", "I")
        .Replace("Ó", "O").Replace("Ú", "U");
}
```

---

## 5. Modelos de Datos

### 5.1 Modelo Comanda

**Archivo:** `Entidades/Comanda.cs`
**Referencia:** [`files/Comanda.cs`](files/Comanda.cs)

```csharp
public class Comanda
{
    public string? id { get; set; }
    public string createdAt { get; set; }
    public string? orderId { get; set; }
    public ChannelC? channel { get; set; }
    public CashRegister? cashRegister { get; set; }
    public Customer? customer { get; set; }
    public List<Product>? products { get; set; }
    public OtrosDatos otrosDatos { get; set; }
    public string impresion { get; set; }
}

public class Product
{
    public string? productId { get; set; }
    public string? name { get; set; }
    public List<string>? content { get; set; }
    public int? amount { get; set; }
    public string? category { get; set; }
    public List<Product2>? products { get; set; }
}
```

### 5.2 Modelo Configuración

**Archivo:** `Entidades/Configuracion.cs`
**Referencia:** [`files/Configuracion.cs`](files/Configuracion.cs)

```csharp
public class Configuracion
{
    public Generales? Generales { get; set; }
    public ConexionMXP? ConexionMXP { get; set; }
    public ConexionKDS? ConexionKDS { get; set; }
    public List<Pantalla>? Pantallas { get; set; }
    public List<Cola>? Colas { get; set; }
    public Comandas? Comandas { get; set; }
    public string? ipPropia { get; set; }
}

public class Pantalla
{
    public string? nombre { get; set; }
    public string? ip { get; set; }
    public string? cola { get; set; }
    public string? imprime { get; set; }
    public string? impresoraNombre { get; set; }
    public string? impresoraIP { get; set; }
    public int impresoraPuerto { get; set; }
    public bool activa { get; set; }
    // ... otros campos
}
```

### 5.3 Modelo Acciones

**Archivo:** `Entidades/Acciones.cs`
**Referencia:** [`files/Acciones.cs`](files/Acciones.cs)

```csharp
public class Acciones
{
    public List<string> userActions { get; set; }
}
```

---

## 6. Configuración

### 6.1 Archivo config.txt

```json
{
  "Generales": {
    "tiempoVida": 300,
    "lecturaComandas": 3000,
    "cuentaProductos": true
  },
  "ConexionKDS": {
    "ip": "servidor",
    "usuario": "usuario",
    "clave": "clave",
    "catalogo": "KDS_DB"
  },
  "ConexionMXP": {
    "ip": "servidor",
    "usuario": "usuario",
    "clave": "clave",
    "catalogo": "MXP_DB"
  },
  "Comandas": {
    "imprimirMedio": "TCP",
    "columnasDetalles": 42,
    "fuenteDetalles": "NORMAL"
  },
  "Pantallas": [
    {
      "nombre": "Pantalla-1",
      "ip": "192.168.1.100",
      "cola": "COCINA",
      "imprime": "SI",
      "impresoraNombre": "EPSON",
      "impresoraIP": "192.168.1.200",
      "impresoraPuerto": 9100
    }
  ],
  "Colas": [
    {
      "nombre": "COCINA",
      "distribucion": "D",
      "canales": ["MOSTRADOR", "DELIVERY"]
    }
  ]
}
```

### 6.2 Stored Procedures Requeridos (Base KDS)

| SP | Parámetros | Descripción |
|----|------------|-------------|
| `SP_ConfigLeer` | - | Retorna configuración JSON |
| `SP_DistribucionListarComandas` | @cola, @pantalla | Lista comandas por pantalla |
| `SP_DistribucionImprimir` | @idOrden, @cola, @pantalla, @imprime | Marca comanda impresa |
| `SP_DistribucionDeshacer` | @cola, @pantalla | Recupera última comanda |

---

## 7. Dependencias y NuGet

### 7.1 Archivo .csproj

```xml
<Project Sdk="Microsoft.NET.Sdk.Web">

  <PropertyGroup>
    <TargetFramework>net6.0</TargetFramework>
  </PropertyGroup>

  <ItemGroup>
    <PackageReference Include="Microsoft.Data.SqlClient" Version="5.1.0" />
  </ItemGroup>

</Project>
```

### 7.2 Namespaces Requeridos

```csharp
// Controllers
using Microsoft.AspNetCore.Mvc;
using System.Net;

// Impresion
using System.Net.Sockets;
using System.Text;

// Repositorios
using Microsoft.Data.SqlClient;
using System.Data;

// Modulos
using System.Text.Json;
```

---

## 8. Orden de Implementación

### Fase 1: Infraestructura Base
1. Crear proyecto ASP.NET Core Web API
2. Copiar `IConector.cs` y `ConectorSQL.cs`
3. Copiar modelos de `Entidades/`
4. Implementar `LogProcesos.cs`

### Fase 2: Configuración
5. Copiar `ConfigMaker.cs`
6. Copiar `Configuracion.cs` completo
7. Configurar `Program.cs` con inicialización

### Fase 3: Almacén en Memoria
8. Copiar `bdKDS2.cs`
9. Copiar `tComanda.cs` y `tDistribucion.cs`

### Fase 4: API
10. Copiar `PantallaController.cs`
11. Copiar `ComandasController.cs`
12. Copiar `Acciones.cs`

### Fase 5: Gestión de Pantallas
13. Copiar `ScreenManager.cs`
14. Copiar `ScreenChecker.cs`

### Fase 6: Impresión
15. Copiar `Impresion.cs`
16. Probar conexión TCP a impresora
17. Verificar formato de tickets

---

## 9. Pruebas

### 9.1 Probar GET /config

```bash
curl http://localhost:5000/config
```

**Respuesta esperada:** JSON con configuración de pantalla

### 9.2 Probar POST /comandas

```bash
curl -X POST http://localhost:5000/comandas \
  -H "Content-Type: application/json" \
  -d '{"userActions": []}'
```

**Respuesta esperada:** Array de comandas o `[]`

### 9.3 Probar Impresión TCP

```csharp
// Test de conectividad
using var client = new TcpClient();
client.Connect("192.168.1.200", 9100);
Console.WriteLine("Conexión exitosa");
client.Close();
```

### 9.4 Probar Acción de Impresión

```bash
curl -X POST http://localhost:5000/comandas \
  -H "Content-Type: application/json" \
  -d '{"userActions": ["ID_COMANDA_VALIDO"]}'
```

---

## Notas Importantes

1. **Thread Safety**: `bdKDS2` usa `ReaderWriterLockSlim` - no modificar la estructura de bloqueo

2. **Singletons**: `ConfigMaker`, `ScreenChecker`, `bdKDS2` y `LogProcesos` son singleton - inicializar una sola vez

3. **ESC/POS**: Los códigos hexadecimales son específicos para impresoras Epson compatibles

4. **Pantallas Espejo**: Verificar `EsPantallaEspejo()` antes de procesar IPs

5. **Logs**: Crear carpeta `logs/` en el directorio de ejecución

6. **Configuración**: El sistema puede leer desde archivo o base de datos según `ingresoPorBase`

---

## Archivos de Referencia

Todos los archivos fuente se encuentran en la carpeta `files/`:

- [`files/ComandasController.cs`](files/ComandasController.cs)
- [`files/PantallaController.cs`](files/PantallaController.cs)
- [`files/Impresion.cs`](files/Impresion.cs)
- [`files/ScreenManager.cs`](files/ScreenManager.cs)
- [`files/ConfigMaker.cs`](files/ConfigMaker.cs)
- [`files/ScreenChecker.cs`](files/ScreenChecker.cs)
- [`files/bdKDS2.cs`](files/bdKDS2.cs)
- [`files/LogProcesos.cs`](files/LogProcesos.cs)
- [`files/IConector.cs`](files/IConector.cs)
- [`files/ConectorSQL.cs`](files/ConectorSQL.cs)
- [`files/Comanda.cs`](files/Comanda.cs)
- [`files/Configuracion.cs`](files/Configuracion.cs)
- [`files/tComanda.cs`](files/tComanda.cs)
- [`files/tDistribucion.cs`](files/tDistribucion.cs)
- [`files/Acciones.cs`](files/Acciones.cs)
