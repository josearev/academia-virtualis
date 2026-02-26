# Directivas Operativas (Actualizado)

## Objetivo
Conservar reglas prácticas aprendidas durante la sesión para mantener consistencia en UX, configuración y flujo de trabajo.

## Reglas de versión y commits
- Mostrar versión visible en UI (`#version-counter`).
- Incrementar sub-versión en cada commit de app (`0.x -> 0.(x+1)`).
- Mantener formato de commit: `[Modelo]: Descripción`.
- No incluir cambios locales no relacionados en commits.

## Configuración centralizada
- Usar `src/config/app-config.js` como fuente única de:
  - constantes globales
  - flags de UI
  - rangos/valores iniciales de sliders
  - claves de persistencia en cookies
- Evitar hardcodear constantes duplicadas en `main.js`, `scene.js` o `overlay.js`.

## AR y controles
- Intentar iniciar cámara automáticamente.
- Si falla autoarranque, mostrar fallback manual con botón centrado.
- Mantener panel principal de controles (`#zoom-controls`) visible solo con marcador detectado.
- Mantener panel de rotación (`#rotation-controls`) separado y controlado por flag:
  - `UI_FLAGS.showRotationControls`
- Rotación global del sistema solar en X/Y/Z:
  - unidad en grados
  - rango `-180..180`
  - persistencia en cookies

## Persistencia de preferencias
- Guardar en cookies los sliders de:
  - zoom, órbitas, escala de planetas, velocidad
  - rotación X/Y/Z
- Restaurar preferencias al iniciar.
- No resetear preferencias al perder y recuperar marcador.

## UI/UX de actividad
- Flujo de finalización en dos popups:
  1. popup de felicitación con countdown de 5s
  2. popup de NFT con acciones
- El popup NFT debe incluir botón `Descargar NFT`.
- El tamaño del popup NFT debe priorizar legibilidad de los 3 botones.
- Mantener animación de confeti al completar (duración 5s).
- Densidad de confeti configurada a `2.5x` respecto al baseline inicial.

## Drag & drop
- Al acertar etiqueta en planeta ocupado:
  - fijar etiqueta correcta
  - mantener etiqueta desplazada en el mismo planeta (debajo), no intercambiar a otro planeta
- En errores de arrastre:
  - feedback visual temporal (parpadeo/rojo)
  - retorno a su ancla previa

## Limpieza y depuración
- No usar atajos de debug en producción para mostrar/ocultar etiquetas.
- No mostrar HUD de debug residual relacionado a tecla `M`.
- Eliminar código huérfano cuando se retire una funcionalidad.

## Túnel remoto
- Mantener convenciones de credenciales acordadas por el usuario, salvo cambio explícito.
- Preservar flujo `npm run dev:remote` / `npm run tunnel` según configuración vigente del repo.
