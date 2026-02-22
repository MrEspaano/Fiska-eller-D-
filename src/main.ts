import "./styles.css";
import { createGame } from "./game/Game";

const root = document.getElementById("app");
if (!root) {
  throw new Error("#app saknas");
}

root.querySelectorAll(".mobile-game-title").forEach((el) => el.remove());
const mobileTitle = document.createElement("div");
mobileTitle.className = "mobile-game-title";
mobileTitle.textContent = "Välkommen - Fiska eller DÖ";
root.appendChild(mobileTitle);

createGame(root);
