import { System, SystemType, Query, TransformComponent, Camera, Sprite, Engine, Screen, Actor, Color } from "excalibur";
import { PointLightComponent, AmbientLightComponent, OccluderComponent } from "./LigthingComponents";
import { LightingPostProcessor } from "./LightingPostProcessor";
import { LightingSystemConfig } from "./LightingTypesAndDefs";
import { AmbientLight, Occluder, PointLight } from "./LightingActors";
import { Resources } from "../../resources";

//Maximum 50 Pt Lights, 50 Ambient Lights, 15 Occluder Masks, 50 Occluders

export class LightingSystem extends System {
  engine: Engine;
  screen: Screen;
  camera: Camera;
  systemType: SystemType = SystemType.Update;
  plQuery: Query<typeof PointLightComponent | typeof TransformComponent>;
  alQuery: Query<typeof AmbientLightComponent | typeof TransformComponent>;
  occQuery: Query<typeof OccluderComponent | typeof TransformComponent>;
  private _pp: LightingPostProcessor;
  private _bufferSize: number;
  private _stepsSize: number = 1.0;
  private _occlusionRolloff: number = 0.0;

  constructor(config: LightingSystemConfig) {
    super();
    this.engine = config.engine;
    this.screen = this.engine.screen;
    this.camera = this.engine.currentScene.camera;

    this.plQuery = this.engine.currentScene.world.query([PointLightComponent, TransformComponent]);
    this.alQuery = this.engine.currentScene.world.query([AmbientLightComponent, TransformComponent]);
    this.occQuery = this.engine.currentScene.world.query([OccluderComponent, TransformComponent]);
    this._pp = config.postProcessor;
    this._bufferSize = config.lightingBufferSize;

    this._stepsSize = config.rayStepSize;
    this._occlusionRolloff = config.occlusionRolloff;
  }

  isLightVisible(entity: PointLight | AmbientLight | Occluder): boolean {
    const adjustedWidth = this.screen.width / this.camera.zoom;
    const adjustedHeight = this.screen.height / this.camera.zoom;
    const halfWidth = adjustedWidth / 2;
    const halfHeight = adjustedHeight / 2;

    const left = this.camera.pos.x - halfWidth - this._bufferSize;
    const right = this.camera.pos.x + halfWidth + this._bufferSize;
    const top = this.camera.pos.y - halfHeight - this._bufferSize;
    const bottom = this.camera.pos.y + halfHeight + this._bufferSize;

    return entity.pos.x >= left && entity.pos.x <= right && entity.pos.y >= top && entity.pos.y <= bottom;
  }

  update(elapsed: number): void {
    let plEntities = this.plQuery.entities as PointLight[];
    let alEntities = this.alQuery.entities as AmbientLight[];
    let occEntities = this.occQuery.entities as Occluder[];

    //filter out entities that aren't visible... i.e. outside the camera view + this._buffersize
    let visiblePLs: PointLight[] = plEntities.filter((pl: PointLight) => this.isLightVisible(pl));
    let visibleALs = alEntities.filter((al: AmbientLight) => this.isLightVisible(al));
    let visibleOcs = occEntities.filter((oc: Occluder) => this.isLightVisible(oc));

    // update the postprocessor entities data
    //check for exceeding entity limits and throw Error
    if (visiblePLs.length > 50) throw new Error("Too many PointLights");
    if (visibleALs.length > 50) throw new Error("Too many AmbientLights");
    if (visibleOcs.length > 50) throw new Error("Too many Occluders");

    this._pp.numPointLights = visiblePLs.length;
    this._pp.numAmbients = visibleALs.length;
    this._pp.numOccluders = visibleOcs.length;
    this._pp.pointLights = [...visiblePLs];
    this._pp.ambientLights = [...visibleALs];
    this._pp.occluders = [...visibleOcs];
    this._pp._RayStepSize = this._stepsSize;
    this._pp._occlusionRolloff = this._occlusionRolloff;
  }
}
