'use strict';
var __createBinding =
  (this && this.__createBinding)
  || (Object.create
    ? function (o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        var desc = Object.getOwnPropertyDescriptor(m, k);
        if (!desc || ('get' in desc ? !m.__esModule : desc.writable || desc.configurable)) {
          desc = {
            enumerable: true,
            get: function () {
              return m[k];
            },
          };
        }
        Object.defineProperty(o, k2, desc);
      }
    : function (o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        o[k2] = m[k];
      });
exports.__esModule = true;
exports.makeVersion = exports.makeApp = void 0;
var makeApp_1 = require('./makeApp');
__createBinding(exports, makeApp_1, 'default', 'makeApp');
var makeVersion_1 = require('./makeVersion');
__createBinding(exports, makeVersion_1, 'default', 'makeVersion');
