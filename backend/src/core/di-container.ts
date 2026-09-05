export type InjectionToken<T = unknown> = string | symbol | (new (...args: any[]) => T);

type Factory<T> = (container: Container) => T;

interface ServiceBinding<T> {
  type: 'singleton' | 'transient';
  factory: Factory<T>;
  instance?: T;
}

export class Container {
  private readonly bindings = new Map<InjectionToken, ServiceBinding<any>>();

  public registerSingleton<T>(token: InjectionToken<T>, instanceOrFactory: T | Factory<T>): this {
    if (typeof instanceOrFactory === 'function') {
      this.bindings.set(token, {
        type: 'singleton',
        factory: instanceOrFactory as Factory<T>
      });
    } else {
      this.bindings.set(token, {
        type: 'singleton',
        factory: () => instanceOrFactory,
        instance: instanceOrFactory
      });
    }
    return this;
  }

  public registerTransient<T>(token: InjectionToken<T>, factory: Factory<T>): this {
    this.bindings.set(token, {
      type: 'transient',
      factory
    });
    return this;
  }

  public resolve<T>(token: InjectionToken<T>): T {
    const binding = this.bindings.get(token);
    if (!binding) {
      const tokenName = typeof token === 'function' ? token.name : String(token);
      throw new Error(`[IoC Container] No dependency binding found for token: ${tokenName}`);
    }

    if (binding.type === 'singleton') {
      if (binding.instance === undefined) {
        binding.instance = binding.factory(this);
      }
      return binding.instance as T;
    }

    return binding.factory(this) as T;
  }

  public has(token: InjectionToken): boolean {
    return this.bindings.has(token);
  }

  public clear(): void {
    this.bindings.clear();
  }
}
