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
;(() => {
  function __assert(
    condition: boolean | undefined | object | null,
    message?: string
  ): asserts condition {
    if (!Boolean(condition)) {
      throw new Error(message ?? 'assert')
    }
  }

  const getStack = (): string[] => {
    try {
      throw new Error()
    } catch (err) {
      return err.stack
        .split('\n')
        .map((v: string) => v.trim())
        .slice(2)
    }
  }

  const assert: typeof __assert = __DEBUG__ ? __assert : () => undefined

  const TRACKED_EXECUTE = Symbol()
  const REMOVE_DEPENDENCIES = Symbol()
  const UPDATE_DEPENDENCIES = Symbol()
  const GET_LOCAL_STATE = Symbol()
  const DELETE_LOCAL_STATE = Symbol()

  type State<T> = T & {
    [TRACKED_EXECUTE]: <F extends (...args: any) => any>(
      fn: F,
      ...args: Parameters<F>
    ) => [Set<string>, ReturnType<F>]
    [REMOVE_DEPENDENCIES]: (
      nextDependencies: Set<string>,
      callback: Function
    ) => void
    [UPDATE_DEPENDENCIES]: (
      prevDependencies: Set<string>,
      nextDependencies: Set<string>,
      callback: Function
    ) => void
    [GET_LOCAL_STATE]: <T extends object>(
      componentId: number,
      state: T
    ) => State<T>
    [DELETE_LOCAL_STATE]: (componentId: number) => void
  }

  type KaikuContext<StateT> = {
    state: State<StateT>
    updateStack: Set<() => void>
    mountStack: Set<() => void>
    currentlyExecutingUpdates: boolean
  }

  type RenderableChild = ElementDescriptor | string | number
  type Child = RenderableChild | boolean | null | undefined | Child[]
  type Children = Child[]
  type ComponentPropsBase = { key?: string; children?: Children[] }
  type ComponentFunction<PropsT extends ComponentPropsBase> = (
    props: PropsT
  ) => ElementDescriptor
  type ClassNames = string | { [key: string]: boolean } | ClassNames[]
  type LazyProperty<T> = T | (() => T)

  type KaikuHtmlTagProps = {
    key: string
    style: Partial<Record<CssProperty, LazyProperty<string>>>
    className: LazyProperty<ClassNames>
    onClick: Function
    onInput: Function
    checked: LazyProperty<boolean>
  }

  type HtmlTagProps = Partial<
    Record<
      Exclude<HtmlAttribute, keyof KaikuHtmlTagProps>,
      LazyProperty<string>
    >
  > &
    Partial<KaikuHtmlTagProps>

  const enum ElementDescriptorType {
    HtmlTag,
    Component,
  }

  const enum ElementType {
    HtmlTag,
    Component,
    TextNode,
  }

  type ElementDescriptor<
    PropsT extends ComponentPropsBase = ComponentPropsBase
  > = HtmlTagDescriptor | ComponentDescriptor<PropsT>

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
    el: () => HTMLElement
    update: (nextProps: HtmlTagProps, children: Children) => void
    destroy: () => void
  }

  type ComponentDescriptor<
    PropsT extends ComponentPropsBase = ComponentPropsBase
  > = {
    type: ElementDescriptorType.Component
    component: ComponentFunction<PropsT>
    props: PropsT
    children: Children
  }

  type Component<PropsT extends ComponentPropsBase = ComponentPropsBase> = {
    type: ElementType.Component
    component: ComponentFunction<PropsT>
    el: () => HTMLElement
    update: (nextProps: PropsT) => void
    destroy: () => void
  }

  type Element<PropsT extends ComponentPropsBase = ComponentPropsBase> =
    | HtmlTag
    | Component<PropsT>

  type ChildElement = Element | { type: ElementType.TextNode; node: Text }

  const union = <T>(a: Set<T> | T[], b: Set<T> | T[]): Set<T> => {
    const s = setPool.allocate(a)
    for (const v of b) {
      s.add(v)
    }
    return s
  }

  const createSetPool = () => {
    const SET_POOL_MAX_SIZE = 10000
    const pool: Set<any>[] = []
    let restorationSet: Set<any>
    if (__DEBUG__) {
      restorationSet = new Set()
    }

    const illegalInvokation = (stack: string[]) => () => {
      throw new Error(
        `Method of a pooled Set() illegally invoked. \n=== FREE STACK ===\n${stack.join(
          '\n\t'
        )}\n=== END FREE STACK ===`
      )
    }

    const allocate = <T>(
      values?: T[] | Set<T> | IterableIterator<T>
    ): Set<T> => {
      const set = pool.pop() ?? new Set()

      if (__DEBUG__) {
        set.add = restorationSet.add
        set.has = restorationSet.has
        set.keys = restorationSet.keys
        set.clear = restorationSet.clear
        set.values = restorationSet.values
        set.delete = restorationSet.delete
        set.forEach = restorationSet.forEach
      }

      if (values) {
        for (const value of values) {
          set.add(value)
        }
      }

      return set
    }

    const free = (set: Set<any>) => {
      assert(set.size === 0)

      if (pool.length > SET_POOL_MAX_SIZE) return

      if (__DEBUG__) {
        set.add =
          set.has =
          set.keys =
          set.clear =
          set.values =
          set.delete =
          set.forEach =
            illegalInvokation(getStack())
      }

      pool.push(set)
    }

    return { allocate, free }
  }

  const setPool = createSetPool()

  const createState = <StateT extends object>(
    initialState: StateT
  ): State<StateT> => {
    let nextObjectId = 0

    const IS_WRAPPED = Symbol()
    const trackedDependencyStack: Set<string>[] = []
    const localState = new Map<number, State<any>>()
    let dependencyMap = new Map<string, Set<Function>>()
    let deferredUpdates = new Set<Function>()
    let deferredUpdateQueued = false

    const deferredUpdate = () => {
      deferredUpdateQueued = false
      for (const callback of deferredUpdates) {
        const size = deferredUpdates.size
        callback()

        assert(
          size >= deferredUpdates.size,
          'deferredUpdate(): Side-effects detected in a dependency callback. Ensure all your components have no side-effects in them.'
        )

        deferredUpdates.delete(callback)
      }

      assert(
        !deferredUpdates.size,
        'deferredUpdate(): Side-effects detected in a dependency callback. Ensure all your components have no side-effects in them.'
      )
    }

    const reusedReturnTuple: any[] = []
    const trackedExectute = <F extends (...args: any[]) => any>(
      fn: F,
      ...args: Parameters<F>
    ): [Set<string>, ReturnType<F>] => {
      trackedDependencyStack.push(setPool.allocate())
      const result = fn(...args)
      const dependencies = trackedDependencyStack.pop()

      assert(dependencies)

      const ret = reusedReturnTuple as [Set<string>, ReturnType<F>]
      ret[0] = dependencies
      ret[1] = result
      return ret
    }

    const removeDependencies = (
      dependencies: Set<string>,
      callback: Function
    ) => {
      // TODO: Not sure if the necessity of adding this counts as a bug
      // or not.
      deferredUpdates.delete(callback)

      for (const depKey of dependencies) {
        const deps = dependencyMap.get(depKey)
        if (deps) {
          deps.delete(callback)
          if (deps.size === 0) {
            setPool.free(deps)
            dependencyMap.delete(depKey)
          }
        }
      }
    }

    const updateDependencies = (
      prevDependencies: Set<string>,
      nextDependencies: Set<string>,
      callback: Function
    ) => {
      for (const depKey of nextDependencies) {
        if (!prevDependencies.has(depKey)) {
          const deps = dependencyMap.get(depKey)
          if (deps) {
            deps.add(callback)
          } else {
            dependencyMap.set(depKey, setPool.allocate([callback]))
          }
        }
      }

      for (const depKey of prevDependencies) {
        if (!nextDependencies.has(depKey)) {
          const deps = dependencyMap.get(depKey)
          if (deps) {
            deps.delete(callback)
            if (deps.size === 0) {
              setPool.free(deps)
              dependencyMap.delete(depKey)
            }
          }
        }
      }
    }

    const getLocalState = <T extends object>(
      componentId: number,
      state: T
    ): State<T> => {
      const existingState: State<T> | undefined = localState.get(componentId)
      if (existingState) {
        return existingState
      } else {
        const wrapped = wrap(state)
        localState.set(componentId, wrapped)
        return wrapped as State<T>
      }
    }

    const deleteLocalState = (componentId: number) => {
      localState.delete(componentId)
    }

    const internals = {
      [IS_WRAPPED]: true,
      [TRACKED_EXECUTE]: trackedExectute,
      [REMOVE_DEPENDENCIES]: removeDependencies,
      [UPDATE_DEPENDENCIES]: updateDependencies,
      [GET_LOCAL_STATE]: getLocalState,
      [DELETE_LOCAL_STATE]: deleteLocalState,
    }

    const wrap = <T extends object>(obj: T) => {
      const id = ++nextObjectId

      const isArray = Array.isArray(obj)

      const proxy = new Proxy(obj, {
        get(target, key) {
          if (key in internals) return internals[key as keyof typeof internals]

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

          if (typeof value === 'object' && value[IS_WRAPPED] !== true) {
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

  // Hooks and their internal state
  const effects = new Map<number, Effect[]>()
  const componentIdStack: number[] = []
  const stateStack: State<object>[] = []
  const componentsThatHaveUpdatedAtLeastOnce = new Set<number>()

  type Effect = {
    state: State<object>
    dependencies: Set<string>
    callback: () => void
  }

  const startHookTracking = (componentId: number, state: State<any>) => {
    stateStack.push(state)
    componentIdStack.push(componentId)
  }

  const stopHookTracking = () => {
    const state = stateStack.pop()
    assert(state)

    const componentId = componentIdStack.pop()
    assert(typeof componentId !== 'undefined')
    componentsThatHaveUpdatedAtLeastOnce.add(componentId)
  }

  const destroyHooks = (componentId: number) => {
    componentsThatHaveUpdatedAtLeastOnce.delete(componentId)

    const componentEffects = effects.get(componentId)
    if (!componentEffects) return

    for (const effect of componentEffects) {
      effect.state[REMOVE_DEPENDENCIES](effect.dependencies, effect.callback)
      effect.dependencies.clear()
      setPool.free(effect.dependencies)
    }
  }

  const useEffect = (fn: () => void) => {
    const componentId = componentIdStack[componentIdStack.length - 1]
    assert(typeof componentId !== 'undefined')

    if (componentsThatHaveUpdatedAtLeastOnce.has(componentId)) {
      return
    }

    const state = stateStack[stateStack.length - 1] as State<object> | undefined
    assert(state)

    const run = () => {
      const [nextDependencies] = state[TRACKED_EXECUTE](fn)
      state[UPDATE_DEPENDENCIES](eff.dependencies, nextDependencies, run)

      eff.dependencies.clear()
      setPool.free(eff.dependencies)

      eff.dependencies = nextDependencies
    }

    const eff: Effect = {
      state,
      dependencies: setPool.allocate(),
      callback: run,
    }

    run()

    let componentEffects = effects.get(componentId)
    if (!componentEffects) {
      componentEffects = []
      effects.set(componentId, componentEffects)
    }
    assert(componentEffects)
    componentEffects.push(eff)
  }

  const useState = <T extends object>(initialState: T) => {
    const componentId = componentIdStack[componentIdStack.length - 1]
    const state = stateStack[stateStack.length - 1] as State<object> | undefined

    assert(state)
    assert(typeof componentId !== 'undefined')

    return state[GET_LOCAL_STATE](componentId, initialState)
  }

  // Components and HTML rendering
  let nextComponentId = 0

  const createComponentDescriptor = <PropsT>(
    component: ComponentFunction<PropsT>,
    props: PropsT,
    children: Children
  ): ComponentDescriptor<PropsT> => {
    return {
      type: ElementDescriptorType.Component,
      component,
      props,
      children,
    }
  }

  const createComponent = <PropsT, StateT>(
    descriptor: ComponentDescriptor<PropsT>,
    context: KaikuContext<StateT>,
    rootElement?: HTMLElement
  ): Component<PropsT> => {
    const id = ++nextComponentId

    // Only used for debugging, don't rely on this. It should be dropped
    // in production builds.
    let destroyed = false

    let dependencies = setPool.allocate<string>()
    let currentLeaf: Element | null = null
    let currentProps: PropsT = descriptor.props
    let nextLeafDescriptor: ElementDescriptor | null = null

    const update = (nextProps: PropsT = currentProps) => {
      assert(!destroyed, 'update() called even after component was destroyed')

      if (nextProps !== currentProps) {
        const properties = union(
          Object.keys(nextProps),
          Object.keys(currentProps)
        ) as Set<keyof PropsT>

        let unchanged = true
        for (const property of properties) {
          if (nextProps[property] !== currentProps[property]) {
            unchanged = false
            break
          }
        }

        if (unchanged) {
          currentProps = nextProps
          return
        }
      }

      startHookTracking(id, context.state)
      const [nextDependencies, leafDescriptor] = context.state[TRACKED_EXECUTE](
        descriptor.component,
        nextProps
      )
      stopHookTracking()

      nextLeafDescriptor = leafDescriptor
      context.state[UPDATE_DEPENDENCIES](dependencies, nextDependencies, update)

      dependencies.clear()
      setPool.free(dependencies)
      dependencies = nextDependencies
      currentProps = nextProps

      context.updateStack.add(updateLeaf)

      if (!context.currentlyExecutingUpdates) {
        context.currentlyExecutingUpdates = true

        for (const fn of context.updateStack) {
          fn()
          context.updateStack.delete(fn)
        }

        for (const fn of context.mountStack) {
          fn()
          context.mountStack.delete(fn)
        }

        context.currentlyExecutingUpdates = false
      }
    }

    const updateLeaf = () => {
      assert(nextLeafDescriptor)
      const wasReused =
        currentLeaf && reuseChildElement(currentLeaf, nextLeafDescriptor)

      if (wasReused) return

      if (currentLeaf) {
        currentLeaf.destroy()
      }

      if (!rootElement) {
        currentLeaf = createElement(nextLeafDescriptor, context)
        return
      }

      if (nextLeafDescriptor.type === ElementDescriptorType.Component) {
        currentLeaf = createElement(nextLeafDescriptor, context, rootElement)
      } else if (nextLeafDescriptor.type === ElementDescriptorType.HtmlTag) {
        currentLeaf = createElement(nextLeafDescriptor, context)
        if (rootElement.firstChild) {
          rootElement.removeChild(rootElement.firstChild)
        }
        rootElement.appendChild(currentLeaf.el())
      }
    }

    const destroy = () => {
      assert(currentLeaf)
      assert(effects)

      // This `if` is to ensure the `destroyed` flag is dropped in
      // production builds.
      if (__DEBUG__) {
        assert(!destroyed)
        destroyed = true
      }

      destroyHooks(id)
      currentLeaf.destroy()
      context.state[REMOVE_DEPENDENCIES](dependencies, update)
      context.state[DELETE_LOCAL_STATE](id)
      dependencies.clear()
      setPool.free(dependencies)
    }

    update()

    const el = () => currentLeaf!.el()

    return {
      type: ElementType.Component,
      component: descriptor.component,
      el,
      update,
      destroy,
    }
  }

  const createHtmlTagDescriptor = (
    tag: TagName,
    props: HtmlTagProps,
    children: Children
  ): HtmlTagDescriptor => {
    return {
      type: ElementDescriptorType.HtmlTag,
      tag,
      props,
      children,
    }
  }

  const stringifyClassNames = (names: ClassNames): string => {
    if (typeof names === 'string') {
      return names
    }

    if (Array.isArray(names)) {
      return names
        .map((name) => stringifyClassNames(name))
        .join(' ')
        .trim()
    }

    let className = ''
    const keys = Object.keys(names)
    for (const key of keys) {
      if (names[key]) className += key + ' '
    }
    return className.trim()
  }

  // TODO: Add special cases for short arrays
  const longestCommonSubsequence = <T>(a: T[], b: T[]): T[] => {
    const C: number[] = Array(a.length * b.length).fill(0)

    const ix = (i: number, j: number) => i * b.length + j

    for (let i = 0; i < a.length; i++) {
      for (let j = 0; j < b.length; j++) {
        if (a[i] === b[j]) {
          C[ix(i + 1, j + 1)] = C[ix(i, j)] + 1
        } else {
          C[ix(i + 1, j + 1)] = Math.max(C[ix(i + 1, j)], C[ix(i, j + 1)])
        }
      }
    }

    const res: T[] = []

    let i = a.length
    let j = b.length

    while (i && j) {
      if (a[i - 1] === b[j - 1]) {
        res.push(a[i - 1])
        i--
        j--
        continue
      }

      if (C[ix(i, j - 1)] > C[ix(i - 1, j)]) {
        j--
      } else {
        i--
      }
    }

    return res.reverse()
  }

  const flattenChildren = (
    children: Children,
    keyPrefix: string = '',
    result: Map<string, RenderableChild> = new Map()
  ): Map<string, RenderableChild> => {
    for (let i = 0; i < children.length; i++) {
      const child = children[i]

      if (
        child === null ||
        typeof child === 'boolean' ||
        typeof child === 'undefined'
      ) {
        continue
      }

      if (Array.isArray(child)) {
        flattenChildren(child, i + '.', result)
        continue
      }

      if (typeof child === 'string' || typeof child === 'number') {
        result.set(keyPrefix + i, child)
        continue
      }

      result.set(
        keyPrefix +
          (typeof child.props.key !== 'undefined' ? '_' + child.props.key : i),
        child
      )
    }

    return result
  }

  const reuseChildElement = (
    prevChild: ChildElement,
    nextChild: RenderableChild
  ): boolean => {
    if (typeof nextChild === 'string' || typeof nextChild === 'number') {
      if (prevChild.type === ElementType.TextNode) {
        const value = String(nextChild)
        if (prevChild.node.data !== value) {
          prevChild.node.data = value
        }
        return true
      }
      return false
    }

    if (
      nextChild.type === ElementDescriptorType.HtmlTag &&
      prevChild.type === ElementType.HtmlTag &&
      nextChild.tag === prevChild.tag
    ) {
      prevChild.update(nextChild.props, nextChild.children)
      return true
    }

    if (
      nextChild.type === ElementDescriptorType.Component &&
      prevChild.type === ElementType.Component &&
      nextChild.component === prevChild.component
    ) {
      prevChild.update(nextChild.props)
      return true
    }

    return false
  }

  const getNodeOfChildElement = (child: ChildElement): HTMLElement | Text =>
    child.type === ElementType.TextNode ? child.node : child.el()

  const createHtmlTag = <StateT>(
    descriptor: HtmlTagDescriptor,
    context: KaikuContext<StateT>
  ): HtmlTag => {
    const element = document.createElement(descriptor.tag)

    let currentChildren: Map<string, ChildElement> = new Map()
    let currentKeys: string[] = []
    let currentProps: HtmlTagProps = {}

    let nextChildren: Children | null = null
    let nextKeys: Set<string> | null = null
    let nextKeysArr: string[] | null = null
    let deadChildren: ChildElement[] = []
    let preservedElements: Set<string> | null = null

    let lazyUpdates: (() => void)[] = []

    const lazy = <T>(prop: LazyProperty<T>, handler: (value: T) => void) => {
      if (typeof prop !== 'function') {
        handler(prop)
        return
      }

      let dependencies = setPool.allocate<string>()

      const run = () => {
        const [nextDependencies, value] = context.state[TRACKED_EXECUTE](
          prop as () => T
        )
        context.state[UPDATE_DEPENDENCIES](dependencies, nextDependencies, run)
        dependencies.clear()
        setPool.free(dependencies)
        dependencies = nextDependencies
        handler(value)
      }

      run()

      if (dependencies.size === 0) {
        setPool.free(dependencies)
        return
      }
      // TODO: Change this to use system similar to effects
      lazyUpdates.push(() => {
        context.state[REMOVE_DEPENDENCIES](dependencies, run)
      })
    }

    const update = (nextProps: HtmlTagProps, children: Children) => {
      const keys = union(
        Object.keys(nextProps),
        Object.keys(currentProps)
      ) as Set<keyof HtmlTagProps>

      for (let unregister; (unregister = lazyUpdates.pop()); ) {
        unregister()
      }

      for (const key of keys) {
        if (currentProps[key] === nextProps[key]) continue
        if (key === 'key') continue

        const isListener = key.startsWith('on')

        if (isListener) {
          const eventName = key.substr(2).toLowerCase()

          if (key in currentProps) {
            element.removeEventListener(
              eventName as any,
              currentProps[key] as any
            )
          }

          if (key in nextProps) {
            element.addEventListener(eventName as any, nextProps[key] as any)
          }
        } else {
          switch (key) {
            case 'style': {
              const properties = union(
                Object.keys(nextProps.style || {}),
                Object.keys(currentProps.style || {})
              ) as Set<CssProperty>

              for (const property of properties) {
                if (
                  nextProps.style?.[property] !== currentProps.style?.[property]
                ) {
                  lazy(nextProps.style?.[property] ?? '', (value) => {
                    element.style[property as any] = value
                  })
                }
              }
              continue
            }
            case 'checked': {
              lazy(nextProps.checked, (value) => {
                ;(element as HTMLInputElement).checked = value as boolean
              })
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

      currentProps = nextProps
      nextChildren = children

      context.updateStack.add(updateChildren)
      context.mountStack.add(mountChildren)
    }

    const updateChildren = () => {
      assert(nextChildren)

      const flattenedChildren = flattenChildren(nextChildren)
      const nextKeysIterator = flattenedChildren.keys()
      nextKeysArr = Array.from(nextKeysIterator)
      nextKeys = setPool.allocate(nextKeysArr)
      preservedElements = setPool.allocate(
        longestCommonSubsequence(currentKeys, nextKeysArr)
      )

      for (const key of preservedElements) {
        const nextChild = flattenedChildren.get(key)
        const prevChild = currentChildren.get(key)

        assert(typeof nextChild !== 'undefined')
        assert(prevChild)

        const wasReused = reuseChildElement(prevChild, nextChild)

        if (!wasReused) {
          preservedElements.delete(key)
        }
      }

      for (const key of nextKeys) {
        if (preservedElements.has(key)) continue

        const nextChild = flattenedChildren.get(key)
        const prevChild = currentChildren.get(key)

        assert(typeof nextChild !== 'undefined')

        const wasReused = prevChild && reuseChildElement(prevChild, nextChild)

        if (!wasReused) {
          if (prevChild) {
            deadChildren.push(prevChild)
          }

          if (typeof nextChild === 'number' || typeof nextChild === 'string') {
            const node = document.createTextNode(nextChild as string)
            currentChildren.set(key, {
              type: ElementType.TextNode,
              node,
            })
            continue
          }

          currentChildren.set(key, createElement(nextChild, context))
        }
      }

      for (const [key, child] of currentChildren) {
        if (!nextKeys.has(key)) {
          deadChildren.push(child)
          currentChildren.delete(key)
        }
      }
    }

    const mountChildren = () => {
      assert(nextKeys)
      assert(nextKeysArr)
      assert(preservedElements)

      for (let child; (child = deadChildren.pop()); ) {
        if (child.type === ElementType.TextNode) {
          element.removeChild(child.node)
        } else {
          element.removeChild(child.el())
          child.destroy()
        }
      }

      for (let i = nextKeysArr.length - 1; i >= 0; i--) {
        const key = nextKeysArr[i]
        const prevKey = nextKeysArr[i + 1]

        if (preservedElements.has(key)) continue

        const child = currentChildren.get(key)
        assert(child)
        const node = getNodeOfChildElement(child)
        if (!prevKey) {
          element.appendChild(node)
        } else {
          const beforeChild = currentChildren.get(prevKey)
          assert(beforeChild)
          const beforeNode = getNodeOfChildElement(beforeChild)
          element.insertBefore(node, beforeNode)
        }
      }

      currentKeys = nextKeysArr
      nextKeys.clear()
      preservedElements.clear()
      setPool.free(nextKeys)
      setPool.free(preservedElements)

      if (__DEBUG__) {
        nextKeys = null
        nextKeysArr = null
        preservedElements = null
      }
    }

    const destroy = () => {
      for (let unregister; (unregister = lazyUpdates.pop()); ) {
        unregister()
      }

      for (const child of currentChildren.values()) {
        if (child.type === ElementType.TextNode) {
          element.removeChild(child.node)
        } else {
          element.removeChild(child.el())
          child.destroy()
        }
      }

      currentChildren.clear()
    }

    const el = () => element

    update(descriptor.props, descriptor.children)

    return {
      type: ElementType.HtmlTag,
      tag: descriptor.tag,
      el,
      destroy,
      update,
    }
  }

  const createElement = <PropsT, StateT>(
    descriptor: ElementDescriptor<PropsT>,
    context: KaikuContext<StateT>,
    rootElement?: HTMLElement
  ): Element<PropsT> => {
    if (descriptor.type === ElementDescriptorType.Component) {
      return createComponent(descriptor, context, rootElement)
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
    assert(
      typeof tagOrComponent === 'string' || typeof tagOrComponent === 'function'
    )

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
    }
  }

  const render = <PropsT, StateT = object>(
    rootDescriptor: ElementDescriptor<PropsT>,
    rootElement: HTMLElement,
    state?: State<StateT>
  ) => {
    if (!state) {
      state = createState({}) as State<StateT>
    }

    createElement<PropsT, StateT>(
      rootDescriptor,
      {
        state,
        updateStack: new Set(),
        mountStack: new Set(),
        currentlyExecutingUpdates: false,
      },
      rootElement
    )
  }

  const kaiku = {
    h,
    render,
    createState,
    useEffect,
    useState,
  }

  if (typeof module !== 'undefined') {
    module.exports = kaiku
  } else {
    ;(self as any).kaiku = kaiku
  }
})()
