import { DefaultProps, NodeDescriptor } from './dist/kaiku'

declare namespace JSX {
  type Element<T extends DefaultProps> = NodeDescriptor<T>
  type ArrayElement = Element<any>[]
  interface FunctionElement<T extends DefaultProps> {
    (props: T): Element<T>
  }
  interface ElementClass<T extends DefaultProps> {
    render(props: any): Element<T>
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
