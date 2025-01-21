import { Actor, Color, Engine, toRadians, Vector } from "excalibur";
import { Resources } from "../resources";
import { Occluder, PointLight } from "../Lib/Lighting";
import { SDFShapes } from "../Lib/Lighting/LightingTypesAndDefs";

export class SpotLight extends Actor {
  occ: Occluder;
  pl: PointLight;
  sweepSpeed: number;
  direction: "clockwise" | "counterclockwise" = "clockwise";

  angleTolerance: number = 0.5;

  constructor(pos: Vector, public startAngle: number, public endAngle: number, speed: number) {
    super({
      pos,
      width: 4,
      height: 9,
      rotation: toRadians(startAngle),
      z: 1,
      anchor: Vector.Zero,
    });

    this.sweepSpeed = speed;

    this.pl = new PointLight({
      pos: new Vector(0, 8),
      color: Color.fromHex("#e6d65b"),
      intensity: 0.15,
      falloff: 0.5,
      anchor: Vector.Zero,
    });

    //@ts-ignore
    this.occ = new Occluder({
      pos: new Vector(0, 8),
      width: 4,
      height: 9,
      //radius: 18.0,
      rotation: this.rotation,
      shape: SDFShapes.SpotLight,
    });

    this.addChild(this.occ);
    this.addChild(this.pl);
  }

  onInitialize(engine: Engine): void {
    this.graphics.use(Resources.spotlight.toSprite());
  }

  onPreUpdate(engine: Engine, elapsed: number): void {
    console.log(this.rotation);

    if (this.direction === "clockwise") {
      this.rotation += this.sweepSpeed;
      if (this.rotation >= toRadians(this.endAngle)) {
        this.direction = "counterclockwise";
      }
    } else {
      this.rotation -= this.sweepSpeed;
      if (this.rotation <= toRadians(this.startAngle)) {
        this.direction = "clockwise";
      }
    }
    this.occ.rotation = this.rotation;
  }
}
