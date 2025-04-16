export class Player {
  public id: number;
  public name: string;
  public mana: number;

  constructor(options: { id: number; name: string; mana: number }) {
    this.id = options.id;
    this.name = options.name;
    this.mana = options.mana;
  }
}
