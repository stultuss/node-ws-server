"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const WebSocket = require("ws");
const Logger_1 = require("./logger/Logger");
const Cluster_1 = require("./cluster/Cluster");
const ClusterNodes_1 = require("./cluster/ClusterNodes");
const UserModel_1 = require("./model/user/UserModel");
const WsConnHandler_1 = require("./server/lib/WsConnHandler");
const Utility_1 = require("./common/Utility");
const CacheFactory_class_1 = require("./common/cache/CacheFactory.class");
const Const_1 = require("./const/Const");
const MODE_DEFAULT = 'default';
const MODE_STRICT = 'strict';
const debug = require('debug')('DEBUG:WsServer');
const ENV = process.env.PROJECT_ENV || 'development';
const baseConfig = require(`../config/${ENV}/base.config.js`);
const cacheConfig = require(`../config/${ENV}/cache.config.js`);
const clusterConfig = require(`../config/${ENV}/cluster.config.js`);
class WsServer {
    constructor() {
        this._initialized = false;
    }
    /**
     * 初始化 wss 服务器配置
     * @return {Promise<void>}
     */
    init() {
        return __awaiter(this, void 0, void 0, function* () {
            // promise queue
            const initQueue = [
                Logger_1.default.instance().init(),
                CacheFactory_class_1.CacheFactory.instance().init(CacheFactory_class_1.CACHE_TYPE_REDIS, cacheConfig),
                Cluster_1.default.instance().init(`${Utility_1.CommonTools.eth0()}:${baseConfig.port}`, clusterConfig),
                ClusterNodes_1.default.instance().init(baseConfig.secret.server)
            ];
            yield Promise.all(initQueue);
            // 严格模式：创建一个默认的客户端ID用来测试
            if (baseConfig.mode == MODE_STRICT) {
                yield CacheFactory_class_1.CacheFactory.instance().getCache().set(Const_1.CACHE_TOKEN + '1q2w3e4r', 999999, Utility_1.TimeTools.HOURS24);
            }
            // start ws server
            this._initialized = true;
        });
    }
    /**
     * 启动 wss 服务器
     */
    start() {
        if (!this._initialized) {
            debug('[wss] Initialization not done yet!');
            return;
        }
        // server start
        Cluster_1.default.instance().start();
        Cluster_1.default.instance().watch();
        this._createWsServer(baseConfig.port);
        Logger_1.default.instance().info(`WebSocket Server is now running at ws://${Cluster_1.default.instance().nodeAddress}.`);
        Logger_1.default.instance().info('WebSocket Server started ...');
    }
    /**
     * 创建 wss 服务器
     *
     * @private
     */
    _createWsServer(port) {
        // 创建 WebSocket 服务器
        let wss = new WebSocket.Server(this._getServerOption(port));
        // 处理客户端连接事件
        wss.on('connection', (conn, req) => __awaiter(this, void 0, void 0, function* () {
            try {
                const user = yield this._login(conn, req);
                // handle client message
                conn.on('message', (message) => __awaiter(this, void 0, void 0, function* () {
                    try {
                        yield WsConnHandler_1.WsConnHandler.onMessage(user, message);
                    }
                    catch (e) {
                        console.log('[WARING INFO]', e.message);
                    }
                }));
                // handle client error
                conn.on('error', (err) => __awaiter(this, void 0, void 0, function* () {
                    yield WsConnHandler_1.WsConnHandler.onError(user, err);
                }));
                // handle client close
                conn.on('close', () => __awaiter(this, void 0, void 0, function* () {
                    yield WsConnHandler_1.WsConnHandler.onClose(user);
                }));
            }
            catch (e) {
                console.log('[WARING CLOSE]', e);
                conn.close(e);
            }
        }));
        // 处理 WebSocket 服务器错误
        wss.on('error', (err) => {
            Logger_1.default.instance().error(`Error:${err.message}`);
        });
    }
    /**
     * 生成 wss 服务器配置
     *
     * @return {WebSocket.ServerOptions}
     * @private
     */
    _getServerOption(port) {
        return {
            handleProtocols: (protocols, request) => {
                //Fixme header::handleProtocols
                return protocols;
            },
            verifyClient: (info, done) => {
                //Fixme header::handleClientVerify
                return done(true);
            },
            perMessageDeflate: false,
            clientTracking: true,
            port: port
        };
    }
    /**
     * 客户端合法性检查，并进行玩家登录
     *
     * @param {WebSocket} conn
     * @param {module:http.IncomingMessage} req
     * @return {Promise<UserModel>}
     */
    _login(conn, req) {
        return __awaiter(this, void 0, void 0, function* () {
            const protocol = this._getProtocol(conn);
            if (protocol == null) {
                return yield this._checkServerLogin(protocol, conn, req);
            }
            else {
                return yield this._checkClientLogin(protocol, conn, req);
            }
        });
    }
    /**
     * 服务器作为客户端登录，拥有服务器权限
     *
     * @param {string} protocol
     * @param {WebSocket} conn
     * @param {module:http.IncomingMessage} req
     * @return {Promise<UserModel>}
     */
    _checkServerLogin(protocol, conn, req) {
        return __awaiter(this, void 0, void 0, function* () {
            const { s, i, t } = req.headers;
            const { secret } = baseConfig;
            if (s !== Utility_1.CommonTools.genToken(secret.server, i, t)) {
                console.log(`server token error`);
                throw 3006 /* IM_ERROR_CODE_ACCESS_DENIED */;
            }
            console.log(`server: ${i} is login...`);
            return null;
        });
    }
    /**
     * 客户端登录，判断验证类型
     *
     * @param {string} protocol
     * @param {WebSocket} conn
     * @param {module:http.IncomingMessage} req
     * @return {Promise<UserModel>}
     */
    _checkClientLogin(protocol, conn, req) {
        return __awaiter(this, void 0, void 0, function* () {
            // 验证 TOKEN
            let uid = req.headers.id;
            if (baseConfig.mode == MODE_STRICT) {
                // 严格模式：只允许在 redis 中有 token 的客户端登陆
                const find = yield CacheFactory_class_1.CacheFactory.instance().getCache().get(Const_1.CACHE_TOKEN + protocol);
                if (!find || find == '' || find != uid) {
                    throw 3006 /* IM_ERROR_CODE_ACCESS_DENIED */;
                }
                // 将登录 token 设置过期并登录
                yield CacheFactory_class_1.CacheFactory.instance().getCache().del(Const_1.CACHE_TOKEN + protocol);
            }
            else {
                // 默认模式：允许任何有 SECRET KEY 的客户端登陆
                const { i, t } = req.headers;
                const { secret } = baseConfig;
                if (Math.abs(Utility_1.TimeTools.getTime() - t) > 60) {
                    throw 3006 /* IM_ERROR_CODE_ACCESS_DENIED */; // TOKEN 过期
                }
                if (protocol !== Utility_1.CommonTools.genToken(`${secret.client}_${uid}`, i, t)) {
                    throw 3006 /* IM_ERROR_CODE_ACCESS_DENIED */; // TOKEN 错误
                }
            }
            // 玩家登陆
            const user = new UserModel_1.default(uid, conn, req);
            yield user.login();
            console.log(`client: ${uid} is login...`);
            return user;
        });
    }
    /**
     * 读取 WebSocket Protocol
     *
     * @param {WebSocket} conn
     * @return {string}
     */
    _getProtocol(conn) {
        return (conn.protocol.length > 0) ? conn.protocol[0] : null;
    }
}
// start server
const app = new WsServer();
app.init().then(() => {
    app.start();
}).catch((err) => {
    console.log(err);
    process.exit(-1);
});
