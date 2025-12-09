# Arquitectura del Sistema - Distribuidor KDS

## Descripción General

El Distribuidor KDS (Kitchen Display System) es un sistema de distribución de comandas de cocina construido en .NET 6.0. Su función principal es recibir órdenes desde un sistema POS, distribuirlas a pantallas de cocina según reglas de balanceo, y gestionar la impresión de tickets.

## Archivos de Referencia

Todos los archivos fuente clave se encuentran copiados en la carpeta `files/` para facilitar la portabilidad:

| Archivo | Descripción |
|---------|-------------|
| [`files/ComandasController.cs`](files/ComandasController.cs) | Controlador API de comandas |
| [`files/PantallaController.cs`](files/PantallaController.cs) | Controlador API de configuración |
| [`files/Impresion.cs`](files/Impresion.cs) | Servicio de impresión ESC/POS |
| [`files/ScreenManager.cs`](files/ScreenManager.cs) | Gestor de pantallas y comandas |
| [`files/ConfigMaker.cs`](files/ConfigMaker.cs) | Singleton de configuración |
| [`files/ScreenChecker.cs`](files/ScreenChecker.cs) | Monitor de estado de pantallas |
| [`files/bdKDS2.cs`](files/bdKDS2.cs) | Almacén en memoria thread-safe |
| [`files/LogProcesos.cs`](files/LogProcesos.cs) | Sistema de logging |
| [`files/IConector.cs`](files/IConector.cs) | Interfaz de acceso a datos |
| [`files/ConectorSQL.cs`](files/ConectorSQL.cs) | Implementación SQL Server |
| [`files/Comanda.cs`](files/Comanda.cs) | Modelo de comanda |
| [`files/Configuracion.cs`](files/Configuracion.cs) | Modelo de configuración |
| [`files/tComanda.cs`](files/tComanda.cs) | Modelo de comanda en memoria |
| [`files/tDistribucion.cs`](files/tDistribucion.cs) | Modelo de distribución |
| [`files/Acciones.cs`](files/Acciones.cs) | Modelo de acciones de usuario |

---

## Stack Tecnológico

| Componente | Tecnología |
|------------|------------|
| Framework | .NET 6.0 |
| Web Server | ASP.NET Core (Kestrel) |
| Base de Datos | SQL Server |
| Protocolo API | REST/JSON |
| Impresión | TCP/IP (ESC/POS) |
| Mensajería | NATS (configurado) |

---

## Estructura del Proyecto

```
KDS/
├── Controllers/              # Controladores HTTP
│   ├── ComandasController.cs
│   ├── PantallaController.cs
│   └── DebugController.cs
│
├── Entidades/                # Modelos de datos
│   ├── Comanda.cs
│   ├── Configuracion.cs
│   ├── tComanda.cs
│   └── tDistribucion.cs
│
├── Interfaces/               # Contratos
│   ├── IConector.cs
│   └── IAlgoritmoBalanceo.cs
│
├── Modulos/                  # Lógica de negocio
│   ├── ConfigMaker.cs
│   ├── ConfigReader.cs
│   ├── DistribuidorColas.cs
│   ├── DistribuidorPantallas.cs
│   ├── Impresion.cs
│   ├── JsonMaker.cs
│   ├── LogProcesos.cs
│   ├── ScreenChecker.cs
│   └── ScreenManager.cs
│
├── Repositorios/             # Acceso a datos
│   ├── bdKDS2.cs
│   ├── ConectorSQL.cs
│   └── AlgoritmoDisponibilidad.cs
│
└── Program.cs                # Punto de entrada
```

---

## Diagrama de Arquitectura

```
                                    ┌─────────────────────┐
                                    │    Base de Datos    │
                                    │        KDS          │
                                    └──────────┬──────────┘
                                               │
                    ┌──────────────────────────┼──────────────────────────┐
                    │                          │                          │
                    ▼                          ▼                          ▼
          ┌─────────────────┐        ┌─────────────────┐        ┌─────────────────┐
          │   ConfigMaker   │        │    JsonMaker    │        │   ConectorSQL   │
          │   (Singleton)   │        │    (Thread)     │        │  (IConector)    │
          └────────┬────────┘        └────────┬────────┘        └─────────────────┘
                   │                          │
                   │                          ▼
                   │                 ┌─────────────────┐
                   │                 │DistribuidorColas│
                   │                 └────────┬────────┘
                   │                          │
                   │                          ▼
                   │                ┌──────────────────────┐
                   │                │DistribuidorPantallas │
                   │                └──────────┬───────────┘
                   │                           │
                   │         ┌─────────────────┼─────────────────┐
                   │         │                 │                 │
                   │         ▼                 ▼                 ▼
                   │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
                   │  │  Algoritmo  │  │   bdKDS2    │  │  Impresion  │
                   │  │Disponibilid │  │ (Singleton) │  │             │
                   │  └─────────────┘  └──────┬──────┘  └──────┬──────┘
                   │                          │                │
                   │                          │                ▼
                   │                          │        ┌───────────────┐
                   │                          │        │   Impresora   │
                   │                          │        │   (TCP/IP)    │
                   │                          │        └───────────────┘
                   │                          │
                   ▼                          ▼
          ┌─────────────────────────────────────────────────────────┐
          │                     ASP.NET Core                        │
          │  ┌──────────────────┐      ┌──────────────────────┐    │
          │  │PantallaController│      │  ComandasController  │    │
          │  │   GET /config    │      │   POST /comandas     │    │
          │  └────────┬─────────┘      └──────────┬───────────┘    │
          └───────────┼───────────────────────────┼────────────────┘
                      │                           │
                      │         ┌─────────────────┤
                      │         │                 │
                      ▼         ▼                 ▼
              ┌───────────┐ ┌───────────┐ ┌───────────┐
              │ Pantalla  │ │ Pantalla  │ │ Pantalla  │
              │   KDS 1   │ │   KDS 2   │ │   KDS N   │
              └───────────┘ └───────────┘ └───────────┘
```

---

## Componentes Principales

### 1. Program.cs - Punto de Entrada

Responsabilidades:
- Inicialización del sistema
- Carga de configuración desde `config.txt` y base de datos
- Inicio de threads de procesamiento
- Configuración de ASP.NET Core

#### Flujo de Inicialización

```
1. ConfigReader.leerArchivo()     → Lee config.txt
2. ConfigMaker.leerBaseDatos()    → Carga desde SP_ConfigLeer
3. ScreenChecker.Instance         → Inicializa monitor de pantallas
4. Thread(JsonMaker.LeerComandas) → Inicia lectura de comandas
5. Thread(ScreenChecker.Desactivar) → Inicia monitor de inactividad
6. WebApplication.Run()           → Inicia servidor HTTP
```

### 2. ConfigMaker (Singleton)

Gestiona toda la configuración del sistema.

**Métodos principales:**
- `leerBaseDatos()` - Carga configuración desde SP_ConfigLeer
- `listarPantallas()` - Retorna lista de pantallas configuradas
- `listarColas()` - Retorna lista de colas
- `detallePantalla(ip)` - Obtiene configuración de una pantalla
- `configuracionPantalla(ip)` - Genera ConfigPantalla para API
- `EsPantallaEspejo(ip)` - Verifica si es pantalla espejo

### 3. JsonMaker

Procesa comandas desde la base de datos.

**Método principal: `LeerComandas()`**
- Loop infinito con intervalo configurable
- Consulta nuevas comandas via `BuscarComandasParaJson()`
- Convierte DataRow a objeto Comanda
- Registra en tabla COMANDAS
- Dispara distribución a colas y pantallas

### 4. DistribuidorColas

Asigna comandas a colas según canales y filtros.

**Flujo:**
1. Recibe comanda nueva
2. Identifica colas que aceptan el canal de venta
3. Aplica filtros de la cola
4. Inserta distribución via SP_DistribucionInsertar
5. Llama a DistribuidorPantallas

### 5. DistribuidorPantallas

Asigna comandas a pantallas específicas dentro de una cola.

**Algoritmos soportados:**
- **Disponibilidad (D)**: Pantalla con menos comandas activas
- **Round Robin (RR)**: Distribución circular

**Comportamiento sin pantallas activas:**
- Imprime automáticamente la comanda
- Marca como cerrada en base de datos

### 6. ScreenManager

Gestiona la interacción con las pantallas cliente.

**Métodos:**
- `MostrarComandas(ip)` - Obtiene comandas para una pantalla
- `ActualizarComanda(acciones, ip)` - Procesa acciones del usuario
- `AplicarFiltro(comanda, filtros)` - Filtra comandas según reglas
- `GenerarEstructuraContador()` - Crea contadores de productos

### 7. ScreenChecker (Singleton)

Monitorea el estado de las pantallas.

**Funcionalidad:**
- `Activar(ip)` - Marca pantalla como activa (cada request)
- `Desactivar()` - Thread que detecta pantallas inactivas
- `PantallasActivas(cola)` - Lista pantallas vivas de una cola

### 8. bdKDS2 (Singleton)

Almacén en memoria para comandas y distribuciones.

**Características:**
- Thread-safe con `ReaderWriterLockSlim`
- Almacena `List<tComanda>` y `List<tDistribucion>`
- Métodos LINQ para consultas
- Sincroniza con base de datos

### 9. ConectorSQL (IConector)

Implementación de acceso a SQL Server.

**Características:**
- Microsoft.Data.SqlClient
- Soporte para stored procedures
- Parámetros tipados
- Encriptación habilitada
- Timeout: 1000 segundos

---

## Flujos de Datos

### Flujo 1: Ingreso de Comanda Nueva

```
┌─────────────┐     ┌─────────────┐     ┌──────────────────┐
│  JsonMaker  │────▶│   bdKDS2    │────▶│DistribuidorColas │
│  (Thread)   │     │  (Memoria)  │     │                  │
└─────────────┘     └─────────────┘     └────────┬─────────┘
                                                 │
                          ┌──────────────────────┘
                          ▼
              ┌───────────────────────┐
              │DistribuidorPantallas  │
              └───────────┬───────────┘
                          │
          ┌───────────────┼───────────────┐
          ▼               ▼               ▼
    ┌───────────┐   ┌───────────┐   ┌───────────┐
    │ Pantalla  │   │ Algoritmo │   │ Impresion │
    │  Activa   │   │ Balanceo  │   │(sin pant.)│
    └───────────┘   └───────────┘   └───────────┘
```

### Flujo 2: Request de Pantalla

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────┐
│  Pantalla   │────▶│ComandasController│────▶│ScreenManager│
│   (HTTP)    │     │ POST /comandas   │     │             │
└─────────────┘     └──────────────────┘     └──────┬──────┘
                                                    │
       ┌────────────────────────────────────────────┤
       ▼                    ▼                       ▼
┌─────────────┐      ┌─────────────┐         ┌───────────┐
│ScreenChecker│      │   bdKDS2    │         │  Filtros  │
│  Activar()  │      │ ObtenerCmd  │         │  Config   │
└─────────────┘      └─────────────┘         └───────────┘
                            │
                            ▼
                    ┌───────────────┐
                    │ JSON Response │
                    │   Comandas    │
                    └───────────────┘
```

### Flujo 3: Acción de Usuario (Completar/Reimprimir)

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────┐
│  Pantalla   │────▶│ComandasController│────▶│ScreenManager│
│userActions  │     │ POST /comandas   │     │Actualizar() │
└─────────────┘     └──────────────────┘     └──────┬──────┘
                                                    │
                    ┌───────────────────────────────┤
                    ▼                               ▼
             ┌─────────────┐                 ┌─────────────┐
             │   bdKDS2    │                 │  Impresion  │
             │ Actualizar  │                 │(si reimprime│
             │   Estado    │                 └─────────────┘
             └─────────────┘
```

---

## Modelo de Datos

### Entidades Principales

#### Comanda (JSON)

```
Comanda
├── id: string
├── orderId: string
├── createdAt: datetime
├── channel
│   ├── id: int
│   ├── name: string
│   └── type: string
├── cashRegister
│   ├── cashier: string
│   └── name: string
├── customer
│   └── name: string
├── products[]
│   ├── productId: string
│   ├── name: string
│   ├── amount: int
│   ├── category: string
│   ├── content: string[]
│   └── products[] (recursivo)
├── otrosDatos
│   ├── turno: string
│   ├── llamarPor: string
│   ├── nroCheque: string
│   ├── Fecha: string
│   └── Direccion: string
└── impresion
    └── estado: string
```

#### Configuracion

```
Configuracion
├── Generales
│   ├── tiempoVida: int
│   ├── lecturaComandas: int
│   ├── ingresoPorBase: bool
│   └── cuentaProductos: bool
├── ConexionKDS
│   ├── ip: string
│   ├── usuario: string
│   ├── clave: string
│   └── catalogo: string
├── ConexionMXP
│   ├── ip: string
│   ├── usuario: string
│   ├── clave: string
│   ├── catalogo: string
│   └── apiImpresion: string
├── ConexionNats
│   ├── Url: string
│   └── Tema: string
├── Pantallas[]
│   ├── nombre: string
│   ├── ip: string
│   ├── cola: string
│   ├── imprime: bool
│   ├── impresoraNombre: string
│   ├── impresoraIP: string
│   ├── impresoraPuerto: int
│   ├── propiedades: object
│   ├── filtros: object[]
│   ├── contar: string[]
│   ├── activa: bool
│   ├── cantidad: int
│   ├── tiempoActiva: datetime
│   └── reflejoDeIP: string
└── Colas[]
    ├── nombre: string
    ├── distribucion: string (D/RR)
    ├── canales: string[]
    └── filtros: object[]
```

#### tComanda (Memoria)

```
tComanda
├── IdOrden: string (PK)
├── datosComanda: string (JSON)
├── fechaIngreso: datetime
├── idEstadoComanda: int
├── fechaCreacion: datetime
└── Reimpresion: int
```

#### tDistribucion (Memoria)

```
tDistribucion
├── idOrden: string (FK)
├── Cola: string
├── Pantalla: string
├── IdEstadoDistribucion: int
└── fechaModificacion: datetime
```

---

## Interfaces

### IConector

Define el contrato para acceso a base de datos.

```csharp
public interface IConector
{
    void sesionConexion(string ip, string user, string pass, string catalog);
    int sesionAbrir(bool mensaje);
    int sesionCerrar();

    void consultaDatos(string nombre, SqlDbType tipo, string contenido);
    int consultaModificar(string query);
    DataTable consultaResultados();

    int consultaEjecutarSP(string SP_Nombre);
    DataTable consultaEjecutarSPTabla(string SP_Nombre);
    int consultaEjecutarSPEscalar(string SP_Nombre);
    void consultaEjecutarSPSinResultados(string SP_Nombre);

    int ConsultaEjecutarQueryEscalarEntero();
    string ConsultaEjecutarQueryEscalarCadena();
}
```

### IAlgoritmoBalanceo

Define el contrato para algoritmos de distribución.

```csharp
public interface IAlgoritmoBalanceo
{
    void RegistrarPantallaDestino(
        string idComanda,
        string nombreCola,
        List<Pantalla> pantallasObjetivo
    );
}
```

---

## Stored Procedures

### Base KDS

| SP | Propósito |
|----|-----------|
| `SP_ConfigLeer` | Obtiene configuración completa |
| `SP_ConfigInsertar` | Guarda configuración |
| `BuscarComandasParaJson` | Obtiene comandas nuevas |
| `SP_ComandasInsertar` | Registra comanda |
| `SP_ComandaCerrarSinPantallas` | Cierra sin mostrar |
| `SP_DistribucionInsertar` | Asigna cola |
| `SP_DistribucionActualizarPantalla` | Asigna pantalla |
| `SP_DistribucionCantidadComandas` | Cuenta por pantalla |

### Base MXP

| Operación | Propósito |
|-----------|-----------|
| `UPDATE Detalle_Orden_Pedido` | Marca impresa |
| `UPDATE Canal_Movimiento` | Estado = 51 |

---

## Patrones de Diseño Utilizados

### Singleton
- `ConfigMaker` - Configuración global
- `ScreenChecker` - Monitor de pantallas
- `bdKDS2` - Almacén en memoria
- `LogProcesos` - Sistema de logs

### Strategy
- `IAlgoritmoBalanceo` con implementaciones:
  - `AlgoritmoDisponibilidad`
  - (Extensible a Round Robin)

### Repository
- `IConector` / `ConectorSQL` - Abstracción de acceso a datos

### Observer (implícito)
- Pantallas hacen polling al controlador
- ScreenChecker monitorea inactividad

---

## Configuración del Sistema

### Archivo config.txt

Ubicación: `{Directorio de aplicación}/config.txt`

```json
{
  "Generales": {
    "tiempoVida": 300,
    "lecturaComandas": 3000,
    "ingresoPorBase": true,
    "cuentaProductos": true
  },
  "ConexionKDS": {
    "ip": "192.168.1.10",
    "usuario": "sa",
    "clave": "password",
    "catalogo": "KDS_DB"
  },
  "ConexionMXP": {
    "ip": "192.168.1.11",
    "usuario": "sa",
    "clave": "password",
    "catalogo": "MXP_DB",
    "apiImpresion": "http://localhost:5000"
  },
  "Pantallas": [...],
  "Colas": [...]
}
```

### Variables de Configuración

| Variable | Descripción | Valor típico |
|----------|-------------|--------------|
| `tiempoVida` | Segundos antes de desactivar pantalla | 300 |
| `lecturaComandas` | Intervalo de lectura (ms) | 3000 |
| `ingresoPorBase` | Leer comandas desde BD | true |
| `cuentaProductos` | Habilitar contadores | true |

---

## Sistema de Logs

### Ubicación
```
{Directorio de aplicación}/logs/log YYYY-MM-DD.txt
```

### Formato
```
[HH:mm:ss] [NIVEL] Mensaje
```

### Niveles
- `INFO` - Información general
- `WARN` - Advertencias
- `ERROR` - Errores

### Rotación
- Automática a medianoche
- Un archivo por día

---

## Threads del Sistema

| Thread | Función | Intervalo |
|--------|---------|-----------|
| JsonMaker.LeerComandas | Lee comandas de BD | Configurable (lecturaComandas) |
| ScreenChecker.Desactivar | Detecta pantallas inactivas | Configurable (tiempoVida) |
| ASP.NET Core | Servidor HTTP | Continuo |

---

## Puntos de Extensión

### Agregar Nuevo Algoritmo de Balanceo

1. Implementar `IAlgoritmoBalanceo`
2. Registrar en `DistribuidorPantallas`
3. Configurar en cola (`distribucion: "NUEVO"`)

### Agregar Nuevo Tipo de Filtro

1. Modificar `ScreenManager.AplicarFiltro()`
2. Agregar lógica de evaluación
3. Configurar en pantalla/cola

### Integrar Nueva Fuente de Comandas

1. Crear módulo similar a `JsonMaker`
2. Implementar conversión a objeto `Comanda`
3. Usar `DistribuidorColas.AsignarCola()`

---

## Consideraciones de Despliegue

### Requisitos
- .NET 6.0 Runtime
- SQL Server (KDS y MXP)
- Conectividad de red a impresoras
- Puerto HTTP accesible

### Recomendaciones
- Ejecutar como servicio de Windows
- Configurar reinicio automático
- Monitorear logs diariamente
- Backup de config.txt

### Escalabilidad
- Una instancia por ubicación física
- Múltiples pantallas por instancia
- Base de datos puede ser compartida
