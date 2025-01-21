import { Actor, Color, Engine, Random, Vector } from "excalibur";
import { Resources } from "../resources";
import { Crate } from "./crate";
import { Lamp } from "./lamp";
import { AmbientLight, Occluder } from "../Lib/Lighting";
import { OccluderActorArgs, SDFShapes } from "../Lib/Lighting/LightingTypesAndDefs";

export class Room extends Actor {
  firsttimeflag: boolean = true;
  rng = new Random();
  occ: Occluder;
  al: AmbientLight;
  constructor() {
    super({
      x: 0,
      y: 0,
      width: 736,
      height: 461,
      z: 0,
      anchor: Vector.Zero,
    });

    //@ts-ignore
    let oCconfig: OccluderActorArgs = {
      pos: new Vector(736 / 2, 461 / 2),
      width: 736,
      height: 461,
      rotation: 0.0,
      radius: 0.0,
      shape: SDFShapes.EmptyBox,
    };
    this.occ = new Occluder(oCconfig);

    this.addChild(this.occ);

    this.al = new AmbientLight({
      intensity: 0.0005,
      color: Color.Red,
    });

    this.addChild(this.al);
  }

  onInitialize(engine: Engine): void {
    this.graphics.use(Resources.floor.toSprite());
    engine.currentScene.camera.strategy.lockToActor(this);
  }

  addCrate() {
    let ratio = 29 / 36;
    let magicNumber = this.rng.floating(1.0, 2.0);
    let cratedims: Vector = new Vector(ratio * magicNumber, magicNumber);
    let crate = new Crate(cratedims, new Vector(325, 275));
    this.addChild(crate);
  }

  addLamp() {
    let magicNumber = this.rng.floating(0.9, 2.0);
    let lampScale: Vector = new Vector(magicNumber, magicNumber);
    let lamp;
    lamp = new Lamp(lampScale, new Vector(325 + 29 / 2 - 10, 275 + 36 / 2 - 16), this);
    this.addChild(lamp);
    /* lamp = new Lamp(lampScale, new Vector(500, 350), this);
    this.addChild(lamp);
    lamp = new Lamp(lampScale, new Vector(350, 150), this);
    this.addChild(lamp); */
  }
}
