import * as LibPath from 'path';
import * as http from 'http';
import * as WebSocket from 'ws';
import Logger from './logger/Logger';
import Cluster from './cluster/Cluster';
import ClusterNodes from './cluster/ClusterNodes';
import UserModel from './model/user/UserModel';
import {WsConnHandler} from './server/lib/WsConnHandler';
import {CommonTools, SettingSchema} from './common/Utility';
import {CACHE_TYPE_REDIS, CacheFactory} from './common/cache/CacheFactory.class';
import {IRedisConfig} from './common/cache/RedisCache.class';
import {ErrorCode} from './config/ErrorCode';
import {CACHE_TOKEN} from './const/Const';

const debug = require('debug')('DEBUG:WsServer');

const ENV = process.env.PROJECT_ENV || 'development';

class WsServer {
    private _initialized: boolean;
    private _setting: SettingSchema;

    constructor() {
        this._initialized = false;
    }

    /**
     * 初始化 wss 服务器配置
     * @return {Promise<void>}
     */
    public async init() {
        debug('[wss] Initialize server start...');

        // get options
        this._setting = CommonTools.getSetting(LibPath.join(__dirname, '..', 'configs', `setting-${ENV}.json`));

        // plugins init
        let initQueue = [
            Logger.instance().init(),
            CacheFactory.instance().init(CACHE_TYPE_REDIS, [this._getRedisOption()]),
            Cluster.instance().init(this._setting),
            ClusterNodes.instance().init(this._setting),
        ];
        await Promise.all<any>(initQueue);

        // start ws server
        this._initialized = true;
    }

    /**
     * 启动 wss 服务器
     */
    public start(): void {
        if (!this._initialized) {
            debug('[wss] Initialization not done yet!');
            return;
        }

        // server start
        Cluster.instance().start();
        Cluster.instance().watch();

        this._createWsServer(this._setting.port);
        Logger.instance().info(`WebSocket Server is now running at ws://${Cluster.instance().nodeAddress}.`);
        Logger.instance().info('WebSocket Server started ...');
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

                // handle client message
                conn.on('message', async (message) => {
                    try {
                        await WsConnHandler.onMessage(user, message);
                    } catch (e) {
                        console.log('[WARING INFO]', e.message);
                    }
                });

                // handle client error
                conn.on('error', async (err) => {
                    await WsConnHandler.onError(user, err);
                });

                // handle client close
                conn.on('close', async () => {
                    await WsConnHandler.onClose(user);
                });
            } catch (e) {
                console.log('[WARING CLOSE]', e);
                conn.close(e);
            }
        });

        // 处理 WebSocket 服务器错误
        wss.on('error', (err) => {
            Logger.instance().error(`Error:${err.message}`);
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
     * 生成 redis 连接配置
     *
     * @return {WebSocket.ServerOptions}
     * @private
     */
    private _getRedisOption(): IRedisConfig {
        return {
            port: this._setting.redis.port,
            host: this._setting.redis.host,
            authPasswd: this._setting.redis.authPasswd,
            // options 配置请不要修改
            options: {
                connect_timeout: 36000000, // redis 服务断开重连超时时间
                retry_delay: 2000, // redis 服务断开，每隔多少时间重连，未找到相关配置，或许是 retry_max_delay
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
    private async _login(conn: WebSocket, req: http.IncomingMessage): Promise<UserModel> {
        const protocol = this._getProtocol(conn);
        if (protocol == null) {
            // 服务器登录
            let token = CommonTools.genToken(this._setting.secret.system, (req.headers.system) as string, (req.headers.time) as any);
            if (req.headers.token !== token) {
                throw ErrorCode.IM_ERROR_CODE_ACCESS_DENIED;
            }

            return null;
        } else {
            // 玩家登录 headers 不正确，并验证 token
            let uid = await CacheFactory.instance().getCache().get(CACHE_TOKEN + protocol);
            if (!uid || uid === '') {
                throw ErrorCode.IM_ERROR_CODE_ACCESS_DENIED;
            }
            // 登录 token 过期，并使得玩家登录
            // await CacheFactory.instance().getCache().del(CACHE_TOKEN + protocol);
            const user = new UserModel(uid, conn, req);
            await user.login();

            return user;
        }
    }

    /**
     * 读取 WebSocket Protocol
     *
     * @param {WebSocket} conn
     * @return {string}
     */
    private _getProtocol(conn: WebSocket) {
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