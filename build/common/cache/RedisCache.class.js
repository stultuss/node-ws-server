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
exports.RedisCache = void 0;
const _ = require("underscore");
const redis = require("redis");
const AbstractCache_1 = require("./abstract/AbstractCache");
const Utility_1 = require("../Utility");
class RedisCache extends AbstractCache_1.default {
    /**
     * Initialize the cache class.
     *
     * @param {IRedisConfig} option
     */
    constructor(option) {
        super(option);
    }
    /**
     * Redis 配置初始化
     *
     * @param {IRedisConfig} option
     */
    _connect(option) {
        this._option = option;
        this._conn = this._createConn();
    }
    /**
     * 创建 Redis 客户端
     *
     * @return {RedisClient}
     * @private
     */
    _createConn() {
        // 手动连接的配置和连接池托管的属性有所不同，需要额外处理
        const self = this;
        const options = this._option.options;
        // 添加 retry_strategy 断线重连属性
        if (!options.retry_strategy) {
            options.retry_strategy = (retryOptions) => {
                // 服务器出现故障，连接被拒绝
                if (retryOptions.error && retryOptions.error.code == 'ECONNREFUSED') {
                    Utility_1.CommonTools.logger('Redis Client connect ECONNREFUSED', Utility_1.CommonTools.LOGGER_TYPE_ERROR, true);
                    // 关闭连接状态
                    self._connected = false;
                }
                // 重连次数超过 10 次
                if (retryOptions.total_retry_time > 10 * options.retry_delay) {
                    Utility_1.CommonTools.logger('Redis Client reconnect more than 10 time', Utility_1.CommonTools.LOGGER_TYPE_ERROR, true);
                }
                // 等待2000毫秒后断线重连
                return options.retry_delay;
            };
        }
        // 创建 RedisClient 连接
        const conn = redis.createClient(this._option.port, this._option.host, Object.assign(Object.assign({}, options), { return_buffers: true }));
        // 监听 redis 的 error 事件
        conn.on('error', () => {
            Utility_1.CommonTools.logger(`Redis connect ${self._option.host}:${self._option.port} failed...`, Utility_1.CommonTools.LOGGER_TYPE_WARN);
        });
        // 监听 redis 的连接事件
        conn.on('connect', () => {
            Utility_1.CommonTools.logger(`Redis connect ${self._option.host}:${self._option.port} succeed...`);
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
    _encodeValue(value) {
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
    _decodeValue(v) {
        let decodeValue;
        let value = v.toString();
        // 只有 json string 才需要解析 json，如果解析失败，直接透传。
        if (_.isString(value)) {
            try {
                decodeValue = JSON.parse(value);
                // 只有结构 Array，并且只有长度等于2，并且第一个元素是 'encode'的情况下，说明是 encodeValue 塞到 redis 中的。
                if (_.isArray(decodeValue) && decodeValue.length == 2 && decodeValue[0] == 'encode') {
                    decodeValue = decodeValue.pop();
                }
            }
            catch (e) {
                decodeValue = value;
            }
        }
        else {
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
    expire(key, expire) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!expire) {
                expire = this.genExpire();
            }
            let r = yield Utility_1.CommonTools.promisify(this._conn.expire, this._conn)(key, expire);
            return (r == 1);
        });
    }
    /**
     * 缓存过期操作
     *
     * @param {string} key
     * @return {Promise<boolean>}
     */
    ttl(key) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield Utility_1.CommonTools.promisify(this._conn.ttl, this._conn)(key);
        });
    }
    /**
     * 删除缓存
     *
     * @param {string} key
     * @return {Promise<boolean>}
     */
    del(key) {
        return __awaiter(this, void 0, void 0, function* () {
            let r = yield Utility_1.CommonTools.promisify(this._conn.del, this._conn)(key);
            return (r == 1);
        });
    }
    /**
     * 测试连接
     *
     * @return {Promise<string>}
     */
    ping() {
        return __awaiter(this, void 0, void 0, function* () {
            return yield Utility_1.CommonTools.promisify(this._conn.ping, this._conn)();
        });
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
    setBuffer(key, value, expire) {
        return __awaiter(this, void 0, void 0, function* () {
            let r = yield Utility_1.CommonTools.promisify(this._conn.set, this._conn)(key, value);
            yield this.expire(key, expire);
            return r;
        });
    }
    /**
     * 获取32进制Array
     *
     * @param {string} key
     * @return {Promise<any>}
     */
    getBuffer(key) {
        return __awaiter(this, void 0, void 0, function* () {
            let r = yield Utility_1.CommonTools.promisify(this._conn.get, this._conn)(key);
            if (_.isEmpty(r)) {
                return null;
            }
            return r;
        });
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
    incr(key, expire) {
        return __awaiter(this, void 0, void 0, function* () {
            let r = yield Utility_1.CommonTools.promisify(this._conn.incr, this._conn)(key);
            yield this.expire(key, expire);
            return r;
        });
    }
    /**
     * redis.incrby
     *
     * @param {string} key
     * @param {number} value
     * @param {number} expire
     * @return {Promise<number>}
     */
    incrby(key, value, expire) {
        return __awaiter(this, void 0, void 0, function* () {
            let r = yield Utility_1.CommonTools.promisify(this._conn.incrby, this._conn)(key, value);
            yield this.expire(key, expire);
            return r;
        });
    }
    /**
     * redis.get
     *
     * @param {string} key
     * @return {Promise<string>}
     */
    get(key) {
        return __awaiter(this, void 0, void 0, function* () {
            let r = yield Utility_1.CommonTools.promisify(this._conn.get, this._conn)(key);
            if (_.isEmpty(r)) {
                return null;
            }
            return this._decodeValue(r);
        });
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
    set(key, value, expire, needEncode = true) {
        return __awaiter(this, void 0, void 0, function* () {
            let encodeValue = (needEncode) ? this._encodeValue(value) : value;
            let r = yield Utility_1.CommonTools.promisify(this._conn.set, this._conn)(key, encodeValue);
            yield this.expire(key, expire);
            return (r == 'OK');
        });
    }
    /**
     * redis.mget
     *
     * @param {Array<string>} keys
     * @return {Promise<any[]>}
     */
    mGet(keys) {
        return __awaiter(this, void 0, void 0, function* () {
            if (_.isEmpty(keys)) {
                return null;
            }
            let responses = yield Utility_1.CommonTools.promisify(this._conn.mget, this._conn)(keys);
            if (_.isEmpty(responses)) {
                return null;
            }
            let r = [];
            for (let response of responses) {
                if (response == null) {
                    r.push(undefined); // FIXME, undefined == null，传入 null 和这边设定的 undefined 是无法区分的。
                }
                else {
                    r.push(this._decodeValue(response));
                }
            }
            return r;
        });
    }
    /**
     * redis.mset
     *
     * @param {Object} obj
     * @param {number} expire
     * @return {Promise<boolean>}
     */
    mSet(obj, expire) {
        return __awaiter(this, void 0, void 0, function* () {
            if (_.isEmpty(obj)) {
                return null;
            }
            let items = [];
            for (let key of Object.keys(obj)) {
                items.push(key);
                items.push(this._encodeValue(obj[key]));
            }
            let r = yield Utility_1.CommonTools.promisify(this._conn.mset, this._conn)(items);
            for (let key of Object.keys(obj)) {
                yield this.expire(key, expire);
            }
            return (r == 1);
        });
    }
    /**
     * redis.add
     *
     * @param {string} key
     * @param value
     * @param {number} expire
     * @return {Promise<boolean>}
     */
    add(key, value, expire) {
        return __awaiter(this, void 0, void 0, function* () {
            let r = yield Utility_1.CommonTools.promisify(this._conn.setnx, this._conn)(key, this._encodeValue(value));
            yield this.expire(key, expire);
            return (r == 1);
        });
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
    hGetAll(key) {
        return __awaiter(this, void 0, void 0, function* () {
            let r = yield Utility_1.CommonTools.promisify(this._conn.hgetall, this._conn)(key);
            if (_.isEmpty(r)) {
                return null;
            }
            for (let key of Object.keys(r)) {
                r[key] = this._decodeValue(r[key]);
            }
            return r;
        });
    }
    /**
     * redis.hget
     *
     * @param {string} key
     * @param {number | string} field
     * @return {Promise<Object>}
     */
    hGet(key, field) {
        return __awaiter(this, void 0, void 0, function* () {
            if (key == null || field == null) {
                return null;
            }
            let r = yield Utility_1.CommonTools.promisify(this._conn.hget, this._conn)(key, field);
            if (_.isEmpty(r)) {
                return null;
            }
            return this._decodeValue(r);
        });
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
    hSet(key, field, value, expire) {
        return __awaiter(this, void 0, void 0, function* () {
            let r = yield Utility_1.CommonTools.promisify(this._conn.hset, this._conn)(key, field, this._encodeValue(value));
            yield this.expire(key, expire);
            return (r == 1);
        });
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
    hincrby(key, field, value, expire) {
        return __awaiter(this, void 0, void 0, function* () {
            let r = yield Utility_1.CommonTools.promisify(this._conn.hincrby, this._conn)(key, field, value);
            yield this.expire(key, expire);
            return r;
        });
    }
    /**
     * redis.hmget
     *
     * @param {string} key
     * @param {Array<number | string>} fields
     * @return {Promise<Object>}
     */
    hMGet(key, fields) {
        return __awaiter(this, void 0, void 0, function* () {
            if (_.isEmpty(fields) || _.isArray(fields) == false) {
                return null;
            }
            let r = yield Utility_1.CommonTools.promisify(this._conn.hmget, this._conn)(key, fields);
            if (_.isEmpty(r)) {
                return null;
            }
            for (let key of Object.keys(r)) {
                r[key] = this._decodeValue(r[key]);
            }
            return r;
        });
    }
    /**
     * redis.hmset
     *
     * @param {string} key
     * @param {Object | Array<any>} obj
     * @param {number} expire
     * @return {Promise<boolean>}
     */
    hMSet(key, obj, expire) {
        return __awaiter(this, void 0, void 0, function* () {
            if (_.isEmpty(obj)) {
                return null;
            }
            let items = [];
            for (let key of Object.keys(obj)) {
                items.push(key);
                items.push(this._encodeValue(obj[key]));
            }
            let r = yield Utility_1.CommonTools.promisify(this._conn.hmset, this._conn)(key, items);
            if (_.isEmpty(r)) {
                return false;
            }
            yield this.expire(key, expire);
            return (r == 'OK');
        });
    }
    /**
     * redis.hdel
     *
     * @param {string} key
     * @param {Array<number | string>} fields
     * @return {Promise<boolean>}
     */
    hDel(key, fields) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!fields) {
                return false;
            }
            let r = yield Utility_1.CommonTools.promisify(this._conn.hdel, this._conn)(key, fields);
            return (r == 1);
        });
    }
    /**
     * redis.hlen
     *
     * @param {string} key
     * @return {Promise<number>}
     */
    hLen(key) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield Utility_1.CommonTools.promisify(this._conn.hlen, this._conn)(key);
        });
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
    zadd(key, score, member, expire) {
        return __awaiter(this, void 0, void 0, function* () {
            let r = yield Utility_1.CommonTools.promisify(this._conn.zadd, this._conn)(key, score, member);
            yield this.expire(key, expire);
            return r;
        });
    }
    /**
     * 从排行中移除一个 member
     *
     * @param {string} key
     * @param {string | number} member
     * @return {Promise<boolean>}
     */
    zrem(key, member) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield Utility_1.CommonTools.promisify(this._conn.zrem, this._conn)(key, member);
        });
    }
    /**
     * 移除排行 key 中，指定排名(rank)区间内的所有成员。
     *
     * @param {string} key
     * @param {number} start
     * @param {number} stop
     * @return {Promise<boolean>}
     */
    zremrangebyrank(key, start, stop) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield Utility_1.CommonTools.promisify(this._conn.zremrangebyrank, this._conn)(key, start, stop);
        });
    }
    /**
     * 移除排行 key 中，指定排名(score)区间内的所有成员。
     *
     * @param {string} key
     * @param {number} min
     * @param {number} max
     * @return {Promise<boolean>}
     */
    zremrangebyscore(key, min, max) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield Utility_1.CommonTools.promisify(this._conn.zremrangebyscore, this._conn)(key, min, max);
        });
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
    zincrby(key, increment, member, expire) {
        return __awaiter(this, void 0, void 0, function* () {
            let r = yield Utility_1.CommonTools.promisify(this._conn.zincrby, this._conn)(key, increment, member);
            yield this.expire(key, expire);
            return r.toString();
        });
    }
    /**
     * 返回成员的 score
     *
     * @param {string} key
     * @param {string | number} member
     * @return {Promise<number>}
     */
    zscore(key, member) {
        return __awaiter(this, void 0, void 0, function* () {
            let score = yield Utility_1.CommonTools.promisify(this._conn.zscore, this._conn)(key, member);
            return Math.floor(score);
        });
    }
    /**
     * 返回排行中成员 member 的排名（从小到大，score 越小排名越高）
     *
     * @param {string} key
     * @param {string | number} member
     * @return {Promise<number>}
     */
    zrank(key, member) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield Utility_1.CommonTools.promisify(this._conn.zrank, this._conn)(key, member);
        });
    }
    /**
     * 返回排行中成员 member 的排名（从大到小，score 越大排名越高）
     *
     * @param {string} key
     * @param {string | number} member
     * @return {Promise<number>}
     */
    zrevrank(key, member) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield Utility_1.CommonTools.promisify(this._conn.zrevrank, this._conn)(key, member);
        });
    }
    /**
     * 返回排行长度
     *
     * @param {string} key
     * @return {Promise<number>}
     */
    zcard(key) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield Utility_1.CommonTools.promisify(this._conn.zcard, this._conn)(key);
        });
    }
    /**
     * 返回排行中，指定 score 区间内的成员数量
     *
     * @param {string} key
     * @param {number} minScore
     * @param {number} maxScore
     * @return {Promise<number>}
     */
    zcount(key, minScore, maxScore) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield Utility_1.CommonTools.promisify(this._conn.zcount, this._conn)(key, minScore, maxScore);
        });
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
    zrange(key, start, stop, withScores = false) {
        return __awaiter(this, void 0, void 0, function* () {
            let response = [];
            if (!withScores) {
                let r = yield Utility_1.CommonTools.promisify(this._conn.zrange, this._conn)(key, start, stop);
                if (_.isEmpty(r)) {
                    return response;
                }
                for (let i = 0; i < r.length; i++) {
                    response.push(r.shift().toString());
                }
            }
            else {
                let r = yield Utility_1.CommonTools.promisify(this._conn.zrange, this._conn)(key, start, stop, 'WITHSCORES');
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
        });
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
    zrangebyscore(key, min, max, withScores = false) {
        return __awaiter(this, void 0, void 0, function* () {
            let response = [];
            if (!withScores) {
                let r = yield Utility_1.CommonTools.promisify(this._conn.zrangebyscore, this._conn)(key, min, max);
                if (_.isEmpty(r)) {
                    return response;
                }
                for (let i = 0; i < r.length; i++) {
                    response.push(r.shift().toString());
                }
            }
            else {
                let r = yield Utility_1.CommonTools.promisify(this._conn.zrangebyscore, this._conn)(key, min, max, 'WITHSCORES');
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
        });
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
    zrevrange(key, start, stop, withScores = false) {
        return __awaiter(this, void 0, void 0, function* () {
            let response = [];
            if (!withScores) {
                let r = yield Utility_1.CommonTools.promisify(this._conn.zrevrange, this._conn)(key, start, stop);
                if (_.isEmpty(r)) {
                    return response;
                }
                for (let i = 0; i < r.length; i++) {
                    response.push(r.shift().toString());
                }
            }
            else {
                let r = yield Utility_1.CommonTools.promisify(this._conn.zrevrange, this._conn)(key, start, stop, 'WITHSCORES');
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
        });
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
    zrevrangebyscore(key, max, min, withScores = false) {
        return __awaiter(this, void 0, void 0, function* () {
            let response = [];
            if (!withScores) {
                let r = yield Utility_1.CommonTools.promisify(this._conn.zrevrangebyscore, this._conn)(key, max, min);
                if (_.isEmpty(r)) {
                    return response;
                }
                for (let i = 0; i < r.length; i++) {
                    response.push(r.shift().toString());
                }
            }
            else {
                let r = yield Utility_1.CommonTools.promisify(this._conn.zrevrangebyscore, this._conn)(key, max, min, 'WITHSCORES');
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
        });
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
    sadd(key, member, expire) {
        return __awaiter(this, void 0, void 0, function* () {
            let r;
            if (_.isArray(member)) {
                if (member.length == 0) {
                    return r;
                }
                let members = [];
                for (let v of member) {
                    members.push(this._encodeValue(v));
                }
                r = yield Utility_1.CommonTools.promisify(this._conn.sadd, this._conn)(key, [...Array.from(members)]);
            }
            else {
                let encodeValue = this._encodeValue(member);
                r = yield Utility_1.CommonTools.promisify(this._conn.sadd, this._conn)(key, encodeValue);
            }
            yield this.expire(key, expire);
            return r;
        });
    }
    /**
     * 返回集合长度
     *
     * @param {string} key
     * @return {Promise<number>}
     */
    scard(key) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield Utility_1.CommonTools.promisify(this._conn.scard, this._conn)(key);
        });
    }
    /**
     * 随机返回一个 member，并从集合中删除
     *
     * @param {string} key
     * @return {Promise<number>}
     */
    spop(key) {
        return __awaiter(this, void 0, void 0, function* () {
            let r = yield Utility_1.CommonTools.promisify(this._conn.spop, this._conn)(key);
            if (_.isEmpty(r)) {
                return null;
            }
            return this._decodeValue(r);
        });
    }
    /**
     * 随机返回 member
     *
     * @param {string} key
     * @return {Promise<any>}
     */
    srandmember(key) {
        return __awaiter(this, void 0, void 0, function* () {
            let r = yield Utility_1.CommonTools.promisify(this._conn.srandmember, this._conn)(key);
            if (_.isEmpty(r)) {
                return null;
            }
            return this._decodeValue(r);
        });
    }
    /**
     * 随机返回 member
     *
     * @param {string} key
     * @param {number} count
     * @return {Promise<any | any[]>}
     */
    srandmembers(key, count) {
        return __awaiter(this, void 0, void 0, function* () {
            let r = yield Utility_1.CommonTools.promisify(this._conn.srandmember, this._conn)(key, count);
            let response = [];
            if (_.isEmpty(r)) {
                return response;
            }
            for (let v of r) {
                response.push(this._decodeValue(v));
            }
            return response;
        });
    }
    /**
     * 删除一个 member
     *
     * @param {string} key
     * @param {any} member
     * @return {Promise<any>}
     */
    srem(key, member) {
        return __awaiter(this, void 0, void 0, function* () {
            let encodeValue = this._encodeValue(member);
            return yield Utility_1.CommonTools.promisify(this._conn.srem, this._conn)(key, encodeValue);
        });
    }
    /**
     * 判断 member 是否存在
     *
     * @param {string} key
     * @param {any} member
     * @return {Promise<any>}
     */
    sismember(key, member) {
        return __awaiter(this, void 0, void 0, function* () {
            let encodeValue = this._encodeValue(member);
            let r = yield Utility_1.CommonTools.promisify(this._conn.sismember, this._conn)(key, encodeValue);
            return r == 1;
        });
    }
    /**
     * 列出所有 member
     *
     * @param {string} key
     * @return {Promise<any>}
     */
    smembers(key) {
        return __awaiter(this, void 0, void 0, function* () {
            let r = yield Utility_1.CommonTools.promisify(this._conn.smembers, this._conn)(key);
            let response = [];
            if (_.isEmpty(r)) {
                return response;
            }
            for (let v of r) {
                response.push(this._decodeValue(v));
            }
            return response;
        });
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
    lrange(key, start, stop) {
        return __awaiter(this, void 0, void 0, function* () {
            let r = yield Utility_1.CommonTools.promisify(this._conn.lrange, this._conn)(key, start, stop);
            let response = [];
            if (_.isEmpty(r)) {
                return response;
            }
            for (let v of r) {
                response.push(this._decodeValue(v));
            }
            return response;
        });
    }
    /**
     * 返回列表长度
     *
     * @param {string} key
     * @return {Promise<number>}
     */
    llen(key) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield Utility_1.CommonTools.promisify(this._conn.llen, this._conn)(key);
        });
    }
    /**
     * 移除并返回列表 key 的头元素。
     *
     * @param {string} key
     * @return {Promise<any>}
     */
    lpop(key) {
        return __awaiter(this, void 0, void 0, function* () {
            let r = yield Utility_1.CommonTools.promisify(this._conn.lpop, this._conn)(key);
            if (_.isEmpty(r)) {
                return null;
            }
            return this._decodeValue(r);
        });
    }
    /**
     * 将一个 value 插入到列表 key 的表头
     *
     * @param {string} key
     * @param {any} value
     * @param {number} expire
     * @return {Promise<number>}
     */
    lpush(key, value, expire) {
        return __awaiter(this, void 0, void 0, function* () {
            let encodeValue = this._encodeValue(value);
            let r = yield Utility_1.CommonTools.promisify(this._conn.lpush, this._conn)(key, encodeValue);
            yield this.expire(key, expire);
            return r;
        });
    }
    /**
     * 将一个 value 插入到列表 key 的表尾。
     *
     * @param {string} key
     * @param {any} value
     * @param {number} expire
     * @return {Promise<number>}
     */
    rpush(key, value, expire) {
        return __awaiter(this, void 0, void 0, function* () {
            let encodeValue = this._encodeValue(value);
            let r = yield Utility_1.CommonTools.promisify(this._conn.rpush, this._conn)(key, encodeValue);
            yield this.expire(key, expire);
            return r;
        });
    }
    /**
     * 对一个列表进行修剪(trim)，就是说，让列表只保留指定区间内的元素，不在指定区间之内的元素都将被删除。
     *
     * @param {string} key
     * @param {number} start
     * @param {number} end
     * @return {Promise<number>}
     */
    ltrim(key, start, end) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield Utility_1.CommonTools.promisify(this._conn.ltrim, this._conn)(key, start, end);
        });
    }
}
exports.RedisCache = RedisCache;
