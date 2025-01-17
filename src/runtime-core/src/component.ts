import { proxyRefs, shallowReadonly } from "../../reactivity";
import { VNode } from "./vnode";
import { publicInstanceProxyHandler } from "./componentPublicInstance";
import { isFun, isObj } from "../../shared";
import { initProps } from "./componentProps";
import { initSlots } from "./componentSlots";
import { emit } from "./componentEmit";
import { initProvides } from "./apiInject";

export type Data = Record<string, unknown>;

export function createComponentInstance(vnode: VNode, parent) {
  const component = {
    vnode,
    type: vnode.type,
    setupResult: {},
    props: {},
    slots: {},
    provides: initProvides(parent),
    parent,
    emit: () => {},
    isMounted: false,
    subTree: null,
  };

  // 这里使用 bind 是因为
  // 用户在使用 emit 时
  // 只需要传入 事件名称
  // 但是我们需要获取组件实例 就使用 bind 通过第二个参数传入
  component.emit = emit.bind(null, component);

  return component;
}

export function setupComponent(instance) {
  // 处理 props
  console.log("开始处理 props");
  initProps(instance, instance.vnode.props);

  // 处理 slots
  console.log("开始处理 slots");
  initSlots(instance, instance.vnode.children);

  // 初始化 有状态的 component
  setupStatefulComponent(instance);
}

function setupStatefulComponent(instance) {
  const Component = instance.type;

  // ctx
  // 通过做代理
  // 在实例上增加 proxy
  // 在 render 的时候 call proxy 就可以实现在 render function 中访问 this.xxx
  // NOTE
  // 在这里只是做 添加操作
  // 真正执行 get 的时候 setupResult 已经拿到了
  instance.proxy = createContext(instance);

  // 拿到 setup option
  // 并且执行 setup
  const { setup } = Component;
  if (setup) {
    // NOTE :
    // 在这里给 currentInstance 赋值
    // 可以保证 每次初始化组件的时候 在调用 setup 里面 能获取到组件实例
    setCurrentInstance(instance);
    // 开始执行 setup
    // 传入 props 和  context
    console.log("**********************************");
    console.log("开始执行 setup");
    console.log("**********************************");
    const setupResult = setup(shallowReadonly(instance.props), {
      emit: instance.emit,
    });
    console.log("setup的返回值为 : ", setupResult);
    // reset currentInstance
    // 这样就能保证 只在 setup 里能拿到当前组件实例了
    setCurrentInstance(null);

    // 处理 setup function 的返回值
    handleSetupResult(instance, setupResult);
  }
}

function createContext(instance) {
  return new Proxy({ _: instance }, publicInstanceProxyHandler);
}

function handleSetupResult(instance, setupResult) {
  // TODO :
  // setup result is render function
  if (isFun(setupResult)) {
  }
  // setup function 如果返回的是对象
  // 当做 state 处理
  else if (isObj(setupResult)) {
    // 把执行结果添加到 instance 中
    instance.setupResult = proxyRefs(setupResult);
    console.log(instance.setupResult, "setupResult");
  }
  // 开始执行 安装结束阶段的处理
  finishComponentSetup(instance);
}

function finishComponentSetup(instance) {
  const Component = instance.type;
  // 给实例添加 render 方法
  // FIXME
  // 目前轮子使用方法为 :
  // 必须要用户传入 render function
  instance.render = Component.render;
}

// API : getCurrentInstance

let currentInstance = null;
export function getCurrentInstance() {
  return currentInstance;
}

function setCurrentInstance(instance) {
  currentInstance = instance;
}
