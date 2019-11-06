"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const CacheFactory_class_1 = require("../CacheFactory.class");
const Utility_1 = require("../../Utility");
class AbstractCache {
    /**
     * Redis 链接状态
     */
    get connected() {
        return this._connected;
    }
    /**
     * Initialize the cache class.
     *
     * @param {Object} option
     */
    constructor(option) {
        this._connected = false;
        this._connect(option);
    }
    /**
     * Generate an expire time with variance calculated in it.
     *
     * @param {number} expires in seconds, default null, means use system default expire time
     * @return {number}
     * @private
     */
    genExpire(expires) {
        if (!expires) {
            expires = CacheFactory_class_1.CACHE_EXPIRE;
        }
        // 为了避免同一时间 redis 大量缓存过期，导致业务中大量出现将数据重新保存 redis 中，所以每个缓存都应当增加一个随机值
        return Math.floor(expires + Utility_1.MathTools.getRandomFromRange(0, expires * 0.02 * CacheFactory_class_1.CACHE_VARIANCE) - expires * 0.01 * CacheFactory_class_1.CACHE_VARIANCE);
    }
}
exports.default = AbstractCache;
