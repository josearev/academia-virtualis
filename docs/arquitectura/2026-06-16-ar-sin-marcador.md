# AR sin marcador (world tracking) — Análisis e investigación

> Fecha: 2026-06-16
> Estado: investigación / decisión pendiente
> Contexto: José y Lucas (hackathon). Proyecto **iPhone-first** (Safari iOS/iPadOS).

## 1. La pregunta

¿Se puede, en vez de usar un marcador impreso, anclar los objetos 3D a **objetos reales de la
escena** (un punto de la mesa de la sala, una almohada del dormitorio) de forma dinámica,
manteniendo la perspectiva 3D según el ancla?

## 2. Respuesta corta

**Sí, conceptualmente** — se llama **AR sin marcador / world tracking**, y la técnica base es
**SLAM** (la cámara reconstruye el espacio y fija anclas en superficies reales). El obstáculo
**no es la idea, es la plataforma**: Safari en iPhone/iPad.

- "Que una almohada/mesa sea el marcador" con anclaje 3D estable **requiere SLAM (6DoF)**.
- Detectar "una almohada" solo con un modelo de visión daría una **caja 2D que tiembla**, sin
  perspectiva 3D real → no cumple el objetivo.

## 3. El cuello de botella: Safari iOS (estado a junio 2026)

- **WebXR** (la API web estándar para AR, incluido `immersive-ar` + `hit-test`) **funciona en
  Android (Chrome)** pero **NO en Safari iOS/iPadOS**. Sigue sin estar habilitado en 2026.
- En **visionOS** (Apple Vision Pro) Safari soporta WebXR `immersive-vr`, pero el **módulo AR
  (`immersive-ar`) aún no está habilitado** ni en visionOS ni en iOS.
- Las librerías open-source **no logran world tracking / detección de planos confiable en iOS**
  todavía.

> ⚠️ **Punto a re-verificar (input de José):** Apple podría estar liberando capacidades de AR en
> Safari en su **nueva versión de SO** (tecnología tomada de Vision Pro). Si `immersive-ar` (WebXR
> AR Module) llega a Safari iOS, **cambia todo** y el Camino C (gratis, estándar) pasaría a ser el
> recomendado. **Acción:** cuando José pase los detalles/versión, validar:
> 1. ¿Safari iOS expone `navigator.xr` y soporta `immersive-ar`?
> 2. ¿Incluye `hit-test` (colocar sobre superficies) y/o anclas (`anchors`)?
> 3. ¿Requiere un flag, una versión mínima de iOS, o gesto del usuario?
> 4. Probar con un demo mínimo de WebXR hit-test en el dispositivo real.

## 4. Caminos posibles

| Camino | ¿iPhone (Safari)? | Calidad de anclaje | Costo / Esfuerzo |
|---|---|---|---|
| **A. Tap-to-place + giroscopio (3DoF)** | ✅ Sí | Media — fija **dirección** al girar; **no** se mantiene si el usuario camina | 🟢 Gratis, esfuerzo medio |
| **B. Plataforma WebAR con SLAM** (Onirix, Zappar/Mattercraft, Hololink, Kivicube) | ✅ Sí (sin instalar app; usan ARKit vía App Clip/binario) | Alta — 6DoF real, objeto pegado a la superficie aunque te muevas | 🔴 De pago (~€9–99/mes) + integración mayor |
| **C. WebXR (`hit-test`)** | ❌ Hoy no en iOS (✅ Android) | Alta | 🟢 Gratis y estándar — **dependiente de que Apple lo habilite (ver §3)** |

### Detalle Camino A (recomendado para empezar, gratis)
1. Fondo = **video de la cámara** (`getUserMedia`).
2. Permiso de **giroscopio** (`DeviceOrientationEvent`, requiere gesto del usuario en iOS).
3. El usuario apunta a la mesa y **toca la pantalla** → se "suelta" ahí el contenido 3D
   (operación + bola de energía + esferas, que ya son objetos 3D).
4. Al **girar** el teléfono, el contenido se mantiene en esa dirección (sensación de anclado).
5. **Limitación honesta:** sin SLAM, si el usuario **camina/traslada**, el objeto no se queda
   clavado en la mesa (no hay 6DoF). Para eso → Camino B o C.

> Reutiliza casi todo el juego 3D actual; solo cambia **cómo se ancla** (giroscopio + tap en vez
> del marcador MindAR).

## 5. Contexto del proyecto hoy

- Stack: Vite + A-Frame + **MindAR (image tracking)**, Three.js, sin backend, iPhone-first.
- Hoy el AR es **con marcador** (`assets/targets/marker-sistema-solar.mind`), compartido por todos
  los juegos.
- El juego de Operaciones ya tiene **gameplay 3D real** anclado al marcador + **modo `?nomarker`**
  (sin cámara, fondo degradado) para pruebas en navegador. Ese modo `?nomarker` es una buena base
  para prototipar el Camino A (ya separa "ancla" de "cámara").

## 6. Recomendación

1. **Esperar los detalles de José** sobre el soporte AR de la nueva versión de Safari/iOS (§3).
   Si Apple habilita WebXR `immersive-ar` en Safari iOS → ir por **Camino C** (gratis, estándar,
   anclaje real a superficies).
2. **Si aún no está disponible** y se quiere avanzar ya: prototipar **Camino A** como un **modo
   nuevo** (junto al marcador actual), sabiendo su límite (3DoF, no resiste traslación).
3. **Camino B (SLAM de pago)** solo si se necesita anclaje 6DoF robusto antes de que Apple libere
   WebXR; implica costo recurrente e integración mayor.

## 7. Fuentes (jun 2026)

- The state of WebXR on iOS, and beyond — Variant Launch: https://launch.variant3d.com/blog/23-06-state-webxr-on-ios-beyond
- WebXR: Browser Support (2026 Guide) — TestMu AI: https://www.testmuai.com/learning-hub/webxr-compatible-browsers/
- WebXR AR module support in Safari — Apple Developer Forums: https://developer.apple.com/forums/thread/756850
- 8th Wall shutdown / WebAR alternatives 2026 — Kivicube: https://www.kivicube.com/post/augmented-reality-after-8th-wall-shutdown-your-2026-guide-to-the-right-webar-platform/
- Onirix (SLAM en iOS, alternativa a 8th Wall): https://www.onirix.com/onirix-8thwall-alternative/
- Migrating from 8th Wall: choosing a WebAR framework — FrameSixty: https://framesixty.com/web-augmented-reality-framework/

## 8. Pendientes (cuando José traiga los detalles de iOS/Safari)

- [ ] Confirmar versión de iOS/Safari y si expone WebXR `immersive-ar`.
- [ ] Probar demo mínimo de WebXR hit-test en iPhone real.
- [ ] Si funciona → diseñar migración del anclaje (marcador → world tracking) como modo nuevo.
- [ ] Decidir si los juegos soportan **ambos** modos (marcador + sin marcador) o sólo uno.
