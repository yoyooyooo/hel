// @ts-nocheck
import { appStyleSrv } from 'hel-micro';
import { evName, getAppMeta, getGlobalThis, getHelEventBus } from 'hel-micro-core';
import React from 'react';
import defaults from '../consts/defaults';
import { useForceUpdate } from '../hooks/share';
import type { IHelContext, IRemoteCompRenderConfig } from '../types';
import { getSkeletonEl } from '../util';
import { getStaticShadowBodyRef } from '../wrap';
import ShadowBody, { getHostData, getShadowBodyReadyEvName, tryMountStaticShadowBody } from './ShadowBody';

const { SHADOW_HOST_NAME, SHADOW_BODY_NAME } = defaults;

const bus = getHelEventBus();

export interface IMayShadowProps {
  /** 内部计算出的组件相关信息 */
  compInfo: {
    Comp: any;
    styleStr: string;
    styleUrlList: string[];
  };
  renderConfig: IRemoteCompRenderConfig;
}

function getPassedProps(
  renderConfig: IRemoteCompRenderConfig,
  insShadowRootRef: React.RefObject<any>,
  insBodyShadowRootRef: React.RefObject<any>,
) {
  const { name, controlOptions, compProps = {}, reactRef } = renderConfig;
  const { platform, versionId, isLegacy = false, ignoreHelContext = false } = controlOptions;
  const staticShadowBodyRootRef = getStaticShadowBodyRef(name, controlOptions);
  // 供用户的  Select Picker Modal 等组件设置 Container 之用，以便安全的渲染到 shadow-dom 里
  const getShadowAppRoot = () => insShadowRootRef.current || null;
  const getShadowBodyRoot = () => insBodyShadowRootRef.current || null;
  const getStaticShadowBodyRoot = () => staticShadowBodyRootRef;
  const getEnsuredBodyRoot = () => getShadowBodyRoot() || getStaticShadowBodyRoot() || getGlobalThis()?.document.body || null;
  // 组件内jsx内部的 children 优先级高于组件属性上里传递的 children
  const children = compProps.children || renderConfig.children;

  const helContext: IHelContext = {
    platform,
    name,
    versionId,
    getShadowAppRoot, // 获取实例自身顶层外部的 shadow 根节点
    getShadowBodyRoot, // 获取伴随实例创建到body下的 shadow 根节点
    getStaticShadowBodyRoot,
    getEnsuredBodyRoot,
  };

  // avoid error: compProps object is not extensible,
  let passedProps = { ...compProps, ref: reactRef };
  if (isLegacy) {
    // getShadowContainer getShadowBodyContainer 作为历史方法暴露，让 MicroAppLegacy 载入老应用时不会报错
    Object.assign(helContext, { getShadowContainer: getShadowBodyRoot, getShadowBodyContainer: getShadowBodyRoot });
    passedProps = { appProps: compProps, children, ref: reactRef };
  }
  if (!ignoreHelContext) {
    // helContext 是关键属性key，不允许用户覆盖
    passedProps.helContext = helContext;
  }
  return passedProps;
}

function useWatchSytleChange(props: IMayShadowProps, options: any) {
  const { appGroupName, data, tryForceUpdate } = options;
  const { compInfo, renderConfig } = props;
  const { styleStr, styleUrlList } = compInfo;
  const { name, controlOptions } = renderConfig;
  const { shadow } = controlOptions;

  React.useEffect(() => {
    if (shadow) {
      let staticRefReadyEv = '';
      let staticRefCb = null;
      const staticRef = getStaticShadowBodyRef(name, controlOptions);
      if (!staticRef) {
        staticRefReadyEv = getShadowBodyReadyEvName(name, controlOptions);
        staticRefCb = () => {
          bus.off(staticRefReadyEv, staticRefCb);
          staticRefCb = null;
          tryForceUpdate();
        };
        bus.on(staticRefReadyEv, staticRefCb);
        const renderProps = { data, delegatesFocus: true, styleSheets: styleUrlList, styleContent: styleStr };
        tryMountStaticShadowBody(renderProps, renderConfig);
      }

      let styleTagAddedEv = '';
      let styleTagAddedCb = null;
      if (appGroupName) {
        styleTagAddedEv = evName.styleTagAdded(appGroupName);
        styleTagAddedCb = (node) => {
          tryForceUpdate();
        };
        bus.on(styleTagAddedEv, styleTagAddedCb);
      }

      let linkTagAddedEv = '';
      let linkTagAddedCb = null;
      if (controlOptions.custom?.host) {
        linkTagAddedEv = evName.cssLinkTagAdded(controlOptions.custom?.host);
        linkTagAddedCb = (node) => {
          tryForceUpdate();
        };
        bus.on(linkTagAddedEv, linkTagAddedCb);
      }

      return () => {
        staticRefCb && bus.off(staticRefReadyEv, staticRefCb);
        styleTagAddedCb && bus.off(styleTagAddedEv, styleTagAddedCb);
        linkTagAddedCb && bus.off(linkTagAddedEv, linkTagAddedCb);
      };
    }
    // here trust my code, ban react-hooks/exhaustive-deps
    // eslint-disable-next-line
  }, []);
}

function MayShadowComp(props: IMayShadowProps) {
  const { compInfo, renderConfig } = props;
  const { Comp, styleStr, styleUrlList } = compInfo;
  const { name, controlOptions } = renderConfig;
  const { shadow, Skeleton, shadowWrapStyle, shadowDelay, ShadowViewImpl, platform } = controlOptions;
  const meta = getAppMeta(name, platform);
  const appGroupName = meta?.app_group_name || '';
  const data = getHostData(name, controlOptions);

  const insShadowRootRef = React.useRef(null); // 包裹组件实例自身 的 shadow 节点
  const insBodyShadowRootRef = React.useRef(null); // 伴随组件实例创建到 body 下的 shadow 节点
  const forceUpdate = useForceUpdate();
  // 是否 staticShadowRoot、 refRootShadowRoot、refBodyShadowRoot 都准备就绪
  const isShadowRefsReady = () => {
    const staticRef = getStaticShadowBodyRef(name, controlOptions);
    return staticRef && insShadowRootRef.current && (controlOptions.mountShadowBodyForRef ? insBodyShadowRootRef.current : true);
  };
  const tryForceUpdate = () => {
    isShadowRefsReady() && forceUpdate();
  };
  const onInsShadowRootReady = (shadowRoot) => {
    insShadowRootRef.current = shadowRoot;
    tryForceUpdate();
  };
  const onInsBodyShadowRootReady = (shadowRoot) => {
    insBodyShadowRootRef.current = shadowRoot;
    tryForceUpdate();
  };
  const passedProps = getPassedProps(renderConfig, insShadowRootRef, insBodyShadowRootRef);
  useWatchSytleChange(props, { appGroupName, data, tryForceUpdate });

  if (shadow) {
    // shawRoot 容器引用还未准备好时，继续骨架屏等待，
    // 确保 show 模式下透传给子组件的 helContext 的 getShadowAppRoot 方法一定能够活动 shawRoot 引用
    let uiContent: React.ReactNode = '';
    if (!isShadowRefsReady()) {
      uiContent = getSkeletonEl(Skeleton);
    } else {
      uiContent = <Comp {...passedProps} />;
    }

    const styleContent = `${styleStr}${appStyleSrv.getStyleTagText(appGroupName)}`;
    const ignoredCssUrlList = appStyleSrv.getIgnoredCssUrlList(name, renderConfig);
    const styleSheets = styleUrlList.concat(ignoredCssUrlList);
    const commonProps = { id: name, data, style: shadowWrapStyle, styleSheets, styleContent, shadowDelay };
    return (
      <>
        {/*
          在body上为应用或组件挂一个 shadow 容器，方便子应用的 Select Picker Modal 等组件设置 Container 时，
          可以调用 getShadowBodyRoot 来设置挂载节点，以确保它们也能够渲染到 shadow-dom 里，从而保证样式隔离
          为性能考虑，默认不跟随组件实例挂载一个shadow 容器，会在组件初始实例化时生成一个静态 shadow 容器
          推荐用户优化考虑使用静态 shadow 容器，见代码 tryMountStaticShadowBody
       */}
        {controlOptions.mountShadowBodyForRef && (
          <ShadowBody
            tagName={SHADOW_BODY_NAME}
            onShadowRootReady={onInsBodyShadowRootReady}
            ShadowView={ShadowViewImpl}
            {...commonProps}
          />
        )}
        <ShadowViewImpl tagName={SHADOW_HOST_NAME} onShadowRootReady={onInsShadowRootReady} {...commonProps}>
          {uiContent}
        </ShadowViewImpl>
      </>
    );
  }

  return <Comp {...passedProps} />;
}

export default MayShadowComp;
