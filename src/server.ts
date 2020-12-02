import * as http from 'http';
import * as WebSocket from 'ws';

import {CommonTools, TimeTools} from './common/Utility';
import {LoggerManager} from './common/logger/LoggerManager';
import {CacheFactory} from './common/cache/CacheFactory.class';
import {ErrorFormat} from './common/exception/ErrorFormat';
import {EtcdClientManger} from './lib/EtcdClientManger';

import {WsService} from './service/ws.service';
import {UserModel} from './model/user/UserModel';
import {PacketCode} from './model/packet/PacketCode';

import {CACHE_TOKEN} from './const/Common';
import {loggerConfig} from './config/logger.config';
import {cacheConfig, cacheType} from './config/cache.config';
import {serverConfig} from './config/server.config';

const WS_VERIFY_MODE = {
    DEFAULT: 'default',
    STRICT: 'strict'
};

export interface IServerConfig {
    env: string,
    mode: string, // 验证 token 的模式，default ｜ strict
    name: string,
    host: string,
    port: number,
    secret: {
        system: string,
        player: string,
    }
}

class Server {
    private _initialized: boolean;

    constructor() {
        this._initialized = false;
    }

    public async init(): Promise<any> {
        // 系统初始化(同步)
        let queue = [];
        queue.push(LoggerManager.instance().init(loggerConfig));
        queue.push(CacheFactory.instance().init(cacheType, cacheConfig));
        await Promise.all(queue);
    
        // 严格模式：创建一个默认的客户端ID用来测试
        if (serverConfig.mode == WS_VERIFY_MODE.STRICT) {
            await CacheFactory.instance().getCache().set(CACHE_TOKEN + '999999', '1q2w3e4r', TimeTools.HOURS24);
        }
        
        // 完成初始化
        this._initialized = true;
    }

    public start(): void {
        if (!this._initialized) {
            throw new ErrorFormat(10000, 'Koa Server not initialized yet');
        }

        // server start
        EtcdClientManger.instance().start();
    
        this._createWsServer(serverConfig.port);
        CommonTools.logger(`WebSocket Server is now running at ws://${serverConfig.host}:${serverConfig.port}.`);
        CommonTools.logger('WebSocket Server started ...');
    }
    
    /**
     * 创建 wss 服务器
     *
     * @private
     */
    private _createWsServer(port: number) {
        // 创建 WebSocket 服务器
        let wss = new WebSocket.Server(this._getServerOption(port));
        
        // 处理客户端连接事件
        wss.on('connection', async (conn: WebSocket, req: http.IncomingMessage) => {
            try {
                const user = await this._login(conn, req);
                conn.on('message', (message) => WsService.onMessage(user, message));
                conn.on('error', (err) => WsService.onError(user, err));
                conn.on('close', () => WsService.onClose(user));
            } catch (e) {
                console.log(e);
                conn.close(e);
            }
        });
        
        // 处理 WebSocket 服务器错误
        wss.on('error', (err) => {
            CommonTools.logger(`Error:${err.message}`, CommonTools.LOGGER_TYPE_ERROR);
        });
    }
    
    /**
     * 生成 wss 服务器配置
     *
     * @return {WebSocket.ServerOptions}
     * @private
     */
    private _getServerOption(port: number): WebSocket.ServerOptions {
        return {
            handleProtocols: (protocols: any, request: any): void => {
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
    private async _login(conn: WebSocket, req: http.IncomingMessage): Promise<UserModel> {
        // fixme websocket bug, wait for merge https://github.com/websockets/ws/pull/1820
        const [uid, token, ip, time] =  conn.protocol[0].split('|');
        
        // 验证 TOKEN
        if (serverConfig.mode == WS_VERIFY_MODE.STRICT) {
            // 严格模式：只允许在 redis 中有 token 的客户端登陆
            const find = await CacheFactory.instance().getCache().get(CACHE_TOKEN + uid);
            if (!find || find == '' || find != token) {
                throw PacketCode.IM_ERROR_CODE_ACCESS_DENIED;
            }
            // 将登录 token 设置过期并登录
            await CacheFactory.instance().getCache().del(CACHE_TOKEN + uid);
        } else {
            // 默认模式：允许任何有 SECRET KEY 的客户端登陆
            if (Math.abs(TimeTools.getTime() - Number(time)) > 60) {
                throw PacketCode.IM_ERROR_CODE_ACCESS_DENIED; // TOKEN 过期
            }
            if (token !== CommonTools.genString(`${serverConfig.secret.player}_${uid}`, ip, time)) {
                throw PacketCode.IM_ERROR_CODE_ACCESS_DENIED; // TOKEN 错误
            }
        }
        
        // 玩家登陆
        const user = new UserModel(uid, conn, req);
        await user.login();
        
        return user;
    }
}

export default new Server();