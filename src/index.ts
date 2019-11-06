import * as http from 'http';
import * as WebSocket from 'ws';
import Logger from './logger/Logger';
import Cluster, {ClusterConfig} from './cluster/Cluster';
import ClusterNodes from './cluster/ClusterNodes';
import UserModel from './model/user/UserModel';
import {WsConnHandler} from './server/lib/WsConnHandler';
import {CommonTools, TimeTools} from './common/Utility';
import {CACHE_TYPE_REDIS, CacheFactory} from './common/cache/CacheFactory.class';
import {IRedisConfig} from './common/cache/RedisCache.class';
import {ErrorCode} from './config/ErrorCode';
import {CACHE_TOKEN} from './const/Const';

const MODE_DEFAULT = 'default';
const MODE_STRICT = 'strict';

// 基础配置类型
type BaseConfig = {
  mode: 'default' | 'strict',
  port: number,
  secret: {
    server: string,
    client: string
  }
}

const debug = require('debug')('DEBUG:WsServer');

const ENV = process.env.PROJECT_ENV || 'development';
const baseConfig = require(`../configs/${ENV}/base.config.js`) as BaseConfig;
const cacheConfig = require(`../configs/${ENV}/cache.config.js`) as Array<IRedisConfig>;
const etcdConfig = require(`../configs/${ENV}/etcd.config.js`) as ClusterConfig;

class WsServer {
  private _initialized: boolean;
  
  constructor() {
    this._initialized = false;
  }
  
  /**
   * 初始化 wss 服务器配置
   * @return {Promise<void>}
   */
  public async init() {
    // promise queue
    const initQueue = [
      Logger.instance().init(),
      CacheFactory.instance().init(CACHE_TYPE_REDIS, cacheConfig),
      Cluster.instance().init(`${CommonTools.eth0()}:${baseConfig.port}`, etcdConfig),
      ClusterNodes.instance().init(baseConfig.secret.server)
    ];
    await Promise.all<any>(initQueue);
    
    // 严格模式：创建一个默认的客户端ID用来测试
    if (baseConfig.mode == MODE_STRICT) {
      await CacheFactory.instance().getCache().set(CACHE_TOKEN + '1q2w3e4r', 999999, TimeTools.HOURS24);
    }
    
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
    
    this._createWsServer(baseConfig.port);
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
   * 客户端合法性检查，并进行玩家登录
   *
   * @param {WebSocket} conn
   * @param {module:http.IncomingMessage} req
   * @return {Promise<UserModel>}
   */
  private async _login(conn: WebSocket, req: http.IncomingMessage): Promise<UserModel> {
    const protocol = this._getProtocol(conn);
    if (protocol == null) {
      return await this._checkServerLogin(protocol, conn, req);
    } else {
      return await this._checkClientLogin(protocol, conn, req);
    }
  }
  
  /**
   * 服务器作为客户端登录，拥有服务器权限
   *
   * @param {string} protocol
   * @param {WebSocket} conn
   * @param {module:http.IncomingMessage} req
   * @return {Promise<UserModel>}
   */
  private async _checkServerLogin(protocol, conn, req) {
    const {s, i, t} = req.headers;
    const {secret} = baseConfig;
    if (s !== CommonTools.genToken(secret.server, i, t)) {
      console.log(`server token error`);
      throw ErrorCode.IM_ERROR_CODE_ACCESS_DENIED;
    }
    console.log(`server: ${i} is login...`);
    return null;
  }
  
  /**
   * 客户端登录，判断验证类型
   *
   * @param {string} protocol
   * @param {WebSocket} conn
   * @param {module:http.IncomingMessage} req
   * @return {Promise<UserModel>}
   */
  private async _checkClientLogin(protocol, conn, req) {
    // 验证 TOKEN
    let uid = req.headers.id;
    if (baseConfig.mode == MODE_STRICT) {
      // 严格模式：只允许在 redis 中有 token 的客户端登陆
      const find = await CacheFactory.instance().getCache().get(CACHE_TOKEN + protocol);
      if (!find || find == '' || find != uid) {
        throw ErrorCode.IM_ERROR_CODE_ACCESS_DENIED;
      }
      
      // 将登录 token 设置过期并登录
      await CacheFactory.instance().getCache().del(CACHE_TOKEN + protocol);
    } else {
      // 默认模式：允许任何有 SECRET KEY 的客户端登陆
      const {i, t} = req.headers;
      const {secret} = baseConfig;
      if (Math.abs(TimeTools.getTime() - t) > 60) {
        throw ErrorCode.IM_ERROR_CODE_ACCESS_DENIED; // TOKEN 过期
      }
      if (protocol !== CommonTools.genToken(`${secret.client}_${uid}`, i, t)) {
        throw ErrorCode.IM_ERROR_CODE_ACCESS_DENIED; // TOKEN 错误
      }
    }
    // 玩家登陆
    const user = new UserModel(uid, conn, req);
    await user.login();
    console.log(`client: ${uid} is login...`);
    return user;
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
app.init().then(() => {
  app.start();
}).catch((err) => {
  console.log(err);
  process.exit(-1);
});