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
  /**
   * NOTES:
   *
   *  - Some functions and members you see here have a underscore
   *    after their name; this does not signify any functional
   *    difference. It is to tell Terser (tool used to minify
   *    the library) that they are not build in methods, and
   *    can be hence renamed.
   *
   *  - Some objects, especially arrays, have a `reused*` prefix.
   *    This signifies that they are reused multiple times across
   *    different components, elements or functions. Be extra cautious
   *    when working with them. Remember asserts if need be!
   */

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
  const CREATE_LOCAL_STATE = Symbol()
  const IMMUTABLE_FLAG = Symbol()
  const STATE_FLAG = Symbol()
  const CLASS_COMPONENT_FLAG = Symbol()

  type Dependee =
    | Effect
    | LazyUpdate<any>
    | FunctionComponent<any>
    | ClassComponent<any>

  type StateInternals = {
    [STATE_FLAG]: true
    [TRACKED_EXECUTE]: <F extends (...args: any) => any>(
      fn: F,
      ...args: Parameters<F>
    ) => [Set<StateKey>, ReturnType<F>]
    [REMOVE_DEPENDENCIES]: (
      nextDependencies: Set<StateKey>,
      dependee: Dependee
    ) => void
    [UPDATE_DEPENDENCIES]: (
      prevDependencies: Set<StateKey>,
      nextDependencies: Set<StateKey>,
      dependee: Dependee
    ) => void
    [CREATE_LOCAL_STATE]: <T extends object>(initialState: T) => State<T>
  }

  type State<T> = T & StateInternals

  type KaikuContext<StateT> = {
    state_: State<StateT>
    queueChildUpdate: <PropsT extends ComponentPropsBase = ComponentPropsBase>(
      element: Element<PropsT>
    ) => void
    queueMount: <PropsT extends ComponentPropsBase = ComponentPropsBase>(
      element: Element<PropsT>
    ) => void
    queuePostMount: <PropsT extends ComponentPropsBase = ComponentPropsBase>(
      element: Element<PropsT>
    ) => void
    queueDestruction: <PropsT extends ComponentPropsBase = ComponentPropsBase>(
      element: Element<PropsT>
    ) => void
  }
  type RenderableChild = ElementDescriptor | string | number
  type Child =
    | ElementDescriptor
    | string
    | number
    | boolean
    | null
    | undefined
    | Child[]
    | FunctionComponentFunction<{}>
  type Children = Child[]
  type ComponentPropsBase = {
    key?: string
    ref?: Ref<any>
    children_?: Children[]
  }
  type FunctionComponentFunction<PropsT extends ComponentPropsBase> = (
    props: PropsT
  ) => ElementDescriptor
  type ClassNames = string | { [key: string]: boolean } | ClassNames[]
  type LazyProperty<T> = T | (() => T)

  type KaikuHtmlTagProps = {
    ref: Ref<any>
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

  const HtmlTagTag = 0
  const FunctionComponentTag = 1
  const ClassComponentTag = 2
  const TextNodeTag = 3
  const LazyUpdateTag = 4
  const EffectTag = 5

  type ElementDescriptor<
    PropsT extends ComponentPropsBase = ComponentPropsBase
  > =
    | HtmlTagDescriptor
    | FunctionComponentDescriptor<PropsT>
    | ClassComponentDescriptor<PropsT>

  type TagName = keyof HTMLElementTagNameMap

  type HtmlTagDescriptor = {
    tag_: typeof HtmlTagTag
    tagName_: TagName
    existingElement?: HTMLElement
    props: HtmlTagProps
    children_: Children
  }

  type ClassComponentType<PropsT> = { new (props: PropsT): Component<PropsT> }

  type ClassComponentDescriptor<
    PropsT extends ComponentPropsBase = ComponentPropsBase
  > = {
    tag_: typeof ClassComponentTag
    class_: ClassComponentType<PropsT>
    props: PropsT
    children_: Children
  }

  type ClassComponent<PropsT extends ComponentPropsBase = ComponentPropsBase> =
    {
      tag_: typeof ClassComponentTag
      key: ChildKey
      context: KaikuContext<{}>
      parentHtmlTag: HtmlTag
      instance: Component<PropsT>
      class_: ClassComponentType<PropsT>
      dependencies: Set<StateKey>
      currentLeaf: Element | null
      currentProps: PropsT
      nextLeafDescriptor: ElementDescriptor | null
      previousLeafElement: HTMLElement | Text | null
    }

  type HtmlTag = {
    tag_: typeof HtmlTagTag
    tagName_: TagName
    context: KaikuContext<{}>
    element_: HTMLElement
    currentChildren: Map<ChildKey, ChildElement>
    currentKeys: ChildKey[]
    currentProps: HtmlTagProps
    nextChildren: Children | null
    nextKeys: ChildKey[] | null
    deadChildren: ChildElement[]
    preservedElements: Set<ChildKey> | null
    lazyUpdates: LazyUpdate<any>[]
  }

  type FunctionComponentDescriptor<
    PropsT extends ComponentPropsBase = ComponentPropsBase
  > = {
    tag_: typeof FunctionComponentTag
    componentFn: FunctionComponentFunction<PropsT>
    props: PropsT
    children_: Children
  }

  type FunctionComponent<
    PropsT extends ComponentPropsBase = ComponentPropsBase
  > = {
    id: FunctionComponentId
    context: KaikuContext<{}>
    descriptor: FunctionComponentDescriptor<PropsT>
    key: ChildKey
    // TODO: Change from Remount to Parent
    parentHtmlTag: HtmlTag
    tag_: typeof FunctionComponentTag
    componentFn: FunctionComponentFunction<PropsT>
    dependencies: Set<StateKey>
    currentLeaf: Element | null
    currentProps: PropsT
    nextLeafDescriptor: ElementDescriptor | null
    previousLeafElement: HTMLElement | Text | null
  }

  type Element<PropsT extends ComponentPropsBase = ComponentPropsBase> =
    | HtmlTag
    | FunctionComponent<PropsT>
    | ClassComponent<PropsT>

  type ChildElement = Element | { tag_: typeof TextNodeTag; node: Text }

  const unionOfKeys = <A extends object, B extends object>(
    a: A,
    b: B
  ): (keyof (A & B))[] => {
    const res = Object.keys(a)
    const bKeys = Object.keys(b)
    for (const key of bKeys) {
      if (!(key in a)) {
        res.push(key)
      }
    }
    return res as (keyof (A & B))[]
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

  type StateKey = string & { __: 'StateKey' }

  const updateDependee = (dependee: Dependee) => {
    switch (dependee.tag_) {
      case FunctionComponentTag:
        return updateFunctionComponent(dependee)
      case ClassComponentTag:
        return updateClassComponent(dependee)
      case EffectTag:
        return runEffect(dependee)
      case LazyUpdateTag:
        return runLazyUpdate(dependee)
    }
  }

  const createState = <StateT extends object>(
    initialState: StateT
  ): State<StateT> => {
    let nextObjectId = 0
    const trackedDependencyStack: Set<StateKey>[] = []
    const dependencyMap = new Map<StateKey, Set<Dependee>>()
    let updatedDependencies: StateKey[] = []

    // We don't want to run `deferredUpdate` on initialization,
    // so mark it as queued. This will be reset once initialization is done.
    let deferredUpdateQueued = true

    const updatedDependees = new Set<Dependee>()

    const deferredUpdate = () => {
      deferredUpdateQueued = false

      for (let key; (key = updatedDependencies.pop()); ) {
        const dependees = dependencyMap.get(key)
        if (!dependees) continue

        for (const dependee of dependees) {
          if (updatedDependees.has(dependee)) continue
          updateDependee(dependee)
          updatedDependees.add(dependee)
        }
      }

      updatedDependees.clear()
    }

    const reusedReturnTuple: any[] = []
    const trackedExectute = <F extends (...args: any[]) => any>(
      fn: F,
      ...args: Parameters<F>
    ): [Set<StateKey>, ReturnType<F>] => {
      trackedDependencyStack.push(setPool.allocate())
      const result = fn(...args)
      const dependencies = trackedDependencyStack.pop()

      assert(dependencies)

      const ret = reusedReturnTuple as [Set<StateKey>, ReturnType<F>]
      ret[0] = dependencies
      ret[1] = result
      return ret
    }

    const removeDependencies = (keys: Set<StateKey>, dependee: Dependee) => {
      for (const key of keys) {
        let dependees = dependencyMap.get(key)
        if (!dependees) continue
        dependees.delete(dependee)

        if (dependees.size === 0) {
          setPool.free(dependees)
          dependencyMap.delete(key)
        }
      }
    }

    const createLocalState = <T extends object>(initialState: T): State<T> => {
      return wrap(initialState)
    }

    const updateDependencies = (
      prevKeys: Set<StateKey>,
      nextKeys: Set<StateKey>,
      dependee: Dependee
    ) => {
      for (const key of nextKeys) {
        if (!prevKeys.has(key)) {
          let dependees = dependencyMap.get(key)

          if (!dependees) {
            dependees = setPool.allocate()
            dependencyMap.set(key, dependees)
          }

          dependees.add(dependee)
        }
      }

      for (const key of prevKeys) {
        if (!nextKeys.has(key)) {
          const dependees = dependencyMap.get(key)
          assert(dependees)
          dependees.delete(dependee)

          if (dependees.size === 0) {
            setPool.free(dependees)
            dependencyMap.delete(key)
          }
        }
      }
    }

    const internals: StateInternals = {
      [STATE_FLAG]: true,
      [TRACKED_EXECUTE]: trackedExectute,
      [REMOVE_DEPENDENCIES]: removeDependencies,
      [UPDATE_DEPENDENCIES]: updateDependencies,
      [CREATE_LOCAL_STATE]: createLocalState,
    }

    const wrap = <T extends object>(obj: T): State<T> => {
      const id = ++nextObjectId

      const isArray = Array.isArray(obj)

      const proxy = new Proxy(obj, {
        get(target, key) {
          if (key in internals) return internals[key as keyof typeof internals]

          if (typeof key === 'symbol') {
            return target[key as keyof T]
          }

          if (trackedDependencyStack.length) {
            const dependencyKey = (id + '.' + key) as StateKey
            trackedDependencyStack[trackedDependencyStack.length - 1].add(
              dependencyKey
            )
          }

          const value = target[key as keyof T]

          if (!isArray && typeof value === 'function') {
            return value.bind(target)
          }

          return value
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

          if (
            value !== null &&
            typeof value === 'object' &&
            !(value[STATE_FLAG] as boolean) &&
            !(value[IMMUTABLE_FLAG] as boolean)
          ) {
            target[key] = wrap(value)
          } else {
            target[key] = value
          }

          const dependencyKey = (id + '.' + key) as StateKey
          updatedDependencies.push(dependencyKey)
          if (!deferredUpdateQueued) {
            deferredUpdateQueued = true
            window.queueMicrotask(deferredUpdate)
          }

          return true
        },
      })

      // Recursively wrap all fields of the object by invoking the `set()` function
      const keys = Object.keys(obj) as (keyof T)[]
      for (const key of keys) {
        proxy[key] = proxy[key]
      }

      return proxy as State<T>
    }

    const state = wrap(initialState)
    deferredUpdateQueued = false
    // Clear keys, since everything was touched at init
    updatedDependencies = []

    return state
  }

  type Immutable<T extends {}> = T & { [IMMUTABLE_FLAG]: true }

  const immutable = <T extends object>(obj: T): Immutable<T> => {
    return new Proxy(obj, {
      get(target, _key) {
        const key = _key as keyof T

        if (key === IMMUTABLE_FLAG) {
          return true
        }

        return target[key]
      },
    }) as Immutable<T>
  }

  type Ref<T> = {
    current?: T
  }

  type FunctionComponentId = number & { __: 'FunctionComponentId' }

  // Hooks and their internal state
  const effects = new Map<FunctionComponentId, Effect[]>()
  const componentStates = new Map<FunctionComponentId, State<any>[]>()
  const componentStateIndexStack: number[] = []

  const componentIdStack: FunctionComponentId[] = []
  const stateStack: State<object>[] = []
  const componentsThatHaveUpdatedAtLeastOnce = new Set<FunctionComponentId>()

  type Effect = {
    tag_: typeof EffectTag
    state_: State<object>
    dependencies: Set<StateKey>
    fn: () => void
  }

  const startHookTracking = (
    componentId: FunctionComponentId,
    state: State<any>
  ) => {
    stateStack.push(state)
    componentIdStack.push(componentId)
    componentStateIndexStack.push(0)
  }

  const stopHookTracking = () => {
    const state = stateStack.pop()
    assert(state)

    const refIndex = componentStateIndexStack.pop()
    assert(typeof refIndex !== 'undefined')

    const componentId = componentIdStack.pop()
    assert(typeof componentId !== 'undefined')
    componentsThatHaveUpdatedAtLeastOnce.add(componentId)
  }

  const destroyHooks = (componentId: FunctionComponentId) => {
    componentsThatHaveUpdatedAtLeastOnce.delete(componentId)
    componentStates.delete(componentId)

    const componentEffects = effects.get(componentId)
    if (!componentEffects) return
    effects.delete(componentId)

    for (const effect of componentEffects) {
      effect.state_[REMOVE_DEPENDENCIES](effect.dependencies, effect)
      effect.dependencies.clear()
      setPool.free(effect.dependencies)
    }
  }

  const runEffect = (eff: Effect) => {
    const { state_ } = eff
    const [nextDependencies] = state_[TRACKED_EXECUTE](eff.fn)
    state_[UPDATE_DEPENDENCIES](eff.dependencies, nextDependencies, eff)

    eff.dependencies.clear()
    setPool.free(eff.dependencies)

    eff.dependencies = nextDependencies
  }

  const useEffect = (fn: () => void) => {
    const componentId = componentIdStack[componentIdStack.length - 1]
    assert(typeof componentId !== 'undefined')

    if (componentsThatHaveUpdatedAtLeastOnce.has(componentId)) {
      return
    }

    const state = stateStack[stateStack.length - 1] as State<object> | undefined
    assert(state)

    const eff: Effect = {
      tag_: EffectTag,
      state_: state,
      dependencies: setPool.allocate(),
      fn,
    }

    runEffect(eff)

    let componentEffects = effects.get(componentId)
    if (!componentEffects) {
      componentEffects = []
      effects.set(componentId, componentEffects)
    }
    assert(componentEffects)
    componentEffects.push(eff)
  }

  const useState = <T extends object>(initialState: T): State<T> => {
    const componentId = componentIdStack[componentIdStack.length - 1]
    const componentStateIndex = componentStateIndexStack[
      componentStateIndexStack.length - 1
    ]++
    const state = stateStack[stateStack.length - 1] as State<object> | undefined

    assert(state)
    assert(typeof componentId !== 'undefined')

    let states = componentStates.get(componentId)

    if (!states) {
      states = []
      componentStates.set(componentId, states)
    }

    if (states.length > componentStateIndex) {
      return states[componentStateIndex]
    }

    const componentState = state[CREATE_LOCAL_STATE](initialState)

    states.push(componentState)

    return componentState
  }

  const useRef = <T>(initialValue?: T): Ref<T> =>
    useState({ current: initialValue })

  // ClassComponent

  abstract class Component<PropsT> {
    static [CLASS_COMPONENT_FLAG] = true
    state: object = {}
    constructor() {}
    componentDidMount() {}
    componentDidUpdate() {}
    componentWillUnmount() {}
    abstract render(props: PropsT): ElementDescriptor
  }

  const createClassComponentDescriptor = <PropsT>(
    component: ClassComponentType<PropsT>,
    props: PropsT,
    children_: Children
  ): ClassComponentDescriptor<PropsT> => {
    return {
      tag_: ClassComponentTag,
      class_: component,
      props,
      children_,
    }
  }

  const createClassComponent = <PropsT extends ComponentPropsBase, StateT>(
    descriptor: ClassComponentDescriptor<PropsT>,
    context: KaikuContext<StateT>,
    key: ChildKey,
    parentHtmlTag: HtmlTag
  ): ClassComponent<PropsT> => {
    const instance = new descriptor.class_(descriptor.props)
    instance.render = instance.render.bind(instance)
    instance.state = context.state_[CREATE_LOCAL_STATE](instance.state)
    instance.componentDidMount = instance.componentDidMount.bind(instance)
    instance.componentDidUpdate = instance.componentDidUpdate.bind(instance)

    const component: ClassComponent<PropsT> = {
      tag_: ClassComponentTag,
      context,
      key,
      parentHtmlTag,
      instance,
      class_: descriptor.class_,
      dependencies: setPool.allocate<StateKey>(),
      currentLeaf: null,
      currentProps: descriptor.props,
      nextLeafDescriptor: null,
      previousLeafElement: null,
    }

    updateClassComponent(component)

    return component
  }

  const updateClassComponent = <PropsT extends ComponentPropsBase>(
    component: ClassComponent<PropsT>,
    nextProps: PropsT = component.currentProps
  ) => {
    const { currentProps, instance, context, dependencies } = component

    if (nextProps !== currentProps) {
      const properties = unionOfKeys(nextProps, currentProps)

      let unchanged = true
      for (const property of properties) {
        if (nextProps[property] !== currentProps[property]) {
          unchanged = false
          break
        }
      }

      if (unchanged) {
        component.currentProps = nextProps
        return
      }

      if ('ref' in nextProps) {
        nextProps.ref!.current = instance
      }
    }

    const [nextDependencies, leafDescriptor] = context.state_[TRACKED_EXECUTE](
      instance.render,
      nextProps
    )

    component.nextLeafDescriptor = leafDescriptor
    context.state_[UPDATE_DEPENDENCIES](
      dependencies,
      nextDependencies,
      component
    )

    dependencies.clear()
    setPool.free(dependencies)
    component.dependencies = nextDependencies
    component.currentProps = nextProps

    context.queueChildUpdate(component)
  }

  const updateClassComponentLeaf = <PropsT>(
    component: ClassComponent<PropsT>
  ) => {
    const { nextLeafDescriptor, currentLeaf, context, key, parentHtmlTag } =
      component

    assert(nextLeafDescriptor)
    const wasReused =
      currentLeaf && reuseChildElement(currentLeaf, nextLeafDescriptor)

    if (wasReused) {
      context.queuePostMount(component)
      return
    }

    if (!currentLeaf) {
      component.currentLeaf = createElement(
        nextLeafDescriptor,
        context,
        key,
        parentHtmlTag
      )
      context.queuePostMount(component)
      return
    }

    // Destroy and remount the leaf if it was not reused and
    // this is not the initialization run
    component.previousLeafElement = getNodeOfElement(currentLeaf)
    component.currentLeaf = createElement(
      nextLeafDescriptor,
      context,
      key,
      parentHtmlTag
    )

    context.queueMount(component)
    context.queuePostMount(component)
    context.queueDestruction(currentLeaf)
  }

  const destroyClassComponent = <PropsT>(component: ClassComponent<PropsT>) => {
    const { instance, currentLeaf, context, dependencies } = component
    instance.componentWillUnmount()

    assert(currentLeaf)
    assert(effects)

    context.queueDestruction(currentLeaf)

    context.state_[REMOVE_DEPENDENCIES](dependencies, component)
    dependencies.clear()
    setPool.free(dependencies)
  }

  // FunctionComponents and HTML rendering
  let nextFunctionComponentId: FunctionComponentId = 0 as FunctionComponentId

  const createFunctionComponentDescriptor = <PropsT>(
    component: FunctionComponentFunction<PropsT>,
    props: PropsT,
    children_: Children
  ): FunctionComponentDescriptor<PropsT> => {
    return {
      tag_: FunctionComponentTag,
      componentFn: component,
      props,
      children_,
    }
  }

  const emptyObject = {}

  const updateFunctionComponent = <PropsT>(
    component: FunctionComponent<PropsT>,
    nextProps: PropsT = component.currentProps
  ) => {
    const { currentProps, id, context, descriptor, dependencies } = component

    if (nextProps !== currentProps) {
      const properties = unionOfKeys(
        nextProps || emptyObject,
        currentProps || emptyObject
      )

      let unchanged = true
      for (const property of properties) {
        if (nextProps[property] !== currentProps[property]) {
          unchanged = false
          break
        }
      }

      if (unchanged) {
        component.currentProps = nextProps
        return
      }
    }

    startHookTracking(id, context.state_)
    const [nextDependencies, leafDescriptor] = context.state_[TRACKED_EXECUTE](
      descriptor.componentFn,
      nextProps
    )
    stopHookTracking()

    component.nextLeafDescriptor = leafDescriptor
    context.state_[UPDATE_DEPENDENCIES](
      dependencies,
      nextDependencies,
      component
    )

    dependencies.clear()
    setPool.free(dependencies)
    component.dependencies = nextDependencies
    component.currentProps = nextProps

    context.queueChildUpdate(component)
  }

  const updateFunctionComponentLeaf = <PropsT extends ComponentPropsBase>(
    component: FunctionComponent<PropsT>
  ) => {
    const { context, key, parentHtmlTag, nextLeafDescriptor, currentLeaf } =
      component

    assert(nextLeafDescriptor)
    const wasReused =
      currentLeaf && reuseChildElement(currentLeaf, nextLeafDescriptor)

    if (wasReused) return

    if (!currentLeaf) {
      component.currentLeaf = createElement(
        nextLeafDescriptor,
        context,
        key,
        parentHtmlTag
      )
      return
    }

    // Destroy and remount the leaf if it was not reused and
    // this is not the initialization run
    component.previousLeafElement = getNodeOfElement(currentLeaf)
    component.currentLeaf = createElement(
      nextLeafDescriptor,
      context,
      key,
      parentHtmlTag
    )
    context.queueDestruction(currentLeaf)
    context.queueMount(component)
  }

  const destroyFunctionComponent = <PropsT>(
    component: FunctionComponent<PropsT>
  ) => {
    const { id, currentLeaf, context, dependencies } = component

    assert(currentLeaf)

    destroyHooks(id)

    context.queueDestruction(currentLeaf)

    context.state_[REMOVE_DEPENDENCIES](dependencies, component)
    dependencies.clear()
    setPool.free(dependencies)
  }

  const createFunctionComponent = <PropsT, StateT>(
    descriptor: FunctionComponentDescriptor<PropsT>,
    context: KaikuContext<StateT>,
    key: ChildKey,
    parentHtmlTag: HtmlTag
  ): FunctionComponent<PropsT> => {
    const id: FunctionComponentId =
      ++nextFunctionComponentId as FunctionComponentId

    const component: FunctionComponent<PropsT> = {
      id,
      context,
      descriptor,
      key,
      parentHtmlTag,
      tag_: FunctionComponentTag,
      componentFn: descriptor.componentFn,
      dependencies: setPool.allocate<StateKey>(),
      currentLeaf: null,
      currentProps: descriptor.props,
      nextLeafDescriptor: null,
      previousLeafElement: null,
    }

    updateFunctionComponent(component)

    return component
  }

  const createHtmlTagDescriptor = (
    tagName: TagName,
    props: HtmlTagProps,
    children_: Children
  ): HtmlTagDescriptor => {
    return {
      tag_: HtmlTagTag,
      tagName_: tagName,
      props,
      children_,
    }
  }

  const stringifyClassNames = (names: ClassNames): string => {
    if (typeof names === 'string') {
      return names
    }

    let className = ''

    if (Array.isArray(names)) {
      for (const name of names) {
        className += stringifyClassNames(name) + ' '
      }
      return className.trim()
    }

    const keys = Object.keys(names)
    for (const key of keys) {
      if (names[key]) className += key + ' '
    }
    return className.trim()
  }

  const slowLCS = <T>(a: T[], b: T[]): T[] => {
    const aLength = a.length
    const bLength = b.length

    if (aLength === 0 || bLength === 0) {
      return []
    }

    if (aLength === 1 && bLength === 1) {
      if (a[0] === b[0]) {
        return a
      }

      return []
    }

    const C: number[] = Array((aLength + 1) * (bLength + 1)).fill(0)

    const ix = (i: number, j: number) => i * bLength + j

    for (let i = 0; i < aLength; i++) {
      for (let j = 0; j < bLength; j++) {
        if (a[i] === b[j]) {
          C[ix(i + 1, j + 1)] = C[ix(i, j)] + 1
        } else {
          C[ix(i + 1, j + 1)] = Math.max(C[ix(i + 1, j)], C[ix(i, j + 1)])
        }
      }
    }

    const res: T[] = []

    let i = aLength
    let j = bLength

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

  const longestCommonSubsequence = <T>(a: T[], b: T[]): T[] => {
    const aLength = a.length
    const bLength = b.length

    if (aLength === 0 || bLength === 0) {
      return []
    }

    if (aLength === 1 && bLength === 1) {
      if (a[0] === b[0]) {
        return a
      }

      return []
    }

    let aStart = 0
    let bStart = 0
    let aEnd = aLength - 1
    let bEnd = bLength - 1

    const head: T[] = []
    const tail: T[] = []

    while (aStart < aLength && bStart < bLength) {
      for (; aStart < aLength && bStart < bLength; aStart++, bStart++) {
        if (a[aStart] !== b[bStart]) {
          break
        }
        head.push(a[aStart])
      }

      if (a[aStart + 1] === b[bStart + 1]) {
        aStart++
        bStart++
      } else if (a[aStart] === b[bStart + 1]) {
        bStart++
      } else if (a[aStart + 1] === b[bStart]) {
        aStart++
      } else {
        break
      }
    }

    while (aStart < aEnd && bStart < bEnd) {
      for (; aStart < aEnd && bStart < bEnd; aEnd--, bEnd--) {
        if (a[aEnd] !== b[bEnd]) {
          break
        }
        tail.push(a[aEnd])
      }

      if (a[aEnd - 1] === b[bEnd - 1]) {
        aEnd--
        bEnd--
      } else if (a[aEnd] === b[bEnd - 1]) {
        bEnd--
      } else if (a[aEnd - 1] === b[bEnd]) {
        aEnd--
      } else {
        break
      }
    }

    aEnd++
    bEnd++

    if (aStart < aEnd && bStart < bEnd) {
      const subLCS = slowLCS(a.slice(aStart, aEnd), b.slice(bStart, bEnd))

      for (let i = 0; i < subLCS.length; i++) {
        head.push(subLCS[i])
      }
    }

    for (let item; (item = tail.pop()); ) {
      head.push(item)
    }

    return head
  }

  const reuseChildElement = (
    prevChild: ChildElement,
    nextChild: RenderableChild
  ): boolean => {
    if (typeof nextChild === 'string' || typeof nextChild === 'number') {
      if (prevChild.tag_ === TextNodeTag) {
        const value = String(nextChild)
        if (prevChild.node.data !== value) {
          prevChild.node.data = value
        }
        return true
      }
      return false
    }

    if (
      nextChild.tag_ === HtmlTagTag &&
      prevChild.tag_ === HtmlTagTag &&
      nextChild.tagName_ === prevChild.tagName_
    ) {
      updateHtmlTag(prevChild, nextChild.props, nextChild.children_)

      return true
    }

    if (
      nextChild.tag_ === FunctionComponentTag &&
      prevChild.tag_ === FunctionComponentTag &&
      nextChild.componentFn === prevChild.componentFn
    ) {
      updateFunctionComponent(prevChild, nextChild.props)
      return true
    }

    if (
      nextChild.tag_ === ClassComponentTag &&
      prevChild.tag_ === ClassComponentTag &&
      nextChild.class_ === prevChild.class_
    ) {
      updateClassComponent(prevChild, nextChild.props)
      return true
    }

    return false
  }

  const getNodeOfElement = (child: ChildElement): HTMLElement | Text => {
    if (child.tag_ === TextNodeTag) {
      return child.node
    }

    let element = child
    while (element.tag_ !== HtmlTagTag) {
      assert(element.currentLeaf)
      element = element.currentLeaf
    }

    return element.element_
  }

  type LazyUpdate<T> = {
    tag_: typeof LazyUpdateTag
    context: KaikuContext<{}>
    prop: () => T
    handler: (value: T) => void
    lastValue: T | undefined
    dependencies: Set<StateKey>
  }

  const reusedPrefixStack: string[] = []
  const reusedChildrenStack: Children[] = []
  const reusedIndexStack: number[] = []

  type ChildKey = string & { __: 'ChildKey' }

  const runLazyUpdate = <T>(lazyUpdate: LazyUpdate<T>) => {
    const { context, prop, handler, lastValue } = lazyUpdate

    const [nextDependencies, value] = context.state_[TRACKED_EXECUTE](prop)
    context.state_[UPDATE_DEPENDENCIES](
      lazyUpdate.dependencies,
      nextDependencies,
      lazyUpdate
    )
    lazyUpdate.dependencies.clear()
    setPool.free(lazyUpdate.dependencies)
    lazyUpdate.dependencies = nextDependencies
    if (value !== lastValue) {
      lazyUpdate.lastValue = value
      handler(value)
    }
  }

  const lazy = <T>(
    htmlTag: HtmlTag,
    prop: LazyProperty<T>,
    handler: (value: T) => void
  ) => {
    const { context, lazyUpdates } = htmlTag
    if (typeof prop !== 'function') {
      handler(prop)
      return
    }

    const lazyUpdate: LazyUpdate<T> = {
      tag_: LazyUpdateTag,
      dependencies: setPool.allocate(),
      lastValue: undefined,
      prop: prop as () => T,
      handler,
      context,
    }

    runLazyUpdate(lazyUpdate)

    if (lazyUpdate.dependencies.size === 0) {
      setPool.free(lazyUpdate.dependencies)
      return
    }

    lazyUpdates.push(lazyUpdate)
  }

  const destroyLazyUpdates = (htmlTag: HtmlTag) => {
    const { context, lazyUpdates } = htmlTag

    for (let lazyUpdate; (lazyUpdate = lazyUpdates.pop()); ) {
      context.state_[REMOVE_DEPENDENCIES](lazyUpdate.dependencies, lazyUpdate)
      lazyUpdate.dependencies.clear()
      setPool.free(lazyUpdate.dependencies)
    }
  }

  const updateHtmlTag = (
    htmlTag: HtmlTag,
    nextProps: HtmlTagProps,
    children: Children
  ) => {
    const { currentProps, element_, context } = htmlTag

    const keys = unionOfKeys(nextProps, currentProps)

    // TODO: Don't destroy these every single time. Make it smart.
    destroyLazyUpdates(htmlTag)

    for (const key of keys) {
      // TODO: Special case access to style and classsnames
      if (currentProps[key] === nextProps[key]) continue
      if (key === 'key') continue

      if (key === 'ref') {
        nextProps[key]!.current = element_
        continue
      }

      // Probably faster than calling startsWith...
      const isListener = key[0] === 'o' && key[1] === 'n'

      if (isListener) {
        const eventName = key.substr(2).toLowerCase()

        if (key in currentProps) {
          element_.removeEventListener(
            eventName as any,
            currentProps[key] as any
          )
        }

        if (key in nextProps) {
          element_.addEventListener(eventName as any, nextProps[key] as any)
        }
      } else {
        switch (key) {
          case 'style': {
            const properties = unionOfKeys(
              nextProps.style || emptyObject,
              currentProps.style || emptyObject
            )

            for (const property of properties) {
              if (
                nextProps.style?.[property] !== currentProps.style?.[property]
              ) {
                lazy(htmlTag, nextProps.style?.[property] ?? '', (value) => {
                  element_.style[property as any] = value
                })
              }
            }
            continue
          }
          case 'checked': {
            lazy(htmlTag, nextProps.checked, (value) => {
              ;(element_ as HTMLInputElement).checked = value as boolean
            })
            continue
          }
          case 'value': {
            lazy(htmlTag, nextProps[key] ?? '', (value) => {
              ;(element_ as HTMLInputElement).value = value
            })
            continue
          }
          case 'className': {
            lazy(htmlTag, nextProps[key], (value) => {
              element_.className = stringifyClassNames(value ?? '')
            })
            continue
          }
        }

        if (key in nextProps) {
          lazy(htmlTag, nextProps[key] as LazyProperty<string>, (value) => {
            element_.setAttribute(key, value)
          })
        } else {
          element_.removeAttribute(key)
        }
      }
    }

    htmlTag.currentProps = nextProps
    htmlTag.nextChildren = children

    context.queueChildUpdate(htmlTag)
    context.queueMount(htmlTag)
  }

  const flattenChildren = (children: Children, prefix = '') => {
    const flattenedChildren = new Map<ChildKey, RenderableChild>()

    if (__DEBUG__) {
      assert(reusedPrefixStack.length === 0)
      assert(reusedChildrenStack.length === 0)
      assert(reusedIndexStack.length === 0)
    }

    reusedPrefixStack.push(prefix)
    reusedChildrenStack.push(children)
    reusedIndexStack.push(0)

    for (let top = 0; top >= 0; reusedIndexStack[top]++) {
      const i = reusedIndexStack[top]
      const children = reusedChildrenStack[top]
      const keyPrefix = reusedPrefixStack[top]

      if (i == children.length) {
        reusedPrefixStack.pop()
        reusedChildrenStack.pop()
        reusedIndexStack.pop()

        top--
        continue
      }

      const child = children[i]

      if (
        child === null ||
        typeof child === 'boolean' ||
        typeof child === 'undefined'
      ) {
        continue
      }

      if (typeof child === 'string' || typeof child === 'number') {
        const key = (keyPrefix + i) as ChildKey
        flattenedChildren.set(key, child)
        continue
      }

      if (typeof child === 'function') {
        const key = (keyPrefix + i) as ChildKey
        flattenedChildren.set(key, h(child, null))
        continue
      }

      if (Array.isArray(child)) {
        top++
        reusedPrefixStack.push(keyPrefix + i + '.')
        reusedChildrenStack.push(child)

        // This needs to start from -1 as it gets incremented once after
        // the continue statement
        reusedIndexStack.push(-1)
        continue
      }
      const key = (keyPrefix +
        (typeof child.props.key !== 'undefined'
          ? '\u9375' + child.props.key
          : i)) as ChildKey
      flattenedChildren.set(key, child)
    }

    if (__DEBUG__) {
      assert(reusedPrefixStack.length === 0)
      assert(reusedChildrenStack.length === 0)
      assert(reusedIndexStack.length === 0)
    }

    return flattenedChildren
  }

  const updateHtmlTagChildren = (htmlTag: HtmlTag) => {
    const {
      nextChildren,
      deadChildren,
      currentChildren,
      currentKeys,
      context,
    } = htmlTag

    assert(nextChildren)
    assert(deadChildren.length === 0)

    const flattenedChildren = flattenChildren(nextChildren)

    const nextKeysIterator = flattenedChildren.keys()
    htmlTag.nextKeys = Array.from(nextKeysIterator) as ChildKey[]
    htmlTag.preservedElements = setPool.allocate(
      longestCommonSubsequence(currentKeys, htmlTag.nextKeys)
    )

    // Check if we can reuse any of the components/elements
    // in the longest preserved key sequence.
    for (const key of htmlTag.preservedElements) {
      const nextChild = flattenedChildren.get(key)
      const prevChild = currentChildren.get(key)

      assert(typeof nextChild !== 'undefined')
      assert(prevChild)

      if (!reuseChildElement(prevChild, nextChild)) {
        // Let's not mark the child as dead yet.
        // It might be reused in the next loop.
        htmlTag.preservedElements.delete(key)
      }
    }

    // Try to reuse old components/elements which share the key.
    // If not reused, mark the previous child for destruction
    // and create a new one in its place.
    for (const [key, nextChild] of flattenedChildren) {
      if (htmlTag.preservedElements.has(key)) continue

      const prevChild = currentChildren.get(key)

      if (prevChild && reuseChildElement(prevChild, nextChild)) {
        continue
      }

      if (prevChild) {
        deadChildren.push(prevChild)
      }

      if (typeof nextChild === 'number' || typeof nextChild === 'string') {
        const node = document.createTextNode(nextChild as string)
        currentChildren.set(key, {
          tag_: TextNodeTag,
          node,
        })
        continue
      }

      currentChildren.set(key, createElement(nextChild, context, key, htmlTag))
    }

    // Check which children will not be a part of the next render.
    // Mark them for destruction and remove from currentChildren.
    for (const [key, child] of currentChildren) {
      if (!htmlTag.nextKeys.includes(key)) {
        deadChildren.push(child)
        currentChildren.delete(key)
      }
    }
  }

  const mountHtmlTagElementChildren = (htmlTag: HtmlTag) => {
    const {
      nextKeys,
      preservedElements,
      element_,
      deadChildren,
      currentChildren,
      context,
    } = htmlTag

    assert(nextKeys)
    assert(preservedElements)

    for (let child; (child = deadChildren.pop()); ) {
      element_.removeChild(getNodeOfElement(child))

      if (child.tag_ !== TextNodeTag) {
        context.queueDestruction(child)
      }
    }

    // Since DOM operations only allow you to append or insertBefore,
    // we must start from the end of the keys.
    for (let i = nextKeys.length - 1; i >= 0; i--) {
      const key = nextKeys[i]
      const prevKey = nextKeys[i + 1]

      if (preservedElements.has(key)) continue

      const child = currentChildren.get(key)
      assert(child)
      const node = getNodeOfElement(child)
      if (typeof prevKey === 'undefined') {
        element_.appendChild(node)
      } else {
        const beforeChild = currentChildren.get(prevKey)
        assert(beforeChild)
        const beforeNode = getNodeOfElement(beforeChild)
        element_.insertBefore(node, beforeNode)
      }
    }

    htmlTag.currentKeys = nextKeys
    preservedElements.clear()
    setPool.free(preservedElements)

    if (__DEBUG__) {
      assert(deadChildren.length === 0)

      // Ensure these are not reused
      htmlTag.nextKeys = null
      htmlTag.preservedElements = null
    }
  }

  const remountComponent = <PropsT>(
    component: FunctionComponent<PropsT> | ClassComponent<PropsT>
  ) => {
    const { key, parentHtmlTag, previousLeafElement, currentLeaf } = component

    assert(previousLeafElement)
    assert(currentLeaf)

    const { element_, currentChildren, currentKeys } = parentHtmlTag
    const nextElement = getNodeOfElement(currentLeaf)

    const child = currentChildren.get(key)
    const childIndex = currentKeys.indexOf(key)
    const prevKey = currentKeys[childIndex - 1]
    assert(childIndex >= 0)
    assert(child)

    element_.removeChild(previousLeafElement)

    if (typeof prevKey === 'undefined') {
      element_.appendChild(nextElement)
    } else {
      const beforeChild = currentChildren.get(prevKey)
      assert(beforeChild)
      const beforeNode = getNodeOfElement(beforeChild)
      element_.insertBefore(nextElement, beforeNode)
    }

    if (__DEBUG__) {
      component.previousLeafElement = null
    }
  }

  const destroyHtmlTag = (htmlTag: HtmlTag) => {
    const { currentChildren, element_, context } = htmlTag
    destroyLazyUpdates(htmlTag)

    for (const child of currentChildren.values()) {
      if (child.tag_ === TextNodeTag) {
        element_.removeChild(child.node)
      } else {
        element_.removeChild(getNodeOfElement(child))
        context.queueDestruction(child)
      }
    }
  }

  const createHtmlTag = <StateT>(
    descriptor: HtmlTagDescriptor,
    context: KaikuContext<StateT>
  ): HtmlTag => {
    const element_ = descriptor.existingElement
      ? descriptor.existingElement
      : document.createElement(descriptor.tagName_)

    const htmlTag: HtmlTag = {
      tag_: HtmlTagTag,
      context,
      tagName_: descriptor.tagName_,
      element_,
      currentChildren: new Map(),
      currentKeys: [],
      currentProps: {},
      nextChildren: null,
      nextKeys: null,
      deadChildren: [],
      preservedElements: null,
      lazyUpdates: [],
    }

    updateHtmlTag(htmlTag, descriptor.props, descriptor.children_)

    return htmlTag
  }

  const createElement = <PropsT, StateT>(
    descriptor: ElementDescriptor<PropsT>,
    context: KaikuContext<StateT>,
    key?: ChildKey,
    parentHtmlTag?: HtmlTag
  ): Element<PropsT> => {
    if (descriptor.tag_ === FunctionComponentTag) {
      assert(typeof key !== 'undefined')
      assert(typeof parentHtmlTag !== 'undefined')
      return createFunctionComponent(descriptor, context, key, parentHtmlTag)
    }

    if (descriptor.tag_ === ClassComponentTag) {
      assert(typeof key !== 'undefined')
      assert(typeof parentHtmlTag !== 'undefined')
      return createClassComponent(descriptor, context, key, parentHtmlTag)
    }

    return createHtmlTag(descriptor, context)
  }

  function h(
    tag: string,
    props: HtmlTagProps | null,
    ...children: Children
  ): HtmlTagDescriptor
  function h<PropsT>(
    component: FunctionComponentFunction<PropsT>,
    props: PropsT | null,
    ...children: Children
  ): FunctionComponentDescriptor<PropsT>
  function h<PropsT>(
    component: ClassComponentType<PropsT>,
    props: PropsT | null,
    ...children: Children
  ): ClassComponentDescriptor<PropsT>
  function h(component: any, props: any, ...children: any) {
    assert(typeof component === 'string' || typeof component === 'function')

    switch (typeof component) {
      case 'function': {
        if (component[CLASS_COMPONENT_FLAG] as boolean) {
          return createClassComponentDescriptor(
            component,
            props ?? {},
            children
          )
        }

        return createFunctionComponentDescriptor(
          component,
          props ?? {},
          children
        )
      }

      case 'string': {
        return createHtmlTagDescriptor(
          component as TagName,
          props ?? {},
          children
        )
      }
    }
  }

  const destroyElement = (element: Element) => {
    switch (element.tag_) {
      case ClassComponentTag: {
        return destroyClassComponent(element)
      }
      case FunctionComponentTag: {
        return destroyFunctionComponent(element)
      }
      case HtmlTagTag: {
        return destroyHtmlTag(element)
      }
      default:
        throw new Error('No destroy function defined')
    }
  }

  const updateChild = (element: Element) => {
    switch (element.tag_) {
      case ClassComponentTag: {
        return updateClassComponentLeaf(element)
      }
      case FunctionComponentTag: {
        return updateFunctionComponentLeaf(element)
      }
      case HtmlTagTag: {
        return updateHtmlTagChildren(element)
      }
      default:
        throw new Error('No update function defined for element')
    }
  }

  const mountElement = (element: Element) => {
    switch (element.tag_) {
      case ClassComponentTag:
      case FunctionComponentTag: {
        return remountComponent(element)
      }
      case HtmlTagTag: {
        return mountHtmlTagElementChildren(element)
      }
      default:
        throw new Error('No update function defined for element')
    }
  }

  const postMountElement = (element: Element) => {
    switch (element.tag_) {
      case ClassComponentTag: {
        return element.instance.componentDidMount()
      }
      default:
        throw new Error('No update function defined for element')
    }
  }

  const render = <StateT = object>(
    rootDescriptor: FunctionComponentDescriptor,
    rootElement: HTMLElement,
    state: State<StateT> = createState({}) as State<StateT>
  ) => {
    let currentlyExecutingUpdates = false
    const childUpdates: Element<any>[] = []
    const mounts: Element<any>[] = []
    const postMounts: Element<any>[] = []
    const destructions: Element<any>[] = []

    const executeUpdatesAndMounts = () => {
      currentlyExecutingUpdates = true

      for (let element; (element = childUpdates.pop()); ) {
        updateChild(element)
      }
      for (let element; (element = mounts.pop()); ) {
        mountElement(element)
      }
      for (let element; (element = postMounts.pop()); ) {
        postMountElement(element)
      }
      for (let element; (element = destructions.pop()); ) {
        destroyElement(element)
      }

      currentlyExecutingUpdates = false
    }

    const context: KaikuContext<StateT> = {
      state_: state,
      queueChildUpdate(element) {
        childUpdates.push(element)
        if (currentlyExecutingUpdates) {
          return
        }
        executeUpdatesAndMounts()
      },
      queueMount(element) {
        mounts.push(element)
        if (currentlyExecutingUpdates) {
          return
        }
        executeUpdatesAndMounts()
      },
      queuePostMount(element) {
        postMounts.push(element)
        if (currentlyExecutingUpdates) {
          return
        }
        executeUpdatesAndMounts()
      },
      queueDestruction(element) {
        destructions.push(element)
        if (currentlyExecutingUpdates) {
          return
        }
        executeUpdatesAndMounts()
      },
    }

    createHtmlTag(
      {
        tag_: HtmlTagTag,
        tagName_: rootElement.tagName as TagName,
        existingElement: rootElement,
        props: {},
        children_: [rootDescriptor],
      },
      context
    )
  }

  const kaiku = {
    h,
    render,
    createState,
    useEffect,
    useState,
    useRef,
    immutable,
    Component,
  }

  if (typeof module !== 'undefined') {
    module.exports = kaiku
  } else {
    ;(self as any).kaiku = kaiku
  }
})()
