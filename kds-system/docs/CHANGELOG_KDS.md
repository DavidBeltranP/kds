# KDS - Changelog

Historial de cambios del sistema KDS (Kitchen Display System).

## [2.0.0] - 2024-XX-XX

### Resumen

Rediseno completo del sistema KDS con nueva arquitectura, backoffice visual completo y containerizacion Docker.

### Agregado

#### Backend
- Nueva arquitectura Node.js/Express con TypeScript
- API REST completa para gestion de pantallas, colas y ordenes
- WebSocket (Socket.IO) para comunicacion en tiempo real
- Sistema de autenticacion JWT con refresh tokens
- Integracion con MAXPOINT via SQL Server (polling)
- Sistema de balanceo de ordenes entre pantallas (Round Robin / Least Loaded)
- Heartbeat automatico para deteccion de estado de pantallas
- Cache Redis para configuraciones y estado
- ORM Prisma con PostgreSQL
- Middleware de autenticacion y autorizacion por roles (ADMIN, OPERATOR, VIEWER)
- Servicio de impresion TCP opcional

#### Frontend KDS
- Nuevo frontend React 18 con TypeScript
- Interfaz responsive con TailwindCSS
- Conexion WebSocket para actualizaciones en tiempo real
- Sistema de paginacion de ordenes
- Timer visual por orden
- Modo standby con activacion por combo de teclas (i+g)
- Configuracion visual dinamica (colores, grid, fuentes)
- Controlador de botonera fisica con debounce y deteccion de combos
- Animaciones de entrada/salida de ordenes
- Estado persistente con Zustand

#### Backoffice
- Nuevo panel de administracion React + Ant Design
- Dashboard con estadisticas en tiempo real
- Gestion completa de pantallas (CRUD)
- Configuracion visual por pantalla (colores, grid, tipografia)
- Configuracion de teclado/botonera por pantalla
- Gestion de colas con canales y filtros
- Vista de ordenes con filtros y acciones
- Control de polling MAXPOINT (iniciar/detener/forzar)
- Monitoreo de estado de servicios (DB, Redis, MXP, WebSocket)
- Autenticacion con roles

#### Docker
- Containerizacion completa del sistema
- docker-compose para produccion y desarrollo
- Imagenes optimizadas multi-stage
- Health checks para todos los servicios
- Volumenes persistentes para datos

#### Documentacion
- ARQUITECTURA_KDS.md - Arquitectura completa del sistema
- BALANCEO_PANTALLAS.md - Logica de balanceo entre pantallas
- BOTONERA.md - Integracion con botonera fisica
- CONFIGURACION_VISUAL.md - Guia de configuracion de apariencia
- DEPLOY_DOCKER.md - Guia de despliegue con Docker

### Cambiado

- **Configuracion**: De archivo `config.txt` a base de datos + API
- **Backend**: De ASP.NET Core 6.0 a Node.js/Express
- **Frontend**: De HTML/JS vanilla a React 18 + TypeScript
- **Base de datos**: De archivo local a PostgreSQL
- **Comunicacion**: De polling HTTP a WebSocket
- **Despliegue**: De manual a Docker containers

### Mejorado

- **Rendimiento**: WebSocket elimina polling constante del frontend
- **Escalabilidad**: Arquitectura stateless permite multiples instancias
- **Mantenibilidad**: Codigo TypeScript con tipado estricto
- **Usabilidad**: Backoffice visual elimina edicion manual de archivos
- **Confiabilidad**: Health checks y monitoreo integrado
- **Seguridad**: JWT, roles, CORS configurado

### Preservado (Compatibilidad)

- Logica de balanceo entre pantallas del mismo tipo
- Integracion con MAXPOINT via SQL Server
- Funcionalidad de botonera fisica (mismas teclas: 1, 3, i, h, g, f)
- Combo standby i+g por 3 segundos
- Soporte para 3 pantallas: 2 pollos (balanceadas) + 1 sanduches

---

## [1.x.x] - Sistema Anterior

### Caracteristicas del sistema original

- Backend ASP.NET Core 6.0
- Configuracion via archivo `config.txt` (JSON)
- Frontend HTML/CSS/JavaScript vanilla
- Base de datos local/SQL Server
- Comunicacion HTTP polling
- Despliegue manual IIS/Kestrel

### Limitaciones resueltas en v2.0

- Edicion manual de archivos de configuracion
- Sin panel de administracion visual
- Polling constante del frontend
- Dificultad para escalar
- Sin containerizacion
- Documentacion limitada

---

## Versionamiento

Este proyecto usa [SemVer](https://semver.org/):
- MAJOR: Cambios incompatibles
- MINOR: Nuevas funcionalidades compatibles
- PATCH: Correcciones de bugs

## Migracion desde v1.x

### Pasos de migracion

1. **Backup de datos**
   ```bash
   # Exportar ordenes activas del sistema anterior
   # Exportar configuracion de pantallas
   ```

2. **Instalar v2.0**
   ```bash
   docker-compose up -d
   ```

3. **Configurar pantallas**
   - Crear pantallas en Backoffice con mismos nombres/IPs
   - Configurar colas (LINEAS, SANDUCHE)
   - Asignar pantallas a colas

4. **Configurar MAXPOINT**
   - Actualizar connection string en Settings
   - Verificar conectividad
   - Iniciar polling

5. **Verificar funcionamiento**
   - Probar botonera fisica
   - Verificar balanceo entre pantallas
   - Monitorear ordenes

### Mapeo de configuracion

| config.txt (v1) | Backoffice (v2) |
|-----------------|-----------------|
| `Filas` | Pantallas > Configurar > Rows |
| `Columnas` | Pantallas > Configurar > Columns |
| `ColorFondo` | Pantallas > Configurar > Background Color |
| `ColorTexto` | Pantallas > Configurar > Text Color |
| `IntervaloPolling` | Settings > MAXPOINT > Polling Interval |
| `ServerName` | Settings > MAXPOINT > Connection String |

---

## Roadmap Futuro

### v2.1.0 (Planificado)
- [ ] Multi-tenant (multiples restaurantes)
- [ ] Reportes y analiticas avanzadas
- [ ] App movil para managers
- [ ] Integracion con mas POS (ademas de MAXPOINT)

### v2.2.0 (Planificado)
- [ ] Machine learning para prediccion de tiempos
- [ ] Alertas configurables
- [ ] Integracion con sistemas de inventario
- [ ] API publica documentada (OpenAPI/Swagger)
