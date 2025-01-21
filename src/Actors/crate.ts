import { Actor, Color, Engine, toRadians, Vector } from "excalibur";
import { Resources } from "../resources";
import { Occluder, PointLight } from "../Lib/Lighting";
import { SDFShapes } from "../Lib/Lighting/LightingTypesAndDefs";

export class Crate extends Actor {
  occ: Occluder;
  pl: PointLight;
  constructor(scale: Vector, pos: Vector) {
    super({
      pos,
      width: 29,
      height: 36,
      rotation: toRadians(120),
      z: 1,
      anchor: Vector.Zero,
    });

    this.pl = new PointLight({
      pos: new Vector(this.width / 2, this.height / 2),
      color: Color.fromHex("#d1cf9f"),
      intensity: 0.0075,
      falloff: 0.1,
      anchor: Vector.Zero,
    });

    //@ts-ignore
    this.occ = new Occluder({
      pos: new Vector(14.5, 16.0),
      //width: 15.0,
      //height: 36.0,
      radius: 18.0,
      rotation: this.rotation,
      shape: SDFShapes.Circle,
    });

    this.addChild(this.occ);
    //this.addChild(this.pl);
  }

  onInitialize(engine: Engine): void {
    this.graphics.use(Resources.crate.toSprite());
  }

  onPreUpdate(engine: Engine, elapsed: number): void {
    // console.log("crate pos: ", this.globalPos);
  }
}
