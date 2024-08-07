import { getGlobalThis } from 'hel-micro-core';
import storageKeys from '../consts/storageKeys';
import type { AssetUrlType } from '../types';
import { getIndexedDBFactory, IndexedDBStorage } from './indexeddb';

export function isRelativePath(path: string) {
  if (path.startsWith('//')) return false;
  return path.startsWith('/') || path.startsWith('./') || path.startsWith('../');
}

export function getAssetUrlType(webDirPath: string, url: string): AssetUrlType {
  if (url.startsWith(webDirPath)) {
    return 'build'; // 是构建生成的 css 文件
  }
  if (isRelativePath(url)) {
    return 'relative';
  }
  return 'static';
}

export function getIndexedDB() {
  if (!getIndexedDBFactory()) return null;

  try {
    const indexedDBIns = new IndexedDBStorage({
      name: storageKeys.DATABASE_NAME,
      storeName: storageKeys.STORE_NAME,
    });
    return {
      setItem: <T extends any = any>(key: string, value: T) => indexedDBIns.setItem<T>(key, value),
      getItem: <T extends any = any>(key: string) => indexedDBIns.getItem<T>(key),
      removeItem: <T extends any = any>(key: string) => indexedDBIns.removeItem<T>(key),
    };
  } catch (err: any) {
    console.error(`new IndexedDBStorage error: ${err.message}`);
    return null;
  }
}

// avoid mock js-dom warn:
// [DOMException [SecurityError]: localStorage is not available for opaque origins]
export function getLocalStorage() {
  // prettier-ignore
  const mockStorage = { getItem() { }, setItem() { }, removeItem() { } };
  try {
    const storage = getGlobalThis()?.localStorage;
    return storage || mockStorage;
  } catch (err: any) {
    return mockStorage;
  }
}

/**
 * 支持读取 dom attrs 时只有 key 的正确含义
 * 例如通过设定 defaultValIfOnlyKey 表示 <script data-helappend /> 可拿到值为 '1' 而非 ''
 */
export function getDatasetVal(dataset: Record<string, string>, key: string, defaultValIfOnlyKey: string) {
  const hasKey = Object.prototype.hasOwnProperty.call(dataset, key);
  if (hasKey) {
    return dataset[key] || defaultValIfOnlyKey;
  }
  return undefined;
}
