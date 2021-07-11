declare const ADD_STATE_DEPENDENCY: unique symbol;
declare const REMOVE_STATE_DEPENDENCY: unique symbol;
declare const START_DEPENDENCY_TRACKING: unique symbol;
declare const STOP_DEPENDENCY_TRACKING: unique symbol;
declare type State<T> = T & {
    [START_DEPENDENCY_TRACKING]: () => void;
    [STOP_DEPENDENCY_TRACKING]: () => Set<string>;
    [ADD_STATE_DEPENDENCY]: (key: string, callback: Function) => void;
    [REMOVE_STATE_DEPENDENCY]: (key: string, callback: Function) => void;
};
declare type Child = ElementDescriptor | string | number | boolean | null | undefined;
declare type Children = Child[];
declare type ComponentFunction<PropsT extends Object> = (props: PropsT) => ElementDescriptor;
declare type ClassNames = string | {
    [key: string]: boolean;
} | ClassNames[];
declare type HtmlTagProps = Partial<{
    id: string | number;
    className: string;
    classNames: ClassNames;
    onClick: Function;
    onInput: Function;
    checked: boolean;
    value: string;
}>;
declare const enum ElementDescriptorType {
    HtmlTag = 0,
    Component = 1
}
declare type ElementDescriptor<PropsT = {}> = HtmlTagDescriptor | ComponentDescriptor<PropsT>;
declare type HtmlTagDescriptor = {
    type: ElementDescriptorType.HtmlTag;
    tag: string;
    props: HtmlTagProps;
    children: Children;
};
declare type ComponentDescriptor<PropsT extends Object = {}> = {
    type: ElementDescriptorType.Component;
    component: ComponentFunction<PropsT>;
    props: PropsT;
    children: Children;
};
declare function createState<StateT extends Object>(initialState: StateT): State<StateT>;
declare function h(tag: string, props: HtmlTagProps | null, ...children: Children): HtmlTagDescriptor;
declare function h<PropsT>(component: ComponentFunction<PropsT>, props: PropsT | null, ...children: Children): ComponentDescriptor<PropsT>;
declare function render<PropsT, StateT>(rootDescriptor: ElementDescriptor<PropsT>, state: State<StateT>, element: HTMLElement): void;
export { h, render, createState };
