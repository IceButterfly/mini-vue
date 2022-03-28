import { createComponentInstance, setupComponent } from "./component";
import { isArr, isOn, ShapeFlags } from "../../shared";
import { VNode, Fragment, Text } from "./vnode";
import { createAppApi } from "./createApp";
import { effect } from "../../reactivity";

export interface RendererNode {
  [key: string]: any;
}

export interface RendererElement extends RendererNode {}

// 创建渲染者
// option 为 平台相关渲染器的方法
export function createRenderer(options) {
  console.log("渲染器传入的渲染器渲染方法为 : ", options);
  // 解构出来渲染方法
  const { patchProp, insert } = options;
  function render(initialVNode: VNode, container: RendererElement) {
    console.log("**********************************");
    console.log("----- runtime-core 内部 render 开始执行 -----");
    console.log("**********************************");
    console.log("initialVNode : ", initialVNode);

    // 调用 patch
    patch(null, initialVNode, container, null);
  }

  // NOTE
  // 核心方法
  // n1 : oldVNode
  // n2 : newVNode
  // container : 渲染的容器
  // parentComponent : 父组件
  function patch(
    n1: VNode | null,
    n2: VNode,
    container: RendererElement,
    parentComponent
  ) {
    console.log("**********************************");
    console.log("----- 开始 patch -----");
    console.log("**********************************");

    const { shapeFlag, type } = n2;
    switch (type) {
      case Fragment:
        console.log("当前 vnode 类型为 Fragment : ", n2, type);
        processFragment(n1, n2, container, parentComponent);
        break;
      case Text:
        console.log("当前 vnode 类型为 Text : ", n2, type);
        processText(n1, n2, container);
        break;
      default:
        // 判断节点类型
        if (shapeFlag & ShapeFlags.ELEMENT) {
          console.log("当前 shapeFlag 类型为 ELEMENT : ", n2, shapeFlag);
          // type === 'div' | 'p' | ...
          processElement(n1, n2, container, parentComponent);
        }
        // 如果是根组件
        else if (shapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
          console.log(
            "当前 shapeFlag 类型为 STATEFUL_COMPONENT : ",
            n2,
            shapeFlag
          );
          processComponent(n1, n2, container, parentComponent);
        }
    }
  }

  // --------------------------------------------------------------------------
  // 处理 element
  function processElement(
    n1: VNode | null,
    n2: VNode,
    container: RendererElement,
    parentComponent
  ) {
    if (!n1) {
      mountElement(n2, container, parentComponent);
    } else {
      patchElement(n1, n2, container, parentComponent);
    }
  }

  // 挂载 element
  function mountElement(
    vnode: VNode,
    container: RendererElement,
    parentComponent
  ) {
    // 一个 element 核心的三要素
    // 1 : element type       => div | p | ...
    // 2 : element attributes => class | id | ...
    // 3 : element children   => string | array
    // NOTE
    // 1 和 2 都可以根据 vnode 的 type 和 props 生成
    // 如果
    // 3 是一个字符串 => 说明子节点是个字符串
    //   example :
    //      <p>this is string child</p>
    // 3 是一个数组   => 说明子节点是多个
    //   example :
    //      <p>
    //        <child1 />
    //        <child2 />
    //      </p>
    //   这种情况需要遍历去 patch 子节点

    const { type, props, children, shapeFlag } = vnode;
    // 生成元素
    const el = (vnode.el = document.createElement(type));
    console.log("创建的元素类型是 : ", type);

    // 处理 props
    for (const prop in props) {
      const propValue = props[prop];
      patchProp(el, prop, propValue);
    }
    console.log("处理 props 后的元素为 : ", el);

    // 处理子节点
    if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
      console.log("当前子节点是一个数组", children, shapeFlag);
      mountChild(children, el, parentComponent);
    } else if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
      console.log("当前子节点是一个文本 内容是 : ", children, shapeFlag);
      el.textContent = children;
    }

    // 挂载
    console.log("插入到父级节点 :", container);
    insert(el, container);
  }

  // 挂载子节点
  function mountChild(
    vnode: VNode,
    container: RendererElement,
    parentComponent
  ) {
    vnode.forEach((child: VNode) =>
      patch(null, child, container, parentComponent)
    );
  }

  // 处理更新元素
  function patchElement(
    n1: VNode,
    n2: VNode,
    container: RendererElement,
    parentComponent
  ) {
    //
    console.log("更新元素: ");
    console.log("old : ", n1);
    console.log("new : ", n2);
  }

  // --------------------------------------------------------------------------
  // 处理组件
  function processComponent(
    n1: VNode | null,
    n2: VNode,
    container: RendererElement,
    parentComponent
  ) {
    console.log("开始处理根组件", n2);
    mountComponent(n2, container, parentComponent);
    console.log("处理组件结束", n2);
  }

  // 挂载组件
  function mountComponent(
    vnode: VNode,
    container: RendererElement,
    parentComponent
  ) {
    // 1 : 创建组件实例
    const instance = createComponentInstance(vnode, parentComponent);
    console.log("1 : 当前组件实例为 : ", instance);
    // 2 : 安装组件
    setupComponent(instance);
    console.log("2 : 安装完成组件实例为 : ", instance);
    // 3 : 开始 patch
    setupRenderEffect(instance, vnode, container);
  }

  // 组件处理的核心方法
  function setupRenderEffect(
    instance: any,
    initialVNode: VNode,
    container: RendererElement
  ) {
    effect(() => {
      const { proxy } = instance;
      if (!instance.isMounted) {
        // 初始化
        // 开始执行 render function 生成根节点下的 虚拟节点树
        // NOTE
        // 这里通过 call 改变 render 函数中的 this 指向
        // 详情看
        // component.ts -> setupStatefulComponent -> instance.proxy = createContext(instance)
        console.log("开始调用 render :");
        const subTree = (instance.subTree = instance.render.call(proxy));
        console.log("调用组件实例的 render function 生成 vnode 树 :", subTree);
        // 转换 vnode -> 真实DOM
        patch(null, subTree, container, instance);
        // 在 patch 完所有的 subTree 后 给当前节点增加 el
        initialVNode.el = subTree.el;
        instance.isMounted = true;
      } else {
        // 更新
        const prevSubTree = instance.subTree;
        const subTree = (instance.subTree = instance.render.call(proxy));
        console.log("**********************************");
        console.log("开始更新");
        console.log("**********************************");
        patch(prevSubTree, subTree, container, instance);
      }
    });
  }

  // 处理 Fragment 类型的 VNode
  // NOTE
  // 思路 :
  // 直接把对应的 vnode 挂载到 container 内
  function processFragment(
    n1: VNode | null,
    n2: VNode,
    container: RendererElement,
    parentComponent
  ) {
    mountChild(isArr(n2) ? n2 : n2.children, container, parentComponent);
  }

  // 处理 Text 类型的 VNode
  // 这种类型是因为 生成 render 的时候 直接写了 string
  // NOTE
  // 思路 :
  // 拿到 children ( 用户写入的字符串 )
  // 创建节点 直接插入对应 container 内
  function processText(
    n1: VNode | null,
    n2: VNode,
    container: RendererElement
  ) {
    const { children } = n2;
    const textNode = (n2.el = document.createTextNode(children as string));
    container.append(textNode);
  }

  // 返回 createAppApi
  // 提供给用户调用
  return {
    createApp: createAppApi(render),
  };
}
