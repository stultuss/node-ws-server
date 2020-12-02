import * as _ from 'underscore';
import * as redis from 'redis';
import AbstractCache from './abstract/AbstractCache';
import {IRedisConfig} from './CacheFactory.class';
import {CommonTools} from '../Utility';

export class RedisCache extends AbstractCache {
    /**
     * 为了能够重连，所以需要保存 option
     */
    protected _option: IRedisConfig;
    
    /**
     * instance of the cache handler
     */
    protected _conn: redis.RedisClient;
    
    /**
     * Initialize the cache class.
     *
     * @param {IRedisConfig} option
     */
    public constructor(option: IRedisConfig) {
        super(option);
    }
    
    /**
     * Redis 配置初始化
     *
     * @param {IRedisConfig} option
     */
    protected _connect(option: IRedisConfig) {
        this._option = option;
        this._conn = this._createConn();
    }
    
    /**
     * 创建 Redis 客户端
     *
     * @return {RedisClient}
     * @private
     */
    private _createConn(): redis.RedisClient {
        // 手动连接的配置和连接池托管的属性有所不同，需要额外处理
        const self = this;
        const options = this._option.options;
        
        // 添加 retry_strategy 断线重连属性
        if (!options.retry_strategy) {
            options.retry_strategy = (retryOptions: redis.RetryStrategyOptions) => {
                // 服务器出现故障，连接被拒绝
                if (retryOptions.error && retryOptions.error.code == 'ECONNREFUSED') {
                    CommonTools.logger('Redis Client connect ECONNREFUSED', CommonTools.LOGGER_TYPE_ERROR, true);
                    // 关闭连接状态
                    self._connected = false;
                }
                
                // 重连次数超过 10 次
                if (retryOptions.total_retry_time > 10 * options.retry_delay) {
                    CommonTools.logger('Redis Client reconnect more than 10 time', CommonTools.LOGGER_TYPE_ERROR, true);
                }
                
                // 等待2000毫秒后断线重连
                return options.retry_delay;
            };
        }
        
        // 创建 RedisClient 连接
        const conn = redis.createClient(this._option.port, this._option.host, {
            ...options,
            return_buffers: true
        });
        
        // 监听 redis 的 error 事件
        conn.on('error', () => {
            CommonTools.logger(`Redis connect ${self._option.host}:${self._option.port} failed...`, CommonTools.LOGGER_TYPE_WARN);
        });
        
        // 监听 redis 的连接事件
        conn.on('connect', () => {
            CommonTools.logger(`Redis connect ${self._option.host}:${self._option.port} succeed...`);
            self._connected = true;
        });
        
        return conn;
    }
    
    /**
     * Encode inputted value into string format.
     *
     * @param {Object} value
     * @return {string}
     */
    private _encodeValue(value: any): string {
        /**
         * boolean: "['encode', true]"
         * number:  "['encode', 1]"
         * null:    "['encode', null]"
         * object:  "['encode', {"name":"david"}]"
         * array:   "['encode', [1,2,3]]"
         * string:  "['encode', "string"]"
         */
        return JSON.stringify(['encode', value]);
    }
    
    /**
     * Decode value into array or other mixed type.
     *
     * @param {Object} value
     * @return {string}
     */
    private _decodeValue(v: any): any {
        let decodeValue: any;
        let value = v.toString();
        
        // 只有 json string 才需要解析 json，如果解析失败，直接透传。
        if (_.isString(value)) {
            try {
                decodeValue = JSON.parse(value);
                // 只有结构 Array，并且只有长度等于2，并且第一个元素是 'encode'的情况下，说明是 encodeValue 塞到 redis 中的。
                if (_.isArray(decodeValue) && decodeValue.length == 2 && decodeValue[0] == 'encode') {
                    decodeValue = decodeValue.pop();
                }
            } catch (e) {
                decodeValue = value;
            }
        } else {
            decodeValue = value;
        }
        
        return decodeValue;
    }
    
    //-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-
    //-* KEYS FUNCTIONS
    //-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-
    /**
     * 设置缓存过期时间
     *
     * @param {string} key
     * @param {number} expire
     * @return {Promise<boolean>}
     */
    public async expire(key: string, expire?: number): Promise<boolean> {
        if (!expire) {
            expire = this.genExpire();
        }
        let r = await CommonTools.promisify(this._conn.expire, this._conn)(key, expire);
        return (r == 1);
    }
    
    /**
     * 缓存过期操作
     *
     * @param {string} key
     * @return {Promise<boolean>}
     */
    public async ttl(key: string): Promise<number> {
        return await CommonTools.promisify(this._conn.ttl, this._conn)(key);
    }
    
    /**
     * 删除缓存
     *
     * @param {string} key
     * @return {Promise<boolean>}
     */
    public async del(key: string): Promise<boolean> {
        let r = await CommonTools.promisify(this._conn.del, this._conn)(key);
        return (r == 1);
    }
    
    /**
     * 测试连接
     *
     * @return {Promise<string>}
     */
    public async ping(): Promise<boolean> {
        return await CommonTools.promisify(this._conn.ping, this._conn)();
    }
    
    //-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-
    //-* BIT FUNCTIONS
    //-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-
    /**
     * 设置32进制Array
     *
     * @param {string} key
     * @param {any} value
     * @param {number} expire
     * @return {Promise<boolean>}
     */
    public async setBuffer(key: string, value: any, expire?: number): Promise<boolean> {
        let r = await CommonTools.promisify(this._conn.set, this._conn)(key, value);
        await this.expire(key, expire);
        return r;
    }
    
    /**
     * 获取32进制Array
     *
     * @param {string} key
     * @return {Promise<any>}
     */
    public async getBuffer(key: string): Promise<any> {
        let r = await CommonTools.promisify(this._conn.get, this._conn)(key);
        if (_.isEmpty(r)) {
            return null;
        }
        return r;
    }
    
    //-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-
    //-* STRING FUNCTIONS
    //-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-
    /**
     * redis.incr
     *
     * @param {string} key
     * @param {number} expire
     * @return {Promise<number>}
     */
    public async incr(key: string, expire?: number): Promise<number> {
        let r = await CommonTools.promisify(this._conn.incr, this._conn)(key);
        await this.expire(key, expire);
        return r;
    }
    
    /**
     * redis.incrby
     *
     * @param {string} key
     * @param {number} value
     * @param {number} expire
     * @return {Promise<number>}
     */
    public async incrby(key: string, value: number, expire?: number): Promise<number> {
        let r = await CommonTools.promisify(this._conn.incrby, this._conn)(key, value);
        await this.expire(key, expire);
        return r;
    }
    
    /**
     * redis.get
     *
     * @param {string} key
     * @return {Promise<string>}
     */
    public async get(key: string): Promise<any> {
        let r = await CommonTools.promisify(this._conn.get, this._conn)(key);
        if (_.isEmpty(r)) {
            return null;
        }
        return this._decodeValue(r);
    }
    
    /**
     * redis.set
     *
     * @param {string} key
     * @param {any} value
     * @param {number} expire
     * @param {boolean} needEncode
     * @return {Promise<boolean>}
     */
    public async set(key: string, value: any, expire?: number, needEncode: boolean = true): Promise<boolean> {
        let encodeValue = (needEncode) ? this._encodeValue(value) : value;
        let r = await CommonTools.promisify(this._conn.set, this._conn)(key, encodeValue);
        await this.expire(key, expire);
        return (r == 'OK');
    }
    
    /**
     * redis.mget
     *
     * @param {Array<string>} keys
     * @return {Promise<any[]>}
     */
    public async mGet(keys: Array<string>): Promise<any[]> {
        if (_.isEmpty(keys)) {
            return null;
        }
        
        let responses = await CommonTools.promisify(this._conn.mget, this._conn)(keys);
        if (_.isEmpty(responses)) {
            return null;
        }
        
        let r: Array<any> = [];
        for (let response of responses) {
            if (response == null) {
                r.push(undefined); // FIXME, undefined == null，传入 null 和这边设定的 undefined 是无法区分的。
            } else {
                r.push(this._decodeValue(response));
            }
        }
        
        return r;
    }
    
    /**
     * redis.mset
     *
     * @param {Object} obj
     * @param {number} expire
     * @return {Promise<boolean>}
     */
    public async mSet(obj: { [key: string]: any }, expire?: number): Promise<boolean> {
        if (_.isEmpty(obj)) {
            return null;
        }
        
        let items: Array<string> = [];
        for (let key of Object.keys(obj)) {
            items.push(key);
            items.push(this._encodeValue(obj[key]));
        }
        
        let r = await CommonTools.promisify(this._conn.mset, this._conn)(items);
        for (let key of Object.keys(obj)) {
            await this.expire(key, expire);
        }
        
        return (r == 1);
    }
    
    /**
     * redis.add
     *
     * @param {string} key
     * @param value
     * @param {number} expire
     * @return {Promise<boolean>}
     */
    public async add(key: string, value: any, expire?: number): Promise<boolean> {
        let r = await CommonTools.promisify(this._conn.setnx, this._conn)(key, this._encodeValue(value));
        await this.expire(key, expire);
        return (r == 1);
    }
    
    //-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-
    //-* HASH FUNCTIONS
    //-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-
    /**
     * redis.hgetall
     *
     * @param {string} key
     * @return {Promise<Object>}
     */
    public async hGetAll(key: string): Promise<{ [key: string]: any }> {
        let r = await CommonTools.promisify(this._conn.hgetall, this._conn)(key);
        if (_.isEmpty(r)) {
            return null;
        }
        for (let key of Object.keys(r)) {
            r[key] = this._decodeValue(r[key]);
        }
        return r;
    }
    
    /**
     * redis.hget
     *
     * @param {string} key
     * @param {number | string} field
     * @return {Promise<Object>}
     */
    public async hGet(key: string, field: number | string): Promise<any> {
        if (key == null || field == null) {
            return null;
        }
        let r = await CommonTools.promisify(this._conn.hget, this._conn)(key, field);
        if (_.isEmpty(r)) {
            return null;
        }
        return this._decodeValue(r);
    }
    
    /**
     * redis.hset
     *
     * @param {string} key
     * @param {number | string} field
     * @param value
     * @param {number} expire
     * @return {Promise<boolean>}
     */
    public async hSet(key: string, field: number | string, value: any, expire?: number): Promise<boolean> {
        let r = await CommonTools.promisify(this._conn.hset, this._conn)(key, field, this._encodeValue(value));
        await this.expire(key, expire);
        return (r == 1);
    }
    
    /**
     * redis.hincrby
     *
     * @param {string} key
     * @param {number | string} field
     * @param {number} value
     * @param {number} expire
     * @return {Promise<number>}
     */
    public async hincrby(key: string, field: number | string, value: number, expire?: number): Promise<number> {
        let r = await CommonTools.promisify(this._conn.hincrby, this._conn)(key, field, value);
        await this.expire(key, expire);
        return r;
    }
    
    /**
     * redis.hmget
     *
     * @param {string} key
     * @param {Array<number | string>} fields
     * @return {Promise<Object>}
     */
    public async hMGet(key: string, fields: Array<number | string>): Promise<{ [key: string]: Object }> {
        if (_.isEmpty(fields) || _.isArray(fields) == false) {
            return null;
        }
        
        let r = await CommonTools.promisify(this._conn.hmget, this._conn)(key, fields);
        if (_.isEmpty(r)) {
            return null;
        }
        
        for (let key of Object.keys(r)) {
            r[key] = this._decodeValue(r[key]);
        }
        
        return r;
    }
    
    /**
     * redis.hmset
     *
     * @param {string} key
     * @param {Object | Array<any>} obj
     * @param {number} expire
     * @return {Promise<boolean>}
     */
    public async hMSet(key: string, obj: Object | Array<any>, expire?: number): Promise<boolean> {
        if (_.isEmpty(obj)) {
            return null;
        }
        
        let items: Array<string | number | boolean> = [];
        for (let key of Object.keys(obj)) {
            items.push(key);
            items.push(this._encodeValue(obj[key]));
        }
        
        let r = await CommonTools.promisify(this._conn.hmset, this._conn)(key, items);
        if (_.isEmpty(r)) {
            return false;
        }
        
        await this.expire(key, expire);
        return (r == 'OK');
    }
    
    /**
     * redis.hdel
     *
     * @param {string} key
     * @param {Array<number | string>} fields
     * @return {Promise<boolean>}
     */
    public async hDel(key: string, fields: Array<number | string>): Promise<boolean> {
        if (!fields) {
            return false;
        }
        
        let r = await CommonTools.promisify(this._conn.hdel, this._conn)(key, fields);
        return (r == 1);
    }
    
    /**
     * redis.hlen
     *
     * @param {string} key
     * @return {Promise<number>}
     */
    public async hLen(key: string): Promise<number> {
        return await CommonTools.promisify(this._conn.hlen, this._conn)(key);
    }
    
    //-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-
    //-* SortedSet FUNCTIONS
    //-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-
    /**
     * 添加一个 member 和 score 到排行
     *
     * @param {string} key
     * @param {number} score
     * @param {string | number} member
     * @param {number} expire
     * @return {Promise<boolean>}
     */
    public async zadd(key: string, score: number, member: string | number, expire?: number) {
        let r = await CommonTools.promisify(this._conn.zadd, this._conn)(key, score, member);
        await this.expire(key, expire);
        return r;
    }
    
    /**
     * 从排行中移除一个 member
     *
     * @param {string} key
     * @param {string | number} member
     * @return {Promise<boolean>}
     */
    public async zrem(key: string, member: string | number): Promise<boolean> {
        return await CommonTools.promisify(this._conn.zrem, this._conn)(key, member);
    }
    
    /**
     * 移除排行 key 中，指定排名(rank)区间内的所有成员。
     *
     * @param {string} key
     * @param {number} start
     * @param {number} stop
     * @return {Promise<boolean>}
     */
    public async zremrangebyrank(key: string, start: number, stop: number): Promise<boolean> {
        return await CommonTools.promisify(this._conn.zremrangebyrank, this._conn)(key, start, stop);
    }
    
    /**
     * 移除排行 key 中，指定排名(score)区间内的所有成员。
     *
     * @param {string} key
     * @param {number} min
     * @param {number} max
     * @return {Promise<boolean>}
     */
    public async zremrangebyscore(key: string, min: number, max: number): Promise<boolean> {
        return await CommonTools.promisify(this._conn.zremrangebyscore, this._conn)(key, min, max);
    }
    
    /**
     * 给排行中的 member 的 score 增加 increment 值
     *
     * @param {string} key
     * @param {number} increment
     * @param {string | number} member
     * @param {number} expire
     * @return {Promise<number>}
     */
    public async zincrby(key: string, increment: number, member: string | number, expire?: number): Promise<number> {
        let r = await CommonTools.promisify(this._conn.zincrby, this._conn)(key, increment, member);
        await this.expire(key, expire);
        return r.toString();
    }
    
    /**
     * 返回成员的 score
     *
     * @param {string} key
     * @param {string | number} member
     * @return {Promise<number>}
     */
    public async zscore(key: string, member: string | number): Promise<number> {
        let score = await CommonTools.promisify(this._conn.zscore, this._conn)(key, member);
        return Math.floor(score);
    }
    
    /**
     * 返回排行中成员 member 的排名（从小到大，score 越小排名越高）
     *
     * @param {string} key
     * @param {string | number} member
     * @return {Promise<number>}
     */
    public async zrank(key: string, member: string | number): Promise<number> {
        return await CommonTools.promisify(this._conn.zrank, this._conn)(key, member);
    }
    
    /**
     * 返回排行中成员 member 的排名（从大到小，score 越大排名越高）
     *
     * @param {string} key
     * @param {string | number} member
     * @return {Promise<number>}
     */
    public async zrevrank(key: string, member: string | number): Promise<number> {
        return await CommonTools.promisify(this._conn.zrevrank, this._conn)(key, member);
    }
    
    /**
     * 返回排行长度
     *
     * @param {string} key
     * @return {Promise<number>}
     */
    public async zcard(key: string): Promise<number> {
        return await CommonTools.promisify(this._conn.zcard, this._conn)(key);
    }
    
    /**
     * 返回排行中，指定 score 区间内的成员数量
     *
     * @param {string} key
     * @param {number} minScore
     * @param {number} maxScore
     * @return {Promise<number>}
     */
    public async zcount(key: string, minScore: number, maxScore: number): Promise<number> {
        return await CommonTools.promisify(this._conn.zcount, this._conn)(key, minScore, maxScore);
    }
    
    /**
     * 返回排行中，指定排序区间内的成员。(从小到大)
     *
     * @param {string} key
     * @param {number} start
     * @param {number} stop
     * @param {boolean} withScores
     * @return {Promise<string[]>}
     */
    public async zrange(key: string, start: number, stop: number, withScores: boolean = false): Promise<any[]> {
        let response = [];
        if (!withScores) {
            let r = await CommonTools.promisify(this._conn.zrange, this._conn)(key, start, stop);
            if (_.isEmpty(r)) {
                return response;
            }
            for (let i = 0; i < r.length; i++) {
                response.push(r.shift().toString());
            }
        } else {
            let r = await CommonTools.promisify(this._conn.zrange, this._conn)(key, start, stop, 'WITHSCORES');
            if (_.isEmpty(r)) {
                return response;
            }
            for (let i = 0; i < r.length; i + 2) {
                let member = r.shift().toString();
                let score = r.shift().toString();
                response.push([Math.floor(score), member]);
            }
        }
        return response;
    }
    
    /**
     * 返回排行中，指定 score 区间内的成员。(从小到大)
     *
     * @param {string} key
     * @param {number} min
     * @param {number} max
     * @param {boolean} withScores
     * @return {Promise<string[]>}
     */
    public async zrangebyscore(key: string, min: number, max: number, withScores: boolean = false): Promise<any[]> {
        let response = [];
        if (!withScores) {
            let r = await CommonTools.promisify(this._conn.zrangebyscore, this._conn)(key, min, max);
            if (_.isEmpty(r)) {
                return response;
            }
            for (let i = 0; i < r.length; i++) {
                response.push(r.shift().toString());
            }
        } else {
            let r = await CommonTools.promisify(this._conn.zrangebyscore, this._conn)(key, min, max, 'WITHSCORES');
            if (_.isEmpty(r)) {
                return response;
            }
            for (let i = 0; i < r.length; i + 2) {
                let member = r.shift().toString();
                let score = r.shift().toString();
                response.push([Math.floor(score), member]);
            }
        }
        return response;
    }
    
    /**
     * 返回排行中，指定排序区间内的成员。(从大到小)
     *
     * @param {string} key
     * @param {number} start
     * @param {number} stop
     * @param {boolean} withScores
     * @return {Promise<string[]>}
     */
    public async zrevrange(key: string, start: number, stop: number, withScores: boolean = false): Promise<any[]> {
        let response = [];
        if (!withScores) {
            let r = await CommonTools.promisify(this._conn.zrevrange, this._conn)(key, start, stop);
            if (_.isEmpty(r)) {
                return response;
            }
            for (let i = 0; i < r.length; i++) {
                response.push(r.shift().toString());
            }
        } else {
            let r = await CommonTools.promisify(this._conn.zrevrange, this._conn)(key, start, stop, 'WITHSCORES');
            if (_.isEmpty(r)) {
                return response;
            }
            for (let i = 0; i < r.length; i + 2) {
                let member = r.shift().toString();
                let score = r.shift().toString();
                response.push([Math.floor(score), member]);
            }
        }
        return response;
    }
    
    /**
     * 返回排行中，指定排序区间内的成员。(从大到小)
     *
     * @param {string} key
     * @param {number} max
     * @param {number} min
     * @param {boolean} withScores
     * @return {Promise<string[]>}
     */
    public async zrevrangebyscore(key: string, max: number, min: number, withScores: boolean = false): Promise<any[]> {
        let response = [];
        if (!withScores) {
            let r = await CommonTools.promisify(this._conn.zrevrangebyscore, this._conn)(key, max, min);
            if (_.isEmpty(r)) {
                return response;
            }
            for (let i = 0; i < r.length; i++) {
                response.push(r.shift().toString());
            }
        } else {
            let r = await CommonTools.promisify(this._conn.zrevrangebyscore, this._conn)(key, max, min, 'WITHSCORES');
            if (_.isEmpty(r)) {
                return response;
            }
            for (let i = 0; i < r.length; i + 2) {
                let member = r.shift().toString();
                let score = r.shift().toString();
                response.push([Math.floor(score), member]);
            }
        }
        return response;
    }
    
    //-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-
    //-* Set FUNCTIONS
    //-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-
    /**
     * 添加一个 member 到集合
     *
     * @param {string} key
     * @param {any} member
     * @param {number} expire
     * @return {Promise<number>}
     */
    public async sadd(key: string, member: any | any[], expire?: number): Promise<number> {
        let r: number;
        if (_.isArray(member)) {
            if (member.length == 0) {
                return r;
            }
            let members = [];
            for (let v of member) {
                members.push(this._encodeValue(v));
            }
            r = await CommonTools.promisify(this._conn.sadd, this._conn)(key, [...Array.from(members)]);
        } else {
            let encodeValue = this._encodeValue(member);
            r = await CommonTools.promisify(this._conn.sadd, this._conn)(key, encodeValue);
        }
        await this.expire(key, expire);
        return r;
    }
    
    /**
     * 返回集合长度
     *
     * @param {string} key
     * @return {Promise<number>}
     */
    public async scard(key: string): Promise<number> {
        return await CommonTools.promisify(this._conn.scard, this._conn)(key);
    }
    
    /**
     * 随机返回一个 member，并从集合中删除
     *
     * @param {string} key
     * @return {Promise<number>}
     */
    public async spop(key: string): Promise<any> {
        let r = await CommonTools.promisify(this._conn.spop, this._conn)(key);
        
        if (_.isEmpty(r)) {
            return null;
        }
        
        return this._decodeValue(r);
    }
    
    /**
     * 随机返回 member
     *
     * @param {string} key
     * @return {Promise<any>}
     */
    public async srandmember(key: string): Promise<any | any[]> {
        let r = await CommonTools.promisify(this._conn.srandmember, this._conn)(key);
        
        if (_.isEmpty(r)) {
            return null;
        }
        return this._decodeValue(r);
    }
    
    /**
     * 随机返回 member
     *
     * @param {string} key
     * @param {number} count
     * @return {Promise<any | any[]>}
     */
    public async srandmembers(key: string, count: number): Promise<any[]> {
        let r = await CommonTools.promisify(this._conn.srandmember, this._conn)(key, count);
        
        let response = [];
        if (_.isEmpty(r)) {
            return response;
        }
        for (let v of r) {
            response.push(this._decodeValue(v));
        }
        return response;
    }
    
    /**
     * 删除一个 member
     *
     * @param {string} key
     * @param {any} member
     * @return {Promise<any>}
     */
    public async srem(key: string, member: any): Promise<number> {
        let encodeValue = this._encodeValue(member);
        return await CommonTools.promisify(this._conn.srem, this._conn)(key, encodeValue);
    }
    
    /**
     * 判断 member 是否存在
     *
     * @param {string} key
     * @param {any} member
     * @return {Promise<any>}
     */
    public async sismember(key: string, member: any): Promise<boolean> {
        let encodeValue = this._encodeValue(member);
        let r = await CommonTools.promisify(this._conn.sismember, this._conn)(key, encodeValue);
        return r == 1;
    }
    
    /**
     * 列出所有 member
     *
     * @param {string} key
     * @return {Promise<any>}
     */
    public async smembers(key: string): Promise<any[]> {
        let r = await CommonTools.promisify(this._conn.smembers, this._conn)(key);
        let response = [];
        if (_.isEmpty(r)) {
            return response;
        }
        for (let v of r) {
            response.push(this._decodeValue(v));
        }
        return response;
    }
    
    //-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-
    //-* List FUNCTIONS
    //-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-
    /**
     * 返回列表长度
     *
     * @param {string} key
     * @param {number} start
     * @param {number} stop
     * @return {Promise<any[]>}
     */
    public async lrange(key: string, start: number, stop: number): Promise<any[]> {
        let r = await CommonTools.promisify(this._conn.lrange, this._conn)(key, start, stop);
        let response = [];
        if (_.isEmpty(r)) {
            return response;
        }
        for (let v of r) {
            response.push(this._decodeValue(v));
        }
        return response;
    }
    
    /**
     * 返回列表长度
     *
     * @param {string} key
     * @return {Promise<number>}
     */
    public async llen(key: string): Promise<number> {
        return await CommonTools.promisify(this._conn.llen, this._conn)(key);
    }
    
    /**
     * 移除并返回列表 key 的头元素。
     *
     * @param {string} key
     * @return {Promise<any>}
     */
    public async lpop(key: string): Promise<any> {
        let r = await CommonTools.promisify(this._conn.lpop, this._conn)(key);
        
        if (_.isEmpty(r)) {
            return null;
        }
        
        return this._decodeValue(r);
    }
    
    /**
     * 将一个 value 插入到列表 key 的表头
     *
     * @param {string} key
     * @param {any} value
     * @param {number} expire
     * @return {Promise<number>}
     */
    public async lpush(key: string, value: any, expire?: number): Promise<number> {
        let encodeValue = this._encodeValue(value);
        let r = await CommonTools.promisify(this._conn.lpush, this._conn)(key, encodeValue);
        await this.expire(key, expire);
        return r;
    }
    
    /**
     * 将一个 value 插入到列表 key 的表尾。
     *
     * @param {string} key
     * @param {any} value
     * @param {number} expire
     * @return {Promise<number>}
     */
    public async rpush(key: string, value: any, expire?: number): Promise<number> {
        let encodeValue = this._encodeValue(value);
        let r = await CommonTools.promisify(this._conn.rpush, this._conn)(key, encodeValue);
        await this.expire(key, expire);
        return r;
    }
    
    /**
     * 对一个列表进行修剪(trim)，就是说，让列表只保留指定区间内的元素，不在指定区间之内的元素都将被删除。
     *
     * @param {string} key
     * @param {number} start
     * @param {number} end
     * @return {Promise<number>}
     */
    public async ltrim(key: string, start: number, end: number): Promise<number> {
        return await CommonTools.promisify(this._conn.ltrim, this._conn)(key, start, end);
    }
}