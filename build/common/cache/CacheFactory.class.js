"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CacheFactory = exports.CACHE_CLASS_INSTANCE = exports.CACHE_CLASS_DEFAULT_NAME = exports.CACHE_TYPE_MEMCACHE = exports.CACHE_TYPE_REDIS = void 0;
const Utility_1 = require("../Utility");
const ErrorFormat_1 = require("../exception/ErrorFormat");
const RedisCache_class_1 = require("./RedisCache.class");
exports.CACHE_TYPE_REDIS = 'Redis';
exports.CACHE_TYPE_MEMCACHE = 'Memcached';
exports.CACHE_CLASS_DEFAULT_NAME = 'default';
exports.CACHE_CLASS_INSTANCE = 'CACHE_CLASS_%s_%s_%s'; // "CACHE_CLASS_${name}_Redis_0", "CACHE_CLASS_${name}_Memcached_0"
/**
 * Cache Factory 单例
 * 使用方式：
 * 需要使用 cache 的时候，直接使用即可 CacheFactory::instance()->getCache(shardValue);
 */
class CacheFactory {
    constructor() {
        this._initialized = false;
    }
    static instance() {
        if (CacheFactory._instance == undefined) {
            CacheFactory._instance = new CacheFactory();
        }
        return CacheFactory._instance;
    }
    /**
     * 游戏启动时，进行初始化
     *
     * @param {CACHE_TYPE} type
     * @param {Array<IRedisConfig>} config
     * @param {string} name
     * @return {Promise<void>}
     */
    init(type = exports.CACHE_TYPE_REDIS, config, name = exports.CACHE_CLASS_DEFAULT_NAME) {
        return __awaiter(this, void 0, void 0, function* () {
            this._cacheType = type;
            this._cacheServerCount = config.length;
            this._cacheServerOptions = config;
            this._cacheInstance = {};
            this._initialized = true;
            // 测试连接
            const cache = this.getCache(0, type);
            yield cache.ping();
        });
    }
    /**
     * Get the cache class instance.
     *
     * @param {number} shardValue null given, means use the first cache shard
     * @param {CACHE_TYPE} cacheType  refer to CACHE_TYPE_*
     * @param {string} name
     * @return {RedisCache}
     */
    getCache(shardValue, cacheType = exports.CACHE_TYPE_REDIS, name = exports.CACHE_CLASS_DEFAULT_NAME) {
        if (!this._initialized) {
            throw new ErrorFormat_1.ErrorFormat(10000, 'CacheFactory not initialized yet');
        }
        if (!cacheType) {
            cacheType = this._cacheType;
        }
        // 计算内存中用于保存 CacheInstance 的 KEY 值
        let shardId = Utility_1.SharingTools.getShardId(this._cacheServerCount, shardValue);
        let shardInstanceKey = Utility_1.CommonTools.format(exports.CACHE_CLASS_INSTANCE, name, cacheType, shardId);
        if (Object.keys(this._cacheInstance).indexOf(shardInstanceKey) !== -1) {
            // 判断 CacheInstance 的链接状态
            let cache = this._cacheInstance[shardInstanceKey];
            if (cache.connected == false) {
                throw new ErrorFormat_1.ErrorFormat(10003);
            }
            return cache;
        }
        else {
            // 如果 CacheInstance 已经存在，则从内存中取，否则就创建连接。
            switch (cacheType) {
                case exports.CACHE_TYPE_REDIS:
                    this._cacheInstance[shardInstanceKey] = CacheFactory.getRedisCache(this._cacheServerOptions[shardId]);
                    break;
                case exports.CACHE_TYPE_MEMCACHE:
                    throw new ErrorFormat_1.ErrorFormat(10021, cacheType);
                default:
                    throw new ErrorFormat_1.ErrorFormat(10021, cacheType);
            }
            return this._cacheInstance[shardInstanceKey];
        }
    }
    /**
     * Initialize Redis Cache
     *
     * @param {IRedisConfig} config
     * @return {RedisCache}
     */
    static getRedisCache(config) {
        return new RedisCache_class_1.RedisCache(config);
    }
}
exports.CacheFactory = CacheFactory;
