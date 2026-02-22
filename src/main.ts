import "./styles.css";
import { createGame } from "./game/Game";

const root = document.getElementById("app");
if (!root) {
  throw new Error("#app saknas");
}

createGame(root);
