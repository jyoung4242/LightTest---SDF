import { Component, Color } from "excalibur";
import { PointLightComponentConfig, AmbientLightComponentConfig, OccluderComponentConfig } from "./LightingTypesAndDefs";

/*
    Lighting System Components
*/
export class PointLightComponent extends Component {
  color: Color;
  intensity: number;
  falloff: number;

  constructor(config: PointLightComponentConfig) {
    super();
    this.color = config.color;
    this.intensity = config.intensity;
    this.falloff = config.falloff;
  }
}

export class AmbientLightComponent extends Component {
  color: Color;
  intensity: number;

  constructor(config: AmbientLightComponentConfig) {
    super();
    this.color = config.color;
    this.intensity = config.intensity;
  }
}
export class OccluderComponent extends Component {
  imageIndex: number;

  constructor(config: OccluderComponentConfig) {
    super();

    this.imageIndex = config.imageIndex;
  }
}
