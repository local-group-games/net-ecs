import { ArgumentsType } from "./types/util";

export type Component<
  ComponentType extends string = string,
  Props extends {} = {}
> = {
  readonly $type: ComponentType;
} & Props;

export interface ComponentFactory<
  ComponentType extends string = string,
  Props extends {} = any
> {
  (...args: any[]): Component<ComponentType, Props>;
  $type: string;
}

export type ComponentOfFactory<
  Factory extends ComponentFactory
> = Factory extends ComponentFactory<infer _, infer Props> ? Props : never;

export function createComponentFactory<
  ComponentType extends string,
  GetProps extends (...args: any[]) => any
>(type: ComponentType, getProps: GetProps) {
  const componentFactory = (
    ...args: ArgumentsType<GetProps>
  ): Component<ComponentType, ReturnType<GetProps>> => ({
    ...getProps(...args),
    $type: type
  });

  componentFactory.$type = type;

  return componentFactory;
}
