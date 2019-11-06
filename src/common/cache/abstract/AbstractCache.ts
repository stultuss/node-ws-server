import {CACHE_EXPIRE, CACHE_VARIANCE} from '../CacheFactory.class';
import {MathTools} from '../../Utility';

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
    protected genExpire(expires?: number): number {
        if (!expires) {
            expires = CACHE_EXPIRE;
        }
        
        // 为了避免同一时间 redis 大量缓存过期，导致业务中大量出现将数据重新保存 redis 中，所以每个缓存都应当增加一个随机值
        return Math.floor(expires + MathTools.getRandomFromRange(0, expires * 0.02 * CACHE_VARIANCE) - expires * 0.01 * CACHE_VARIANCE);
    }
}