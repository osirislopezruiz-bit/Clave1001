# Clave 1001 Bridge (Fase 2)

Servicio **local** en el PC o servidor del franquiciatario. Recibe el video de emergencia y lo guarda en disco **sin usar Supabase Storage**.

## Requisitos

- Windows 10/11 o servidor con **Node.js 18+**
- Carpeta de evidencias (ej. `D:\Clave1001\Evidencias`)
- **Service role key** de Supabase (solo en este equipo, nunca en la PWA)

## Instalación rápida

```powershell
cd bridge
copy config.example.json config.json
# Editar config.json con bloc de notas
npm install
npm start
```

Probar: abrir `http://localhost:9876/health`

## Configuración en Supabase

Ejecutar `docs/supabase-evidencia-phase2.sql` y en la tabla `organizaciones`:

| Campo | Valor |
|-------|--------|
| `storage_mode` | `local_bridge` |
| `bridge_url` | URL accesible desde móviles (ej. `http://192.168.1.10:9876` o dominio VPN) |
| `bridge_api_key` | La misma que `apiKey` en `config.json` |

## Red

- El **celular del cliente** debe poder llegar a `bridge_url` (misma WiFi, VPN o IP pública con firewall).
- En producción use HTTPS (reverse proxy con Caddy/nginx) si expone el Bridge a internet.

## Qué entregar al franquiciatario

1. Carpeta `bridge/` o instalador generado por usted
2. `config.json` ya personalizado (API key + org id)
3. Acceso directo / tarea programada: `npm start` al iniciar Windows
4. Guía `docs/FRANQUICIA-PAQUETE.md`
