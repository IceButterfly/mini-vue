import { mutableHandler, readonlyHandler } from './baseHandlers'

export enum REACTIVE_FLAGS {
  IS_REACTIVE = '__J_REACTIVE',
  IS_READONLY = '__J_READONLY',
}

export function reactive<T extends Object>(raw: T) {
  return createActiveObject(raw, mutableHandler)
}

// readonly 只有 get
export function readonly<T extends Object>(raw: T) {
  return createActiveObject<T>(raw, readonlyHandler)
}

function createActiveObject<T extends Object>(raw: T, baseHandlers: any) {
  return new Proxy(raw, baseHandlers)
}

// isReactive 和 isReadOnly
// 思路为 : 触发 getter 根据 handler 中的 isReadOnly 判断
export function isReactive(value: any) {
  return !!value[REACTIVE_FLAGS.IS_REACTIVE]
}

export function isReadOnly(value: any) {
  return !!value[REACTIVE_FLAGS.IS_READONLY]
}
