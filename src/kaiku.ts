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

  type Context<StateT extends {}> = {
    state_: State<StateT>
  }

  type FragmentProperties = { key?: string | number }

  type HtmlElementTagName = keyof HTMLElementTagNameMap
  type HtmlElementProperties = Record<string, any>

  type NextSibling = HTMLElement | Text | null

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
    tag_: typeof ClassComponentTag
    context_: Context<{}>
    instance: Component<PropertiesT>
    props: PropertiesT
    child: NodeInstance<any> | null
    parentElement_: HtmlElementInstance | null
    nextSibling_: NextSibling
  }

  type FunctionComponentInstance<PropertiesT extends DefaultProps> = {
    id: FunctionComponentId
    tag_: typeof FunctionComponentTag
    func: FunctionComponent<PropertiesT>
    context_: Context<{}>
    props: PropertiesT
    parentElement_: HtmlElementInstance | null
    nextSibling_: NextSibling
    child: NodeInstance<any> | null
  }

  type FragmentInstance = {
    tag_: typeof FragmentTag
    context_: Context<{}>
    props: FragmentProperties
    children_: NodeInstance<DefaultProps>[]
    childMap: Map<string | number, NodeInstance<DefaultProps>>
    parentElement_: HtmlElementInstance | null
    nextSibling_: NextSibling
  }

  type HtmlElementInstance = {
    tag_: typeof HtmlElementTag
    tagName_: HtmlElementTagName
    element_: HTMLElement
    props: HtmlElementProperties
    context_: Context<{}>
    parentElement_: HtmlElementInstance | null
    nextSibling_: NextSibling
    children_: FragmentInstance | null
    lazyUpdates: LazyUpdate<any>[]
  }

  type TextInstance = {
    tag_: typeof TextNodeTag
    element_: Text
    parentElement_: HtmlElementInstance | null
    nextSibling_: NextSibling
  }

  type NodeInstance<PropertiesT extends DefaultProps> =
    | ClassComponentInstance<PropertiesT>
    | FunctionComponentInstance<PropertiesT>
    | FragmentInstance
    | HtmlElementInstance
    | TextInstance

  class Component<PropertiesT extends DefaultProps> {
    static [CLASS_COMPONENT_FLAG]: true
  }

  type FunctionComponent<PropertiesT extends DefaultProps> = (
    props: PropertiesT | null
  ) => NodeDescriptor<any>

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

  type StateKey = number & { __: 'StateKey' }
  type FunctionComponentId = number & { __: 'FunctionComponentId' }

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
    tag_: typeof EffectTag
    state_: State<object>
    fn: () => void
  }

  type LazyUpdate<T> = {
    tag_: typeof LazyUpdateTag
    state_: State<object>
    prop: () => T
    handler: (value: T) => void
    lastValue: T | undefined
  }

  type Ref<T> = {
    current?: T
  }

  type Dependee = ClassComponentInstance<any> | FunctionComponentInstance<any> | Effect | LazyUpdate<any>

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

  const assert: typeof __assert = __DEBUG__ ? __assert : () => undefined

  //
  //  State management
  //
  ///////////////

  const updateDependee = (dependee: Dependee) => {
    switch (dependee.tag_) {
      case FunctionComponentTag: {
        updateFunctionComponentInstance(dependee)
        break
      }
      case ClassComponentTag: {
        updateClassComponentInstance(dependee)
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
    // TODO: Use two-way registering
    const dependeeToKeys: Map<Dependee, Set<StateKey>> = new Map()
    const keyToDependees: Map<StateKey, Set<Dependee>> = new Map()

    let updatedDependencies: StateKey[] = []
    const keyToId: Record<any, number> = {}

    // We don't want to run `deferredUpdate` on initialization,
    // so mark it as queued. This will be reset once initialization is done.
    let deferredUpdateQueued = true



    const deferredUpdate = () => {
      deferredUpdateQueued = false
      const updatedDependees = new Set()

      for (const key of updatedDependencies) {
        const dependees = keyToDependees.get(key)
        if (!dependees) continue
        for (const dependee of dependees) {
          if (updatedDependees.has(dependee)) {
            continue
          }

          updatedDependees.add(dependee)
          updateDependee(dependee)
        }
      }

      updatedDependencies = []
    }

    const trackedExectute = <F extends (...args: any[]) => any>(
      dependee: Dependee,
      fn: F,
      ...args: Parameters<F>
    ): ReturnType<F> => {

      const previousDependencies = dependeeToKeys.get(dependee)
      if (previousDependencies) {
        for (const key of previousDependencies) {
          const dependees = keyToDependees.get(key)
          assert(dependees)
          dependees.delete(dependee)
        }
      }

      trackedDependencyStack.push(new Set())
      const result = fn(...args)
      const dependencies = trackedDependencyStack.pop()

      assert(dependencies)
      dependeeToKeys.set(dependee, dependencies)

      for (const key of dependencies) {
        let dependencies = keyToDependees.get(key)
        if (!dependencies) {
          dependencies = new Set()
          keyToDependees.set(key, dependencies)
        }
        dependencies.add(dependee)
      }

      return result
    }

    const removeDependencies = (dependee: Dependee) => {
      dependeeToKeys.delete(dependee)
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

      const proxy = new Proxy(obj, {
        get(target, key) {
          if (key in internals) return internals[key as keyof typeof internals]

          if (typeof key === 'symbol') {
            return target[key as keyof T]
          }

          if (trackedDependencyStack.length) {
            const dependencyKey = (id |
              ((keyToId[key] || (keyToId[key] = ++nextKeyId)) <<
                26)) as StateKey
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

          const dependencyKey = (id |
            ((keyToId[key] || (keyToId[key] = ++nextKeyId)) << 26)) as StateKey
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

  const effects = new Map<FunctionComponentId, Effect[]>()
  const componentStates = new Map<FunctionComponentId, State<any>[]>()
  const componentStateIndexStack: number[] = []

  const componentIdStack: FunctionComponentId[] = []
  const stateStack: State<object>[] = []
  const componentsThatHaveUpdatedAtLeastOnce = new Set<FunctionComponentId>()

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
    effects.delete(componentId)
  }

  const runEffect = (effect: Effect) => {
    effect.state_[TRACKED_EXECUTE](effect, effect.fn)
  }

  const useEffect = (fn: () => void) => {
    const componentId = componentIdStack[componentIdStack.length - 1]
    assert(typeof componentId !== 'undefined')

    if (componentsThatHaveUpdatedAtLeastOnce.has(componentId)) {
      return
    }

    const state = stateStack[stateStack.length - 1] as State<object> | undefined
    assert(state)

    const effect: Effect = {
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
    assert(componentEffects)
    componentEffects.push(effect)
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

  //
  //  Child utilities
  //
  ///////////////

  const getFirstChildOfNodeInstance = (
    instance: NodeInstance<DefaultProps>
  ): HTMLElement | Text | null => {
    switch (instance.tag_) {
      case ClassComponentTag:
      case FunctionComponentTag: {
        if (!instance.child) {
          return null
        }
        return getFirstChildOfNodeInstance(instance.child)
      }

      case FragmentTag: {
        if (instance.children_.length !== 0) {
          return getFirstChildOfNodeInstance(
            instance.children_[instance.children_.length - 1]
          )
        }

        return null
      }

      case TextNodeTag:
      case HtmlElementTag:
        return instance.element_
    }
  }

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
      updateClassComponentInstance(instance, descriptor.props)
      return true
    }

    if (
      instance.tag_ === FunctionComponentTag &&
      descriptor.tag_ === FunctionComponentTag &&
      instance.func === descriptor.func
    ) {
      updateFunctionComponentInstance(instance, descriptor.props)
      return true
    }

    if (
      instance.tag_ === HtmlElementTag &&
      descriptor.tag_ === HtmlElementTag
    ) {
      if (instance.tagName_ !== descriptor.tagName_) {
        // TODO: Replace tags in-place
        
        return false
      }

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
    class_: Component<PropertiesT>,
    props: PropertiesT | null,
    children: Child[]
  ): ClassComponentDescriptor<PropertiesT> => {}

  const createClassComponentInstance = <PropertiesT extends {}>() => {}

  const updateClassComponentInstance = <PropertiesT extends {}>(
    instance: ClassComponentInstance<PropertiesT>,
    props: PropertiesT | null
  ) => {}

  //
  //  Function components
  //
  ///////////////

  let nextFunctionComponentId = 0

  const createFunctionComponentDescriptor = <PropertiesT extends {}>(
    func: FunctionComponent<PropertiesT>,
    props: PropertiesT,
    children: Child[]
  ): FunctionComponentDescriptor<PropertiesT> => ({
    tag_: FunctionComponentTag,
    func,
    props,
  })

  const createFunctionComponentInstance = <PropertiesT extends {}>(
    descriptor: FunctionComponentDescriptor<PropertiesT>,
    context: Context<any>
  ): FunctionComponentInstance<PropertiesT> => {
    const instance: FunctionComponentInstance<PropertiesT> = {
      id: ++nextFunctionComponentId as FunctionComponentId,
      tag_: FunctionComponentTag,
      context_: context,
      func: descriptor.func,
      props: EMPTY_OBJECT as PropertiesT,
      parentElement_: null,
      nextSibling_: null,
      child: null,
    }

    updateFunctionComponentInstance(instance, descriptor.props)

    return instance
  }

  const updateFunctionComponentInstance = <PropertiesT extends {}>(
    instance: FunctionComponentInstance<PropertiesT>,
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

    startHookTracking(instance.id, instance.context_.state_)
    const childDescriptor = instance.context_.state_[TRACKED_EXECUTE](
      instance,
      instance.func,
      props
    )
    stopHookTracking()

    if (!instance.child) {
      instance.child = createNodeInstance(childDescriptor, instance.context_)
      return
    }

    const wasReused = reuseNodeInstance(instance.child, childDescriptor)

    if (!wasReused) {
      const newChild = createNodeInstance(childDescriptor, instance.context_)
      unmountNodeInstance(instance.child)
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
    context_: Context<any>
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

    // TODO: Handle deletions
    instance.children_ = []

    const keys = new Set()

    for (let i = childDescriptors.length - 1; i >= 0; i--) {
      const descriptor = childDescriptors[i]
      const descriptorKey = getKeyOfNodeDescriptor(descriptor)
      const key = descriptorKey === null ? i : descriptorKey

      keys.add(key)

      const existingChild = instance.childMap.get(key)
      const wasReused =
        existingChild && reuseNodeInstance(existingChild, descriptor)

      if (wasReused) {
        assert(existingChild)
        instance.children_.push(existingChild)
      } else {
        if (existingChild) {
          // TODO: Destroy? Unmount?
          // unmount until HTML tag?
          unmountNodeInstance(existingChild)
        }

        const node = createNodeInstance(descriptor, instance.context_)
        instance.children_.push(node)
        instance.childMap.set(key, node)
      }
    }

    for (const [key, child] of instance.childMap) {
      if (!keys.has(key)) {
        // TODO: Destroy, unmount
        unmountNodeInstance(child)
        instance.childMap.delete(key)
      }
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
    context_: Context<any>
  ): HtmlElementInstance => {
    const element_ =
      descriptor.existingElement || document.createElement(descriptor.tagName_)

    const instance: HtmlElementInstance = {
      tag_: HtmlElementTag,
      tagName_: descriptor.tagName_,
      context_,
      element_,
      parentElement_: null,
      nextSibling_: null,
      props: EMPTY_OBJECT,
      children_: null,
      lazyUpdates: []
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
          instance.element_.addEventListener(eventName as any, nextProps[key] as any)
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
              ;(instance.element_ as HTMLInputElement).checked = value as boolean
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
              instance.element_.className = stringifyClassNames(value ?? '')
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
        // TODO: Destroy and unmount
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
    context: Context<any>
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

  const mountNodeInstance = <PropertiesT extends DefaultProps>(
    instance: NodeInstance<PropertiesT>,
    parentElement: HtmlElementInstance,
    nextSibling: NextSibling
  ) => {
    switch (instance.tag_) {
      case ClassComponentTag:
      case FunctionComponentTag: {
        if (instance.child) {
          mountNodeInstance(instance.child, parentElement, nextSibling)
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

        if (!nextSibling) {
          parentElement.element_.appendChild(instance.element_)
        } else {
          parentElement.element_.insertBefore(instance.element_, nextSibling)
        }

        break
      }

      case FragmentTag: {
        for (const child of instance.children_) {
          mountNodeInstance(child, parentElement, nextSibling)
          nextSibling = getFirstChildOfNodeInstance(child)
        }
      }
    }
  }

  const unmountNodeInstance = (instance: NodeInstance<DefaultProps>) => {
    switch (instance.tag_) {
      case FunctionComponentTag:
      case ClassComponentTag: {
        if (instance.child) {
          unmountNodeInstance(instance.child)
        }
        break
      }
      case TextNodeTag:
      case HtmlElementTag: {
        assert(instance.parentElement_)
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
  function h<PropertiesT extends {}>(
    type: FunctionComponent<PropertiesT>,
    props: PropertiesT | null,
    ...children: Child[]
  ): FunctionComponentDescriptor<PropertiesT>
  function h<PropertiesT>(
    type: ClassComponent<PropertiesT>,
    props: PropertiesT | null,
    ...children: Child[]
  ): ClassComponentDescriptor<PropertiesT>
  function h(
    type: typeof Fragment,
    props: null | { key?: string | number },
    ...children: Child[]
  ): FragmentDescriptor
  function h(type: any, props: any, ...children: any): NodeDescriptor<any> {
    if (typeof type === 'string') {
      return createHtmlElementDescriptor(
        type as HtmlElementTagName,
        props || EMPTY_OBJECT,
        children
      )
    }

    if (type[CLASS_COMPONENT_FLAG]) {
      return createClassComponentDescriptor(type, props || EMPTY_OBJECT, children)
    }

    if (type === Fragment) {
      return createFragmentDescriptor(props || EMPTY_OBJECT, children)
    }

    return createFunctionComponentDescriptor(type, props || EMPTY_OBJECT, children)
  }

  const render: Render = <PropertiesT extends DefaultProps, StateT extends {}>(
    rootDescriptor: NodeDescriptor<PropertiesT>,
    rootElement: HTMLElement,
    state_: State<StateT> = createState({}) as State<StateT>
  ) => {
    const rootInstance: HtmlElementInstance = {
      tag_: HtmlElementTag,
      tagName_: rootElement.tagName as HtmlElementTagName,
      element_: rootElement,
      children_: null,
      context_: {
        state_,
      },
      parentElement_: null,
      nextSibling_: null,
      props: EMPTY_OBJECT,
      lazyUpdates: []
    }

    mountNodeInstance(
      createNodeInstance(rootDescriptor, {
        state_,
      }),
      rootInstance,
      null
    )
  }

  const kaiku = {
    Component,
    h,
    render,
    useState,
    useRef,
    useEffect,
    createState,
  }

  if (typeof module !== 'undefined') {
    module.exports = kaiku
  } else {
    ;(self as any).kaiku = kaiku
  }
})()
