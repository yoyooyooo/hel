/** @typedef {typeof import('./consts').HEL_LOAD_STATUS} HelLoadStatusType */
/** @typedef {HelLoadStatusType[keyof HelLoadStatusType]} HelLoadStatusEnum */
import { helConsts } from './consts';
import { getGlobalThis } from './globalRef';
import { inner } from './microDebug';

const { DEFAULT_API_URL, PLAT_HEL, PLAT_UNPKG, DEFAULT_API_PREFIX, CORE_VER } = helConsts;
ensureHelMicroShared();

function makeOriginOptions(presetOptions?: any) {
  const { apiPrefix } = presetOptions || {};
  return {
    apiMode: 'get',
    apiPrefix,
    apiSuffix: '',
    apiPathOfApp: DEFAULT_API_URL,
    apiPathOfAppVersion: '',
    getSubAppAndItsVersionFn: null,
    onFetchMetaFailed: null,
    strictMatchVer: true,
    getUserName: null,
    userLsKey: '',
    shouldUseGray: null,
    trustAppNames: null,
    semverApi: null,
    hook: {},
  };
}

export function makeCacheNode(platform) {
  /** @type {import('../index').SharedCache} */
  const cacheNode = {
    isConfigOverwrite: false,
    platform,
    appName2Comp: {},
    appName2Lib: {},
    appName2isLibAssigned: {},
    appName2EmitApp: {},
    appName2verLoadStatus: {},
    appName2verEmitLib: {},
    appName2verEmitApp: {},
    appName2verStyleStr: {},
    appName2verStyleFetched: {},
    appName2verExtraCssList: {},
    appName2verAppVersion: {},
    appName2verCustomData: {},
    appName2app: {},
    appName2appVersion: {},
    appName2styleStr: {},
    appGroupName2firstVer: {},
    isOriginInitCalled: false,
    // below properties can be overwrite for user custom platform
    ...makeOriginOptions(),
    origin: makeOriginOptions({ apiPrefix: DEFAULT_API_PREFIX }), // originInit 写入到此对象下
  };
  return cacheNode;
}

function makeEventBus() {
  /** @type {Record<string, any[]>} */
  const name2listeners = {};
  return {
    on: (eventName, cb) => {
      let listeners = name2listeners[eventName];
      if (!listeners) {
        const arr = [];
        name2listeners[eventName] = arr;
        listeners = arr;
      }
      listeners.push(cb);
    },
    emit: (eventName, ...args) => {
      const listeners = name2listeners[eventName];
      if (listeners) {
        const listenersCopy = listeners.slice();
        listenersCopy.forEach((cb) => cb(...args));
      }
    },
    off: (eventName, cb) => {
      const listeners = name2listeners[eventName];
      if (listeners) {
        for (let i = 0, len = listeners.length; i < len; i++) {
          const cbItem = listeners[i];
          if (cbItem === cb) {
            listeners.splice(i, 1);
            break;
          }
        }
      }
    },
  };
}

function makeHelMicroShared() {
  const unpkgCache = makeCacheNode(PLAT_UNPKG);
  const helCache = makeCacheNode(PLAT_HEL);
  const cacheRoot = {
    /**
     * 默认的平台值，这个值在这里已无意义，最新版本的 getPlatform 返回值已固定，不再取此处的值
     * 这里刻意设为 PLAT_HEL 是为了让 3.0 和 4.0 版本包共存时
     * 例如宿主4子模块3这种情况，子模块的旧版本 hel-micro-core 调用 getPlatform 依然能正常获取到 hel 为默认平台
     */
    platform: PLAT_HEL,
    platformHint: 'the platform value here does not make any sense!',
    /** 1.4+ 新增，用于记录 preFetchLib 时显示传递了 platform 值，供 hel-lib-proxy 使用，
     * 方便多平台共同加载包体场景下， exposeLib 接口如果未显式的传递平台值，能尽量正确推测出应用对应的 platform 值
     * 但是这里依然推荐用户 exposeLib 传递具体的平台值，避免推测错误
     */
    appName2platform: {},
    /** 取代 appName2platform，后续 appName2platform 会移出 */
    appGroupName2platform: {},
    /** @type {Record<string, ReturnType<typeof makeCacheNode>>} */
    caches: {
      [PLAT_UNPKG]: unpkgCache,
      [PLAT_HEL]: helCache,
    },
    /** @type {Record<string, Record<string, any>>} 和应用无关的通用缓存池 */
    common: {},
  };

  const innerEventBus = makeEventBus();
  const userEventBus = makeEventBus();
  return {
    ver: CORE_VER,
    isStyleObInit: false,
    nativeHeadAppend: null,
    nativeBodyAppend: null,
    /** 记录用户传递的句柄 */
    patchedHeadAppend: null,
    patchedBodyAppend: null,
    createFeature: 'created by hel-micro-mini',
    eventBus: innerEventBus,
    userEventBus,
    cacheRoot,
    /** 指向的是  cacheRoot.caches.unpkg ，放第一层仅用于方便控制台查看，实际业务逻辑还是走 caches 去取 */
    unpkgCache,
    /** 指向的是  cacheRoot.caches.hel ，放第一层仅用于方便控制台查看，实际业务逻辑还是走 caches 去取 */
    helCache,
    /** 调试相关函数 */
    dev: {
      setLogMode: inner.setLogMode,
      setLogFilter: inner.setLogFilter,
    },
  };
}

export function ensureHelMicroShared() {
  let helMicroShared = getHelMicroShared();
  if (helMicroShared) {
    return;
  }

  helMicroShared = makeHelMicroShared();
  getGlobalThis().__HEL_MICRO_SHARED__ = helMicroShared;
}

/** @return {ReturnType<typeof makeHelMicroShared>} */
export function getHelMicroShared() {
  var microShared = getGlobalThis().__HEL_MICRO_SHARED__;
  return microShared;
}
