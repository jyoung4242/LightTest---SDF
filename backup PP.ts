import { Sprite, ScreenShader, Engine, Color } from "excalibur";
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
  private _masksDirtyFlag: boolean = false;

  qualityThreshold: number = 0;
  volumetricDensity: number = 0;
  volumetricScattering: number = 0;
  volumetricSamples: number = 0;
  volumetricColor: Color = new Color(0, 0, 0);

  public _RayStepSize = 1.0;

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

      // Occlusion Shader Uniforms
      let occluderPositions: number[] = Array(100);
      let occluderSizes: number[] = Array(100);
      let occluderAngles: number[] = Array(50);
      let occluderTextureAssignments: number[] = Array(50);

      for (let i = 0; i < this._numOccluders; i++) {
        occluderPositions[i * 2] = this.occluders[i].globalPos.x + -this.engine.currentScene.camera.viewport.left;
        occluderPositions[i * 2 + 1] =
          this.engine.screen.height - this.occluders[i].globalPos.y + this.engine.currentScene.camera.viewport.top;

        occluderSizes[i * 2] = this.occluders[i].width;
        occluderSizes[i * 2 + 1] = this.occluders[i].height;
        occluderAngles[i] = this.occluders[i].rotation;
        occluderTextureAssignments[i] = this.occluders[i].imageIndex;
      }

      //pad the rest of each array to fill the size
      occluderPositions.fill(0.0, this._numOccluders * 2, 100 - this._numOccluders * 2);
      occluderSizes.fill(0.0, this._numOccluders * 2, 100 - this._numOccluders * 2);
      occluderAngles.fill(0.0, this._numOccluders, 50 - this._numOccluders);
      occluderTextureAssignments.fill(0, this._numOccluders, 50 - this._numOccluders);

      myShader.trySetUniformInt("uOccluderCount", this._numOccluders);
      myShader.trySetUniformFloatArray("uOccluderPositions", occluderPositions);
      myShader.trySetUniformFloatArray("uOccluderSizes", occluderSizes);
      myShader.trySetUniformIntArray("uMyOcclusionTextureAssignments", occluderTextureAssignments);
      myShader.trySetUniformFloatArray("uOccluderAngles", occluderAngles);

      //raysteps
      myShader.trySetUniformFloat("uRayStepSize", this._RayStepSize);
    }
  }

  setOcclusionMaskDirtyFlag(): void {
    this._masksDirtyFlag = true;
  }

  onDraw(): void {
    let myShader = this._shader?.getShader();
    if (myShader && this._masksDirtyFlag) {
      let myTexture = this.graphicsContext.textureLoader.load(this.occlusionMasks[0].image.image);
      myShader.setTexture(1, myTexture as WebGLTexture);
      myShader.trySetUniformInt("uOccluderMask0", 1);

      myTexture = this.graphicsContext.textureLoader.load(this.occlusionMasks[1].image.image);
      myShader.setTexture(2, myTexture as WebGLTexture);
      myShader.trySetUniformInt("uOccluderMask1", 2);

      myTexture = this.graphicsContext.textureLoader.load(this.occlusionMasks[2].image.image);
      myShader.setTexture(3, myTexture as WebGLTexture);
      myShader.trySetUniformInt("uOccluderMask2", 3);

      myTexture = this.graphicsContext.textureLoader.load(this.occlusionMasks[3].image.image);
      myShader.setTexture(4, myTexture as WebGLTexture);
      myShader.trySetUniformInt("uOccluderMask3", 4);

      myTexture = this.graphicsContext.textureLoader.load(this.occlusionMasks[4].image.image);
      myShader.setTexture(5, myTexture as WebGLTexture);
      myShader.trySetUniformInt("uOccluderMask4", 5);

      myTexture = this.graphicsContext.textureLoader.load(this.occlusionMasks[5].image.image);
      myShader.setTexture(6, myTexture as WebGLTexture);
      myShader.trySetUniformInt("uOccluderMask5", 6);

      myTexture = this.graphicsContext.textureLoader.load(this.occlusionMasks[6].image.image);
      myShader.setTexture(7, myTexture as WebGLTexture);
      myShader.trySetUniformInt("uOccluderMask6", 7);

      myTexture = this.graphicsContext.textureLoader.load(this.occlusionMasks[7].image.image);
      myShader.setTexture(8, myTexture as WebGLTexture);
      myShader.trySetUniformInt("uOccluderMask7", 8);

      myTexture = this.graphicsContext.textureLoader.load(this.occlusionMasks[8].image.image);
      myShader.setTexture(9, myTexture as WebGLTexture);
      myShader.trySetUniformInt("uOccluderMask8", 9);

      myTexture = this.graphicsContext.textureLoader.load(this.occlusionMasks[9].image.image);
      myShader.setTexture(10, myTexture as WebGLTexture);
      myShader.trySetUniformInt("uOccluderMask9", 10);

      myTexture = this.graphicsContext.textureLoader.load(this.occlusionMasks[10].image.image);
      myShader.setTexture(11, myTexture as WebGLTexture);
      myShader.trySetUniformInt("uOccluderMask10", 11);

      myTexture = this.graphicsContext.textureLoader.load(this.occlusionMasks[11].image.image);
      myShader.setTexture(12, myTexture as WebGLTexture);
      myShader.trySetUniformInt("uOccluderMask11", 12);

      myTexture = this.graphicsContext.textureLoader.load(this.occlusionMasks[12].image.image);
      myShader.setTexture(13, myTexture as WebGLTexture);
      myShader.trySetUniformInt("uOccluderMask12", 13);

      myTexture = this.graphicsContext.textureLoader.load(this.occlusionMasks[13].image.image);
      myShader.setTexture(14, myTexture as WebGLTexture);
      myShader.trySetUniformInt("uOccluderMask13", 14);

      myTexture = this.graphicsContext.textureLoader.load(this.occlusionMasks[14].image.image);
      myShader.setTexture(15, myTexture as WebGLTexture);
      myShader.trySetUniformInt("uOccluderMask14", 15);
      this._masksDirtyFlag = false;
    }
  }
}
