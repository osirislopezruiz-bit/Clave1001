# CLAVE 1001 — Guía de instalación y puesta en marcha

**Documento:** GUIA-INSTALACION-COMPLETA  
**Versión:** 1.0 — Fase 1 + Fase 2 (Bridge)  
**Producto:** Clave 1001 — Arché Holding Labs  
**Uso:** Técnicos de instalación, franquiciatarios y operadores de central  

---

## Cómo leer esta guía (estilo paso a paso)

Cada procedimiento indica:

| Símbolo | Significado |
|---------|-------------|
| **DÓNDE** | En qué equipo, carpeta o sitio web actúa |
| **CUÁNDO** | En qué orden del proyecto (antes/después de otro paso) |
| **CÓMO** | Acciones exactas a realizar |
| **VERIFICACIÓN** | Cómo saber que el paso fue exitoso |

> **IMPORTANTE**  
> No salte pasos. Si un paso de **VERIFICACIÓN** falla, deténgase y consulte el **Apéndice A — Solución de problemas** antes de continuar.

---

## Índice

1. [Antes de comenzar](#1-antes-de-comenzar)  
2. [Parte A — Base de datos (Supabase)](#parte-a--base-de-datos-supabase)  
3. [Parte B — Aplicación web (PWA + War Room)](#parte-b--aplicación-web-pwa--war-room)  
4. [Parte C — Fase 1 sin Bridge (solo navegador)](#parte-c--fase-1-sin-bridge-solo-navegador)  
5. [Parte D — Bridge en PC del franquiciatario (Fase 2)](#parte-d--bridge-en-pc-del-franquiciatario-fase-2)  
6. [Parte E — Configurar la franquicia en el sistema](#parte-e--configurar-la-franquicia-en-el-sistema)  
7. [Parte F — Prueba de aceptación final](#parte-f--prueba-de-aceptación-final)  
8. [Apéndice A — Solución de problemas](#apéndice-a--solución-de-problemas)  
9. [Hoja de registro de instalación](#hoja-de-registro-de-instalación)  

---

## 1. Antes de comenzar

### 1.1 Qué va a instalar (visión general)

| Componente | Dónde vive | Obligatorio |
|------------|------------|-------------|
| Proyecto Supabase | Nube (panel supabase.com) | Sí |
| App web / PWA | Vercel, servidor o PC de prueba | Sí |
| War Room (mismo proyecto React) | Misma URL, rol operador/admin | Sí |
| **Clave 1001 Bridge** | PC Windows del **franquiciatario** | Solo Fase 2 |

### 1.2 Materiales que debe tener a la mano

- [ ] Proyecto descargado o clonado: carpeta `clave-1001-standalone`
- [ ] Cuenta Supabase con acceso de **administrador**
- [ ] **Service role key** de Supabase (solo para el Bridge; no la publique en la PWA)
- [ ] **Anon key** y URL del proyecto (ya están en `src/lib/supabase.js` o las cambiará)
- [ ] PC Windows 10/11 para el Bridge (Fase 2), con **Node.js 18 o superior**
- [ ] IP fija o conocida del PC Bridge en la red local (ej. `192.168.1.50`)
- [ ] Lista de franquicias: nombre, ID de organización, operadores

### 1.3 Tiempo estimado

| Escenario | Tiempo |
|-----------|--------|
| Solo Fase 1 (web + Supabase) | 1–2 horas |
| Fase 1 + Bridge por franquicia | +45 min por cada PC franquicia |

### 1.4 Orden obligatorio de instalación

```
PASO 1 → Supabase (tablas y columnas)
PASO 2 → Compilar y publicar la app web
PASO 3 → Crear usuarios y franquicias
PASO 4 → (Opcional Fase 1) Probar sin Bridge
PASO 5 → Instalar Bridge en PC franquicia
PASO 6 → Enlazar franquicia (bridge_url + API key)
PASO 7 → Prueba de aceptación
```

---

## Parte A — Base de datos (Supabase)

### A.1 Ejecutar scripts SQL

| | |
|--|--|
| **DÓNDE** | Navegador → [https://supabase.com](https://supabase.com) → su proyecto → **SQL Editor** |
| **CUÁNDO** | **Primero**, antes de publicar la app o instalar Bridge |
| **CÓMO** | 1. Abra **SQL Editor** → **New query**.<br>2. Copie y ejecute el contenido de `docs/supabase-evidencia-phase1.sql`.<br>3. Copie y ejecute el contenido de `docs/supabase-evidencia-phase2.sql`.<br>4. Pulse **Run** en cada uno. |
| **VERIFICACIÓN** | En **Table Editor** → `organizaciones`: existen columnas `storage_mode`, `bridge_url`, `bridge_api_key`.<br>En `alertas_crisis`: existen `evidencia_estado`, `evidencia_hash`, `evidencia_ruta_local`, etc. |

> **NOTA**  
> Si alguna columna ya existía, el script usa `IF NOT EXISTS` y no debe dar error.

### A.2 Comprobar tablas principales

| | |
|--|--|
| **DÓNDE** | Supabase → **Table Editor** |
| **CUÁNDO** | Inmediatamente después de A.1 |
| **CÓMO** | Confirme que existen (o créelas según su esquema base): `usuarios_clave`, `organizaciones`, `alertas_crisis`, `dispositivos_nfc`. |
| **VERIFICACIÓN** | Puede insertar una fila de prueba en `organizaciones` y borrarla. |

### A.3 Guardar claves (sin compartirlas mal)

| | |
|--|--|
| **DÓNDE** | Supabase → **Project Settings** → **API** |
| **CUÁNDO** | Antes del Bridge y antes de entregar credenciales |
| **CÓMO** | Anote en lugar seguro:<br>• **Project URL**<br>• **anon public** → va en la app web (`src/lib/supabase.js`)<br>• **service_role** → **solo** en `bridge/config.json` del PC franquicia |
| **VERIFICACIÓN** | La **service_role** no aparece en el código fuente subido a GitHub público. |

> **IMPORTANTE**  
> Nunca pegue la **service_role** en la PWA ni en el repositorio público.

---

## Parte B — Aplicación web (PWA + War Room)

### B.1 Instalar dependencias del proyecto principal

| | |
|--|--|
| **DÓNDE** | PC de desarrollo o servidor de build → carpeta raíz `clave-1001-standalone` |
| **CUÁNDO** | Después de Parte A |
| **CÓMO** | Abra **PowerShell** o **Símbolo del sistema**:<br><br>`cd ruta\clave-1001-standalone`<br>`npm install`<br>`npm run build` |
| **VERIFICACIÓN** | Mensaje `Compiled successfully` y carpeta `build\` creada. |

### B.2 Probar en local (opcional pero recomendado)

| | |
|--|--|
| **DÓNDE** | Mismo PC |
| **CUÁNDO** | Después de B.1 |
| **CÓMO** | `npm start` → navegador en `http://localhost:3000` |
| **VERIFICACIÓN** | Carga pantalla de login; puede iniciar sesión con un usuario de prueba. |

### B.3 Publicar en internet (producción)

| | |
|--|--|
| **DÓNDE** | Plataforma de hosting (ej. **Vercel**, Netlify, o su servidor con HTTPS) |
| **CUÁNDO** | Cuando la prueba local funcione |
| **CÓMO** | 1. Suba el proyecto o conecte Git.<br>2. Comando de build: `npm run build`<br>3. Carpeta de salida: `build`<br>4. Anote la URL final (ej. `https://clave1001.vercel.app`). |
| **VERIFICACIÓN** | La URL abre la app en el celular y en PC; icono “Agregar a pantalla de inicio” funciona (PWA). |

### B.4 Actualizar CORS del Bridge (cuando use Fase 2)

| | |
|--|--|
| **DÓNDE** | Archivo `bridge/config.json` en el PC franquicia |
| **CUÁNDO** | **Después** de conocer la URL definitiva de B.3 |
| **CÓMO** | En `corsOrigins` agregue su URL de producción, por ejemplo:<br>`"https://clave1001.vercel.app"` |
| **VERIFICACIÓN** | Tras reiniciar Bridge, el móvil en producción puede subir evidencia sin error CORS. |

---

## Parte C — Fase 1 sin Bridge (solo navegador)

Use esta parte si la franquicia **aún no** tiene Bridge. Puede operar mientras instala Fase 2.

### C.1 Crear operador y franquicia

| | |
|--|--|
| **DÓNDE** | App web → War Room (usuario con rol `admin` u `operador`) |
| **CUÁNDO** | App publicada (Parte B) |
| **CÓMO** | 1. Inicie sesión como administrador.<br>2. Menú **FRANQUICIAS** → crear organización.<br>3. Deje `storage_mode` en **Fase 1 — Descarga manual**.<br>4. Cree usuarios finales (app móvil) desde registro o panel. |
| **VERIFICACIÓN** | La franquicia aparece en el listado; un usuario puede iniciar sesión en el celular. |

### C.2 Capacitar al operador (Fase 1)

| | |
|--|--|
| **DÓNDE** | PC del operador + celular del usuario |
| **CUÁNDO** | Antes de operación real |
| **CÓMO** | Indique:<br>• Carpeta fija: `D:\Clave1001\Evidencias\`<br>• Tras cada alerta, mover el `.webm` de **Descargas** a esa carpeta<br>• En emergencia en el celular: **no bloquear el teléfono**, mantener la app abierta |
| **VERIFICACIÓN** | Operador completa una alerta de prueba y ubica el archivo en disco. |

---

## Parte D — Bridge en PC del franquiciatario (Fase 2)

> Instale **una copia del Bridge por cada franquicia**, en el PC que guardará las evidencias (puede ser el mismo del War Room).

### D.1 Requisitos del PC

| Requisito | Detalle |
|-----------|---------|
| Sistema | Windows 10/11 (64 bits) |
| Node.js | Versión **18 o superior** — [https://nodejs.org](https://nodejs.org) |
| Disco | Espacio libre según volumen de alertas (recomendado ≥ 50 GB) |
| Red | IP conocida en la LAN; puerto **9876** libre en firewall |
| Permisos | Usuario con derecho de escritura en `D:\Clave1001\Evidencias\` |

| | |
|--|--|
| **VERIFICACIÓN** | En PowerShell: `node -v` muestra `v18.x` o superior. |

### D.2 Copiar archivos del Bridge

| | |
|--|--|
| **DÓNDE** | PC del franquiciatario → ej. `C:\Clave1001\bridge\` |
| **CUÁNDO** | Después de Parte A (Supabase listo) |
| **CÓMO** | Copie la carpeta `bridge` del proyecto completa, incluyendo:<br>• `src\`<br>• `package.json`<br>• `config.example.json`<br>• `scripts\INICIAR-BRIDGE.bat` |
| **VERIFICACIÓN** | Existe `C:\Clave1001\bridge\src\server.js`. |

### D.3 Crear y completar config.json

| | |
|--|--|
| **DÓNDE** | `bridge\config.json` (cópia de `config.example.json`) |
| **CUÁNDO** | Antes del primer `npm start` |
| **CÓMO** | 1. `copy config.example.json config.json`<br>2. Edite con Bloc de notas cada campo: |

| Campo | Qué poner | Ejemplo |
|-------|-----------|---------|
| `port` | Puerto local | `9876` |
| `host` | Escuchar en todas las interfaces | `0.0.0.0` |
| `storagePath` | Carpeta de evidencias | `D:\\Clave1001\\Evidencias` |
| `apiKey` | Clave larga aleatoria (mín. 32 caracteres) | Generar una única por franquicia |
| `organizacionId` | UUID de la fila en `organizaciones` | Copiar de Supabase |
| `organizacionNombre` | Nombre comercial | `Franquicia Norte` |
| `supabaseUrl` | URL del proyecto | `https://xxxx.supabase.co` |
| `supabaseServiceKey` | Service role (secreto) | Solo en este archivo |
| `corsOrigins` | URL de la PWA | `["https://su-app.vercel.app"]` |

| | |
|--|--|
| **VERIFICACIÓN** | El archivo guardado es `config.json` (no `.example`). |

### D.4 Instalar dependencias del Bridge

| | |
|--|--|
| **DÓNDE** | PowerShell → carpeta `bridge` |
| **CUÁNDO** | Con `config.json` ya creado |
| **CÓMO** | `cd C:\Clave1001\bridge`<br>`npm install`<br><br>Si aparece error de certificado SSL:<br>`$env:NODE_OPTIONS="--use-system-ca"`<br>`npm install` |
| **VERIFICACIÓN** | Existe carpeta `node_modules\` sin errores finales. |

### D.5 Arrancar el Bridge

| | |
|--|--|
| **DÓNDE** | Mismo PC |
| **CUÁNDO** | Después de D.4 |
| **CÓMO** | Opción A — Doble clic en `scripts\INICIAR-BRIDGE.bat`<br>Opción B — `npm start` |
| **VERIFICACIÓN** | En consola aparece:<br>`CLAVE 1001 BRIDGE — Fase 2`<br>`Escuchando: http://localhost:9876` |

### D.6 Prueba de salud (health)

| | |
|--|--|
| **DÓNDE** | Navegador en el **mismo PC** |
| **CUÁNDO** | Bridge en ejecución (D.5) |
| **CÓMO** | Abra `http://localhost:9876/health` |
| **VERIFICACIÓN** | JSON con `"ok": true` y `storagePath` correcto. |

### D.7 Abrir firewall de Windows

| | |
|--|--|
| **DÓNDE** | PC franquiciatario → **Firewall de Windows** → Reglas de entrada |
| **CUÁNDO** | Antes de probar desde el celular |
| **CÓMO** | Permitir puerto **TCP 9876** (o el `port` de su config) para redes privadas. |
| **VERIFICACIÓN** | Desde otro dispositivo en la misma WiFi: `http://IP-DEL-PC:9876/health` responde. |

### D.8 Dejar el Bridge al iniciar Windows (recomendado)

| | |
|--|--|
| **DÓNDE** | Carpeta de inicio de Windows o **Programador de tareas** |
| **CUÁNDO** | Tras verificar D.6 y D.7 |
| **CÓMO** | Crear tarea al inicio de sesión que ejecute `INICIAR-BRIDGE.bat` con “Ejecutar aunque el usuario no haya iniciado sesión” (si aplica política de la empresa). |
| **VERIFICACIÓN** | Reinicie el PC → tras 1 minuto `/health` responde sin abrir manualmente la ventana. |

---

## Parte E — Configurar la franquicia en el sistema

### E.1 Enlazar Bridge con Supabase

| | |
|--|--|
| **DÓNDE** | Supabase → **Table Editor** → `organizaciones` → fila de la franquicia<br>**O** War Room → **FRANQUICIAS** → editar |
| **CUÁNDO** | Bridge funcionando (D.6) y con IP conocida |
| **CÓMO** | Actualice la fila: |

| Columna | Valor |
|---------|--------|
| `storage_mode` | `local_bridge` |
| `bridge_url` | `http://192.168.1.50:9876` (IP real del PC, **sin** barra final) |
| `bridge_api_key` | **Exactamente** la misma que `apiKey` en `config.json` |

| | |
|--|--|
| **VERIFICACIÓN** | Los tres campos guardados; usuario móvil de esa franquicia tiene `organizacion_id` correcto. |

### E.2 Invitación de usuarios B2B (opcional)

| | |
|--|--|
| **DÓNDE** | URL de la PWA |
| **CUÁNDO** | Franquicia ya creada |
| **CÓMO** | Comparta enlace de registro:<br>`https://su-app.vercel.app/?org=UUID_DE_LA_ORGANIZACION` |
| **VERIFICACIÓN** | Nuevo usuario se registra y ve colores/nombre de la franquicia. |

---

## Parte F — Prueba de aceptación final

Realice **todos** los ítems. Marque ✓ al terminar.

### F.1 Alerta desde el celular

| # | Acción | ✓ |
|---|--------|---|
| 1 | Usuario inicia sesión en la PWA (misma red WiFi que el Bridge, si Fase 2). | |
| 2 | Pulsa **S.O.S.** → pantalla de emergencia **al instante**. | |
| 3 | Acepta permisos de **ubicación** y **cámara/micrófono**. | |
| 4 | War Room muestra la alerta en menos de 5 segundos. | |

### F.2 Evidencia de video

| # | Acción | ✓ |
|---|--------|---|
| 5 | Espera hasta 30 s de grabación (o 5 min máx.). | |
| 6 | **Fase 2:** en `D:\Clave1001\Evidencias\...\` aparece un archivo `.webm`. | |
| 7 | **Fase 2:** en Supabase, `alertas_crisis` tiene `evidencia_estado` = `en_bridge` y `evidencia_ruta_local` con ruta. | |
| 8 | **Fase 1:** archivo en Descargas del PC operador. | |

### F.3 Desactivación

| # | Acción | ✓ |
|---|--------|---|
| 9 | Usuario ingresa **palabra clave** y desactiva. | |
| 10 | Alerta pasa a `resuelta` en Supabase. | |

### F.4 Mensaje al cliente final

Entregue al usuario esta instrucción impresa o por WhatsApp:

> *En una emergencia real: no bloquee el teléfono, no cierre Clave 1001 y mantenga buena señal de datos hasta que central confirme.*

---

## Apéndice A — Solución de problemas

| Síntoma | Causa probable | Qué hacer |
|---------|----------------|-----------|
| `npm install` falla con certificado SSL | Antivirus / proxy | `$env:NODE_OPTIONS="--use-system-ca"` y repetir; o instalar fuera de VPN |
| Bridge `/health` no abre | Bridge apagado o puerto bloqueado | `npm start`; revisar firewall |
| Celular no sube video al Bridge | `bridge_url` incorrecta o redes distintas | Misma WiFi; probar `http://IP:9876/health` **desde el celular** |
| Error CORS al subir | Falta URL en `corsOrigins` | Agregar URL exacta de la PWA en `config.json`; reiniciar Bridge |
| `organizacion_id no coincide` | API key de otra franquicia | Mismo `organizacionId` en config y en Supabase |
| Video no graba con pantalla bloqueada | Límite del navegador | Mantener app abierta; Fase 3 / app nativa |
| War Room no ve alerta | Realtime / red | Revisar Supabase; refrescar; comprobar `alertas_crisis` en tabla |
| Botón S.O.S. lento | GPS en frío | Esperar 3 s en pantalla principal antes de prueba; ya optimizado en app |

---

## Hoja de registro de instalación

*(Fotocopiable — una hoja por franquicia)*

| Campo | Valor |
|-------|--------|
| Nombre franquicia | |
| Fecha instalación | |
| Técnico instalador | |
| ID organización (UUID) | |
| URL PWA | |
| IP PC Bridge | |
| Puerto Bridge | |
| Ruta evidencias | |
| Instaló Fase 1 ☐ / Fase 2 ☐ | |
| Prueba F.1–F.10 aprobada ☐ | |
| Firma franquiciatario | |
| Firma Arché Holding | |

---

## Documentos relacionados

| Archivo | Contenido |
|---------|-----------|
| `docs/FRANQUICIA-PAQUETE.md` | Qué vender y qué entregar al cliente |
| `docs/supabase-evidencia-phase1.sql` | SQL Fase 1 |
| `docs/supabase-evidencia-phase2.sql` | SQL Fase 2 |
| `bridge/README.md` | Referencia técnica del Bridge |

---

*Fin del documento — Clave 1001 Guía de instalación v1.0*
