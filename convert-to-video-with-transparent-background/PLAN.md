# Plan: Convertir video a transparente (background removido)

## Objetivo

Dado un video de producto (ej. MP4), remover el fondo automaticamente con IA y exportar un video con canal alpha (fondo transparente), manteniendo solo el objeto/producto.

---

## Investigacion 2026: Mejores soluciones

### Opcion A (RECOMENDADA) — `@imgly/background-removal-node` + FFmpeg

| Aspecto | Detalle |
|---|---|
| **License** | AGPL-3.0 (gratis) |
| **Stars** | ~7,200 |
| **Modelo** | ONNX (BiRefNet / U²-Net) — corre 100% local, sin API |
| **Pipeline** | Frames → remover bg de cada frame → reensamblar con alpha |
| **Pros** | Privacidad total, sin costos recurrentes, maduro |
| **Contras** | Primer descarga ~170MB de modelos, procesamiento secuencial por frame |

### Opcion B — rembg (Python via subprocess + pipe streaming)

| Aspecto | Detalle |
|---|---|
| **License** | MIT |
| **Stars** | ~24,000 |
| **Modelo** | U²-Net / BiRefNet / ISNet |
| **Pipe** | `ffmpeg → stdin → rembg b → stdout → ffmpeg` |
| **Pros** | Sin archivos intermedios, mas rapido, mas modelos |
| **Contras** | Dependencia de Python + pip, orquestacion Node.js via child_process |

### Opcion C — Unscreen API (`@unscreen/video-background-remover`)

| Aspecto | Detalle |
|---|---|
| **License** | SDK MIT (servicio pago) |
| **SDK** | `npm install @unscreen/video-background-remover` |
| **Pros** | API directa para video (no frame-by-frame), webhooks, calidad alta |
| **Contras** | Pago por credito, requiere internet, datos van a cloud |

### Opcion D — VideoBGRemover SDK (`@videobgremover/sdk`)

| Aspecto | Detalle |
|---|---|
| **License** | SDK MIT (servicio pago) |
| **Features** | Composicion multicapa, WebM VP9 alpha, ProRes |
| **Pros** | Multiple output formats, composicion incluida |
| **Contras** | Pago por segundo de video, API key requerida |

---

## Arquitectura recomendada (Opcion A)

```
input.mp4
    │
    ▼
┌─────────────────────────────┐
│  FFmpeg: extraer frames PNG │  fps=10 (balance calidad/velocidad)
└─────────┬───────────────────┘
          │
          ▼ frames individuales
┌──────────────────────────────────┐
│  @imgly/background-removal-node  │  elimina fondo de cada frame
│  (ONNX local, sin API)           │  output: PNG con canal alpha
└─────────┬────────────────────────┘
          │
          ▼ frames con alpha
┌──────────────────────────────────┐
│  FFmpeg: reensamblar con alpha   │  VP9 (WebM) o ProRes (MOV)
│  -pix_fmt yuva420p               │
│  -c:v libvpx-vp9                 │
└─────────┬────────────────────────┘
          │
          ▼
output.webm  (fondo transparente)
```

### Pipeline alternativo (Opcion B, pipe streaming)

```
ffmpeg -i input.mp4 -f rawvideo -pix_fmt rgb24 - |
    rembg b <width> <height> -o frame-%04d.png |
    ffmpeg -framerate 10 -i frame-%04d.png
           -c:v libvpx-vp9 -pix_fmt yuva420p output.webm
```

---

## Formato de salida

| Formato | Codec | PixFmt | Alpha | Compatibilidad |
|---|---|---|---|---|
| WebM | libvpx-vp9 | yuva420p | ✅ | Chrome, Firefox, Edge |
| MOV | prores | yuva444p10le | ✅ | QuickTime, DaVinci, FCP |
| MOV | qtrle | rgba | ✅ | QuickTime (poco comprimido) |
| PNG sequence | — | rgba | ✅ | Universal |

**Recomendado**: WebM VP9 con alpha — mejor compresion, soportado en navegadores modernos.

---

## Consideraciones tecnicas

1. **Performance**: Procesar frame por frame es lento para videos largos. Usar `fps=10` como balance. Para produccion, considerar GPU (CUDA/CoreML con onnxruntime).
2. **Memoria**: No cargar todos los frames en RAM. Pipeline streaming o procesar batches.
3. **Calidad**: El modelo BiRefNet da mejores bordes que U²-Net. `@imgly` usa modelos propietarios entrenados por IMG.LY.
4. **FFmpeg**: Necesario para extraer frames y reensamblar. El proyecto ya tiene `ffmpeg-static` y `fluent-ffmpeg` como dependencias.

---

## Dependencias necesarias

```json
{
  "dependencies": {
    "@imgly/background-removal-node": "^1.4.5",
    "fluent-ffmpeg": "^2.1.3",
    "ffmpeg-static": "^5.3.0",
    "sharp": "^0.34.5"
  }
}
```

(O `@unscreen/video-background-remover` para la opcion cloud.)

---

## Resumen de decision

| Criterio | Opcion A (imgly + FFmpeg) | Opcion B (rembg pipe) | Opcion C (Unscreen API) |
|---|---|---|---|
| **Local/offline** | ✅ | ✅ | ❌ (requiere internet) |
| **Sin costo por uso** | ✅ | ✅ | ❌ |
| **Calidad IA** | Alta | Alta (BiRefNet) | Muy alta |
| **Complejidad impl** | Media | Alta (orquestar Python) | Baja|
| **Velocidad** | Media | Alta (streaming pipe) | Alta (servidores GPU) |
| **Licencia** | AGPL (gratis) | MIT | SDK MIT (servicio pago) |

**✅ RECOMENDACION FINAL**: Comenzar con **Opcion A** (`@imgly/background-removal-node` + FFmpeg) por ser 100% local, sin costos, y pure JS. Si se necesita mayor velocidad o calidad, migrar a **Opcion C** (Unscreen API).
