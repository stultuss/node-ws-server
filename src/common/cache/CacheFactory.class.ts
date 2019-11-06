import {IRedisConfig, RedisCache} from './RedisCache.class';
import {CommonTools, SharingTools} from '../Utility';

export type CACHE_TYPE = 'Redis' | 'Memcached';
export const CACHE_TYPE_REDIS = 'Redis';
export const CACHE_TYPE_MEMCACHE = 'Memcached';
export const CACHE_CLASS_DEFAULT_NAME = 'default';
export const CACHE_CLASS_INSTANCE = 'CACHE_CLASS_%s_%s_%s'; // "CACHE_CLASS_${name}_Redis_0", "CACHE_CLASS_${name}_Memcached_0"


/**
 * default expire time, in seconds
 * default is 1296000 = 2 weeks
 *
 * @type {number}
 */
export const CACHE_EXPIRE = 1296000;

/**
 * max % variance in actual expiration time <br/>
 *
 * <pre>
 * max variance (in percent) in expiration of cache.
 * Thus, for a variance of 10 if an expiration time of 100 seconds is specified,
 * the item will actually expire in 90-110 seconds (selected randomly).
 * Designed to prevent mass simultaneous expiration of cache objects.
 * </pre>
 *
 * @type {number}
 */
export const CACHE_VARIANCE = 10;

/**
 * Cache Factory 单例
 * 使用方式：
 * 需要使用 cache 的时候，直接使用即可 CacheFactory::instance()->getCache($shardKey);
 */
export class CacheFactory {
    private static _instance: CacheFactory;

    private _initialized: boolean;
    private _cacheType: CACHE_TYPE;
    private _cacheServerCount: number;
    private _cacheServerOptions: Array<IRedisConfig>;
    private _cacheInstance: {[key: string]: RedisCache};

    public static instance(): CacheFactory {
        if (CacheFactory._instance == undefined) {
            CacheFactory._instance = new CacheFactory();
        }
        return CacheFactory._instance;
    }

    private constructor() {
        this._initialized = false;
    }

    /**
     * Init cache factory
     *
     * @param {CACHE_TYPE} cacheType
     * @param {Array<IRedisConfig>} cacheConfig
     * @param {string} name
     * @return {Promise<void>}
     */
    public async init(cacheType: CACHE_TYPE, cacheConfig: Array<IRedisConfig>, name: string = CACHE_CLASS_DEFAULT_NAME) {
        this._cacheType = cacheType;
        this._cacheServerCount = cacheConfig.length;
        this._cacheServerOptions = cacheConfig;
        this._cacheInstance = {};
        this._initialized = true;
        
        // 测试连接
        const cache = this.getCache(0, cacheType);
        await cache.ping();
    }

    /**
     * Get the cache class instance.
     *
     * @param {number} shardKey null given, means use the first cache shard
     * @param {CACHE_TYPE} cacheType  refer to CACHE_TYPE_*
     * @param {string} name
     * @return {RedisCache}
     */
    public getCache(shardKey?: number, cacheType: CACHE_TYPE = CACHE_TYPE_REDIS, name: string = CACHE_CLASS_DEFAULT_NAME): RedisCache {
        if (!cacheType) {
            cacheType = this._cacheType;
        }

        // 计算内存中用于保存 CacheInstance 的 KEY 值
        let shardId = SharingTools.getShardId(this._cacheServerCount, shardKey);
        let shardInstanceKey = CommonTools.format(CACHE_CLASS_INSTANCE, name, cacheType, shardId);

        // 如果 CacheInstance 已经存在，则从内存中取，否则就创建连接。
        if (Object.keys(this._cacheInstance).indexOf(shardInstanceKey) != -1) {
            // 判断 CacheInstance 的链接状态
            let cache = this._cacheInstance[shardInstanceKey];
            if (cache.connected == false) {
                throw new Error(`CACHE_CONNECT_ERR`);
            }
            return cache;
        } else {
            switch (cacheType) {
                case CACHE_TYPE_REDIS:
                    this._cacheInstance[shardInstanceKey] = CacheFactory.getRedisCache(this._cacheServerOptions[shardId]);
                    break;
                case CACHE_TYPE_MEMCACHE:
                    throw new Error(`CACHE_TYPE_ERR!`);
                default:
                    throw new Error(`CACHE_TYPE_ERR!`);
            }
            return this._cacheInstance[shardInstanceKey];
        }
    }

    /**
     * Initialize Redis Cache
     *
     * @param {IRedisConfig} config
     * @param {boolean} poolOpen
     * @return {RedisCache}
     */
    protected static getRedisCache(config: IRedisConfig, poolOpen: boolean = false): RedisCache {
        return new RedisCache(config);
    }
}
