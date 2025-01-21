import { Actor, Color, Engine, Vector } from "excalibur";
import { Resources } from "../resources";
import { PointLight } from "../Lib/Lighting";

const LampColor = Color.fromHex("#d1cf9f");

export class Lamp extends Actor {
  pLight: PointLight;
  isClicked: boolean = false;
  clickThrottle: number = 0;
  owner: Actor;

  constructor(scale: Vector, pos: Vector, parent: Actor) {
    super({
      pos,
      width: 21,
      height: 33,
      z: 1,
      anchor: Vector.Zero,
    });

    this.owner = parent;

    this.pLight = new PointLight({
      pos: new Vector(this.width / 2, this.height / 2),
      color: LampColor,
      intensity: 0.01,
      falloff: 0.015,
      anchor: Vector.Zero,
    });
    this.addChild(this.pLight);
  }

  onInitialize(engine: Engine): void {
    this.graphics.use(Resources.lamp.toSprite());
    this.on("pointerdown", () => {
      this.isClicked = true;
    });

    this.on("pointerup", () => {
      this.isClicked = false;
    });
  }

  onPreUpdate(engine: Engine, elapsed: number): void {
    if (this.isClicked) {
      this.clickThrottle++;

      if (this.clickThrottle > 10) {
        //get pointer position
        const pointerPos = engine.input.pointers.primary.lastWorldPos;
        this.pos = pointerPos.sub(this.owner.pos);
      }
    }
  }
}
