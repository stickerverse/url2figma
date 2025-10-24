export class ComponentManager {
  private components: Map<string, ComponentNode> = new Map();

  constructor(private componentRegistry: any) {}

  registerComponent(id: string, component: ComponentNode): void {
    this.components.set(id, component);
  }

  getComponent(id: string): ComponentNode | undefined {
    return this.components.get(id);
  }

  hasComponent(id: string): boolean {
    return this.components.has(id);
  }
}
