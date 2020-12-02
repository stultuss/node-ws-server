import * as redis from 'redis';
import {CommonTools, SharingTools} from '../Utility';
import {ErrorFormat} from '../exception/ErrorFormat';
import {RedisCache} from './RedisCache.class';

export interface IRedisConfig {
    port: number,
    host: string,
    options: {
        connect_timeout: number, // redis 服务断开重连超时时间
        retry_delay: number, // redis 服务断开，每隔多少时间重连
        password?: string | null,
        retry_strategy?: redis.RetryStrategy,
    }
}

export type CACHE_TYPE = 'Redis' | 'Memcached';
export const CACHE_TYPE_REDIS = 'Redis';
export const CACHE_TYPE_MEMCACHE = 'Memcached';
export const CACHE_CLASS_DEFAULT_NAME = 'default';
export const CACHE_CLASS_INSTANCE = 'CACHE_CLASS_%s_%s_%s';    // "CACHE_CLASS_${name}_Redis_0", "CACHE_CLASS_${name}_Memcached_0"

/**
 * Cache Factory 单例
 * 使用方式：
 * 需要使用 cache 的时候，直接使用即可 CacheFactory::instance()->getCache(shardValue);
 */
export class CacheFactory {
    private static _instance: CacheFactory;
    private _initialized: boolean;
    private _cacheType: CACHE_TYPE;
    private _cacheServerCount: number;
    private _cacheServerOptions: Array<IRedisConfig>;
    private _cacheInstance: { [key: string]: RedisCache };
    
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
     * 游戏启动时，进行初始化
     *
     * @param {CACHE_TYPE} type
     * @param {Array<IRedisConfig>} config
     * @param {string} name
     * @return {Promise<void>}
     */
    public async init(type: CACHE_TYPE = CACHE_TYPE_REDIS, config: Array<IRedisConfig>, name: string = CACHE_CLASS_DEFAULT_NAME) {
        this._cacheType = type;
        this._cacheServerCount = config.length;
        this._cacheServerOptions = config;
        this._cacheInstance = {};
        this._initialized = true;
        
        // 测试连接
        const cache = this.getCache(0, type);
        await cache.ping();
    }
    
    /**
     * Get the cache class instance.
     *
     * @param {number} shardValue null given, means use the first cache shard
     * @param {CACHE_TYPE} cacheType  refer to CACHE_TYPE_*
     * @param {string} name
     * @return {RedisCache}
     */
    public getCache(shardValue?: string | number, cacheType: CACHE_TYPE = CACHE_TYPE_REDIS, name: string = CACHE_CLASS_DEFAULT_NAME): RedisCache {
        if (!this._initialized) {
            throw new ErrorFormat(10000, 'CacheFactory not initialized yet');
        }
        
        if (!cacheType) {
            cacheType = this._cacheType;
        }
        
        // 计算内存中用于保存 CacheInstance 的 KEY 值
        let shardId = SharingTools.getShardId(this._cacheServerCount, shardValue);
        let shardInstanceKey = CommonTools.format(CACHE_CLASS_INSTANCE, name, cacheType, shardId);
        
        if (Object.keys(this._cacheInstance).indexOf(shardInstanceKey) !== -1) {
            // 判断 CacheInstance 的链接状态
            let cache = this._cacheInstance[shardInstanceKey];
            if (cache.connected == false) {
                throw new ErrorFormat(10003);
            }
            return cache;
        } else {
            // 如果 CacheInstance 已经存在，则从内存中取，否则就创建连接。
            switch (cacheType) {
                case CACHE_TYPE_REDIS:
                    this._cacheInstance[shardInstanceKey] = CacheFactory.getRedisCache(this._cacheServerOptions[shardId]);
                    break;
                case CACHE_TYPE_MEMCACHE:
                    throw new ErrorFormat(10021, cacheType);
                default:
                    throw new ErrorFormat(10021, cacheType);
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
    protected static getRedisCache(config: IRedisConfig): RedisCache {
        return new RedisCache(config);
    }
}
