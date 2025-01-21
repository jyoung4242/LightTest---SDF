// resources.ts
import { ImageSource, Loader, Sprite, SpriteSheet } from "excalibur";
import floor from "./Assets/floor.png"; // replace this
import crate from "./Assets/crate.png";
import lamp from "./Assets/lamp.png";
import roomOcc from "./Assets/roomOcc.png";
import crateOcc from "./Assets/crateOcc.png";
import blank from "./Assets/blank.png";
import SpotLight from "./Assets/spotlight.png";

export const Resources = {
  floor: new ImageSource(floor),
  crate: new ImageSource(crate),
  lamp: new ImageSource(lamp),
  roomOcc: new ImageSource(roomOcc),
  crateOcc: new ImageSource(crateOcc),
  blank: new ImageSource(blank),
  spotlight: new ImageSource(SpotLight),
};

export const loader = new Loader();

for (let res of Object.values(Resources)) {
  loader.addResource(res);
}
