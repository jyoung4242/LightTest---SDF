import { Sprite, ScreenShader, Engine, Color, Vector } from "excalibur";
import { Occluder, PointLight, AmbientLight } from "./LightingActors";
import { shader } from "./LightingShader";

export class LightingPostProcessor implements ex.PostProcessor {
  private _shader: ex.ScreenShader | undefined;
  texture: WebGLTexture | null = null;

  private _numOccluders: number = 0;
  private _numPointLights: number = 0;
  private _numAmbients: number = 0;

  public occluders: Occluder[] = [];
  public pointLights: PointLight[] = [];
  public ambientLights: AmbientLight[] = [];
  public occlusionMasks: Sprite[] = [];

  qualityThreshold: number = 0;
  volumetricDensity: number = 0;
  volumetricScattering: number = 0;
  volumetricSamples: number = 0;
  volumetricColor: Color = new Color(0, 0, 0);

  public _RayStepSize = 1.0;
  public _occlusionRolloff = 0.0;

  constructor(public graphicsContext: ex.ExcaliburGraphicsContextWebGL, public engine: Engine) {
    console.log(this);
  }

  initialize(gl: WebGL2RenderingContext): void {
    this._shader = new ScreenShader(gl, shader);
  }

  getLayout(): ex.VertexLayout {
    //@ts-expect-error
    return this._shader.getLayout();
  }

  getShader(): ex.Shader {
    //@ts-expect-error
    return this._shader.getShader();
  }

  set numPointLights(num: number) {
    this._numPointLights = num;
  }

  set numAmbients(num: number) {
    this._numAmbients = num;
  }

  set numOccluders(num: number) {
    this._numOccluders = num;
  }

  onUpdate(elapsed: number): void {
    let myShader = this._shader?.getShader();
    if (myShader) {
      //#region point lights
      //Point Light Uniforms
      let pointLightPositions: number[] = Array(100);
      let pointLightColors: number[] = Array(150);
      let pointLightIntensities: number[] = Array(50);
      let pointLightFalloffs: number[] = Array(50);

      for (let i = 0; i < this._numPointLights; i++) {
        pointLightPositions[i * 2] = this.pointLights[i].globalPos.x + -this.engine.currentScene.camera.viewport.left;
        pointLightPositions[i * 2 + 1] =
          this.engine.screen.height - this.pointLights[i].globalPos.y + this.engine.currentScene.camera.viewport.top;
        pointLightColors[i * 3] = this.pointLights[i].color.r;
        pointLightColors[i * 3 + 1] = this.pointLights[i].color.g;
        pointLightColors[i * 3 + 2] = this.pointLights[i].color.b;
        pointLightIntensities[i] = this.pointLights[i].PLintensity;
        pointLightFalloffs[i] = this.pointLights[i].PLfalloff;
      }

      //pad the rest of each array to fill the size
      pointLightPositions.fill(0.0, this._numPointLights * 2, 100 - this._numPointLights * 2);
      pointLightColors.fill(0.0, this._numPointLights * 3, 150 - this._numPointLights * 3);
      pointLightIntensities.fill(0.0, this._numPointLights, 50 - this._numPointLights);
      pointLightFalloffs.fill(0.0, this._numPointLights, 50 - this._numPointLights);

      myShader.trySetUniformInt("uPointLightCount", this._numPointLights);
      myShader.trySetUniformFloatArray("uPointLightPositions", pointLightPositions);
      myShader.trySetUniformFloatArray("uPointLightColors", pointLightColors);
      myShader.trySetUniformFloatArray("uPointLightIntensities", pointLightIntensities);
      myShader.trySetUniformFloatArray("uPointLightFalloffs", pointLightFalloffs);

      //#endregion point lights

      //#region ambient lights
      //Ambient Light Uniforms
      let ambientLightPositions: number[] = Array(100);
      let ambientLightColors: number[] = Array(150);
      let ambientLightIntensities: number[] = Array(50);
      for (let i = 0; i < this._numAmbients; i++) {
        ambientLightPositions[i * 2] = this.ambientLights[i].globalPos.x;
        ambientLightPositions[i * 2 + 1] = this.ambientLights[i].globalPos.y;
        ambientLightColors[i * 3] = this.ambientLights[i].color.r;
        ambientLightColors[i * 3 + 1] = this.ambientLights[i].color.g;
        ambientLightColors[i * 3 + 2] = this.ambientLights[i].color.b;
        ambientLightIntensities[i] = this.ambientLights[i].ALintensity;
      }

      //pad the rest of each array to fill the size
      ambientLightPositions.fill(0.0, this._numAmbients * 2, 100 - this._numAmbients * 2);
      ambientLightColors.fill(0.0, this._numAmbients * 3, 150 - this._numAmbients * 3);
      pointLightIntensities.fill(0.0, this._numAmbients, 50 - this._numAmbients);

      myShader.trySetUniformInt("uAmbientLightCount", this._numAmbients);
      myShader.trySetUniformFloatArray("uAmbientLightPositions", ambientLightPositions);
      myShader.trySetUniformFloatArray("uAmbientLightColors", ambientLightColors);
      myShader.trySetUniformFloatArray("uAmbientLightIntensities", ambientLightIntensities);

      //#endregion ambient lights

      //#region occluders
      // Occlusion Shader Uniforms
      let occluderShapes: number[] = Array(50);
      let occluderPositions: number[] = Array(100);
      let occluderSizes: number[] = Array(100);
      let occluderRadiuses: number[] = Array(50);
      let occluderAngles: number[] = Array(50);

      for (let i = 0; i < this._numOccluders; i++) {
        occluderShapes[i] = this.occluders[i].shape;
        occluderPositions[i * 2] = this.occluders[i].globalPos.x + -this.engine.currentScene.camera.viewport.left;
        occluderPositions[i * 2 + 1] =
          this.engine.screen.height - this.occluders[i].globalPos.y + this.engine.currentScene.camera.viewport.top;
        occluderSizes[i * 2] = this.occluders[i].width;
        occluderSizes[i * 2 + 1] = this.occluders[i].height;
        occluderAngles[i] = this.occluders[i].rotation;
        occluderRadiuses[i] = this.occluders[i].width / 2;
      }

      //pad the rest of each array to fill the size
      occluderPositions.fill(0.0, this._numOccluders * 2, 100 - this._numOccluders * 2);
      occluderSizes.fill(0.0, this._numOccluders * 2, 100 - this._numOccluders * 2);
      occluderAngles.fill(0.0, this._numOccluders, 50 - this._numOccluders);
      occluderRadiuses.fill(0.0, this._numOccluders, 50 - this._numOccluders);
      occluderShapes.fill(0, this._numOccluders, 50 - this._numOccluders);

      //set Uniforms
      myShader.trySetUniformInt("uOccluderCount", this._numOccluders);
      myShader.trySetUniformIntArray("uOccluderShapes", occluderShapes);
      myShader.trySetUniformFloatArray("uOccluderPositions", occluderPositions);
      myShader.trySetUniformFloatArray("uOccluderSizes", occluderSizes);
      myShader.trySetUniformFloatArray("uOccluderAngles", occluderAngles);
      myShader.trySetUniformFloatArray("uOccluderRadiuses", occluderRadiuses);

      //#endregion occluders

      //raysteps
      myShader.trySetUniformFloat("uRayStepSize", this._RayStepSize);

      //occlusion rolloff
      myShader.trySetUniformFloat("uOcclusionRolloff", this._occlusionRolloff);
    }
  }
}
