/** @license Kaiku
 * kaiku.ts
 *
 * Copyright (c) 2021 Teemu Pääkkönen
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * NOTES:
 *
 *  - Some functions and members you see here have a underscore
 *    after their name; this does not signify any functional
 *    difference. It is to tell Terser (the tool used to minify
 *    the library) that they are not built-in methods, and
 *    can be hence renamed.
 *
 */

// These are translated compile time into number tags, but in debug
// builds they are strings.
declare const ClassComponentTag = 'ClassComponent'
declare const FunctionComponentTag = 'FunctionComponent'
declare const HtmlElementTag = 'HtmlElement'
declare const FragmentTag = 'Fragment'
declare const TextNodeTag = 'TextNode'
declare const EffectTag = 'EffectTag'
declare const LazyPropUpdateTag = 'LazyPropUpdateTag'
declare const LazyStyleUpdateTag = 'LazyStyleUpdateTag'

const CLASS_COMPONENT_FLAG = Symbol()
const IMMUTABLE_FLAG = Symbol()
const STATE_FLAG = Symbol()
const UNWRAP = Symbol()

const SVG_NAMESPACE_URI = 'http://www.w3.org/2000/svg'

type StateKey = number & { __: 'StateKey' }
type DependeeId = number & { __: 'DependeeId' }

type Context = {
  svgNs: boolean
}

type FragmentProperties = { key?: string | number }

type HtmlElementTagName =
  | keyof HTMLElementTagNameMap
  | keyof SVGElementTagNameMap
type HtmlElementProperties = Record<string, any> & {
  style?: Record<string, string | (() => string)>
  className?: ClassNames
}

export type DefaultProps = Record<string, any>
export type WithIntrinsicProps<T extends DefaultProps> = T & {
  children?: Child | Children
  key?: string
}

type ClassComponentDescriptor<
  PropertiesT extends DefaultProps,
  StateT extends {} | undefined = undefined
> = {
  tag_: typeof ClassComponentTag
  class_: ClassComponent<PropertiesT, StateT>
  props_: WithIntrinsicProps<PropertiesT>
}

type FunctionComponentDescriptor<PropertiesT extends DefaultProps> = {
  tag_: typeof FunctionComponentTag
  props_: WithIntrinsicProps<PropertiesT>
  func: FunctionComponent<PropertiesT>
}

type FragmentDescriptor = {
  tag_: typeof FragmentTag
  props_: FragmentProperties
  children_: Child[]
}

type HtmlElementDescriptor = {
  tag_: typeof HtmlElementTag
  tagName_: HtmlElementTagName
  props_: HtmlElementProperties
  children_: Child[]
}

type TextDescriptor = {
  tag_: typeof TextNodeTag
  value_: string
}

export type NodeDescriptor<PropertiesT extends DefaultProps> =
  | ClassComponentDescriptor<PropertiesT>
  | FunctionComponentDescriptor<PropertiesT>
  | FragmentDescriptor
  | HtmlElementDescriptor
  | TextDescriptor

type ClassComponentInstance<
  PropertiesT extends DefaultProps,
  StateT extends {} | undefined = undefined
> = {
  id_: DependeeId
  tag_: typeof ClassComponentTag
  context_: Context
  instance: Component<PropertiesT, StateT>
  props_: State<WithIntrinsicProps<PropertiesT>>
  child: NodeInstance<any> | null
  parentElement_: HtmlElementInstance | null
  nextSibling_: NodeInstance<any> | null
}

type FunctionComponentInstance<PropertiesT extends DefaultProps> = {
  id_: DependeeId
  tag_: typeof FunctionComponentTag
  func: FunctionComponent<PropertiesT>
  context_: Context
  props_: State<WithIntrinsicProps<PropertiesT>>
  parentElement_: HtmlElementInstance | null
  nextSibling_: NodeInstance<any> | null
  child: NodeInstance<any> | null
}

type FragmentInstance = {
  tag_: typeof FragmentTag
  context_: Context
  props_: FragmentProperties
  children_: NodeInstance<DefaultProps>[]
  childMap: Map<string | number, NodeInstance<DefaultProps>>
  parentElement_: HtmlElementInstance | null
  nextSibling_: NodeInstance<any> | null
}

type HtmlElementInstance = {
  tag_: typeof HtmlElementTag
  tagName_: HtmlElementTagName
  element_: HTMLElement | SVGElement
  props_: HtmlElementProperties
  context_: Context
  parentElement_: HtmlElementInstance | null
  nextSibling_: NodeInstance<any> | null
  children_: FragmentInstance | null
  lazyPropUpdates: Map<string, LazyPropUpdate<any>> | null
  lazyStyleUpdates: Map<string, LazyStyleUpdate<any>> | null
  eventHandlers: Record<string, (evt: Event) => void> | null
  eventListener: ((evt: Event) => void) | null
}

type TextInstance = {
  tag_: typeof TextNodeTag
  element_: Text
  parentElement_: HtmlElementInstance | null
  nextSibling_: NodeInstance<any> | null
}

type NodeInstance<
  PropertiesT extends DefaultProps,
  StateT extends {} | undefined = undefined
> =
  | ClassComponentInstance<PropertiesT, StateT>
  | FunctionComponentInstance<PropertiesT>
  | FragmentInstance
  | HtmlElementInstance
  | TextInstance

abstract class Component<
  PropertiesT extends DefaultProps = DefaultProps,
  StateT extends {} | undefined = undefined
> {
  props: PropertiesT = {} as PropertiesT
  static [CLASS_COMPONENT_FLAG] = true
  state: StateT = undefined as StateT
  constructor(props: WithIntrinsicProps<PropertiesT>) {
    this.props = props
  }
  componentDidMount() {}
  componentWillUnmount() {}
  abstract render(
    props: WithIntrinsicProps<PropertiesT>
  ): NodeDescriptor<any> | null
}

export type FunctionComponent<PropertiesT extends DefaultProps> = (
  props: WithIntrinsicProps<PropertiesT>
) => NodeDescriptor<any> | null

export type FC<PropertiesT extends DefaultProps> =
  FunctionComponent<PropertiesT>

type ClassComponent<
  PropertiesT extends DefaultProps,
  StateT extends {} | undefined = undefined
> = {
  new (props: WithIntrinsicProps<PropertiesT>): Component<PropertiesT, StateT>
}

export type Child =
  | undefined
  | null
  | boolean
  | number
  | string
  | NodeDescriptor<any>
  | FunctionComponent<any>
  | Child[]

export type Children = Child[]

type State<T> = T & { [UNWRAP]: T; [STATE_FLAG]: true }

type Immutable<T extends {}> = T & { [IMMUTABLE_FLAG]: true }

type Effect = {
  id_: DependeeId
  tag_: typeof EffectTag
  fn: () => void | (() => void)
  unsubscribe_?: () => void
}

type LazyPropUpdate<T> = {
  id_: DependeeId
  tag_: typeof LazyPropUpdateTag
  element_: HTMLElement | SVGElement
  property: string
  callback: () => T
  previousValue: T | undefined
}

type LazyStyleUpdate<T> = {
  id_: DependeeId
  tag_: typeof LazyStyleUpdateTag
  element_: HTMLElement
  property: string
  callback: () => T
  previousValue: T | undefined
}

type Ref<T> = {
  current?: T
}

type Dependee =
  | ClassComponentInstance<any, any>
  | FunctionComponentInstance<any>
  | Effect
  | LazyPropUpdate<any>
  | LazyStyleUpdate<any>

type Render = <PropertiesT extends DefaultProps>(
  rootDescriptor: NodeDescriptor<PropertiesT>,
  rootElement: HTMLElement | SVGElement
) => void

type ClassNames =
  | undefined
  | null
  | string
  | { [key: string]: boolean }
  | ClassNames[]

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
    case LazyPropUpdateTag: {
      runLazyPropUpdate(dependee)
      break
    }
    case LazyStyleUpdateTag: {
      runLazyStyleUpdate(dependee)
      break
    }
  }
}

let nextObjectId = 0
let nextKeyId = 0
const trackedDependencyStack: Set<StateKey>[] = []
const currentDependees: Map<DependeeId, Dependee> = new Map()
const dependeeToKeys: Map<DependeeId, Set<StateKey>> = new Map()
const keyToDependees: Map<StateKey, Set<DependeeId>> = new Map()

let updatedDependencies: StateKey[] = []
const keyToId: Map<any, StateKey> = new Map()
const getKeyId = (key: any): StateKey => {
  const existingKey = keyToId.get(key)
  if (existingKey) {
    return existingKey
  }

  const id = (++nextKeyId * 0x4000000) as StateKey
  keyToId.set(key, id)
  return id
}

let deferredUpdateQueued = false

const deferredUpdate = () => {
  deferredUpdateQueued = false
  const updatedDependees = new Set<DependeeId>()

  const keys = [...updatedDependencies]
  updatedDependencies = []

  for (const key of keys) {
    const dependees = keyToDependees.get(key)
    if (!dependees) continue
    for (const dependeeId of dependees) {
      if (updatedDependees.has(dependeeId)) {
        continue
      }

      updatedDependees.add(dependeeId)

      const dependee = currentDependees.get(dependeeId)
      assert?.(dependee)
      updateDependee(dependee)
    }
  }

  if (updatedDependencies.length !== 0) {
    deferredUpdateQueued = true

    if (__DEBUG__) {
      try {
        deferredUpdate()
      } catch (err) {
        if (
          // Chromium-based
          err instanceof RangeError ||
          // Firefox
          (typeof InternalError !== 'undefined' && err instanceof InternalError)
        ) {
          throw new Error(
            "useEffect loop detected! Make sure effects aren't continuously updating the same value."
          )
        } else {
          throw err
        }
      }
    } else {
      deferredUpdate()
    }
  }
}

const trackedExecute = <F extends (...args: any[]) => any>(
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
      if (dependees.size === 0) {
        keyToDependees.delete(key)
      }
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
  const keys = dependeeToKeys.get(dependee.id_)
  if (keys) {
    for (const key of keys) {
      keyToDependees.get(key)?.delete(dependee.id_)
    }

    dependeeToKeys.delete(dependee.id_)
  }
}

const internalCreateState = <T extends object>(
  obj: T,
  shallow: boolean
): State<T> => {
  const id = ++nextObjectId

  const isArray = Array.isArray(obj)
  let initializing = true

  const proxy = new Proxy(obj, {
    get(target, key) {
      if (key === UNWRAP) return target
      if (key === STATE_FLAG) return true

      if (trackedDependencyStack.length) {
        const dependencyKey = (id + getKeyId(key)) as StateKey
        trackedDependencyStack[trackedDependencyStack.length - 1].add(
          dependencyKey
        )
      }

      const value = target[key as keyof T]

      if (!isArray && typeof value === 'function') {
        return (value as Function).bind(target)
      }

      return value
    },

    deleteProperty(target, _key) {
      const key = _key as keyof T

      if (!initializing) {
        updatedDependencies.push(id as StateKey)

        if (!deferredUpdateQueued) {
          deferredUpdateQueued = true
          window.queueMicrotask(deferredUpdate)
        }
      }

      return delete target[key]
    },

    ownKeys(target) {
      if (trackedDependencyStack.length) {
        trackedDependencyStack[trackedDependencyStack.length - 1].add(
          id as StateKey
        )
      }

      return Reflect.ownKeys(target)
    },

    has(target, key) {
      if (trackedDependencyStack.length) {
        trackedDependencyStack[trackedDependencyStack.length - 1].add(
          id as StateKey
        )
      }

      return Reflect.has(target, key)
    },

    set(target, _key, value) {
      const key = _key as keyof T
      const isNewKeyForTarget = !(key in target)
      const isValueObject = typeof value === 'object'
      const isValueNull = value === null
      const isArrayLengthUpdate = isArray && key === 'length'

      // Check if the value is unchanged and do an early return.
      //
      // If a value is pushed to an array, the proxy's `set` handler will be called
      // on the key `length`. The value, however, will always be equal to the target's
      // length. In this specific case, we cannot trust the equivalence and must
      // treat the value as changed.
      if (
        target[key] === value &&
        !isArrayLengthUpdate &&
        (isValueNull || !isValueObject || (value[STATE_FLAG] as boolean))
      ) {
        return true
      }

      if (
        !isValueNull &&
        isValueObject &&
        !(value[STATE_FLAG] as boolean) &&
        !(value[IMMUTABLE_FLAG] as boolean) &&
        !shallow
      ) {
        target[key] = createState(value)
      } else {
        target[key] = value
      }

      // When initializing state, do not mark the new keys as dependencies.
      if (initializing) {
        return true
      }

      // When setting for the first time, add the value itself as dependency
      // to account for e.g. `Object.keys` updates
      if (isNewKeyForTarget) {
        updatedDependencies.push(id as StateKey)
      }

      const dependencyKey = (id + getKeyId(key)) as StateKey
      updatedDependencies.push(dependencyKey)
      if (!deferredUpdateQueued) {
        deferredUpdateQueued = true
        window.queueMicrotask(deferredUpdate)
      }

      return true
    },
  })

  if (!shallow) {
    // For non-shallow state objects, recursively wrap all fields of the
    // object by invoking the `set()` function.
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'object') {
        proxy[key as keyof T] = value
      }
    }
  }

  initializing = false
  return proxy as State<T>
}

const createState = <T extends object>(obj: T): State<T> =>
  internalCreateState(obj, false)

const createShallowState = <T extends object>(obj: T): State<T> =>
  internalCreateState(obj, true)

const unwrap = <T>(state: State<T>): T => {
  return state[UNWRAP]
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
const componentsThatHaveUpdatedAtLeastOnce = new Set<DependeeId>()

const startHookTracking = (componentId: DependeeId) => {
  componentIdStack.push(componentId)
  componentStateIndexStack.push(0)
}

const stopHookTracking = () => {
  const refIndex = componentStateIndexStack.pop()
  assert?.(typeof refIndex !== 'undefined')

  const componentId = componentIdStack.pop()
  assert?.(typeof componentId !== 'undefined')
  componentsThatHaveUpdatedAtLeastOnce.add(componentId)
}

const destroyHooks = (componentId: DependeeId) => {
  componentsThatHaveUpdatedAtLeastOnce.delete(componentId)
  componentStates.delete(componentId)

  const componentEffects = effects.get(componentId)
  if (componentEffects) {
    for (const effect of componentEffects) {
      removeDependencies(effect)
      effect.unsubscribe_?.()
    }

    effects.delete(componentId)
  }
}

const runEffect = (effect: Effect) => {
  effect.unsubscribe_?.()
  effect.unsubscribe_ = trackedExecute(effect, effect.fn) as
    | undefined
    | (() => void)
}

const useEffect = (fn: () => void | (() => void)) => {
  const componentId = componentIdStack[componentIdStack.length - 1] as
    | DependeeId
    | undefined

  if (
    componentId !== undefined &&
    componentsThatHaveUpdatedAtLeastOnce.has(componentId)
  ) {
    return
  }

  const effect: Effect = {
    id_: ++nextDependeeId as DependeeId,
    tag_: EffectTag,
    fn,
  }

  runEffect(effect)

  if (!componentId) {
    return
  }

  let componentEffects = effects.get(componentId)
  if (!componentEffects) {
    componentEffects = []
    effects.set(componentId, componentEffects)
  }
  assert?.(componentEffects)
  componentEffects.push(effect)
}

const internalUseState = <T extends object>(
  initialState: T,
  shallow: boolean
): State<T> => {
  const componentId = componentIdStack[componentIdStack.length - 1]
  const componentStateIndex = componentStateIndexStack[
    componentStateIndexStack.length - 1
  ]++

  assert?.(typeof componentId !== 'undefined')

  let states = componentStates.get(componentId)

  if (!states) {
    states = []
    componentStates.set(componentId, states)
  }

  if (states.length > componentStateIndex) {
    return states[componentStateIndex]
  }

  const componentState = internalCreateState(initialState, shallow)

  states.push(componentState)

  return componentState
}

const useState = <T extends object>(initialState: T): State<T> =>
  internalUseState(initialState, false)

const useShallowState = <T extends object>(initialState: T): State<T> =>
  internalUseState(initialState, true)

const useRef = <T>(initialValue?: T): Ref<T> =>
  internalUseState({ current: initialValue }, true)

//
//  Node utilities
//
///////////////

const childToDescriptor = (child: Child): NodeDescriptor<any> => {
  if (child === null || child === undefined || typeof child === 'boolean') {
    return { tag_: TextNodeTag, value_: '' }
  }

  if (typeof child === 'string' || typeof child === 'number') {
    return { tag_: TextNodeTag, value_: child as string }
  }

  if (Array.isArray(child)) {
    return createFragmentDescriptor(EMPTY_OBJECT, child)
  }

  if (typeof child === 'function') {
    return h<any>(child, EMPTY_OBJECT)
  }

  return child
}

const reuseNodeInstance = (
  instance: NodeInstance<DefaultProps>,
  descriptor: NodeDescriptor<DefaultProps>
): boolean => {
  const isSameFunctionComponent =
    instance.tag_ === FunctionComponentTag &&
    descriptor.tag_ === FunctionComponentTag &&
    instance.func === descriptor.func

  const isSameClassComponent =
    instance.tag_ === ClassComponentTag &&
    descriptor.tag_ === ClassComponentTag &&
    instance.instance instanceof descriptor.class_

  if (isSameFunctionComponent || isSameClassComponent) {
    assert?.(
      instance.tag_ === FunctionComponentTag ||
        instance.tag_ === ClassComponentTag
    )
    assert?.(
      descriptor.tag_ === FunctionComponentTag ||
        descriptor.tag_ === ClassComponentTag
    )

    const keys = unionOfKeys(descriptor.props_, instance.props_)
    for (const key of keys) {
      instance.props_[key] =
        descriptor.props_[key as keyof typeof descriptor.props_]
    }
    return true
  }

  if (
    instance.tag_ === HtmlElementTag &&
    descriptor.tag_ === HtmlElementTag &&
    instance.tagName_ === descriptor.tagName_
  ) {
    updateHtmlElementInstance(instance, descriptor.props_, descriptor.children_)
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

  if (typeof descriptor.props_?.key !== 'undefined') {
    return descriptor.props_?.key
  }

  return null
}

//
//  Class components
//
///////////////

const createClassComponentDescriptor = <PropertiesT extends DefaultProps>(
  class_: ClassComponent<PropertiesT>,
  props_: WithIntrinsicProps<PropertiesT>
): ClassComponentDescriptor<PropertiesT> => ({
  tag_: ClassComponentTag,
  class_,
  props_,
})

const createClassComponentInstance = <
  PropertiesT extends DefaultProps,
  StateT extends {} | undefined = undefined
>(
  descriptor: ClassComponentDescriptor<PropertiesT, StateT>,
  context: Context
): ClassComponentInstance<PropertiesT, StateT> => {
  const id = ++nextDependeeId as DependeeId

  startHookTracking(id)
  const classInstance = new descriptor.class_(descriptor.props_)
  stopHookTracking()

  classInstance.render = classInstance.render.bind(classInstance)

  if (typeof classInstance.state !== 'undefined') {
    classInstance.state = internalCreateState(classInstance.state, false) as any
  }
  const instance: ClassComponentInstance<PropertiesT, StateT> = {
    id_: id,
    tag_: ClassComponentTag,
    context_: context,
    instance: classInstance,
    props_: internalCreateState(descriptor.props_, true),
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

const createFunctionComponentDescriptor = <PropertiesT extends DefaultProps>(
  func: FunctionComponent<PropertiesT>,
  props_: WithIntrinsicProps<PropertiesT>
): FunctionComponentDescriptor<PropertiesT> => ({
  tag_: FunctionComponentTag,
  func,
  props_,
})

const createFunctionComponentInstance = <PropertiesT extends DefaultProps>(
  descriptor: FunctionComponentDescriptor<PropertiesT>,
  context: Context
): FunctionComponentInstance<PropertiesT> => {
  const instance: FunctionComponentInstance<PropertiesT> = {
    id_: ++nextDependeeId as DependeeId,
    tag_: FunctionComponentTag,
    context_: context,
    func: descriptor.func,
    props_: internalCreateState(descriptor.props_, true),
    parentElement_: null,
    nextSibling_: null,
    child: null,
  }

  updateComponentInstance(instance)

  return instance
}

const updateComponentInstance = <
  PropertiesT extends DefaultProps,
  StateT extends {} | undefined = undefined
>(
  instance:
    | FunctionComponentInstance<PropertiesT>
    | ClassComponentInstance<PropertiesT, StateT>,
  props: WithIntrinsicProps<PropertiesT> = instance.props_
) => {
  let childDescriptor
  if (instance.tag_ === FunctionComponentTag) {
    startHookTracking(instance.id_)
    childDescriptor = trackedExecute(instance, instance.func, instance.props_)
    stopHookTracking()
  } else {
    instance.instance.props = props
    childDescriptor = trackedExecute(instance, instance.instance.render, props)
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
  } else {
    const wasReused = reuseNodeInstance(instance.child, childDescriptor)

    if (!wasReused) {
      unmountNodeInstance(instance.child)
      const newChild = createNodeInstance(childDescriptor, instance.context_)
      instance.child = newChild
    }
  }

  if (instance.parentElement_) {
    mountNodeInstance(instance, instance.parentElement_, instance.nextSibling_)
  }
}

//
//  Fragments
//
///////////////

const Fragment = __DEBUG__
  ? () => assert(false, 'Fragment should not be called explicitly')
  : () => {}

const createFragmentDescriptor = (
  props_: FragmentProperties,
  children: Child[]
): FragmentDescriptor => {
  return {
    tag_: FragmentTag,
    children_: children,
    props_,
  }
}

const createFragmentInstance = (
  descriptor: FragmentDescriptor,
  context_: Context
): FragmentInstance => {
  const instance: FragmentInstance = {
    tag_: FragmentTag,
    props_: descriptor.props_,
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
  const childDescriptors = children.map(childToDescriptor)

  // NOTE: The fragment children are stored in reverse order to make
  // DOM operations on them easier.

  instance.children_ = []
  const nextkeys = new Set<string | number>()

  for (let i = childDescriptors.length - 1; i >= 0; i--) {
    const descriptor = childDescriptors[i]
    const descriptorKey = getKeyOfNodeDescriptor(descriptor)
    const key = descriptorKey === null ? i : descriptorKey

    if (__DEBUG__) {
      if (nextkeys.has(key)) {
        throw new Error(
          'Duplicate key detected! Make sure no two sibling elements have the same key.'
        )
      }
    }

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

const updateElementProperty = (
  element: HTMLElement | SVGElement,
  property: string,
  value: any
) => {
  switch (property) {
    case 'value': {
      ;(element as HTMLInputElement).value = value
      break
    }
    case 'checked': {
      if (Boolean(value)) {
        element.setAttribute(property, value)
      } else {
        element.removeAttribute(property)
      }
      ;(element as HTMLInputElement).checked = Boolean(value)
      break
    }
    case 'class':
    case 'className': {
      ;(element as HTMLElement).className = stringifyClassNames(value ?? '')
      break
    }
    case 'html': {
      ;(element as HTMLElement).innerHTML = value
      break
    }
    default: {
      if (!Boolean(value) && value !== 0) {
        element.removeAttribute(property)
      } else {
        element.setAttribute(property, value)
      }
      break
    }
  }
}

const updateElementStyle = (
  element: HTMLElement | SVGElement,
  property: string,
  value: any
) => {
  element.style[property as any] = value
}

const registerLazyPropUpdate = <T>(
  instance: HtmlElementInstance,
  property: string,
  callback: () => T
) => {
  if (!instance.lazyPropUpdates) {
    instance.lazyPropUpdates = new Map()
  }

  let propUpdate: LazyPropUpdate<T> | undefined =
    instance.lazyPropUpdates.get(property)

  if (propUpdate) {
    propUpdate.callback = callback
  } else {
    propUpdate = {
      id_: ++nextDependeeId as DependeeId,
      tag_: LazyPropUpdateTag,
      element_: instance.element_,
      property,
      callback,
      previousValue: undefined,
    }
    instance.lazyPropUpdates.set(property, propUpdate)
  }

  runLazyPropUpdate(propUpdate)
}

const runLazyPropUpdate = <T>(propUpdate: LazyPropUpdate<T>) => {
  const value = trackedExecute(propUpdate, propUpdate.callback)

  if (value !== propUpdate.previousValue) {
    propUpdate.previousValue = value
    updateElementProperty(propUpdate.element_, propUpdate.property, value)
  }
}

const registerLazyStyleUpdate = <T>(
  instance: HtmlElementInstance,
  property: string,
  callback: () => T
) => {
  if (!instance.lazyStyleUpdates) {
    instance.lazyStyleUpdates = new Map()
  }

  let styleUpdate: LazyStyleUpdate<T> | undefined =
    instance.lazyStyleUpdates.get(property)

  if (styleUpdate) {
    styleUpdate.callback = callback
  } else {
    styleUpdate = {
      id_: ++nextDependeeId as DependeeId,
      tag_: LazyStyleUpdateTag,
      element_: instance.element_ as HTMLElement,
      property,
      callback,
      previousValue: undefined,
    }

    instance.lazyStyleUpdates.set(property, styleUpdate)
  }

  runLazyStyleUpdate(styleUpdate)
}

const runLazyStyleUpdate = <T>(styleUpdate: LazyStyleUpdate<T>) => {
  const value = trackedExecute(styleUpdate, styleUpdate.callback)

  if (value !== styleUpdate.previousValue) {
    styleUpdate.previousValue = value
    updateElementStyle(styleUpdate.element_, styleUpdate.property, value)
  }
}

const destroyLazyUpdates = (instance: HtmlElementInstance) => {
  if (instance.lazyPropUpdates) {
    for (const [, propUpdate] of instance.lazyPropUpdates) {
      removeDependencies(propUpdate)
    }
    instance.lazyPropUpdates = null
  }
  if (instance.lazyStyleUpdates) {
    for (const [, styleUpdate] of instance.lazyStyleUpdates) {
      removeDependencies(styleUpdate)
    }
    instance.lazyStyleUpdates = null
  }
}

//
//  Html elements
//
///////////////

const stringifyClassNames = (names: ClassNames): string => {
  if (names === null || typeof names === 'undefined') {
    return ''
  }

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
  props_: HtmlElementProperties,
  children_: Child[]
): HtmlElementDescriptor => ({
  tag_: HtmlElementTag,
  tagName_,
  props_,
  children_,
})

const createHtmlElementInstance = (
  descriptor: HtmlElementDescriptor,
  context_: Context
): HtmlElementInstance => {
  const useSvgNs = descriptor.tagName_ === 'svg' || context_.svgNs

  if (context_.svgNs !== useSvgNs) {
    context_ = { svgNs: useSvgNs }
  }

  const element_ = useSvgNs
    ? document.createElementNS(SVG_NAMESPACE_URI, descriptor.tagName_)
    : document.createElement(descriptor.tagName_)

  const instance: HtmlElementInstance = {
    tag_: HtmlElementTag,
    tagName_: descriptor.tagName_,
    context_,
    element_,
    parentElement_: null,
    nextSibling_: null,
    props_: EMPTY_OBJECT,
    children_: null,
    lazyPropUpdates: null,
    lazyStyleUpdates: null,
    eventHandlers: {},
    eventListener: null,
  }

  updateHtmlElementInstance(instance, descriptor.props_, descriptor.children_)

  return instance
}

const updateHtmlElementInstance = (
  instance: HtmlElementInstance,
  nextProps: HtmlElementProperties,
  children: Child[]
) => {
  const keys = unionOfKeys(nextProps, instance.props_)

  // Handle the style prop
  const properties = unionOfKeys(
    nextProps.style ||
      (EMPTY_OBJECT as Exclude<HtmlElementProperties['style'], undefined>),
    instance.props_.style ||
      (EMPTY_OBJECT as Exclude<HtmlElementProperties['style'], undefined>)
  )

  for (const property of properties) {
    const prevValue = instance.props_.style?.[property]
    const value = nextProps.style?.[property]

    if (prevValue !== value) {
      if (typeof value === 'function') {
        registerLazyStyleUpdate(instance, property, value)
      } else {
        updateElementStyle(instance.element_, property, value)
      }
    }
  }

  // Handle properties other than `style`
  for (const key of keys) {
    if (key === 'style') continue
    if (key === 'key') continue
    if (instance.props_[key] === nextProps[key]) continue

    if (key === 'ref') {
      if (key in nextProps) {
        nextProps[key]!.current = instance.element_
      } else {
        instance.props_[key]!.current = undefined
      }
      continue
    }

    // Probably faster than calling startsWith...
    const isListener = key[0] === 'o' && key[1] === 'n'

    if (isListener) {
      const eventName = key.substring(2).toLowerCase()

      if (!instance.eventListener) {
        instance.eventHandlers = {}
        instance.eventListener = (evt: Event) => {
          const handlers = instance.eventHandlers
          assert?.(
            handlers,
            'instance.eventHandlers record not initialized before event call'
          )

          const handler = handlers[evt.type]
          assert?.(
            handler,
            `handler for event type '${evt.type}' not present in instance.eventHandlers`
          )

          return handler(evt)
        }
      }

      assert?.(instance.eventHandlers)
      assert?.(instance.eventListener)

      if (typeof nextProps[key] === 'function') {
        // Event handler is in next props
        if (!(eventName in instance.eventHandlers)) {
          instance.element_.addEventListener(eventName, instance.eventListener)
        }
        instance.eventHandlers[eventName] = nextProps[key]
      } else {
        // Event handler is NOT in next props
        instance.element_.removeEventListener(eventName, instance.eventListener)
        delete instance.eventHandlers[eventName]
      }
    } else {
      if (typeof nextProps[key] === 'function') {
        registerLazyPropUpdate(instance, key, nextProps[key])
      } else {
        updateElementProperty(instance.element_, key, nextProps[key])
      }
    }
  }

  instance.props_ = nextProps

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
  context: Context
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

const mountNodeInstance = <
  PropertiesT extends DefaultProps,
  StateT extends {} | undefined = undefined
>(
  instance: NodeInstance<PropertiesT, StateT>,
  parentElement: HtmlElementInstance,
  nextSibling: NodeInstance<any> | null
) => {
  assert?.(instance)
  assert?.(parentElement)

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
      instance.nextSibling_ = nextSibling

      for (const child of instance.children_) {
        mountNodeInstance(child, parentElement, nextSibling)
        nextSibling = child
      }
    }
  }
}

const unmountNodeInstance = (instance: NodeInstance<DefaultProps>) => {
  switch (instance.tag_) {
    case ClassComponentTag:
    case FunctionComponentTag: {
      destroyHooks(instance.id_)
      removeDependencies(instance)
      if (instance.tag_ === ClassComponentTag) {
        instance.instance.componentWillUnmount()
      }
      if (instance.child) {
        unmountNodeInstance(instance.child)
      }
      break
    }

    case HtmlElementTag: {
      if (typeof instance.props_.ref !== 'undefined') {
        instance.props_.ref.current = undefined
      }

      destroyLazyUpdates(instance)
      assert?.(instance.parentElement_)
      instance.parentElement_.element_.removeChild(instance.element_)
      if (instance.children_) {
        instance.children_.children_.forEach(unmountNodeInstance)
      }
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
    return createClassComponentDescriptor(type, {
      ...(props || EMPTY_OBJECT),
      children: children.length === 0 ? undefined : children,
    })
  }

  if (type === Fragment) {
    return createFragmentDescriptor(props || EMPTY_OBJECT, children)
  }

  return createFunctionComponentDescriptor(type, {
    ...(props || EMPTY_OBJECT),
    children: children.length === 0 ? undefined : children,
  })
}

function jsx(
  type: HtmlElementTagName,
  props: HtmlElementProperties,
  key?: string
): HtmlElementDescriptor
function jsx<PropertiesT extends DefaultProps>(
  type: FunctionComponent<PropertiesT>,
  props: PropertiesT | null,
  key?: string
): FunctionComponentDescriptor<PropertiesT>
function jsx<PropertiesT extends DefaultProps>(
  type: ClassComponent<PropertiesT>,
  props: PropertiesT | null,
  key?: string
): ClassComponentDescriptor<PropertiesT>
function jsx(
  type: typeof Fragment,
  props: null | { key?: string | number },
  key?: string
): FragmentDescriptor
function jsx(
  type: any,
  props: DefaultProps | HtmlElementProperties | null,
  key?: string
): NodeDescriptor<any> {
  let children = props?.children
  children =
    children !== undefined
      ? Array.isArray(children)
        ? children
        : [children]
      : undefined
  const propsCopy: Record<string, any> = {
    ...props,
    children,
    key,
  }

  if (typeof type === 'string') {
    delete propsCopy.children
    return createHtmlElementDescriptor(
      type as HtmlElementTagName,
      propsCopy,
      children ?? []
    )
  }

  if (type[CLASS_COMPONENT_FLAG] as boolean) {
    return createClassComponentDescriptor(type, propsCopy)
  }

  if (type === Fragment) {
    delete propsCopy.children
    return createFragmentDescriptor(propsCopy, children ?? [])
  }

  return createFunctionComponentDescriptor(type, propsCopy)
}

const render: Render = <PropertiesT extends DefaultProps>(
  descriptor: NodeDescriptor<PropertiesT>,
  element: HTMLElement | SVGElement
) => {
  const svgNs = element.namespaceURI === SVG_NAMESPACE_URI

  const rootElementInstance: HtmlElementInstance = {
    tag_: HtmlElementTag,
    tagName_: element.tagName as HtmlElementTagName,
    element_: element,
    children_: null,
    context_: { svgNs },
    parentElement_: null,
    nextSibling_: null,
    props_: EMPTY_OBJECT,
    lazyPropUpdates: null,
    lazyStyleUpdates: null,
    eventHandlers: null,
    eventListener: null,
  }

  const rootComponentInstance = createNodeInstance(descriptor, {
    svgNs,
  })

  mountNodeInstance(rootComponentInstance, rootElementInstance, null)
}

export {
  Component,
  Fragment,
  h,
  jsx,
  render,
  useState,
  useShallowState,
  useRef,
  useEffect,
  createState,
  createShallowState,
  immutable,
  unwrap,
}
