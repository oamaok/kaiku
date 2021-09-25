/** @license Kaiku
 * kaiku.ts
 *
 * Copyright (c) 2021 Teemu Pääkkönen
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

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
   */
  const CLASS_COMPONENT_FLAG = Symbol()
  const TRACKED_EXECUTE = Symbol()
  const REMOVE_DEPENDENCIES = Symbol()
  const CREATE_LOCAL_STATE = Symbol()
  const IMMUTABLE_FLAG = Symbol()
  const STATE_FLAG = Symbol()

  const ClassComponentTag = 0
  const FunctionComponentTag = 1
  const HtmlElementTag = 2
  const FragmentTag = 3
  const TextNodeTag = 4
  const EffectTag = 5
  const LazyUpdateTag = 6

  type StateKey = number & { __: 'StateKey' }
  type DependeeId = number & { __: 'DependeeId' }

  type Context<StateT extends {}> = {
    state_: State<StateT>
    svgNs: boolean
  }

  type FragmentProperties = { key?: string | number }

  type HtmlElementTagName =
    | keyof HTMLElementTagNameMap
    | keyof SVGElementTagNameMap
  type HtmlElementProperties = Record<string, any> & {
    style?: Record<string, string>
    className?: ClassNames
  }

  type DefaultProps = Record<string, any>
  type LazyProperty<T> = T | (() => T)

  type ClassComponentDescriptor<PropertiesT extends DefaultProps> = {
    tag_: typeof ClassComponentTag
    class_: ClassComponent<PropertiesT>
    props: PropertiesT
  }

  type FunctionComponentDescriptor<PropertiesT extends DefaultProps> = {
    tag_: typeof FunctionComponentTag
    props: PropertiesT
    func: FunctionComponent<PropertiesT>
  }

  type FragmentDescriptor = {
    tag_: typeof FragmentTag
    props: FragmentProperties
    children_: Child[]
  }

  type HtmlElementDescriptor = {
    tag_: typeof HtmlElementTag
    existingElement?: HTMLElement
    tagName_: HtmlElementTagName
    props: HtmlElementProperties
    children_: Child[]
  }

  type TextDescriptor = {
    tag_: typeof TextNodeTag
    value_: string
  }

  type NodeDescriptor<PropertiesT extends DefaultProps> =
    | ClassComponentDescriptor<PropertiesT>
    | FunctionComponentDescriptor<PropertiesT>
    | FragmentDescriptor
    | HtmlElementDescriptor
    | TextDescriptor

  type ClassComponentInstance<PropertiesT extends DefaultProps> = {
    id_: DependeeId
    tag_: typeof ClassComponentTag
    context_: Context<{}>
    instance: Component<PropertiesT>
    props: PropertiesT
    child: NodeInstance<any> | null
    parentElement_: HtmlElementInstance | null
    nextSibling_: NodeInstance<any> | null
  }

  type FunctionComponentInstance<PropertiesT extends DefaultProps> = {
    id_: DependeeId
    tag_: typeof FunctionComponentTag
    func: FunctionComponent<PropertiesT>
    context_: Context<{}>
    props: PropertiesT
    parentElement_: HtmlElementInstance | null
    nextSibling_: NodeInstance<any> | null
    child: NodeInstance<any> | null
  }

  type FragmentInstance = {
    tag_: typeof FragmentTag
    context_: Context<{}>
    props: FragmentProperties
    children_: NodeInstance<DefaultProps>[]
    childMap: Map<string | number, NodeInstance<DefaultProps>>
    parentElement_: HtmlElementInstance | null
    nextSibling_: NodeInstance<any> | null
  }

  type HtmlElementInstance = {
    tag_: typeof HtmlElementTag
    tagName_: HtmlElementTagName
    element_: HTMLElement | SVGElement
    props: HtmlElementProperties
    context_: Context<{}>
    parentElement_: HtmlElementInstance | null
    nextSibling_: NodeInstance<any> | null
    children_: FragmentInstance | null
    lazyUpdates: LazyUpdate<any>[]
  }

  type TextInstance = {
    tag_: typeof TextNodeTag
    element_: Text
    parentElement_: HtmlElementInstance | null
    nextSibling_: NodeInstance<any> | null
  }

  type NodeInstance<PropertiesT extends DefaultProps> =
    | ClassComponentInstance<PropertiesT>
    | FunctionComponentInstance<PropertiesT>
    | FragmentInstance
    | HtmlElementInstance
    | TextInstance

  abstract class Component<PropertiesT extends DefaultProps> {
    static [CLASS_COMPONENT_FLAG] = true
    state: object = {}
    constructor() {}
    componentDidMount() {}
    componentWillUnmount() {}
    abstract render(props: PropertiesT): NodeDescriptor<any> | null
  }

  type FunctionComponent<PropertiesT extends DefaultProps> = (
    props: PropertiesT
  ) => NodeDescriptor<any> | null

  type ClassComponent<PropertiesT extends {}> = {
    new (props: PropertiesT): Component<PropertiesT>
  }

  type Child =
    | undefined
    | null
    | boolean
    | number
    | string
    | NodeDescriptor<any>
    | FunctionComponent<any>
    | Child[]

  type StateInternals = {
    [STATE_FLAG]: true
    [TRACKED_EXECUTE]: <F extends (...args: any) => any>(
      dependee: Dependee,
      fn: F,
      ...args: Parameters<F>
    ) => ReturnType<F>
    [REMOVE_DEPENDENCIES]: (dependee: Dependee) => void
    [CREATE_LOCAL_STATE]: <T extends object>(initialState: T) => State<T>
  }

  type State<T> = T & StateInternals

  type Immutable<T extends {}> = T & { [IMMUTABLE_FLAG]: true }

  type Effect = {
    id_: DependeeId
    tag_: typeof EffectTag
    state_: State<object>
    fn: () => void
  }

  type LazyUpdate<T> = {
    id_: DependeeId
    tag_: typeof LazyUpdateTag
    state_: State<object>
    prop: () => T
    handler: (value: T) => void
    lastValue: T | undefined
  }

  type Ref<T> = {
    current?: T
  }

  type Dependee =
    | ClassComponentInstance<any>
    | FunctionComponentInstance<any>
    | Effect
    | LazyUpdate<any>

  type Render = <PropertiesT extends DefaultProps, StateT extends {}>(
    rootDescriptor: NodeDescriptor<PropertiesT>,
    rootElement: HTMLElement,
    state?: State<StateT>
  ) => void

  type ClassNames = string | { [key: string]: boolean } | ClassNames[]

  //
  //  Generic utilities
  //
  ///////////////

  const EMPTY_OBJECT = {}

  function __assert(
    condition: boolean | undefined | object | null,
    message?: string
  ): asserts condition {
    if (!Boolean(condition)) {
      throw new Error(message ?? 'assert')
    }
  }

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
  const assert: typeof __assert = __DEBUG__
    ? __assert
    : (undefined as unknown as typeof __assert)

  //
  //  State management
  //
  ///////////////

  let nextDependeeId = 0

  const updateDependee = (dependee: Dependee) => {
    switch (dependee.tag_) {
      case FunctionComponentTag:
      case ClassComponentTag: {
        updateComponentInstance(dependee)
        break
      }
      case EffectTag: {
        runEffect(dependee)
        break
      }
      case LazyUpdateTag: {
        runLazyUpdate(dependee)
        break
      }
    }
  }

  const createState = <StateT extends object>(
    initialState: StateT
  ): State<StateT> => {
    let nextObjectId = 0
    let nextKeyId = 0

    const trackedDependencyStack: Set<StateKey>[] = []
    const currentDependees: Map<DependeeId, Dependee> = new Map()
    const dependeeToKeys: Map<DependeeId, Set<StateKey>> = new Map()
    const keyToDependees: Map<StateKey, Set<DependeeId>> = new Map()

    const updatedDependencies: StateKey[] = []
    const keyToId: Record<any, number> = {}

    let deferredUpdateQueued = false

    const deferredUpdate = () => {
      deferredUpdateQueued = false
      const updatedDependees = new Set<DependeeId>()

      for (let key; (key = updatedDependencies.pop()); ) {
        const dependees = keyToDependees.get(key)
        if (!dependees) continue
        for (const dependeeId of dependees) {
          if (updatedDependees.has(dependeeId)) {
            continue
          }

          updatedDependees.add(dependeeId)
          updateDependee(currentDependees.get(dependeeId)!)
        }
      }
    }

    const trackedExectute = <F extends (...args: any[]) => any>(
      dependee: Dependee,
      fn: F,
      ...args: Parameters<F>
    ): ReturnType<F> => {
      currentDependees.set(dependee.id_, dependee)
      const previousDependencies = dependeeToKeys.get(dependee.id_)
      if (previousDependencies) {
        for (const key of previousDependencies) {
          const dependees = keyToDependees.get(key)
          assert?.(dependees)
          dependees.delete(dependee.id_)
        }
      }

      trackedDependencyStack.push(new Set())
      const result = fn(...args)
      const dependencies = trackedDependencyStack.pop()

      assert?.(dependencies)
      dependeeToKeys.set(dependee.id_, dependencies)

      for (const key of dependencies) {
        let dependencies = keyToDependees.get(key)
        if (!dependencies) {
          dependencies = new Set()
          keyToDependees.set(key, dependencies)
        }
        dependencies.add(dependee.id_)
      }

      return result
    }

    const removeDependencies = (dependee: Dependee) => {
      currentDependees.delete(dependee.id_)
      dependeeToKeys.delete(dependee.id_)
    }

    const createLocalState = <T extends object>(initialState: T): State<T> => {
      return wrap(initialState)
    }

    const internals: StateInternals = {
      [STATE_FLAG]: true,
      [TRACKED_EXECUTE]: trackedExectute,
      [REMOVE_DEPENDENCIES]: removeDependencies,
      [CREATE_LOCAL_STATE]: createLocalState,
    }

    const wrap = <T extends object>(obj: T): State<T> => {
      const id = ++nextObjectId

      const isArray = Array.isArray(obj)
      let initializing = true

      const proxy = new Proxy(obj, {
        get(target, key) {
          if (key in internals) return internals[key as keyof typeof internals]

          if (typeof key === 'symbol') {
            return target[key as keyof T]
          }

          if (trackedDependencyStack.length) {
            const dependencyKey = (id +
              (keyToId[key] || (keyToId[key] = ++nextKeyId)) *
                0x4000000) as StateKey
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
            (value === null ||
              typeof value !== 'object' ||
              (value[STATE_FLAG] as boolean)) &&
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

          if (initializing) {
            return true
          }

          const dependencyKey = (id +
            (keyToId[key] || (keyToId[key] = ++nextKeyId)) *
              0x4000000) as StateKey
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
        if (typeof proxy[key] === 'object') {
          proxy[key] = proxy[key]
        }
      }
      initializing = false
      return proxy as State<T>
    }

    const state = wrap(initialState)

    return state
  }

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

  //
  //  Hooks
  //
  ///////////////

  const effects = new Map<DependeeId, Effect[]>()
  const componentStates = new Map<DependeeId, State<any>[]>()
  const componentStateIndexStack: number[] = []

  const componentIdStack: DependeeId[] = []
  const stateStack: State<object>[] = []
  const componentsThatHaveUpdatedAtLeastOnce = new Set<DependeeId>()

  const startHookTracking = (componentId: DependeeId, state: State<any>) => {
    stateStack.push(state)
    componentIdStack.push(componentId)
    componentStateIndexStack.push(0)
  }

  const stopHookTracking = () => {
    const state = stateStack.pop()
    assert?.(state)

    const refIndex = componentStateIndexStack.pop()
    assert?.(typeof refIndex !== 'undefined')

    const componentId = componentIdStack.pop()
    assert?.(typeof componentId !== 'undefined')
    componentsThatHaveUpdatedAtLeastOnce.add(componentId)
  }

  const destroyHooks = (componentId: DependeeId) => {
    componentsThatHaveUpdatedAtLeastOnce.delete(componentId)
    componentStates.delete(componentId)
    effects.delete(componentId)
  }

  const runEffect = (effect: Effect) => {
    effect.state_[TRACKED_EXECUTE](effect, effect.fn)
  }

  const useEffect = (fn: () => void) => {
    const componentId = componentIdStack[componentIdStack.length - 1]
    assert?.(typeof componentId !== 'undefined')

    if (componentsThatHaveUpdatedAtLeastOnce.has(componentId)) {
      return
    }

    const state = stateStack[stateStack.length - 1] as State<object> | undefined
    assert?.(state)

    const effect: Effect = {
      id_: ++nextDependeeId as DependeeId,
      tag_: EffectTag,
      state_: state,
      fn,
    }

    runEffect(effect)

    let componentEffects = effects.get(componentId)
    if (!componentEffects) {
      componentEffects = []
      effects.set(componentId, componentEffects)
    }
    assert?.(componentEffects)
    componentEffects.push(effect)
  }

  const useState = <T extends object>(initialState: T): State<T> => {
    const componentId = componentIdStack[componentIdStack.length - 1]
    const componentStateIndex = componentStateIndexStack[
      componentStateIndexStack.length - 1
    ]++
    const state = stateStack[stateStack.length - 1] as State<object> | undefined

    assert?.(state)
    assert?.(typeof componentId !== 'undefined')

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

  //
  //  Node utilities
  //
  ///////////////

  const childrenToDescriptors = (children: Child[]): NodeDescriptor<any>[] => {
    const result: NodeDescriptor<any>[] = []

    for (const child of children) {
      if (child === null || child === undefined || typeof child === 'boolean') {
        result.push({ tag_: TextNodeTag, value_: '' })
        continue
      }

      if (typeof child === 'string' || typeof child === 'number') {
        result.push({ tag_: TextNodeTag, value_: child as string })
        continue
      }

      if (Array.isArray(child)) {
        result.push(createFragmentDescriptor(EMPTY_OBJECT, child))
        continue
      }

      if (typeof child === 'function') {
        result.push(h(child, EMPTY_OBJECT))
        continue
      }

      result.push(child)
    }

    return result
  }

  const reuseNodeInstance = (
    instance: NodeInstance<DefaultProps>,
    descriptor: NodeDescriptor<DefaultProps>
  ): boolean => {
    if (
      instance.tag_ === ClassComponentTag &&
      descriptor.tag_ === ClassComponentTag &&
      instance.instance instanceof descriptor.class_
    ) {
      updateComponentInstance(instance, descriptor.props)
      return true
    }

    if (
      instance.tag_ === FunctionComponentTag &&
      descriptor.tag_ === FunctionComponentTag &&
      instance.func === descriptor.func
    ) {
      updateComponentInstance(instance, descriptor.props)
      return true
    }

    if (
      instance.tag_ === HtmlElementTag &&
      descriptor.tag_ === HtmlElementTag &&
      instance.tagName_ === descriptor.tagName_
    ) {
      updateHtmlElementInstance(
        instance,
        descriptor.props,
        descriptor.children_
      )
      return true
    }

    if (instance.tag_ === FragmentTag && descriptor.tag_ === FragmentTag) {
      updateFragmentInstance(instance, descriptor.children_)
      return true
    }

    if (instance.tag_ === TextNodeTag && descriptor.tag_ === TextNodeTag) {
      if (instance.element_.data !== String(descriptor.value_)) {
        instance.element_.data = descriptor.value_
      }
      return true
    }

    return false
  }

  const getKeyOfNodeDescriptor = (
    descriptor: NodeDescriptor<DefaultProps>
  ): string | number | null => {
    if (descriptor.tag_ === TextNodeTag) {
      return null
    }

    if (typeof descriptor.props?.key !== 'undefined') {
      return descriptor.props?.key
    }

    return null
  }

  //
  //  Class components
  //
  ///////////////

  const createClassComponentDescriptor = <PropertiesT extends {}>(
    class_: ClassComponent<PropertiesT>,
    props: PropertiesT,
    _children: Child[]
  ): ClassComponentDescriptor<PropertiesT> => ({
    tag_: ClassComponentTag,
    class_,
    props,
  })

  const createClassComponentInstance = <PropertiesT extends {}>(
    descriptor: ClassComponentDescriptor<PropertiesT>,
    context: Context<{}>
  ): ClassComponentInstance<PropertiesT> => {
    const classInstance = new descriptor.class_(descriptor.props)
    classInstance.render = classInstance.render.bind(classInstance)
    classInstance.state = context.state_[CREATE_LOCAL_STATE](
      classInstance.state
    )

    const instance: ClassComponentInstance<PropertiesT> = {
      id_: ++nextDependeeId as DependeeId,
      tag_: ClassComponentTag,
      context_: context,
      instance: classInstance,
      props: descriptor.props,
      parentElement_: null,
      nextSibling_: null,
      child: null,
    }

    updateComponentInstance(instance)

    return instance
  }

  //
  //  Function components
  //
  ///////////////

  const createFunctionComponentDescriptor = <PropertiesT extends {}>(
    func: FunctionComponent<PropertiesT>,
    props: PropertiesT,
    _children: Child[]
  ): FunctionComponentDescriptor<PropertiesT> => ({
    tag_: FunctionComponentTag,
    func,
    props,
  })

  const createFunctionComponentInstance = <PropertiesT extends {}>(
    descriptor: FunctionComponentDescriptor<PropertiesT>,
    context: Context<{}>
  ): FunctionComponentInstance<PropertiesT> => {
    const instance: FunctionComponentInstance<PropertiesT> = {
      id_: ++nextDependeeId as DependeeId,
      tag_: FunctionComponentTag,
      context_: context,
      func: descriptor.func,
      props: descriptor.props,
      parentElement_: null,
      nextSibling_: null,
      child: null,
    }

    updateComponentInstance(instance)

    return instance
  }

  const updateComponentInstance = <PropertiesT extends {}>(
    instance:
      | FunctionComponentInstance<PropertiesT>
      | ClassComponentInstance<PropertiesT>,
    props: PropertiesT = instance.props
  ) => {
    if (props !== instance.props) {
      const keys = unionOfKeys(props, instance.props)
      let equalProps = true

      for (const key of keys) {
        if (props[key] !== instance.props[key]) {
          equalProps = false
          break
        }
      }

      if (equalProps) {
        return
      }
    }

    instance.props = props

    let childDescriptor
    if (instance.tag_ === FunctionComponentTag) {
      startHookTracking(instance.id_, instance.context_.state_)
      childDescriptor = instance.context_.state_[TRACKED_EXECUTE](
        instance,
        instance.func,
        instance.props
      )
      stopHookTracking()
    } else {
      childDescriptor = instance.context_.state_[TRACKED_EXECUTE](
        instance,
        instance.instance.render,
        props
      )
    }

    if (!childDescriptor) {
      if (instance.child) {
        unmountNodeInstance(instance.child)
      }
      instance.child = null
      return
    }

    if (!instance.child) {
      instance.child = createNodeInstance(childDescriptor, instance.context_)
      return
    }

    const wasReused = reuseNodeInstance(instance.child, childDescriptor)

    if (!wasReused) {
      unmountNodeInstance(instance.child)
      const newChild = createNodeInstance(childDescriptor, instance.context_)
      instance.child = newChild
    }

    if (instance.parentElement_) {
      mountNodeInstance(
        instance,
        instance.parentElement_,
        instance.nextSibling_
      )
    }
  }

  //
  //  Fragments
  //
  ///////////////

  const Fragment = Symbol()

  const createFragmentDescriptor = (
    props: FragmentProperties,
    children: Child[]
  ): FragmentDescriptor => {
    return {
      tag_: FragmentTag,
      children_: children,
      props,
    }
  }

  const createFragmentInstance = (
    descriptor: FragmentDescriptor,
    context_: Context<{}>
  ): FragmentInstance => {
    const instance: FragmentInstance = {
      tag_: FragmentTag,
      props: descriptor.props,
      context_,
      parentElement_: null,
      nextSibling_: null,
      childMap: new Map(),
      children_: [],
    }

    updateFragmentInstance(instance, descriptor.children_)

    return instance
  }

  const updateFragmentInstance = (
    instance: FragmentInstance,
    children: Child[]
  ) => {
    const childDescriptors = childrenToDescriptors(children)

    // NOTE: The fragment children are stored in reverse order to make
    // DOM operations on them easier.

    instance.children_ = []
    const nextkeys = new Set()

    for (let i = childDescriptors.length - 1; i >= 0; i--) {
      const descriptor = childDescriptors[i]
      const descriptorKey = getKeyOfNodeDescriptor(descriptor)
      const key = descriptorKey === null ? i : descriptorKey

      nextkeys.add(key)

      const existingChild = instance.childMap.get(key)
      const wasReused =
        existingChild && reuseNodeInstance(existingChild, descriptor)

      if (wasReused) {
        assert?.(existingChild)
        instance.children_.push(existingChild)
      } else {
        if (existingChild) {
          unmountNodeInstance(existingChild)
        }

        const node = createNodeInstance(descriptor, instance.context_)
        instance.children_.push(node)
        instance.childMap.set(key, node)
      }
    }

    for (const [key, child] of instance.childMap) {
      if (!nextkeys.has(key)) {
        unmountNodeInstance(child)
        instance.childMap.delete(key)
      }
    }
  }

  //
  //  Text nodes
  //
  ///////////////

  const createTextInstance = (descriptor: TextDescriptor): TextInstance => {
    return {
      tag_: TextNodeTag,
      element_: document.createTextNode(descriptor.value_),
      parentElement_: null,
      nextSibling_: null,
    }
  }

  //
  //  Lazy updates
  //
  ///////////////

  const runLazyUpdate = <T>(lazyUpdate: LazyUpdate<T>) => {
    const { state_, prop, handler, lastValue } = lazyUpdate

    const value = state_[TRACKED_EXECUTE](lazyUpdate, prop)
    if (value !== lastValue) {
      lazyUpdate.lastValue = value
      handler(value)
    }
  }

  const lazy = <T>(
    instance: HtmlElementInstance,
    prop: LazyProperty<T>,
    handler: (value: T) => void
  ) => {
    if (typeof prop !== 'function') {
      handler(prop)
      return
    }

    const lazyUpdate: LazyUpdate<T> = {
      id_: ++nextDependeeId as DependeeId,
      tag_: LazyUpdateTag,
      lastValue: undefined,
      prop: prop as () => T,
      handler,
      state_: instance.context_.state_,
    }

    runLazyUpdate(lazyUpdate)

    instance.lazyUpdates.push(lazyUpdate)
  }

  const destroyLazyUpdates = (instance: HtmlElementInstance) => {
    for (let lazyUpdate; (lazyUpdate = instance.lazyUpdates.pop()); ) {
      lazyUpdate.state_[REMOVE_DEPENDENCIES](lazyUpdate)
    }
  }

  //
  //  Html elements
  //
  ///////////////

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

  const createHtmlElementDescriptor = (
    tagName_: HtmlElementTagName,
    props: HtmlElementProperties,
    children_: Child[]
  ): HtmlElementDescriptor => ({
    tag_: HtmlElementTag,
    tagName_,
    props,
    children_,
  })

  const createHtmlElementInstance = (
    descriptor: HtmlElementDescriptor,
    context_: Context<{}>
  ): HtmlElementInstance => {
    const useSvgNs = descriptor.tagName_ === 'svg' || context_.svgNs

    if (context_.svgNs !== useSvgNs) {
      context_ = { svgNs: useSvgNs, state_: context_.state_ }
    }

    const element_ =
      descriptor.existingElement ||
      (useSvgNs
        ? document.createElementNS(
            'http://www.w3.org/2000/svg',
            descriptor.tagName_
          )
        : document.createElement(descriptor.tagName_))

    const instance: HtmlElementInstance = {
      tag_: HtmlElementTag,
      tagName_: descriptor.tagName_,
      context_,
      element_,
      parentElement_: null,
      nextSibling_: null,
      props: EMPTY_OBJECT,
      children_: null,
      lazyUpdates: [],
    }

    updateHtmlElementInstance(instance, descriptor.props, descriptor.children_)

    return instance
  }

  const updateHtmlElementInstance = (
    instance: HtmlElementInstance,
    nextProps: HtmlElementProperties,
    children: Child[]
  ) => {
    const keys = unionOfKeys(nextProps, instance.props)

    for (const key of keys) {
      // TODO: Special case access to style and classsnames
      if (instance.props[key] === nextProps[key]) continue
      if (key === 'key') continue

      if (key === 'ref') {
        nextProps[key]!.current = instance.element_
        continue
      }

      // Probably faster than calling startsWith...
      const isListener = key[0] === 'o' && key[1] === 'n'

      if (isListener) {
        const eventName = key.substr(2).toLowerCase()

        if (key in instance.props) {
          instance.element_.removeEventListener(
            eventName as any,
            instance.props[key] as any
          )
        }

        if (key in nextProps) {
          instance.element_.addEventListener(
            eventName as any,
            nextProps[key] as any
          )
        }
      } else {
        switch (key) {
          case 'style': {
            const properties = unionOfKeys(
              nextProps.style || EMPTY_OBJECT,
              instance.props.style || EMPTY_OBJECT
            )

            for (const property of properties) {
              if (
                nextProps.style?.[property] !== instance.props.style?.[property]
              ) {
                lazy(instance, nextProps.style?.[property] ?? '', (value) => {
                  instance.element_.style[property as any] = value
                })
              }
            }
            continue
          }
          case 'checked': {
            lazy(instance, nextProps.checked, (value) => {
              ;(instance.element_ as HTMLInputElement).checked =
                value as boolean
            })
            continue
          }
          case 'value': {
            lazy(instance, nextProps[key] ?? '', (value) => {
              ;(instance.element_ as HTMLInputElement).value = value
            })
            continue
          }
          case 'className': {
            lazy(instance, nextProps[key], (value) => {
              (instance.element_.className as any) = stringifyClassNames(value ?? '')
            })
            continue
          }
        }

        if (key in nextProps) {
          lazy(instance, nextProps[key] as LazyProperty<string>, (value) => {
            instance.element_.setAttribute(key, value)
          })
        } else {
          instance.element_.removeAttribute(key)
        }
      }
    }

    instance.props = nextProps

    if (children.length === 0) {
      if (instance.children_) {
        unmountNodeInstance(instance.children_)
      }

      instance.children_ = null
    } else {
      if (instance.children_) {
        reuseNodeInstance(
          instance.children_,
          createFragmentDescriptor(EMPTY_OBJECT, children)
        )
      } else {
        instance.children_ = createFragmentInstance(
          createFragmentDescriptor(EMPTY_OBJECT, children),
          instance.context_
        )
      }
    }
  }

  //
  //  Common functions
  //
  ///////////////

  const createNodeInstance = <PropertiesT extends DefaultProps>(
    descriptor: NodeDescriptor<PropertiesT>,
    context: Context<{}>
  ): NodeInstance<PropertiesT> => {
    switch (descriptor.tag_) {
      case ClassComponentTag:
        return createClassComponentInstance(descriptor, context)
      case FunctionComponentTag:
        return createFunctionComponentInstance(descriptor, context)
      case HtmlElementTag:
        return createHtmlElementInstance(descriptor, context)
      case FragmentTag:
        return createFragmentInstance(descriptor, context)
      case TextNodeTag:
        return createTextInstance(descriptor)
    }
  }

  const getNextSiblingElement = (
    instance: NodeInstance<any>
  ): HTMLElement | SVGElement | Text | null => {
    switch (instance.tag_) {
      case ClassComponentTag:
      case FunctionComponentTag: {
        if (instance.child) {
          return getNextSiblingElement(instance.child)
        }

        if (instance.nextSibling_) {
          return getNextSiblingElement(instance.nextSibling_)
        }

        return null
      }

      case FragmentTag: {
        if (instance.children_.length !== 0) {
          return getNextSiblingElement(
            instance.children_[instance.children_.length - 1]
          )
        }

        if (instance.nextSibling_) {
          return getNextSiblingElement(instance.nextSibling_)
        }

        return null
      }

      case TextNodeTag:
      case HtmlElementTag:
        return instance.element_
    }
  }

  const mountNodeInstance = <PropertiesT extends DefaultProps>(
    instance: NodeInstance<PropertiesT>,
    parentElement: HtmlElementInstance,
    nextSibling: NodeInstance<any> | null
  ) => {
    switch (instance.tag_) {
      case ClassComponentTag:
      case FunctionComponentTag: {
        if (instance.child) {
          mountNodeInstance(instance.child, parentElement, nextSibling)
        }

        if (instance.tag_ === ClassComponentTag && !instance.parentElement_) {
          instance.instance.componentDidMount()
        }

        instance.parentElement_ = parentElement
        instance.nextSibling_ = nextSibling

        break
      }

      case TextNodeTag:
      case HtmlElementTag: {
        if (instance.tag_ === HtmlElementTag && instance.children_) {
          mountNodeInstance(instance.children_, instance, null)
        }

        if (
          instance.parentElement_ === parentElement &&
          instance.nextSibling_ === nextSibling
        ) {
          break
        }

        instance.nextSibling_ = nextSibling
        instance.parentElement_ = parentElement

        const refElement = nextSibling && getNextSiblingElement(nextSibling)
        parentElement.element_.insertBefore(instance.element_, refElement)
        break
      }

      case FragmentTag: {
        for (const child of instance.children_) {
          mountNodeInstance(child, parentElement, nextSibling)
          nextSibling = child
        }
      }
    }
  }

  const unmountNodeInstance = (instance: NodeInstance<DefaultProps>) => {
    switch (instance.tag_) {
      case FunctionComponentTag: {
        destroyHooks(instance.id_)
        instance.context_.state_[REMOVE_DEPENDENCIES](instance)
        if (instance.child) {
          unmountNodeInstance(instance.child)
        }
        break
      }

      case ClassComponentTag: {
        instance.instance.componentWillUnmount()
        instance.context_.state_[REMOVE_DEPENDENCIES](instance)
        if (instance.child) {
          unmountNodeInstance(instance.child)
        }
        break
      }

      case HtmlElementTag: {
        destroyLazyUpdates(instance)
        assert?.(instance.parentElement_)
        instance.parentElement_.element_.removeChild(instance.element_)
        break
      }

      case TextNodeTag: {
        assert?.(instance.parentElement_)
        instance.parentElement_.element_.removeChild(instance.element_)
        break
      }

      case FragmentTag: {
        instance.children_.forEach(unmountNodeInstance)
        break
      }
    }
  }

  //
  //  Core functions
  //
  ///////////////

  function h(
    type: HtmlElementTagName,
    props: HtmlElementProperties,
    ...children: Child[]
  ): HtmlElementDescriptor
  function h<PropertiesT extends DefaultProps>(
    type: FunctionComponent<PropertiesT>,
    props: PropertiesT | null,
    ...children: Child[]
  ): FunctionComponentDescriptor<PropertiesT>
  function h<PropertiesT extends DefaultProps>(
    type: ClassComponent<PropertiesT>,
    props: PropertiesT | null,
    ...children: Child[]
  ): ClassComponentDescriptor<PropertiesT>
  function h(
    type: typeof Fragment,
    props: null | { key?: string | number },
    ...children: Child[]
  ): FragmentDescriptor
  function h(
    type: any,
    props: DefaultProps | HtmlElementProperties | null,
    ...children: any
  ): NodeDescriptor<any> {
    if (typeof type === 'string') {
      return createHtmlElementDescriptor(
        type as HtmlElementTagName,
        props || EMPTY_OBJECT,
        children
      )
    }

    if (type[CLASS_COMPONENT_FLAG] as boolean) {
      return createClassComponentDescriptor(
        type,
        props || EMPTY_OBJECT,
        children
      )
    }

    if (type === Fragment) {
      return createFragmentDescriptor(props || EMPTY_OBJECT, children)
    }

    return createFunctionComponentDescriptor(
      type,
      props || EMPTY_OBJECT,
      children
    )
  }

  const render: Render = <PropertiesT extends DefaultProps, StateT extends {}>(
    descriptor: NodeDescriptor<PropertiesT>,
    element: HTMLElement,
    state_: State<StateT> = createState({}) as State<StateT>
  ) => {
    const rootElementInstance: HtmlElementInstance = {
      tag_: HtmlElementTag,
      tagName_: element.tagName as HtmlElementTagName,
      element_: element,
      children_: null,
      context_: {
        state_,
        svgNs: false,
      },
      parentElement_: null,
      nextSibling_: null,
      props: EMPTY_OBJECT,
      lazyUpdates: [],
    }

    const rootComponentInstance = createNodeInstance(descriptor, {
      state_,
      svgNs: false,
    })

    mountNodeInstance(rootComponentInstance, rootElementInstance, null)
  }

  const kaiku = {
    Component,
    Fragment,
    h,
    render,
    useState,
    useRef,
    useEffect,
    createState,
    immutable,
  }

  if (typeof module !== 'undefined') {
    module.exports = kaiku
  } else {
    ;(self as any).kaiku = kaiku
  }
})()
