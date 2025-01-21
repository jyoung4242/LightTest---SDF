import { ActorArgs, Color, World, Camera, Engine, Vector } from "excalibur";
import { LightingPostProcessor } from "./LightingPostProcessor";

export enum SDFShapes {
  Circle = 0,
  Rectangle = 1,
  Capsule = 2,
  Ellipse = 3,
  SpotLight = 4,
  Segment = 5,
  Trapezoid = 6,
  EmptyBox = 7,
}

export interface CircleOccluder {
  radius: number;
  offset: Vector;
}

export type PointLightActorArgs = ActorArgs & PointLightComponentConfig;
export type AmbientLightActorArgs = ActorArgs & AmbientLightComponentConfig;
export type OccluderActorArgs = ActorArgs & OccluderComponentConfig;

/*
    Lighting System Component Configs
*/

export interface PointLightComponentConfig {
  color: Color;
  intensity: number;
  falloff: number;
}

export interface AmbientLightComponentConfig {
  color: Color;
  intensity: number;
}
export interface OccluderComponentConfig {
  shape: SDFShapes;
}

/*
    Lighting System Config
*/

export interface LightingSystemConfig {
  lightingBufferSize: number; // # of pixels buffer around the screen to render lights into, even if just off camera
  postProcessor: LightingPostProcessor;
  engine: Engine;
  rayStepSize: number;
  occlusionRolloff: number;
}
