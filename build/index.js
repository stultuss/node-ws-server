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
const LibPath = require("path");
const http = require("http");
const WebSocket = require("ws");
const Logger_1 = require("./logger/Logger");
const Cluster_1 = require("./cluster/Cluster");
const ClusterNodes_1 = require("./cluster/ClusterNodes");
const UserModel_1 = require("./model/user/UserModel");
const WsConnHandler_1 = require("./server/lib/WsConnHandler");
const Utility_1 = require("./common/Utility");
const CacheFactory_class_1 = require("./common/cache/CacheFactory.class");
const Const_1 = require("./const/Const");
const debug = require('debug')('DEBUG:WsServer');
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
            debug('[wss] Initialize server start...');
            // get options
            this._setting = Utility_1.CommonTools.getSetting(LibPath.join(__dirname, '..', 'configs', 'setting.json'));
            // plugins init
            let initQueue = [
                Logger_1.default.instance().init(),
                CacheFactory_class_1.CacheFactory.instance().init(CacheFactory_class_1.CACHE_TYPE_REDIS, [this._getRedisOption()]),
                Cluster_1.default.instance().init(this._setting),
                ClusterNodes_1.default.instance().init(this._setting),
            ];
            yield Promise.all(initQueue);
            // start ws server
            this._server = yield this._createWsServer();
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
        this._server.listen(this._setting.port, this._setting.host, () => {
            Logger_1.default.instance().info(`WebSocket Server is now running at ws://${Cluster_1.default.instance().nodeAddress}.`);
            Logger_1.default.instance().info('WebSocket Server started ...');
        });
    }
    /**
     * 创建 wss 服务器
     *
     * @return {Promise<module:http.Server>}
     * @private
     */
    _createWsServer() {
        return __awaiter(this, void 0, void 0, function* () {
            let server = yield http.createServer();
            let options = this._getServerOption(server);
            // 创建 WebSocket 服务器
            let wss = new WebSocket.Server(options);
            // 处理客户端连接事件
            wss.on('connection', (conn, req) => __awaiter(this, void 0, void 0, function* () {
                try {
                    const user = yield this._login(conn, req);
                    // handle client message
                    conn.on('message', (message) => __awaiter(this, void 0, void 0, function* () {
                        console.log(message);
                        yield WsConnHandler_1.WsConnHandler.onMessage(user, message);
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
                    conn.close(e);
                }
            }));
            // 处理 WebSocket 服务器错误
            wss.on('error', (err) => {
                Logger_1.default.instance().error(`Error:${err.message}`);
            });
            return server;
        });
    }
    /**
     * 生成 wss 服务器配置
     *
     * @return {WebSocket.ServerOptions}
     * @private
     */
    _getServerOption(server) {
        return {
            handleProtocols: (protocols, request) => {
                //Fixme header::handleProtocols
                return protocols;
            },
            verifyClient: (info, done) => {
                //Fixme header::handleClientVerify
                return done(true);
            },
            perMessageDeflate: true,
            clientTracking: true,
            server: server,
        };
    }
    /**
     * 生成 redis 连接配置
     *
     * @return {WebSocket.ServerOptions}
     * @private
     */
    _getRedisOption() {
        return {
            port: this._setting.redis.port,
            host: this._setting.redis.host,
            authPasswd: this._setting.redis.authPasswd,
            // options 配置请不要修改
            options: {
                connect_timeout: 36000000,
                retry_delay: 2000,
            }
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
                // 玩家登录 headers 不正确，并验证 token
                const user = new UserModel_1.default(conn, req);
                if (!user.id || !user.token || user.token !== (yield CacheFactory_class_1.CacheFactory.instance().getCache().get(Const_1.CACHE_TOKEN + user.id))) {
                    throw 3006 /* IM_ERROR_CODE_ACCESS_DENIED */;
                }
                // 登录 token 过期，并使得玩家登录
                // await CacheFactory.instance().getCache().del(CACHE_TOKEN + user.id);
                yield user.login();
                return user;
            }
            else {
                // 服务器登录
                let token = Utility_1.CommonTools.genToken(this._setting.secret.system, (req.headers.system), (req.headers.time));
                if (protocol !== token) {
                    throw 3006 /* IM_ERROR_CODE_ACCESS_DENIED */;
                }
                return null;
            }
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
app.init()
    .then(() => {
    app.start();
})
    .catch((err) => {
    console.log(err);
    process.exit(-1);
});
