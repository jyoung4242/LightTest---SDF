import { Actor, Color, Engine, Random, Vector } from "excalibur";
import { Resources } from "../resources";
import { Crate } from "./crate";
import { Lamp } from "./lamp";
import { AmbientLight, Occluder } from "../Lib/Lighting";
import { OccluderActorArgs, SDFShapes } from "../Lib/Lighting/LightingTypesAndDefs";
import { SpotLight } from "./spotlight";

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
      intensity: 0.0025,
      color: Color.fromHex("#2c4a5e"),
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
    let crate = new Crate(cratedims, new Vector(this.rng.integer(100, 600), this.rng.integer(100, 300)));
    this.addChild(crate);
    crate = new Crate(cratedims, new Vector(this.rng.integer(100, 600), this.rng.integer(100, 300)));
    this.addChild(crate);
    crate = new Crate(cratedims, new Vector(this.rng.integer(100, 600), this.rng.integer(100, 300)));
    this.addChild(crate);
  }

  addSpotlight() {
    let spotlight = new SpotLight(new Vector(80, 64), 270, 359, 0.015);
    this.addChild(spotlight);
  }

  addLamp() {
    let magicNumber = this.rng.floating(0.9, 2.0);
    let lampScale: Vector = new Vector(magicNumber, magicNumber);
    let lamp;
    lamp = new Lamp(lampScale, new Vector(680, 64), this);
    this.addChild(lamp);
    lamp = new Lamp(lampScale, new Vector(680, 128), this);
    this.addChild(lamp);
    lamp = new Lamp(lampScale, new Vector(680, 192), this);
    this.addChild(lamp);
    lamp = new Lamp(lampScale, new Vector(680, 256), this);
    this.addChild(lamp);
  }
}
