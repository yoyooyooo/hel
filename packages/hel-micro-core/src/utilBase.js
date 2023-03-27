/*
|--------------------------------------------------------------------------
|
| 下沉一下基础函数，避免循环引用
| util <---> microDebug
| 改进后依赖形如
| util ---> microDebug ---> utilBase
|
|--------------------------------------------------------------------------
*/

let globalThisRef = null;

function assignRef() {
  try {
    // for browser env
    if (typeof window !== 'undefined') {
      globalThisRef = window;
      return;
    }
    // eslint-disable-next-line
    const workerSelf = self;
    // for worker env
    if (typeof workerSelf !== 'undefined') {
      globalThisRef = workerSelf;
    } else if (typeof global !== 'undefined') {
      // for nodejs env
      globalThisRef = global;
    }
    if (!globalThisRef) {
      throw new Error('opps');
    }
  } catch (err) {
    // below error occurred in jest node env node
    // ReferenceError: self is not defined
    if (!global) {
      throw new Error('unable to locate global object');
    }
    globalThisRef = global;
  }
}

/**
 *
 * @returns {typeof globalThis}
 */
export function getGlobalThis() {
  if (!globalThisRef) {
    return assignRef();
  }
  return globalThisRef;
}

export function setGlobalThis(specGlobalThis, merge = false) {
  let prevShared = null;
  if (globalThisRef?.__HEL_MICRO_SHARED__) {
    prevShared = globalThisRef.__HEL_MICRO_SHARED__;
  }
  if (merge) {
    globalThisRef = { ...globalThisRef, ...specGlobalThis }
  } else {
    globalThisRef = specGlobalThis;
  }
  // 避免 resetGlobalThis 被用户调用后，共享数据丢失
  if (prevShared) {
    globalThisRef.__HEL_MICRO_SHARED__ = prevShared;
  }
}

/**
 * 获取 hel 全局单例对象挂载的宿主，现阶段是 window self global
 * 针对浏览器环境后期可能会调整宿主节点
 */
export function getHelSingletonHost() {
  return getGlobalThis();
}
