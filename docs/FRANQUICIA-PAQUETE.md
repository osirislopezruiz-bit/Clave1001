# Paquete para franquiciatarios — Clave 1001

Documento comercial y técnico para **vender e instalar** cada franquicia.

---

## Resumen por fase

| Fase | ¿Instalan software? | Dónde queda el video |
|------|---------------------|----------------------|
| **1** | No | Descargas del PC del operador + respaldo en el celular |
| **2** | **Sí — Bridge** | Disco del franquiciatario (`D:\Clave1001\Evidencias\`) |
| **3** | Mismo Bridge | + retención legal, actas, soporte |

---

## Fase 1 — Operación web (sin instalador)

### Qué entregas

- URL de la **PWA** (usuarios finales) y del **War Room** (operadores).
- Credenciales por franquicia / operador.
- Este manual (sección Fase 1).

### Flujo operativo

1. Usuario pulsa **S.O.S.** → emergencia en pantalla al instante.
2. Cámara y audio hasta **5 minutos** (o hasta desactivar con palabra clave).
3. Operador abre la alerta en War Room → grabación automática en su PC.
4. Archivo `.webm` en **Descargas** → mover a carpeta acordada.

### Limitación importante — celular bloqueado o app cerrada

| Situación | ¿Sigue grabando video? |
|-----------|-------------------------|
| App abierta, pantalla encendida | **Sí** (recomendado) |
| Usuario bloquea el teléfono | **No de forma fiable** (límite del navegador) |
| Usuario cambia a otra app | **Se pausa**; se guardan fragmentos en el teléfono |
| Usuario vuelve a la app | **Intenta reanudar** la cámara |

**Mensaje para capacitación:** *“En emergencia, no bloquee el teléfono y mantenga Clave 1001 abierta.”*

La **ubicación GPS** y la **alerta en central** sí pueden seguir activas aunque minimicen la app; el **video** en web depende de que la app siga viva.

### Qué NO prometer en Fase 1

- “Graba aunque apaguen la pantalla” en versión solo web.
- “El video siempre llega solo al disco del franquiciatario” sin que el operador mueva archivos.

---

## Fase 2 — Clave 1001 Bridge (instalación obligatoria)

### Qué instalan

En el **PC o servidor de la franquicia** (Windows recomendado):

| Entregable | Descripción |
|------------|-------------|
| **Carpeta `bridge/`** o instalador que usted empaquete | Servicio Node.js |
| **`config.json`** | API key, ID de organización, ruta de disco, claves Supabase (service role **solo aquí**) |
| **Acceso directo / servicio Windows** | Ejecutar `npm start` al encender el PC |
| **Guía de 1 página** | Instalar → probar `http://localhost:9876/health` → configurar Supabase |

Nombre comercial sugerido: **“Clave 1001 Bridge”**.

### Qué hace el Bridge

- Escucha en un puerto local (por defecto **9876**).
- Recibe el `.webm` desde el **celular del cliente** o el **War Room**.
- Guarda en:  
  `D:\Clave1001\Evidencias\{organizacion_id}\{año}\{mes}\{alerta_id}_{fecha}.webm`
- Calcula **SHA-256** y actualiza en Supabase solo **metadatos** (ruta local, hash, estado).
- **No sube el archivo** a Supabase Storage ni a la nube de Arché.

### Configuración en Supabase (por franquicia)

Ejecutar `docs/supabase-evidencia-phase2.sql` y completar:

```text
storage_mode     = local_bridge
bridge_url       = http://IP-DEL-PC-FRANQUICIA:9876
bridge_api_key   = (misma clave que en bridge/config.json)
```

El **móvil del usuario** debe poder abrir `bridge_url` (misma red WiFi, VPN o IP fija).

### Checklist de red

- [ ] Puerto 9876 abierto en firewall del PC franquicia.
- [ ] Antivirus no bloquea `node.exe`.
- [ ] Prueba desde el celular (WiFi misma red): abrir `/health` en el navegador.
- [ ] En producción expuesta a internet: usar **HTTPS** (Caddy/nginx delante del Bridge).

### Instalación rápida (técnico)

```powershell
cd bridge
copy config.example.json config.json
notepad config.json
npm install
npm start
```

Desde la raíz del proyecto también: `npm run bridge`

### Paquete ZIP sugerido para el cliente

```text
Clave1001-Bridge-{NombreFranquicia}/
  bridge/              (código + node_modules o script install)
  config.json          (ya personalizado)
  INICIAR-BRIDGE.bat
  Manual-1-pagina.pdf
```

Ejemplo `INICIAR-BRIDGE.bat`:

```bat
@echo off
cd /d "%~dp0bridge"
node src\server.js
pause
```

---

## Fase 3 — Cumplimiento (cuando aprueben)

| Entregable | Contenido |
|------------|-----------|
| Retención | Borrado automático a 90 días (script en Bridge) |
| Acta de cadena de custodia | PDF con hash SHA-256 + ruta + fecha |
| SLA | Reinstalación, rotación de `bridge_api_key`, monitoreo |

---

## Qué dice el contrato vs la realidad técnica

| Promesa comercial | Fase necesaria |
|-------------------|----------------|
| Alerta y GPS en central al instante | Fase 1 |
| Video en disco del franquiciatario sin nube de Arché | **Fase 2 (Bridge)** |
| Grabación con teléfono bloqueado | Fase 3 o **app nativa** (futuro) |

---

## Soporte — preguntas frecuentes

**¿El Bridge graba si el operador no está en el War Room?**  
Sí, si el **celular** sube el archivo al terminar los 5 min y `bridge_url` es alcanzable.

**¿Pueden varias franquicias en un solo Bridge?**  
Una instalación = una `organizacionId` en `config.json`. Una instancia por franquicia.

**¿Dónde está la service role key?**  
Solo en `bridge/config.json` del PC del franquiciatario, nunca en la PWA pública.

---

## Contacto interno Arché

Actualizar este documento cuando se apruebe Fase 3 o app nativa Android/iOS.
