import * as minified from './kaiku.min.js'
import * as dev from './kaiku.dev.js'

let Component
let Fragment
let h
let jsx
let render
let useState
let useShallowState
let useRef
let useEffect
let createState
let createShallowState
let immutable
let unwrap

if (process.env.NODE_ENV === 'production') {
  Component = minified.Component
  Fragment = minified.Fragment
  h = minified.h
  jsx = minified.jsx
  render = minified.render
  useState = minified.useState
  useShallowState = minified.useShallowState
  useRef = minified.useRef
  useEffect = minified.useEffect
  createState = minified.createState
  createShallowState = minified.createShallowState
  immutable = minified.immutable
  unwrap = minified.unwrap
} else {
  Component = dev.Component
  Fragment = dev.Fragment
  h = dev.h
  jsx = dev.jsx
  render = dev.render
  useState = dev.useState
  useShallowState = dev.useShallowState
  useRef = dev.useRef
  useEffect = dev.useEffect
  createState = dev.createState
  createShallowState = dev.createShallowState
  immutable = dev.immutable
  unwrap = dev.unwrap
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
