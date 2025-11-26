# KDS v2.0 - Guia de Seguridad

## Tabla de Contenidos

1. [Archivos que NUNCA deben subirse a Git](#archivos-que-nunca-deben-subirse-a-git)
2. [Manejo de Credenciales](#manejo-de-credenciales)
3. [Configuracion de Variables de Entorno](#configuracion-de-variables-de-entorno)
4. [Migracion desde Sistema Anterior](#migracion-desde-sistema-anterior)
5. [Buenas Practicas de Seguridad](#buenas-practicas-de-seguridad)
6. [Checklist de Seguridad](#checklist-de-seguridad)

---

## Archivos que NUNCA deben subirse a Git

### Archivos de Entorno

| Archivo | Razon |
|---------|-------|
| `.env` | Contiene credenciales reales |
| `.env.local` | Configuracion local con secretos |
| `.env.development` | Puede contener credenciales de desarrollo |
| `.env.production` | Credenciales de produccion |
| `.env.staging` | Credenciales de staging |

**Excepcion**: `.env.example` SI debe versionarse (es la plantilla sin valores reales).

### Archivos de Configuracion del Sistema Anterior

| Archivo | Razon |
|---------|-------|
| `config.txt` | Contiene credenciales de base de datos |
| `conf.txt` | Variante del archivo de configuracion |
| `config.json` | Si tiene credenciales embebidas |

**Solucion**: Usar `config.example.json` como plantilla.

### Credenciales y Certificados

| Archivo/Extension | Descripcion |
|-------------------|-------------|
| `*.pem` | Certificados SSL/TLS |
| `*.key` | Llaves privadas |
| `*.crt` | Certificados |
| `*.p12`, `*.pfx` | Certificados PKCS#12 |
| `credentials.json` | Credenciales de servicios |
| `service-account*.json` | Cuentas de servicio (GCP, etc.) |
| `*.secret` | Cualquier archivo de secretos |
| `secrets/` | Directorio de secretos |

### Base de Datos

| Archivo/Extension | Descripcion |
|-------------------|-------------|
| `*.sql` | Dumps que pueden contener datos sensibles |
| `*.dump` | Backups de base de datos |
| `*.bak` | Archivos de respaldo |
| `*.db`, `*.sqlite` | Bases de datos locales |

**Excepcion**: `prisma/migrations/*.sql` SI deben versionarse (son migraciones de esquema, no datos).

### Otros Archivos Sensibles

| Archivo/Patron | Descripcion |
|----------------|-------------|
| `api-keys.json` | API keys de terceros |
| `tokens.json` | Tokens de autenticacion |
| Rutas absolutas (`C:\KDS2\`, `/var/kds/`) | Configuracion especifica de maquina |

---

## Manejo de Credenciales

### Principios Fundamentales

1. **Nunca hardcodear credenciales** en el codigo fuente
2. **Usar variables de entorno** para toda configuracion sensible
3. **Rotar credenciales** periodicamente
4. **Usar passwords fuertes** (minimo 16 caracteres, alfanumericos + simbolos)

### Generacion de Credenciales Seguras

```bash
# Generar password aleatorio (Linux/Mac)
openssl rand -base64 32

# Generar JWT secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Generar password en PowerShell (Windows)
[System.Web.Security.Membership]::GeneratePassword(32, 8)
```

### Almacenamiento de Credenciales

#### Desarrollo Local

```bash
# 1. Copiar plantilla
cp .env.example .env

# 2. Editar con tus valores
nano .env  # o tu editor preferido

# 3. Verificar que .env esta en .gitignore
cat .gitignore | grep ".env"
```

#### Produccion

Para produccion, considera usar gestores de secretos:

| Herramienta | Descripcion |
|-------------|-------------|
| **Docker Secrets** | Integrado con Docker Swarm |
| **HashiCorp Vault** | Gestor de secretos empresarial |
| **AWS Secrets Manager** | Para despliegues en AWS |
| **Azure Key Vault** | Para despliegues en Azure |
| **GCP Secret Manager** | Para despliegues en GCP |

#### Ejemplo con Docker Secrets

```yaml
# docker-compose.yml
services:
  backend:
    secrets:
      - db_password
      - jwt_secret

secrets:
  db_password:
    file: ./secrets/db_password.txt
  jwt_secret:
    file: ./secrets/jwt_secret.txt
```

---

## Configuracion de Variables de Entorno

### Paso a Paso

1. **Copiar la plantilla**:
   ```bash
   cp .env.example .env
   ```

2. **Completar valores requeridos**:
   ```bash
   # Base de datos
   POSTGRES_PASSWORD=tu_password_seguro_aqui

   # Redis
   REDIS_PASSWORD=otro_password_seguro

   # JWT (CRITICO - usar valores unicos)
   JWT_SECRET=tu_jwt_secret_muy_largo_y_aleatorio
   JWT_REFRESH_SECRET=otro_secret_diferente_y_largo
   ```

3. **Verificar permisos** (Linux/Mac):
   ```bash
   chmod 600 .env
   ```

4. **Verificar que no se sube a Git**:
   ```bash
   git status
   # .env NO debe aparecer en la lista
   ```

### Variables por Categoria

#### Requeridas (sin valor por defecto)

| Variable | Descripcion |
|----------|-------------|
| `POSTGRES_PASSWORD` | Password de PostgreSQL |
| `REDIS_PASSWORD` | Password de Redis |
| `JWT_SECRET` | Secret para tokens de acceso |
| `JWT_REFRESH_SECRET` | Secret para refresh tokens |

#### Condicionales (requeridas si MXP_ENABLED=true)

| Variable | Descripcion |
|----------|-------------|
| `MXP_SERVER` | IP/hostname del servidor MAXPOINT |
| `MXP_USER` | Usuario SQL Server |
| `MXP_PASSWORD` | Password SQL Server |

#### Opcionales (tienen valor por defecto)

| Variable | Default | Descripcion |
|----------|---------|-------------|
| `POSTGRES_USER` | kds | Usuario de BD |
| `POSTGRES_DB` | kds | Nombre de BD |
| `MXP_POLLING_INTERVAL` | 3000 | Intervalo polling (ms) |
| `HEARTBEAT_INTERVAL` | 10000 | Intervalo heartbeat (ms) |

---

## Migracion desde Sistema Anterior

### El archivo `config.txt`

El sistema anterior usaba un archivo `config.txt` con formato JSON que contenia:

```json
{
  "ServerName": "192.168.1.100",
  "Database": "MAXPOINT",
  "Username": "sa",
  "Password": "password_real",
  "Pantallas": [...]
}
```

**Este archivo NO debe versionarse** porque contiene credenciales.

### Proceso de Migracion

1. **Extraer credenciales** de `config.txt`

2. **Configurar en `.env`**:
   ```bash
   # Mapeo de campos
   # config.txt → .env

   ServerName → MXP_SERVER
   Database   → MXP_DATABASE
   Username   → MXP_USER
   Password   → MXP_PASSWORD
   ```

3. **Configurar pantallas/colas** desde el Backoffice (ya no se definen en archivos)

4. **Eliminar** o mover `config.txt` fuera del repositorio:
   ```bash
   # Mover a ubicacion segura fuera del repo
   mv config.txt ~/backups/kds-config-backup.txt
   ```

### Archivo de Referencia

Se incluye `config.example.json` como referencia del formato anterior. Este archivo:

- **SI se versiona** (es solo una plantilla)
- **NO contiene** credenciales reales
- Documenta como migrar la configuracion

---

## Buenas Practicas de Seguridad

### En Desarrollo

1. **Nunca usar credenciales de produccion** en desarrollo
2. **Usar passwords diferentes** para cada ambiente
3. **Revisar cambios antes de commit**:
   ```bash
   git diff --staged
   # Buscar patterns sospechosos: password, secret, key, token
   ```

### En Git

1. **Configurar hooks de pre-commit** para detectar secretos:
   ```bash
   # Instalar git-secrets
   brew install git-secrets  # Mac
   # o
   apt install git-secrets   # Linux

   # Configurar
   git secrets --install
   git secrets --register-aws
   ```

2. **Usar `.gitignore` consistente** (ya configurado en el proyecto)

3. **Si accidentalmente subiste un secreto**:
   ```bash
   # 1. Cambiar la credencial INMEDIATAMENTE
   # 2. Limpiar del historial
   git filter-branch --force --index-filter \
     'git rm --cached --ignore-unmatch .env' \
     --prune-empty --tag-name-filter cat -- --all

   # 3. Force push (coordinar con equipo)
   git push origin --force --all
   ```

### En Docker

1. **Nunca incluir secretos en la imagen**:
   ```dockerfile
   # MAL
   ENV DATABASE_PASSWORD=mi_password

   # BIEN
   # Pasar en runtime via docker-compose o docker run -e
   ```

2. **Usar multi-stage builds** (ya configurado)

3. **Ejecutar como usuario no-root** (ya configurado)

### En Produccion

1. **Usar HTTPS** para todo el trafico
2. **Configurar firewall** para limitar acceso a puertos
3. **Habilitar logs de auditoria**
4. **Monitorear accesos fallidos**
5. **Rotar credenciales** cada 90 dias minimo

---

## Checklist de Seguridad

### Antes de Primer Commit

- [ ] `.env` esta en `.gitignore`
- [ ] `config.txt` esta en `.gitignore`
- [ ] No hay passwords en el codigo fuente
- [ ] No hay API keys hardcodeadas
- [ ] `.env.example` no tiene valores reales

### Antes de Deploy a Produccion

- [ ] Passwords de produccion son unicos y fuertes (16+ chars)
- [ ] JWT secrets son diferentes a desarrollo
- [ ] HTTPS esta configurado
- [ ] Firewall permite solo puertos necesarios
- [ ] Backups de BD estan configurados
- [ ] Logs de acceso estan habilitados

### Periodicamente

- [ ] Rotar passwords de BD (cada 90 dias)
- [ ] Rotar JWT secrets (cada 90 dias)
- [ ] Revisar accesos de usuarios en Backoffice
- [ ] Revisar logs de errores de autenticacion
- [ ] Actualizar dependencias (npm audit)

---

## Contacto de Seguridad

Si descubres una vulnerabilidad de seguridad, reportala de forma responsable:

1. **NO** abras un issue publico
2. Contacta al equipo de desarrollo directamente
3. Proporciona detalles de la vulnerabilidad
4. Espera confirmacion antes de divulgar publicamente

---

## Referencias

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [12 Factor App - Config](https://12factor.net/config)
- [Docker Security Best Practices](https://docs.docker.com/develop/security-best-practices/)
- [Node.js Security Checklist](https://blog.risingstack.com/node-js-security-checklist/)
