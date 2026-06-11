import { GAMES, CANVA_URL } from "../shared/games.js";
import { createWallet } from "../shared/ui/wallet.js";

const gameList = document.querySelector("#game-list");
const canvaLink = document.querySelector("#canva-link");

const buildCard = (game) => {
  const item = document.createElement("li");
  item.className = `game-card game-card--${game.estado}`;

  const icon = document.createElement("span");
  icon.className = "game-icon";
  icon.style.background = game.color;
  icon.textContent = game.estado === "proximamente" ? "🔒" : game.emoji;

  const text = document.createElement("span");
  text.className = "game-text";
  const name = document.createElement("span");
  name.className = "game-name";
  name.textContent = game.estado === "proximamente" ? `${game.nombre} (Próximamente)` : game.nombre;
  const desc = document.createElement("span");
  desc.className = "game-desc";
  desc.textContent = game.descripcion;
  text.appendChild(name);
  text.appendChild(desc);

  if (game.estado === "disponible") {
    const link = document.createElement("a");
    link.className = "game-link";
    link.href = game.url;
    link.setAttribute("aria-label", `Jugar ${game.nombre}`);
    const go = document.createElement("span");
    go.className = "game-go";
    go.textContent = "›";
    link.appendChild(icon);
    link.appendChild(text);
    link.appendChild(go);
    item.appendChild(link);
  } else {
    item.setAttribute("aria-disabled", "true");
    item.appendChild(icon);
    item.appendChild(text);
  }

  return item;
};

GAMES.forEach((game) => gameList.appendChild(buildCard(game)));

if (canvaLink) {
  canvaLink.href = CANVA_URL;
}

createWallet();
