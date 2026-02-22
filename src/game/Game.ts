import Phaser from "phaser";
import { GameState } from "./GameState";
import { CabinScene } from "./scenes/CabinScene";
import { WorldScene } from "./scenes/WorldScene";
import { AudioSystem } from "./systems/AudioSystem";

export function createGame(root: HTMLElement): Phaser.Game {
  const gameState = new GameState();
  const audioSystem = new AudioSystem(gameState.state.settings);

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: root,
    width: 1152,
    height: 648,
    backgroundColor: "#88a8b0",
    pixelArt: true,
    antialias: false,
    antialiasGL: false,
    roundPixels: true,
    render: {
      pixelArt: true,
      antialias: false,
      antialiasGL: false
    },
    physics: {
      default: "arcade",
      arcade: {
        gravity: { x: 0, y: 0 },
        debug: false
      }
    },
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH
    },
    scene: [WorldScene, CabinScene]
  });

  game.registry.set("gameState", gameState);
  game.registry.set("audioSystem", audioSystem);
  game.registry.set("hasStartedGame", false);
  if (game.canvas) {
    game.canvas.style.imageRendering = "pixelated";
  }
  return game;
}
