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
exports.ShellTools = exports.CryptoTools = exports.SharingTools = exports.JsonTools = exports.RequestTools = exports.MathTools = exports.TimeTools = exports.CommonTools = void 0;
const _ = require("underscore");
const crypto = require("crypto");
const qs = require("querystring");
const util = require("util");
const request = require("request");
const os = require("os");
const child_process_1 = require("child_process");
const LoggerManager_1 = require("./logger/LoggerManager");
const ErrorFormat_1 = require("./exception/ErrorFormat");
const MIN_REQUEST_DELAY = 500;
const MAX_REQUEST_DELAY = 7000;
const MAX_RECONNECT_COUNT = 3; // normal connect count:1, reconnect count:3, total count: 1 + 3
/**
 * 通用工具库
 */
var CommonTools;
(function (CommonTools) {
    CommonTools.LOGGER_TYPE_ERROR = 0;
    CommonTools.LOGGER_TYPE_WARN = 1;
    CommonTools.LOGGER_TYPE_INFO = 2;
    CommonTools.LOGGER_TYPE_DEBUG = 3;
    /**
     * 记录日志
     */
    function logger(text, level = CommonTools.LOGGER_TYPE_DEBUG, isShow = false) {
        // 是否打印日志
        if (isShow === true) {
            console.log(text);
        }
        switch (level) {
            case CommonTools.LOGGER_TYPE_ERROR:
                LoggerManager_1.LoggerManager.instance().error(text);
                break;
            case CommonTools.LOGGER_TYPE_WARN:
                LoggerManager_1.LoggerManager.instance().warn(text);
                break;
            case CommonTools.LOGGER_TYPE_INFO:
                LoggerManager_1.LoggerManager.instance().info(text);
                break;
            case CommonTools.LOGGER_TYPE_DEBUG:
                LoggerManager_1.LoggerManager.instance().debug(text);
                break;
            default:
                LoggerManager_1.LoggerManager.instance().info(text);
                break;
        }
    }
    CommonTools.logger = logger;
    /**
     * 随机字符串
     * @return {string}
     */
    function randStr(lenght = 4) {
        let p = 'ABCDEFGHKMNPQRSTUVWXYZ3456789';
        let str = '';
        for (let i = 0; i < lenght; i++) {
            str += p.charAt(Math.random() * p.length | 0);
        }
        return str;
    }
    CommonTools.randStr = randStr;
    /**
     * 获取 IP
     *
     * @param {http.IncomingMessage} req
     */
    function getIP(req) {
        if (req && req.headers['x-real-ip']) {
            return req.headers['x-real-ip'];
        }
        if (req && req.headers['x-forwarded-for'] && typeof req.headers['x-forwarded-for'] == 'string') {
            return req.headers['x-forwarded-for'].toString().split(',')[0];
        }
        let ipAddress;
        if (req) {
            if (req.connection && req.connection.remoteAddress) {
                ipAddress = req.connection.remoteAddress;
            }
            if (!ipAddress && req.socket && req.socket.remoteAddress) {
                ipAddress = req.socket.remoteAddress;
            }
        }
        return ipAddress;
    }
    CommonTools.getIP = getIP;
    /**
     * generate token key via md5
     *
     * @param {string | number} key1
     * @param {string | number} key2
     * @param {string | number} key3
     * @return {string}
     */
    function genString(key1, key2, key3 = 0) {
        return CryptoTools.md5(`${key1},${key2},${key3}`);
    }
    CommonTools.genString = genString;
    /**
     * 数字区间
     *
     * @param {number} start
     * @param {number} end
     * @param {number} interval
     * @return {number[]}
     */
    function range(start, end, interval = 1) {
        const list = [];
        for (let i = start; i <= end; i += interval) {
            list.push(i);
        }
        return list;
    }
    CommonTools.range = range;
    /**
     * 数组排序
     *
     * @param {Object[]} list
     * @param {string} field
     * @param {boolean} desc
     * @return {Object[]}
     */
    function sort(list, field, desc = true) {
        return list.sort((a, b) => {
            const anum = a[field] || (desc ? 0 : Infinity);
            const bnum = b[field] || (desc ? 0 : Infinity);
            if ((desc && anum > bnum) || (!desc && anum < bnum)) {
                return -1;
            }
            return (anum === bnum) ? 0 : 1;
        });
    }
    CommonTools.sort = sort;
    /**
     * 填充 string
     *
     * @param {string | number} str
     * @param {number} length
     * @param {string} context
     * @return {string}
     */
    function padding(str, length, context = '0') {
        let numLength = (str.toString()).length;
        let paddingLen = (length > numLength) ? length - numLength + 1 || 0 : 0;
        return Array(paddingLen).join(context) + str;
    }
    CommonTools.padding = padding;
    /**
     * Refresh regularly generated resource according to now time & last time resource charged time.
     *
     * @param {number} resource
     * @param {number} lastChargedTime
     * @param {number} limit
     * @param {number} recoveryInterval
     * @param {number} recoveryAmount
     * @param {number} reqTime
     * @return any
     */
    function refreshResource(resource, lastChargedTime, limit, recoveryInterval, recoveryAmount, reqTime) {
        // prepare params
        const recoveryTimes = Math.floor((reqTime - lastChargedTime) / recoveryInterval);
        if (recoveryTimes) { // resource recovery time reached, go through following logics
            if (resource < limit) { // if resource is smaller than limit, means resource can recover
                resource += recoveryTimes * recoveryAmount;
                if (resource > limit) { // resource recovery exceeded the limit, change it to limit
                    resource = limit;
                }
            }
            // if resource recovered, time need to be set to now
            lastChargedTime += recoveryTimes * recoveryInterval;
        }
        return [resource, lastChargedTime];
    }
    CommonTools.refreshResource = refreshResource;
    /**
     * util.format()
     */
    CommonTools.format = util.format;
    /**
     * 将 callback 的方法转成 promise 方法
     *
     * @param {Function} fn
     * @param {any} receiver
     * @return {Function}
     */
    function promisify(fn, receiver) {
        return (...args) => {
            return new Promise((resolve, reject) => {
                fn.apply(receiver, [...args, (err, res) => {
                        return err ? reject(err) : resolve(res);
                    }]);
            });
        };
    }
    CommonTools.promisify = promisify;
    /**
     * 完全冻结对象中的所有对象
     *
     * @param {Object} obj
     */
    function deepFreeze(obj) {
        Object.freeze(obj);
        let keys = Object.keys(obj);
        for (let i of keys) {
            let v = obj[keys[i]];
            if (typeof v !== 'object' || Object.isFrozen(v)) {
                continue;
            }
            deepFreeze(v);
        }
    }
    CommonTools.deepFreeze = deepFreeze;
    /**
     * 完全合并对象中的所有对象
     *
     * @param {Object} obj1
     * @param {Object} obj2
     */
    function deepMerge(obj1, obj2) {
        for (let k in obj2) {
            obj1[k] = (obj1[k] && obj1[k].toString() === '[object Object]') ? deepMerge(obj1[k], obj2[k]) : obj1[k] = obj2[k];
        }
        return obj1;
    }
    CommonTools.deepMerge = deepMerge;
    /**
     * 暂停
     *
     * @param {number} ms
     * @return {Promise<void>}
     */
    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    CommonTools.sleep = sleep;
    /**
     * 获取本机 ip 地址
     */
    function eth0() {
        let iptable = {};
        let network = os.networkInterfaces();
        for (let key in network) {
            network[key].forEach((details, alias) => {
                if (details.family == 'IPv4') {
                    iptable[key + (alias ? ':' + alias : '')] = details.address;
                }
            });
        }
        return iptable.hasOwnProperty('eth0') ? iptable.eth0 : '127.0.0.1';
    }
    CommonTools.eth0 = eth0;
})(CommonTools = exports.CommonTools || (exports.CommonTools = {}));
/**
 * 时间函数工具库
 */
var TimeTools;
(function (TimeTools) {
    TimeTools.EMPTY_TIME = '0000-00-00 00:00:00'; // default value in DB
    TimeTools.TIMESTAMP_INIT_TIME = '1970-01-01 00:00:00';
    // time constants, all in seconds
    TimeTools.MINUTE = 60;
    TimeTools.MINUTES5 = 300;
    TimeTools.MINUTES10 = 600;
    TimeTools.MINUTES30 = 1800;
    TimeTools.HOUR = 3600;
    TimeTools.HOURS4 = 14400;
    TimeTools.HOURS6 = 21600;
    TimeTools.HOURS8 = 28800;
    TimeTools.HOURS12 = 43200;
    TimeTools.HOURS24 = 86400;
    TimeTools.DAY2 = 172800;
    TimeTools.DAY3 = 259200;
    TimeTools.DAY7 = 604800;
    TimeTools.DEFAULT_EMPTY_TIME = 1514736000;
    /**
     * 获取 Date 对象
     *
     * @return {Date}
     */
    function getDate(timestamp) {
        if (timestamp === 0) {
            timestamp = TimeTools.DEFAULT_EMPTY_TIME;
        }
        if (timestamp) {
            let millisecond = secondToMilli(timestamp);
            return new Date(millisecond);
        }
        return new Date();
    }
    TimeTools.getDate = getDate;
    /**
     * 获取时间戳
     *
     * @param {number} timestamp
     * @return {number}
     */
    function getTime(timestamp) {
        let millisecond = secondToMilli(timestamp);
        return milliToSecond(getDate(millisecond).getTime());
    }
    TimeTools.getTime = getTime;
    /**
     * 获取时间的当日 0 点
     *
     * @param {number} timestamp
     * @return {number}
     */
    function getDayTime(timestamp) {
        let millisecond = secondToMilli(timestamp);
        let date = getDate(millisecond);
        date.setHours(0, 0, 0, 0);
        return milliToSecond(date.getTime());
    }
    TimeTools.getDayTime = getDayTime;
    /**
     * 获取时间的昨日 0 点
     *
     * @param {number} timestamp
     * @return {number}
     */
    function getPrevDayTime(timestamp) {
        return getDayTime(timestamp) - TimeTools.HOURS24;
    }
    TimeTools.getPrevDayTime = getPrevDayTime;
    /**
     * 获取时间的明日 0 点
     *
     * @param {number} timestamp
     * @return {number}
     */
    function getNextDayTime(timestamp) {
        return getDayTime(timestamp) + TimeTools.HOURS24;
    }
    TimeTools.getNextDayTime = getNextDayTime;
    /**
     * 将毫秒转成秒
     *
     * @param {number} timestamp
     * @return {number}
     */
    function milliToSecond(timestamp) {
        if (!timestamp) {
            return timestamp;
        }
        if (timestamp.toString().length < 13) {
            timestamp = secondToMilli(timestamp);
        }
        return Math.floor(timestamp / 1000);
    }
    TimeTools.milliToSecond = milliToSecond;
    /**
     * 将毫秒转成秒
     *
     * @param {number} timestamp
     * @return {number}
     */
    function secondToMilli(timestamp) {
        if (!timestamp) {
            return timestamp;
        }
        if (timestamp && timestamp.toString().length > 10) {
            timestamp = milliToSecond(timestamp);
        }
        return Math.floor(timestamp * 1000);
    }
    TimeTools.secondToMilli = secondToMilli;
    /**
     * 获取到达次日 0 点需要多少秒
     *
     * @param {number} timestamp
     * @return {number}
     */
    function getNextDayRemainSecond(timestamp) {
        return getDayTime(timestamp) + TimeTools.HOURS24 - ((timestamp) ? timestamp : TimeTools.getTime());
    }
    TimeTools.getNextDayRemainSecond = getNextDayRemainSecond;
    /**
     * 获取当前时间点到目标时间点还需要多少秒
     *
     * @return {number}
     */
    function getRemainSecond(targetTime, beginTime) {
        const target = milliToSecond(targetTime);
        const begin = beginTime || TimeTools.getTime();
        return (target < begin) ? 0 : target - begin;
    }
    TimeTools.getRemainSecond = getRemainSecond;
    /**
     * 计算当前循环轮数
     *
     * @param {number} time
     * @param {number} startTime
     * @param {number} coolDown
     * @return {number}
     */
    function getCycleRound(time, startTime, coolDown) {
        const curTime = (time) ? getTime() : time;
        return Math.floor((curTime - startTime) / coolDown);
    }
    TimeTools.getCycleRound = getCycleRound;
    /**
     * 计算当前循环的开始时间
     *
     * @param {number} time
     * @param {number} startTime
     * @param {number} coolDown
     * @return {number}
     */
    function getCycleRoundTime(time, startTime, coolDown) {
        return startTime + (getCycleRound(time, startTime, coolDown)) * coolDown;
    }
    TimeTools.getCycleRoundTime = getCycleRoundTime;
    /**
     * 计算下一次循环轮次
     *
     * @param {number} time
     * @param {number} startTime
     * @param {number} coolDown
     * @return {number}
     */
    function getNextCycleRound(time, startTime, coolDown) {
        return getCycleRound(time, startTime, coolDown) + 1;
    }
    TimeTools.getNextCycleRound = getNextCycleRound;
    /**
     * 计算下一次循环的开始时间
     *
     * @param {number} time
     * @param {number} startTime
     * @param {number} coolDown
     * @return {number}
     */
    function getNextCycleRoundTime(time, startTime, coolDown) {
        return startTime + (getCycleRound(time, startTime, coolDown) + 1) * coolDown;
    }
    TimeTools.getNextCycleRoundTime = getNextCycleRoundTime;
})(TimeTools = exports.TimeTools || (exports.TimeTools = {}));
/**
 * 数学函数工具库
 */
var MathTools;
(function (MathTools) {
    /**
     * 乱序
     *
     * @param list
     */
    function shuffle(list) {
        list.sort(() => Math.random() - 0.5);
        return list;
    }
    MathTools.shuffle = shuffle;
    /**
     * Get Random Element From Array. And if probability is 0, then return this bonus id directly without random logic. <br/>
     * Probability logic: The percentage probability means is determined by the total sum value.
     *
     * <pre>
     * e.g the total sum value is 10000
     * bonusId => probability
     * 10      => 500 5%
     * 11      => 500 5%
     * 12      => 500 5%
     * 13      => 400 4%
     * 14      => 50 0.5%
     * 15      => 50 0.5%
     * 16      => 1500 15%
     * 17      => 1500 15%
     * 18      => 5000 50%
     * </pre>
     *
     * @param {Object} probabilityList
     * <pre>
     *     {
     *          bonusId: probability,
     *          ...
     *     }
     * </pre>
     * @return {number}
     */
    function getRandomElementByProbability(probabilityList) {
        let all = 0;
        let result = null;
        let probabilityKeys = Object.keys(probabilityList);
        probabilityKeys.forEach((bonusId) => {
            let probability = probabilityList[bonusId];
            // 配置 probability = 0，则代表必中
            if (probability == 0) {
                // result = bonusId;
                // return;
            }
            all += probability;
        });
        if (result == null) {
            let seed = getRandomFromRange(0, all);
            let sum = 0;
            probabilityKeys.forEach((bonusId) => {
                if (result != null) {
                    return;
                }
                // get bonus id by probability
                sum += probabilityList[bonusId];
                if (seed <= sum) {
                    result = bonusId;
                    return;
                }
            });
        }
        return result;
    }
    MathTools.getRandomElementByProbability = getRandomElementByProbability;
    /**
     * 获取随机数，范围 min <= x <= max
     *
     * @param {number} min
     * @param {number} max
     * @return {number}
     */
    function getRandomFromRange(min, max) {
        // min is bigger than max, exchange value
        if (min >= max) {
            min = min ^ max;
            max = min ^ max;
            min = min ^ max;
        }
        return Math.round(Math.random() * (max - min) + min);
    }
    MathTools.getRandomFromRange = getRandomFromRange;
    /**
     * Calculate whether given percentage rate hit or not.
     *
     * @param {number} rate
     * <pre>
     * shall be 1-100
     * if float, it should be 0.xx and will be multiplied by 100 (0.xx * 100 => xx%)
     * </pre>
     * @return {boolean} hit
     */
    function calcPercentageRate(rate) {
        // 浮点数处理
        if (!isNaN(rate) && rate.toString().indexOf('.') != -1) {
            rate = rate * 100; // convert 0.3 => 30%
        }
        let hit = false;
        if (rate <= 0) {
            // do nothing, $hit already FALSE
        }
        else {
            if (rate >= 100) {
                hit = true;
            }
            else {
                let randomRate = getRandomFromRange(1, 100);
                if (randomRate <= rate) {
                    hit = true;
                }
            }
        }
        return hit;
    }
    MathTools.calcPercentageRate = calcPercentageRate;
})(MathTools = exports.MathTools || (exports.MathTools = {}));
/**
 * HTTP Request 工具库
 */
var RequestTools;
(function (RequestTools) {
    RequestTools.methods = {
        'post': request.post,
        'get': request.get
    };
    /**
     * 生成签名
     *
     * @param {Object} query
     * @param {string} secret
     * @param {string} ignore
     * @param {boolean} keyInQuery
     * @private
     */
    function addSignature(query, secret = '', ignore = [], keyInQuery = false) {
        let queryKeys = Object.keys(query).sort();
        let queryStr = '';
        let i = 0;
        for (let key of queryKeys) {
            if (query[key] === '' || query[key] === undefined || query[key] === null) {
                delete query[key];
                continue;
            }
            if (ignore.indexOf(key) !== -1) {
                continue;
            }
            if (i !== 0) {
                queryStr += '&';
            }
            queryStr += `${key}=${query[key]}`;
            i++;
        }
        query.signature = CryptoTools.md5(queryStr + `&${secret}`);
        // CommonTools.logger(`[SIGN] signature: ${query.signature} queryStr: ${queryStr}&${secret}`);
        return query;
    }
    RequestTools.addSignature = addSignature;
    /**
     * 封装网络请求
     *
     * @param {"get" | "post"} requestMethod
     * @param {string} url
     * @param {Object} params
     * @param {string} dataType
     * @param {number} timeout
     * @param {request.CoreOptions} coreOptions
     * @return {Promise<any>}
     */
    function httpRequest(requestMethod, url, params, dataType = 'json', timeout = 1000, coreOptions) {
        return __awaiter(this, void 0, void 0, function* () {
            // 组合 request option 配置
            let options = coreOptions || {};
            // 如果没有 timeout，则不设置过期时间
            if (timeout) {
                options.timeout = timeout;
            }
            // 如果参数不为空，则进行参数拼接
            if (!_.isEmpty(params)) {
                for (let key of Object.keys(params)) {
                    if (params[key] == null) {
                        delete params[key];
                    }
                }
                if (requestMethod == 'post') {
                    options.form = params;
                }
                else {
                    url += '?' + qs.stringify(params);
                }
            }
            let method = requestMethod.toLowerCase();
            if (!RequestTools.methods[method]) {
                throw new ErrorFormat_1.ErrorFormat(700510, method);
            }
            let res = yield makeRequest(RequestTools.methods[method], url, options);
            CommonTools.logger(`[HTTP] url: ${url}, res: ${(_.isObject(res)) ? JSON.stringify(res) : res.replace(/\r\n|\n|\s+/g, '')}, options: ${JSON.stringify(options)}`, CommonTools.LOGGER_TYPE_DEBUG);
            // 当 dataType = json 或者返回结果为空时候，直接透传
            if (res == null || dataType != 'json' || _.isObject(res)) {
                return res;
            }
            // body 返回的结果为 json 字符串
            return JsonTools.parse(res.replace(/\r\n|\n|\s+/g, ''));
        });
    }
    RequestTools.httpRequest = httpRequest;
    /**
     * 处理 RequestTools 请求，由于三方 API 的返回结构中可能带有报错，所以需要将 RequestTools 返回数据透传到方法外，由封装三方 API 的 class 单独处理
     *
     * @param {RequestTools.IRequest} fn
     * @param {string} url
     * @param {request.CoreOptions} options
     * @param {number} reconnectCount
     * @return {Promise<string>}
     */
    function makeRequest(fn, url, options, reconnectCount = 1) {
        return new Promise((resolve, reject) => {
            let completeCallback = (err, response, body = null) => {
                if (err) {
                    reject(err);
                }
                else if (response && response.statusCode != 200) {
                    if (response.statusCode == 429 && reconnectCount <= MAX_RECONNECT_COUNT) {
                        reconnectCount++;
                        // in case we hit RequestTools 429, delay requests by random timeout in between minRequestDelay and maxRequestDelay
                        setTimeout(() => {
                            fn(url, options, completeCallback);
                        }, MathTools.getRandomFromRange(MIN_REQUEST_DELAY, MAX_REQUEST_DELAY));
                    }
                    else {
                        reject(new Error(`HTTP Status Code: ${response.statusCode}`));
                    }
                }
                else {
                    resolve(body);
                }
            };
            fn(url, options, completeCallback);
        });
    }
})(RequestTools = exports.RequestTools || (exports.RequestTools = {}));
var JsonTools;
(function (JsonTools) {
    /**
     * 解析 JSON
     *
     * @param {string} str
     * @param {any} defaultValue
     * @return {Object}
     */
    function parse(str, defaultValue = {}) {
        try {
            return JSON.parse(str);
        }
        catch (e) {
            return defaultValue;
        }
    }
    JsonTools.parse = parse;
    /**
     * 字符串转 json
     *
     * @param {string} str
     * @return {Object}
     */
    function stringToObj(str) {
        return JSON.parse(str);
    }
    JsonTools.stringToObj = stringToObj;
    /**
     *json 转字符串
     *
     * @param {Object} obj
     * @return {string}
     */
    function objToString(obj) {
        return JSON.stringify(obj);
    }
    JsonTools.objToString = objToString;
    /**
     * map 转换为 json
     *
     * @param {Map<any, any>} map
     * @return {string}
     */
    function mapToString(map) {
        return JSON.stringify(JsonTools.mapToObj(map));
    }
    JsonTools.mapToString = mapToString;
    /**
     * json 转换为 map
     *
     * @param {string} str
     * @return {Map<any, any>}
     */
    function stringToMap(str) {
        return JsonTools.objToMap(JSON.parse(str));
    }
    JsonTools.stringToMap = stringToMap;
    /**
     * map 转化为 obj
     *
     * @param {Map<any, any>} map
     * @return {Object}
     */
    function mapToObj(map) {
        let obj = Object.create(null);
        for (let [k, v] of map) {
            obj[k] = v;
        }
        return obj;
    }
    JsonTools.mapToObj = mapToObj;
    /**
     * obj 转换为 map
     *
     * @param {Object} obj
     * @return {Map<any, any>}
     */
    function objToMap(obj) {
        let strMap = new Map();
        for (let k of Object.keys(obj)) {
            strMap.set(k.toString(), obj[k]);
        }
        return strMap;
    }
    JsonTools.objToMap = objToMap;
})(JsonTools = exports.JsonTools || (exports.JsonTools = {}));
/**
 * 分库分表工具库
 */
var SharingTools;
(function (SharingTools) {
    /**
     * 通过数量和分片 id 计算分片，如果没有分片 id，则默认为 0 号分片
     *
     * @param {number} count
     * @param {string} shardValue
     * @return {number}
     */
    function getShardId(count, shardValue = null) {
        if (count <= 1 || shardValue == null || shardValue == '') {
            return 0;
        }
        // 由于 shardValue 既可能是 string 又可能是长度超过 16 位的 number（会被自动科学计数法），所以分片方案取最后一位，再取余
        const value = shardValue.toString().substr(-1);
        const formatted = Number(value);
        if (_.isNumber(formatted) && !_.isNaN(formatted)) {
            return formatted % count;
        }
        else {
            return value.charCodeAt(0) % count;
        }
    }
    SharingTools.getShardId = getShardId;
})(SharingTools = exports.SharingTools || (exports.SharingTools = {}));
/**
 * 加密工具库
 */
var CryptoTools;
(function (CryptoTools) {
    /**
     * TO MD5
     *
     * @param content
     */
    function md5(content) {
        return crypto.createHash('md5').update(content.toString()).digest('hex');
    }
    CryptoTools.md5 = md5;
    /**
     * TO sha1
     *
     * @param content
     */
    function sha1(content) {
        return crypto.createHash('sha1').update(content.toString()).digest('hex');
    }
    CryptoTools.sha1 = sha1;
    /**
     * 解密
     *
     * @param content
     * @param secret
     * @param iv
     */
    function decrypt(content, secret, iv = '') {
        // 解密配置设置
        const key = crypto.createHash('sha256').update(String(secret)).digest('base64').substr(0, 16);
        const decipher = crypto.createDecipheriv('aes-128-ecb', key, iv);
        // 解密开始
        const decode = [];
        decode.push(decipher.update(content, 'hex', 'utf8'));
        decode.push(decipher.final('utf8'));
        return decode.join('');
    }
    CryptoTools.decrypt = decrypt;
    /**
     * 加密
     *
     * @param content
     * @param secret
     * @param iv
     */
    function encrypt(content, secret, iv = '') {
        // 加密配置设置
        const key = crypto.createHash('sha256').update(String(secret)).digest('base64').substr(0, 16);
        const cipher = crypto.createCipheriv('aes-128-ecb', key, iv);
        // 加密开始
        const encode = [];
        encode.push(cipher.update(content, 'utf8', 'hex'));
        encode.push(cipher.final('hex'));
        return encode.join('');
    }
    CryptoTools.encrypt = encrypt;
})(CryptoTools = exports.CryptoTools || (exports.CryptoTools = {}));
/**
 * 命令行工具库
 */
var ShellTools;
(function (ShellTools) {
    /**
     * 执行 shell
     *
     * @param {string} cmd
     * @param {string[]} args
     * @param {Function} cb
     */
    function exec(cmd, args, cb) {
        let executed = false;
        let stdout = '';
        let stderr = '';
        let ch = child_process_1.spawn(cmd, args);
        ch.stdout.on('data', (d) => {
            stdout += d.toString();
        });
        ch.stderr.on('data', (d) => {
            stderr += d.toString();
        });
        ch.on('error', (err) => {
            if (executed)
                return;
            // callback
            executed = true;
            cb(err);
        });
        ch.on('close', function (code, signal) {
            if (executed)
                return;
            // callback
            executed = true;
            if (stderr) {
                return cb(new Error(stderr));
            }
            cb(null, stdout, code);
        });
    }
    ShellTools.exec = exec;
    /**
     * 获取 pid 信息.
     * @param  {Number[]} pids
     * @param  {Function} cb
     */
    function ps(pids, cb) {
        const pArg = pids.join(',');
        const args = ['-o', 'etime,pid,ppid,pcpu,time', '-p', pArg];
        exec('ps', args, (err, stdout, code) => {
            if (err)
                return cb(err);
            if (code === 1) {
                return cb(new Error('No maching pid found'));
            }
            if (code !== 0) {
                return cb(new Error('pidusage ps command exited with code ' + code));
            }
            let now = new Date().getTime();
            let statistics = {};
            let output = stdout.split(os.EOL);
            for (let i = 1; i < output.length; i++) {
                let line = output[i].trim().split(/\s+/);
                if (!line || line.length !== 5) {
                    continue;
                }
                let etime = line[0];
                let pid = parseInt(line[1], 10);
                let ppid = parseInt(line[2], 10);
                let cpu = line[3];
                let ctime = line[4];
                statistics[pid] = {
                    pid: pid,
                    ppid: ppid,
                    cpu: cpu,
                    ctime: ctime,
                    elapsed: etime,
                    timestamp: now
                };
            }
            cb(null, statistics);
        });
    }
    ShellTools.ps = ps;
    /**
     * 获取事件循环延迟数据
     *
     * @param {number} ms
     */
    function lag(ms = 1000) {
        let start = time();
        let delay = 0;
        let timeout = setTimeout(check, ms);
        timeout.unref();
        return () => delay;
        function check() {
            clearTimeout(timeout);
            let t = time();
            delay = Math.max(0, t - start - ms);
            start = t;
            timeout = setTimeout(check, ms);
            timeout.unref();
        }
        function time() {
            let t = process.hrtime();
            return (t[0] * 1e3) + (t[1] / 1e6);
        }
    }
    ShellTools.lag = lag;
})(ShellTools = exports.ShellTools || (exports.ShellTools = {}));
