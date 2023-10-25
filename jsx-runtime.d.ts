import { DefaultProps, Child, NodeDescriptor } from './dist/kaiku'

declare namespace JSX {
  type Element<T extends DefaultProps> = NodeDescriptor<T>
  type ArrayElement = Element<any>[]
  interface FunctionElement<T extends DefaultProps> {
    (props: T): Child
  }
  interface ElementClass<T extends DefaultProps> {
    render(props: T): Child
  }
  type ElementChildrenAttribute = {
    children: any
  }
  type ElementAttributesProperty = {
    props: any
  }
  type IntrinsicElements = Record<
    keyof HTMLElementTagNameMap | keyof SVGElementTagNameMap,
    any
  >
}
