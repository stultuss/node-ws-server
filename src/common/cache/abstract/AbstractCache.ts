import {MathTools} from '../../Utility';

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

export default abstract class AbstractCache {
    /**
     * Redis 链接状态
     */
    protected _connected: boolean;
    
    /**
     * Redis 链接状态
     */
    public get connected(): boolean {
        return this._connected;
    }
    
    /**
     * Initialize the cache class.
     *
     * @param {Object} option
     */
    protected constructor(option: Object) {
        this._connected = false;
        this._connect(option);
    }
    
    /**
     * Connect to the cache server.
     *
     * @param {Object} option
     * @private
     */
    protected abstract _connect(option: Object): void;
    
    /**
     * Generate an expire time with variance calculated in it.
     *
     * @param {number} expires in seconds, default null, means use system default expire time
     * @return {number}
     * @private
     */
    public genExpire(expires?: number): number {
        if (!expires) {
            expires = CACHE_EXPIRE;
        }
        
        // 为了避免同一时间 redis 大量缓存过期，导致业务中大量出现将数据重新保存 redis 中，所以每个缓存都应当增加一个随机值
        return Math.floor(expires + MathTools.getRandomFromRange(0, expires * 0.02 * CACHE_VARIANCE) - expires * 0.01 * CACHE_VARIANCE);
    }
}