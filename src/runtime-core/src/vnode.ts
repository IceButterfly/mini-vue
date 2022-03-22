import { Ref } from '../../reactivity'
import { RendererNode, RendererElement } from './renderer'
import { Data } from './component'
import { ShapeFlags, isStr, isArr } from '../../shared'

export type VNodeTypes = string | VNode | typeof Text | typeof Comment

export type VNodeRef =
  | string
  | Ref
  | ((ref: object | null, refs: Record<string, any>) => void)

export type VNodeProps = {
  key?: string | number
  ref?: VNodeRef
}

type VNodeChildAtom =
  | VNode
  | string
  | number
  | boolean
  | null
  | undefined
  | void

export type VNodeNormalizedChildren = string | VNodeArrayChildren | null

export type VNodeArrayChildren = Array<VNodeArrayChildren | VNodeChildAtom>

export type VNode<
  HostNode = RendererNode,
  HostElement = RendererElement,
  ExtraProps = { [key: string]: any }
> = {
  type: any // VNodeTypes
  props: (VNodeProps & ExtraProps) | null
  children: VNodeNormalizedChildren
  el: any
  shapeFlag: ShapeFlags
}

export function createVNode(
  // type: VNodeTypes,
  // props: (Data & VNodeProps) | null = null,
  // children: VNodeNormalizedChildren
  type: VNodeTypes,
  props: (Data & VNodeProps) | null = null,
  children?: any
): VNode {
  const vnode: VNode = {
    type,
    props,
    children,
    el: null,
    shapeFlag: getShapeFlag(type),
  }

  if (isStr(children)) {
    vnode.shapeFlag = vnode.shapeFlag | ShapeFlags.TEXT_CHILDREN
  }
  // other
  else if (isArr(children)) {
    vnode.shapeFlag = vnode.shapeFlag | ShapeFlags.ARRAY_CHILDREN
  }

  return vnode
}

export function isVNode(value: any): value is VNode {
  return value ? value.__v_isVNode === true : false
}

function getShapeFlag(type: VNodeTypes) {
  return isStr(type) ? ShapeFlags.ELEMENT : ShapeFlags.STATEFUL_COMPONENT
}
