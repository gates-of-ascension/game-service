export type PlayerProperties = {
  id: string;
  name: string;
  mana: number;
};

export class Player {
  public id: string;
  public name: string;
  public mana: number;

  constructor(options: PlayerProperties) {
    this.id = options.id;
    this.name = options.name;
    this.mana = options.mana;
  }
}
