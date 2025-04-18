export type EntityProperties = {
  [K in keyof Entity]: Entity[K];
};

export class Entity {
  public id: string;
  public position: [number, number];
  public health: number;
  public maxHealth: number;
  public attack: number;
  public defense: number;

  constructor(options: {
    id: string;
    position: [number, number];
    health: number;
    maxHealth: number;
    attack: number;
    defense: number;
  }) {
    this.id = options.id;
    this.position = options.position;
    this.health = options.health;
    this.maxHealth = options.maxHealth;
    this.attack = options.attack;
    this.defense = options.defense;
  }
}
