/** @license Kaiku
 * kaiku.ts
 *
 * Copyright (c) 2021 Teemu Pääkkönen
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const ADD_STATE_DEPENDENCY = Symbol()
const REMOVE_STATE_DEPENDENCY = Symbol()
const START_DEPENDENCY_TRACKING = Symbol()
const STOP_DEPENDENCY_TRACKING = Symbol()

type State<T> = T & {
  [START_DEPENDENCY_TRACKING]: () => void
  [STOP_DEPENDENCY_TRACKING]: () => Set<string>
  [ADD_STATE_DEPENDENCY]: (key: string, callback: Function) => void
  [REMOVE_STATE_DEPENDENCY]: (key: string, callback: Function) => void
}

type KaikuContext<StateT> = {
  parentNode: HTMLElement
  state: State<StateT>
}

type Child = ElementDescriptor | string | number | boolean | null | undefined
type Children = Child[]

type ComponentFunction<PropsT extends Object> = (
  props: PropsT
) => ElementDescriptor

type ClassNames = string | { [key: string]: boolean } | ClassNames[]

type HtmlTagProps = Partial<{
  id: string | number
  className: string
  classNames: ClassNames
  onClick: Function
  onInput: Function
  checked: boolean
  value: string
}>

const enum ElementDescriptorType {
  HtmlTag,
  Component,
}

const enum ElementType {
  HtmlTag,
  Component,
  TextNode,
}

type ElementDescriptor<PropsT = {}> =
  | HtmlTagDescriptor
  | ComponentDescriptor<PropsT>

type HtmlTagDescriptor = {
  type: ElementDescriptorType.HtmlTag
  tag: string
  props: HtmlTagProps
  children: Children
}

type HtmlTag = {
  type: ElementType.HtmlTag
  tag: string
  update: (nextProps: HtmlTagProps, children: Children) => void
  destroy: () => void
}

type ComponentDescriptor<PropsT extends Object = {}> = {
  type: ElementDescriptorType.Component
  component: ComponentFunction<PropsT>
  props: PropsT
  children: Children
}

type Component<PropsT extends Object = {}> = {
  type: ElementType.Component
  component: ComponentFunction<PropsT>
  update: (nextProps: PropsT) => void
  destroy: () => void
}

type Element<PropsT = {}> = HtmlTag | Component<PropsT>

const enum ActionType {
  CreateText,
  CreateElement,
  UpdateText,
  UpdateElement,
}

type Action =
  | {
      type: ActionType.CreateText
      value: string | number
    }
  | {
      type: ActionType.CreateElement
      descriptor: ElementDescriptor<any>
    }
  | {
      type: ActionType.UpdateText
      node: Text
      value: string | number
    }
  | {
      type: ActionType.UpdateElement
      element: Element<any>
      descriptor: ElementDescriptor<any>
    }

function createState<StateT extends Object>(
  initialState: StateT
): State<StateT> {
  const IS_WRAPPED = Symbol()
  let nextId = 0
  let trackDependencies = false
  let trackedDependencyStack: Set<string>[] = []
  let dependencyMap = new Map<string, Set<Function>>()
  let deferredUpdates = new Set<Function>()
  let deferredUpdateQueued = false

  function deferredUpdate() {
    const updates = deferredUpdates
    deferredUpdateQueued = false
    deferredUpdates = new Set()
    for (const callback of updates) {
      callback()
    }

    if (deferredUpdates.size) {
      throw new Error('Side effects in render')
    }
  }

  function startDependencyTracking() {
    trackedDependencyStack.push(new Set())
    trackDependencies = true
  }

  function stopDependencyTracking(): Set<string> {
    trackDependencies = false
    const deps = trackedDependencyStack.pop()
    if (!deps) {
      throw new Error(
        'stopDependencyTracking() called without a matching start call'
      )
    }

    return deps
  }

  function addDependencies(key: string, callback: Function) {
    if (!dependencyMap.has(key)) {
      dependencyMap.set(key, new Set())
    }
    dependencyMap.get(key)!.add(callback)
  }

  function removeDependency(key: string, callback: Function) {
    if (dependencyMap.has(key)) {
      dependencyMap.get(key)!.delete(callback)

      if (dependencyMap.get(key)!.size === 0) {
        dependencyMap.delete(key)
      }
    }
  }

  function wrap<T extends object>(obj: T) {
    const id = ++nextId

    const proxy = new Proxy(obj, {
      get(target, key) {
        switch (key) {
          case START_DEPENDENCY_TRACKING:
            return startDependencyTracking
          case STOP_DEPENDENCY_TRACKING:
            return stopDependencyTracking
          case ADD_STATE_DEPENDENCY:
            return addDependencies
          case REMOVE_STATE_DEPENDENCY:
            return removeDependency
          case IS_WRAPPED:
            return true
        }

        if (typeof key === 'symbol') {
          return target[key as keyof T]
        }

        if (trackDependencies) {
          const dependencyKey = id + '.' + key
          trackedDependencyStack[trackedDependencyStack.length - 1].add(
            dependencyKey
          )
        }

        return target[key as keyof T]
      },

      set(target, key, value) {
        if (typeof key === 'symbol') {
          target[key as keyof T] = value
          return true
        }

        const dependencyKey = id + '.' + key

        if (typeof value === 'object' && !value[IS_WRAPPED]) {
          target[key as keyof T] = wrap(value)
        } else {
          target[key as keyof T] = value
        }

        if (dependencyMap.has(dependencyKey)) {
          if (!deferredUpdateQueued) {
            deferredUpdateQueued = true
            window.queueMicrotask(deferredUpdate)
          }

          for (const callback of dependencyMap.get(dependencyKey)!) {
            deferredUpdates.add(callback)
          }
        }

        return true
      },
    })

    // Recursively wrap all fields of the object by invoking the `set()` function
    const keys = Object.keys(obj) as (keyof T)[]
    for (const key of keys) {
      proxy[key] = proxy[key]
    }

    return proxy
  }

  const state = wrap(initialState)

  return state as State<StateT>
}

function createComponentDescriptor<PropsT>(
  component: ComponentFunction<PropsT>,
  props: PropsT,
  children: Children
): ComponentDescriptor<PropsT> {
  return {
    type: ElementDescriptorType.Component,
    component,
    props,
    children,
  }
}

function createComponent<PropsT, StateT>(
  descriptor: ComponentDescriptor<PropsT>,
  context: KaikuContext<StateT>
): Component<PropsT> {
  let dependencies = new Set<string>()
  let prevLeaf: Element | null = null

  let prevProps: PropsT = descriptor.props

  function update(nextProps: PropsT = prevProps) {
    for (const dep of dependencies) {
      context.state[REMOVE_STATE_DEPENDENCY](dep, update)
    }

    context.state[START_DEPENDENCY_TRACKING]()
    const leafDescriptor = descriptor.component(nextProps)
    dependencies = context.state[STOP_DEPENDENCY_TRACKING]()

    for (const dep of dependencies) {
      context.state[ADD_STATE_DEPENDENCY](dep, update)
    }

    if (
      leafDescriptor.type === ElementDescriptorType.Component &&
      prevLeaf?.type === ElementType.Component &&
      leafDescriptor.component === prevLeaf.component
    ) {
      prevLeaf.update(leafDescriptor.props)
    } else if (
      leafDescriptor.type === ElementDescriptorType.HtmlTag &&
      prevLeaf?.type === ElementType.HtmlTag &&
      leafDescriptor.tag === prevLeaf.tag
    ) {
      prevLeaf.update(leafDescriptor.props, leafDescriptor.children)
    } else if (prevLeaf) {
      prevLeaf.destroy()
      prevLeaf = createElement(leafDescriptor, context)
    } else {
      prevLeaf = createElement(leafDescriptor, context)
    }

    prevProps = nextProps
  }

  function destroy() {
    if (prevLeaf) {
      prevLeaf.destroy()
    }

    for (const dep of dependencies) {
      context.state[REMOVE_STATE_DEPENDENCY](dep, update)
    }
  }

  update()

  return {
    type: ElementType.Component,
    component: descriptor.component,
    update,
    destroy,
  }
}

function createHtmlTagDescriptor(
  tag: string,
  props: HtmlTagProps,
  children: Children
): HtmlTagDescriptor {
  return {
    type: ElementDescriptorType.HtmlTag,
    tag,
    props,
    children,
  }
}

function stringifyClassNames(names: ClassNames): string {
  if (typeof names === 'string') {
    return names
  }

  if (Array.isArray(names)) {
    return names.map((name) => stringifyClassNames(name)).join(' ')
  }

  let className = ''
  const keys = Object.keys(names)
  for (const key of keys) {
    if (names[key]) className += key
  }
  return className
}

function createHtmlTag<StateT>(
  descriptor: HtmlTagDescriptor,
  context: KaikuContext<StateT>
): HtmlTag {
  let previousChildren: (
    | { type: ElementType.TextNode; node: Text }
    | Element
  )[] = []
  let prevProps: HtmlTagProps = {}

  const element = document.createElement(descriptor.tag)
  context.parentNode.appendChild(element)

  function update(nextProps: HtmlTagProps, nextChildren: Children) {
    const keys = new Set([
      ...Object.keys(nextProps),
      ...Object.keys(prevProps),
    ]) as Set<keyof HtmlTagProps>

    for (const key of keys) {
      if (prevProps[key] === nextProps[key]) continue

      const isListener = key.startsWith('on')

      if (isListener) {
        const eventName = key.substr(2).toLowerCase()

        if (key in prevProps) {
          element.removeEventListener(eventName as any, prevProps[key] as any)
        }

        if (key in nextProps) {
          element.addEventListener(eventName as any, nextProps[key] as any)
        }
      } else {
        switch (key) {
          case 'checked': {
            ;(element as HTMLInputElement).checked = !!nextProps[key]
            continue
          }
          case 'value': {
            ;(element as HTMLInputElement).value = nextProps[key] ?? ''
            continue
          }
          case 'className': {
            element.setAttribute(
              'class',
              stringifyClassNames(nextProps[key] ?? '')
            )
            continue
          }
        }

        if (key in nextProps) {
          element.setAttribute(key, nextProps[key] as any)
        } else {
          element.removeAttribute(key)
        }
      }
    }

    prevProps = nextProps

    const actions: Action[] = []

    for (const child of nextChildren.flat()) {
      if (
        child === null ||
        typeof child === 'undefined' ||
        typeof child === 'boolean'
      ) {
        continue
      }

      const existingPrevChildIdx = previousChildren.findIndex((prevChild) => {
        if (typeof child === 'string' || typeof child === 'number') {
          return prevChild.type === ElementType.TextNode
        }

        if (
          child.type === ElementDescriptorType.HtmlTag &&
          prevChild.type === ElementType.HtmlTag
        ) {
          return child.tag === prevChild.tag
        }

        if (
          child.type === ElementDescriptorType.Component &&
          prevChild.type === ElementType.Component
        ) {
          return child.component === prevChild.component
        }

        return false
      })

      if (existingPrevChildIdx === -1) {
        if (typeof child === 'string' || typeof child === 'number') {
          actions.push({
            type: ActionType.CreateText,
            value: child,
          })
        } else {
          actions.push({
            type: ActionType.CreateElement,
            descriptor: child,
          })
        }
        continue
      }

      const prevChild = previousChildren.splice(existingPrevChildIdx, 1)[0]

      if (prevChild.type === ElementType.TextNode) {
        actions.push({
          type: ActionType.UpdateText,
          node: prevChild.node,
          value: child as string | number,
        })
        continue
      }

      actions.push({
        type: ActionType.UpdateElement,
        element: prevChild,
        descriptor: child as ElementDescriptor,
      })
    }

    for (const prevChild of previousChildren) {
      if (prevChild.type === ElementType.TextNode) {
        element.removeChild(prevChild.node)
      } else {
        prevChild.destroy()
      }
    }

    previousChildren = []

    for (const action of actions) {
      switch (action.type) {
        case ActionType.CreateText: {
          const node = document.createTextNode(String(action.value))
          element.appendChild(node)
          previousChildren.push({
            type: ElementType.TextNode,
            node,
          })
          continue
        }

        case ActionType.CreateElement: {
          previousChildren.push(
            createElement(action.descriptor, {
              state: context.state,
              parentNode: element,
            })
          )
          continue
        }

        case ActionType.UpdateText: {
          const text = String(action.value)
          if (action.node.data !== text) {
            action.node.data = text
          }
          previousChildren.push({
            type: ElementType.TextNode,
            node: action.node,
          })
          continue
        }

        case ActionType.UpdateElement: {
          action.element.update(
            action.descriptor.props,
            action.descriptor.children
          )
          previousChildren.push(action.element)
          continue
        }
      }
    }
  }

  function destroy() {
    context.parentNode.removeChild(element)
    for (const child of previousChildren) {
      if (child.type === ElementType.TextNode) {
        element.removeChild(child.node)
      } else {
        child.destroy()
      }
    }
  }

  update(descriptor.props, descriptor.children)

  return {
    type: ElementType.HtmlTag,
    tag: descriptor.tag,
    destroy,
    update,
  }
}

function createElement<PropsT, StateT>(
  descriptor: ElementDescriptor<PropsT>,
  context: KaikuContext<StateT>
): Element<PropsT> {
  if (descriptor.type === ElementDescriptorType.Component) {
    return createComponent(descriptor, context)
  }
  return createHtmlTag(descriptor, context)
}

function h(
  tag: string,
  props: HtmlTagProps | null,
  ...children: Children
): HtmlTagDescriptor
function h<PropsT>(
  component: ComponentFunction<PropsT>,
  props: PropsT | null,
  ...children: Children
): ComponentDescriptor<PropsT>
function h(tagOrComponent: any, props: any, ...children: any) {
  switch (typeof tagOrComponent) {
    case 'function': {
      return createComponentDescriptor(tagOrComponent, props ?? {}, children)
    }

    case 'string': {
      return createHtmlTagDescriptor(tagOrComponent, props ?? {}, children)
    }

    default: {
      throw new Error('Invalid constructor')
    }
  }
}

function render<PropsT, StateT>(
  rootDescriptor: ElementDescriptor<PropsT>,
  state: State<StateT>,
  element: HTMLElement
) {
  createElement<PropsT, StateT>(rootDescriptor, { state, parentNode: element })
}

export { h, render, createState }
