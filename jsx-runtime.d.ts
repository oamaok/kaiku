import { DefaultProps, NodeDescriptor } from './src/kaiku'

declare namespace JSX {
  type Element<T extends DefaultProps> = NodeDescriptor<T>
  type ArrayElement = Element<any>[]
  interface FunctionElement<T> {
    (props: T): Element<T>
  }
  interface ElementClass<T> {
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
