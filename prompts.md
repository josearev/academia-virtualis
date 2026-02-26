# Academia Virtualis

## Misión

Debes hacer una página web que sea un juego educativo de realidad aumentada

## Detalles Funcionales

1. Al abrir la página, debe aparecer un sistema solar en 3D sobre la imagen de la cámara (realidad aumentada)
2. Sobre cada uno de los planetas debe aparecer el nombre pero en desorden
3. Los nombres de los planetas se deben poder mover: arrastrar y soltar
4. El estudiante podrá usar sus dedos o el mouse para arrastrar los nombres de los planetas
5. Cuando el estudiante coloque el nombre correspondiente en el planeta de forma correcta, debe aparecer una animación de un sello de un visto bueno color verde
6. Si el estudiante tiene 8 sellos (todos los planetas correctos), debe aparecer un mensaje que diga: "Felicidades! Has completado la actividad. Ahora has ganado 1 NFT que será guardado en tu NFT gallery"
7. Luego de 5 segundos debe aparecer una imagen del NFT que ha ganado, escoge uno al azar de la carpeta nfts/. Habrán 10 variantes diferentes
8. Finalmente debe aparecer dos botones, uno para cerrar el sitio y otro para volverlo a intentar

## Tecnología

1. El sitio debe funcionar principalmente en dispositivos Apple, tanto iphone como ipad deben estar soportados
2. Cuando tengas una versión del sitio, levanta un servidor local y muestrame la dirección para acceder desde mi dispositivo

Por favor realizame las preguntas que consideres necesarias para realizar esta tarea

---

Implemented end-to-end.

  Running URLs

  - iPhone/iPad (HTTPS): https://large-horses-serve.loca.lt
  - Local network: http://192.168.100.245:5173/
  - If LocalTunnel asks for a password, use: 157.100.142.247

---

Sí, ya quedó implementado y activo.

  URL HTTPS para acceder desde iPhone/iPad:

  - https://light-kids-leave.loca.lt

  Si LocalTunnel pide contraseña:

  - 157.100.142.247

  También dejé un comando nuevo para que lo levantes en un paso:

  - npm run dev:remote

  Esto inicia Vite + túnel HTTPS y te imprime:

  - URL pública
  - contraseña de LocalTunnel (si aplica)

---

Clave: virtualis.1811

---

Hecho. Ya quedó configurado para usar siempre la clave virtualis.1811.

  Cambios aplicados:

  - Reemplacé el flujo de túnel para dev:remote y tunnel usando cloudflared.
  - Añadí un proxy con autenticación básica fija:
      - Usuario: virtualis
      - Contraseña: virtualis.1811

  Túnel activo ahora:

  - URL: https://membership-model-irc-picnic.trycloudflare.com
  - Credenciales: virtualis / virtualis.1811

  Comandos a usar en adelante:

  - npm run dev:remote (servidor + túnel HTTPS + auth)
  - npm run tunnel (alias al mismo flujo)

---

gracias! el marcador ahora lo reconoce mucho mejor! pero el sistema solar sigue sin verse bien, hice una captura para que veas lo que está sucediendo, la captura está en '/Users/josearevalo/proyectos/academia-virtualis/assets/debug/Academia Virtualis - Sistema Solar AR.png'
Una posible solución es que permitamos hacer zoom con pinch al sistema solar

También ten en cuenta que moví la carpeta de NFTs dentro de assets


por favort no te preocupes de la escala, cuando se detecte el marcador, el sistema solar debe mostrarse al menos hasta Marte en el área del marcador. Te dejo una imagen de muestra para que tomes de ejemplo las escalas que podemos manejar para que salga todo el sistema solar en la pantalla: /Users/josearevalo/proyectos/academia-virtualis/assets/debug/ejemplo-sistema-solar.png