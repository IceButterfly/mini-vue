import { isFun, extend } from '../../shared'

type EffectOption = { scheduler?: () => void; onStop?: () => void }
// 依赖工厂
class ReactiveEffect {
  public _fn
  public _scheduler
  public _onStop
  deps: any[] = []
  // 标记用户是否多次调用 stop
  active: boolean = true

  constructor(fn: () => void, option: EffectOption = {}) {
    const { scheduler, onStop } = option
    this._fn = isFun(fn) ? fn : () => {}
    this._scheduler = isFun(scheduler) ? scheduler : null
    this._onStop = isFun(onStop) ? onStop : null
  }
  run() {
    // 将当前依赖保存到全局 用于收集
    activeEffect = this

    // 执行依赖
    // 执行的过程中 会触发数据劫持
    // 从而触发 trigger 来收集刚赋值的 activeEffect
    return this._fn()
  }
  stop() {
    // 只清空一次 防止重复删除 浪费性能
    if (this.active) {
      // 删除掉 depsMap 里所有的 dep
      cleanupEffect(this)
      if (this._onStop) this._onStop()
      this.active = false
    }
  }
}

function cleanupEffect(effect: any) {
  effect.deps.forEach((dep: Set<any>) => {
    // 因为 dep 是 Set 结构
    dep.delete(effect)
  })
}

// 当前执行的 effect fn
let activeEffect: ReactiveEffect

// 全局的依赖收集对象
const targetMap = new Map()

// 收集依赖
export function track<T>(target: T, key: string) {
  // 数据结构为
  // targetMap -> depsMap -> dep
  // 全局的 targetMap 最外层的大管家
  // 里面包含 depsMap 用于存储依赖集合
  // deps 为所有的依赖的集合
  let depsMap = targetMap.get(target)
  // 初始化的时候没有 depsMap
  // 创建 depsMap
  if (!depsMap) {
    depsMap = new Map()
    // 追加到全局的 依赖收集对象中
    targetMap.set(target, depsMap)
  }
  let dep = depsMap.get(key)
  // 初始化时没有 deps
  if (!dep) {
    // 声明一个空集合
    dep = new Set()
    // 追加到 depsMap 中
    depsMap.set(key, dep)
  }
  // 依赖收集
  dep.add(activeEffect)
  // note
  // 想要实现 stop 功能
  // 需要将 dep 反向收集到 activeEffect 中
  // 在执行 stop 时 只需要将 deps 中的所有 dep 清空即可
  // 如果没有调用 effect 就不会有 activeEffect
  if (!activeEffect) return
  activeEffect.deps.push(dep)
}

// 触发依赖
export function trigger<T>(target: T, key: string) {
  // 在全局依赖中取出 depsMap
  const depsMap = targetMap.get(target)
  // 拿到依赖的集合
  const dep = depsMap.get(key)
  // 遍历集合 执行依赖
  for (const effect of dep) {
    if (effect._scheduler) {
      effect._scheduler()
    } else {
      effect.run()
    }
  }
}

export function effect(fn: () => void, options?: EffectOption) {
  // 创建 effect 对象
  const _effect = new ReactiveEffect(fn, options)
  // 执行传入的 fn
  _effect.run()
  // 声明 runner
  const runner: any = _effect.run.bind(_effect)
  // 拓展 runner
  extend(runner, {
    effect: _effect,
  })
  return runner
}

// 如果想取消通知 只需要删除 depsMap 中所有的 dep
export function stop(runner: any) {
  runner.effect.stop()
}
