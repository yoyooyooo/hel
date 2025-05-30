/**
 * some setup work here
 */
import { setGlobalThis } from 'hel-micro-core';
import * as qs from 'qs';
import * as mockData from './mockData';

// prettier-ignore
const noop = () => { };
const localStorageCache: Record<string, string> = {};

function guessNameAndVer(url: string) {
  if (url.includes('@')) {
    // unpkg
    const str = url.split('/').find((str) => str.includes('@'));
    const [name, ver] = str.split('@');
    return { name, ver };
  }
  const searchObj: any = qs.parse(url.split('?')[1]);
  return { name: searchObj.name, ver: searchObj.ver };
}

/**
 * 提供模拟的 globalThis，方便为测试用例打桩
 */
setGlobalThis(
  {
    fetch: async (url: string) => {
      // mock unpkg redirect
      if (url.includes('@latest/')) {
        return { status: 404, url: url.replace('@latest/', '@1.1.3/') };
      }

      return {
        json: async () => {
          const { name, ver } = guessNameAndVer(url);
          if (name === 'invalid-module') {
            return {
              data: { app: null, version: null },
            };
          }

          const app = mockData.makeApp({ app: { name, build_version: ver } });
          const version = mockData.makeVersion({ versionId: ver });

          // 走
          if (url.includes('/getSubAppVersion') || url.includes('/getSubAppFullVersion')) {
            return { data: version, code: 0 };
          }
          if (url.includes('/getSubAppAndItsVersion') || url.includes('/getSubAppAndItsFullVersion')) {
            return { data: { app, version }, code: 0 };
          }

          // semverApi 直接返回 { app, version }
          // see https://unpkg.com/browse/hel-tpl-remote-vue-comps@1.1.3/hel_dist/hel-meta.json
          return { app, version };
        },
        text() {
          if (url.endsWith('chunk1.css')) {
            return 'html{width:100%;height:100%;}body{font-size:12px;}';
          }
          if (url.endsWith('chunk2.css')) {
            return 'p{padding:1px;}';
          }
          return '';
        },
        status: 200,
        url,
      };
    },
  },
  true,
);
