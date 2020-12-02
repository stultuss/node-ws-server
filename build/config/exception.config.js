"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ERROR_CODE = void 0;
exports.ERROR_CODE = {
    0: 'SUCCEED',
    1: 'UNKNOWN, msg: %s',
    //-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-
    //-* 黑名单
    //-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-
    99999: '黑名单账号禁止登录, UID:%s',
    //-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-
    //-* 框架报错 10000 - 90000
    //-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-
    /**
     * 默认报错
     */
    10000: '%s',
    10001: 'SYS_ERR, msg: %s',
    10002: 'PARAM_INVALID, msg: %s',
    10003: 'REDIS_CONNECT_ERR',
    /**
     * 配置报错
     */
    10011: 'SETTING: Setting file not found! fileName: %s',
    10012: 'SETTING: Setting file or key not found! fileName: %s, key: %s',
    /**
     * 缓存报错
     */
    10021: 'CACHE: Cache type not found! type: %s',
};
