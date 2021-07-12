/** @license Kaiku
 * kaiku.ts
 *
 * Copyright (c) 2021 Teemu Pääkkönen
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { CssProperty } from './css-properties'
import { HtmlAttribute } from './html-attributes'

const TRACKED_EXECUTE = Symbol()
const UPDATE_DEPENDENCIES = Symbol()

type State<T> = T & {
  [TRACKED_EXECUTE]: <F extends (...args: any) => any>(
    fn: F,
    ...args: Parameters<F>
  ) => [Set<string>, ReturnType<F>]
  [UPDATE_DEPENDENCIES]: (
    prevDependencies: Set<string>,
    nextDependencies: Set<string>,
    callback: Function
  ) => void
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

type LazyProperty<T> = T | (() => T)

type HtmlTagProps = Partial<Record<HtmlAttribute, LazyProperty<string>>> &
  Partial<{
    style: Partial<Record<CssProperty, LazyProperty<string>>>
    className: LazyProperty<ClassNames>
    onClick: Function
    onInput: Function
    checked: boolean
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

type TagName = keyof HTMLElementTagNameMap

type HtmlTagDescriptor = {
  type: ElementDescriptorType.HtmlTag
  tag: TagName
  props: HtmlTagProps
  children: Children
}

type HtmlTag = {
  type: ElementType.HtmlTag
  tag: TagName
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

type Effect = {
  run: () => void
  unregister: () => void
}

function createState<StateT extends Object>(
  initialState: StateT
): State<StateT> {
  const IS_WRAPPED = Symbol()
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

  function trackedExectute<F extends (...args: any) => any>(
    fn: F,
    ...args: Parameters<F>
  ): [Set<string>, ReturnType<F>] {
    trackedDependencyStack.push(new Set())
    const result = fn(...args)
    const dependencies = trackedDependencyStack.pop()
    return [dependencies!, result]
  }

  function updateDependencies(
    prevDependencies: Set<string>,
    nextDependencies: Set<string>,
    callback: Function
  ) {
    for (const depKey of nextDependencies) {
      if (!prevDependencies.has(depKey)) {
        const deps = dependencyMap.get(depKey)
        if (deps) {
          deps.add(callback)
        } else {
          dependencyMap.set(depKey, new Set([callback]))
        }
      }
    }

    for (const depKey of prevDependencies) {
      if (!nextDependencies.has(depKey)) {
        const deps = dependencyMap.get(depKey)
        if (deps) {
          deps.delete(callback)
          if (deps.size === 0) {
            dependencyMap.delete(depKey)
          }
        }
      }
    }
  }

  let nextId = 0
  function wrap<T extends object>(obj: T) {
    const id = ++nextId

    const isArray = Array.isArray(obj)

    const proxy = new Proxy(obj, {
      get(target, key) {
        switch (key) {
          case TRACKED_EXECUTE:
            return trackedExectute
          case UPDATE_DEPENDENCIES:
            return updateDependencies
          case IS_WRAPPED:
            return true
        }

        if (typeof key === 'symbol') {
          return target[key as keyof T]
        }

        if (trackedDependencyStack.length) {
          const dependencyKey = id + '.' + key
          trackedDependencyStack[trackedDependencyStack.length - 1].add(
            dependencyKey
          )
        }

        return target[key as keyof T]
      },

      set(target, _key, value) {
        const key = _key as keyof T

        if (
          !(isArray && key === 'length') &&
          typeof value !== 'object' &&
          target[key] === value
        ) {
          return true
        }

        if (typeof key === 'symbol') {
          target[key] = value
          return true
        }

        const dependencyKey = id + '.' + key

        if (typeof value === 'object' && !value[IS_WRAPPED]) {
          target[key] = wrap(value)
        } else {
          target[key] = value
        }

        const callbacks = dependencyMap.get(dependencyKey)
        if (callbacks) {
          if (!deferredUpdateQueued) {
            deferredUpdateQueued = true
            window.queueMicrotask(deferredUpdate)
          }

          for (const callback of callbacks) {
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

function createEffect() {
  let currentState: State<any> | null = null
  const effects: Effect[][] = []

  function startEffectTracking(state: State<any>) {
    currentState = state
    effects.push([])
  }

  function stopEffectTracking() {
    currentState = null
    const effs = effects.pop()
    if (!effs) {
      throw new Error(
        'stopEffectTracking() called without a matching start call'
      )
    }
    return effs
  }

  function effect(fn: Function) {
    const state = currentState
    let dependencies = new Set()

    const run = () => {
      if (!state) return
      const [nextDependencies] = state[TRACKED_EXECUTE](fn)
      state[UPDATE_DEPENDENCIES](dependencies, nextDependencies, run)
      dependencies = nextDependencies
    }

    run()

    const unregister = () => {
      state[UPDATE_DEPENDENCIES](dependencies, new Set(), run)
    }

    effects[effects.length - 1].push({
      run,
      unregister,
    })
  }

  return { startEffectTracking, stopEffectTracking, effect }
}

const { startEffectTracking, stopEffectTracking, effect } = createEffect()

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
  let effects: Effect[] | null = null

  function update(nextProps: PropsT = prevProps) {
    if (effects === null) {
      startEffectTracking(context.state)
    }

    const [nextDependencies, leafDescriptor] = context.state[TRACKED_EXECUTE](
      descriptor.component,
      nextProps
    )
    context.state[UPDATE_DEPENDENCIES](dependencies, nextDependencies, update)
    dependencies = nextDependencies

    if (effects === null) {
      effects = stopEffectTracking()
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

    if (effects) {
      for (const effect of effects) {
        effect.unregister()
      }
    }

    context.state[UPDATE_DEPENDENCIES](dependencies, new Set(), update)
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
  tag: TagName,
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

type LazyUpdate = {
  unregister: () => void
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
  let lazyUpdates: LazyUpdate[] = []

  const element = document.createElement(descriptor.tag)
  context.parentNode.appendChild(element)

  const lazy = <T>(prop: LazyProperty<T>, handler: (value: T) => void) => {
    if (typeof prop !== 'function') {
      handler(prop)
      return
    }

    let dependencies = new Set<string>()

    const run = () => {
      const [nextDependencies, value] = context.state[TRACKED_EXECUTE](
        prop as () => T
      )
      context.state[UPDATE_DEPENDENCIES](dependencies, nextDependencies, run)
      dependencies = nextDependencies
      handler(value)
    }

    run()

    if (dependencies.size === 0) {
      return
    }

    lazyUpdates.push({
      unregister() {
        context.state[UPDATE_DEPENDENCIES](dependencies, new Set(), run)
      },
    })
  }

  function update(nextProps: HtmlTagProps, nextChildren: Children) {
    const keys = new Set([
      ...Object.keys(nextProps),
      ...Object.keys(prevProps),
    ]) as Set<keyof HtmlTagProps>

    let update
    while ((update = lazyUpdates.pop())) {
      update.unregister()
    }

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
          case 'style': {
            const properties = new Set([
              ...Object.keys(nextProps.style || {}),
              ...Object.keys(prevProps.style || {}),
            ]) as Set<CssProperty>

            for (const property of properties) {
              if (nextProps.style?.[property] !== prevProps.style?.[property]) {
                lazy(nextProps.style?.[property] ?? '', (value) => {
                  element.style[property as any] = value
                })
              }
            }
            continue
          }
          case 'checked': {
            ;(element as HTMLInputElement).checked = !!nextProps[key]
            continue
          }
          case 'value': {
            lazy(nextProps[key] ?? '', (value) => {
              ;(element as HTMLInputElement).value = value
            })
            continue
          }
          case 'className': {
            lazy(nextProps[key], (value) => {
              element.setAttribute('class', stringifyClassNames(value ?? ''))
            })
            continue
          }
        }

        if (key in nextProps) {
          lazy(nextProps[key] as LazyProperty<string>, (value) => {
            element.setAttribute(key, value)
          })
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
    let update
    while ((update = lazyUpdates.pop())) {
      update.unregister()
    }

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
      return createHtmlTagDescriptor(
        tagOrComponent as TagName,
        props ?? {},
        children
      )
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

export { h, render, createState, effect }
