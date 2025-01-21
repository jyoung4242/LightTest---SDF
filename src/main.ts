// main.ts
import "./style.css";

import { UI } from "@peasy-lib/peasy-ui";
import { Engine, DisplayMode, ExcaliburGraphicsContextWebGL } from "excalibur";
import { model, template } from "./UI/UI";
import { loader, Resources } from "./resources";
import { Room } from "./Actors/Room";
import { LightingPostProcessor, LightingSystem } from "./Lib/Lighting";
import { LightingSystemConfig } from "./Lib/Lighting/LightingTypesAndDefs";

await UI.create(document.body, model, template).attached;

const game = new Engine({
  width: 800, // the width of the canvas
  height: 600, // the height of the canvas
  canvasElementId: "cnv", // the DOM canvas element ID, if you are providing your own
  displayMode: DisplayMode.Fixed, // the display mode
  pixelArt: true,
});

await game.start(loader);

//create PP and Lighting system, add to Scene
let myPP = new LightingPostProcessor(game.graphicsContext as ExcaliburGraphicsContextWebGL, game);
let lsConfig: LightingSystemConfig = {
  postProcessor: myPP,
  lightingBufferSize: 20,
  engine: game,
  rayStepSize: 1.0, // in pixels
  occlusionRolloff: 2.5,
};
let ls = new LightingSystem(lsConfig);
game.currentScene.world.add(ls);

game.graphicsContext.addPostProcessor(myPP);

let room = new Room();
game.add(room);
room.addSpotlight();
room.addCrate();
room.addLamp();
