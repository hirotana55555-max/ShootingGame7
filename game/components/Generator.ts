// game/components/Generator.ts
export interface GeneratorConfig {
  entityType: 'meteor';
  trigger: {
    initialDelay: number;
    interval: number;
  };
}

export class Generator {
  public config: GeneratorConfig;
  public timer: number;

  constructor(config: GeneratorConfig) {
    this.config = config;
    this.timer = config.trigger.initialDelay || 0;
  }
}
