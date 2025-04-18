export type PlayerProperties = {
  id: number;
  name: string;
  mana: number;
};

export class Player {
  public id: number;
  public name: string;
  public mana: number;

  constructor(options: PlayerProperties) {
    this.id = options.id;
    this.name = options.name;
    this.mana = options.mana;
  }
}
