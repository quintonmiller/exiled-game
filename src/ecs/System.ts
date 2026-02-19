export abstract class System {
  priority: number = 0;
  abstract update(): void;
}
