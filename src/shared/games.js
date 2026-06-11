// Fuente única de datos del catálogo de juegos.
// La portada (catalogo.js) y la billetera (nft/gallery.js, ui/wallet.js) leen de aquí.
export const GAMES = [
  {
    id: "sistema-solar",
    nombre: "Sistema Solar",
    descripcion: "Coloca cada planeta en su lugar",
    emoji: "🪐",
    color: "linear-gradient(135deg, #3b2f8f, #6a4bd6)",
    url: "/juegos/sistema-solar/",
    estado: "disponible"
  },
  {
    id: "operaciones",
    nombre: "Operaciones",
    descripcion: "Resuelve retos de matemáticas",
    emoji: "➗",
    color: "linear-gradient(135deg, #0e7a5f, #23b58a)",
    url: "/juegos/operaciones/",
    estado: "disponible"
  }
];

export const getGameById = (gameId) =>
  GAMES.find((game) => game.id === gameId) || null;

export const getGameName = (gameId) => {
  const game = getGameById(gameId);
  return game ? game.nombre : gameId;
};

// Enlace externo mostrado al pie del catálogo (antes era APP_CONFIG.returnUrl,
// que ya no usa ningún juego). Se centraliza aquí, en el módulo compartido.
export const CANVA_URL = "https://xerticagrupoacererobdr.my.canva.site/c1fncgdhef8bcwqy";
