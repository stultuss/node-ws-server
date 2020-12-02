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
const WebSocket = require("ws");
const Utility_1 = require("./common/Utility");
const LoggerManager_1 = require("./common/logger/LoggerManager");
const CacheFactory_class_1 = require("./common/cache/CacheFactory.class");
const ErrorFormat_1 = require("./common/exception/ErrorFormat");
const EtcdClientManger_1 = require("./lib/EtcdClientManger");
const ws_service_1 = require("./service/ws.service");
const UserModel_1 = require("./model/user/UserModel");
const PacketCode_1 = require("./model/packet/PacketCode");
const Common_1 = require("./const/Common");
const logger_config_1 = require("./config/logger.config");
const cache_config_1 = require("./config/cache.config");
const server_config_1 = require("./config/server.config");
const WS_VERIFY_MODE = {
    DEFAULT: 'default',
    STRICT: 'strict'
};
class Server {
    constructor() {
        this._initialized = false;
    }
    init() {
        return __awaiter(this, void 0, void 0, function* () {
            // 系统初始化(同步)
            let queue = [];
            queue.push(LoggerManager_1.LoggerManager.instance().init(logger_config_1.loggerConfig));
            queue.push(CacheFactory_class_1.CacheFactory.instance().init(cache_config_1.cacheType, cache_config_1.cacheConfig));
            yield Promise.all(queue);
            // 严格模式：创建一个默认的客户端ID用来测试
            if (server_config_1.serverConfig.mode == WS_VERIFY_MODE.STRICT) {
                yield CacheFactory_class_1.CacheFactory.instance().getCache().set(Common_1.CACHE_TOKEN + '999999', '1q2w3e4r', Utility_1.TimeTools.HOURS24);
            }
            // 完成初始化
            this._initialized = true;
        });
    }
    start() {
        if (!this._initialized) {
            throw new ErrorFormat_1.ErrorFormat(10000, 'Koa Server not initialized yet');
        }
        // server start
        EtcdClientManger_1.EtcdClientManger.instance().start();
        this._createWsServer(server_config_1.serverConfig.port);
        Utility_1.CommonTools.logger(`WebSocket Server is now running at ws://${server_config_1.serverConfig.host}:${server_config_1.serverConfig.port}.`);
        Utility_1.CommonTools.logger('WebSocket Server started ...');
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
                conn.on('message', (message) => ws_service_1.WsService.onMessage(user, message));
                conn.on('error', (err) => ws_service_1.WsService.onError(user, err));
                conn.on('close', () => ws_service_1.WsService.onClose(user));
            }
            catch (e) {
                console.log(e);
                conn.close(e);
            }
        }));
        // 处理 WebSocket 服务器错误
        wss.on('error', (err) => {
            Utility_1.CommonTools.logger(`Error:${err.message}`, Utility_1.CommonTools.LOGGER_TYPE_ERROR);
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
            // fixme websocket bug, wait for merge https://github.com/websockets/ws/pull/1820
            const [uid, token, ip, time] = conn.protocol[0].split('|');
            // 验证 TOKEN
            if (server_config_1.serverConfig.mode == WS_VERIFY_MODE.STRICT) {
                // 严格模式：只允许在 redis 中有 token 的客户端登陆
                const find = yield CacheFactory_class_1.CacheFactory.instance().getCache().get(Common_1.CACHE_TOKEN + uid);
                if (!find || find == '' || find != token) {
                    throw PacketCode_1.PacketCode.IM_ERROR_CODE_ACCESS_DENIED;
                }
                // 将登录 token 设置过期并登录
                yield CacheFactory_class_1.CacheFactory.instance().getCache().del(Common_1.CACHE_TOKEN + uid);
            }
            else {
                // 默认模式：允许任何有 SECRET KEY 的客户端登陆
                if (Math.abs(Utility_1.TimeTools.getTime() - Number(time)) > 60) {
                    throw PacketCode_1.PacketCode.IM_ERROR_CODE_ACCESS_DENIED; // TOKEN 过期
                }
                if (token !== Utility_1.CommonTools.genString(`${server_config_1.serverConfig.secret.player}_${uid}`, ip, time)) {
                    throw PacketCode_1.PacketCode.IM_ERROR_CODE_ACCESS_DENIED; // TOKEN 错误
                }
            }
            // 玩家登陆
            const user = new UserModel_1.UserModel(uid, conn, req);
            yield user.login();
            return user;
        });
    }
}
exports.default = new Server();
