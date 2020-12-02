import {Etcd3} from 'etcd3';
import {CommonTools} from '../common/Utility';
import {GrpcClientManager} from './GrpcClientManager';

import {serverConfig} from '../config/server.config';
import {etcdConfig} from '../config/etcd.config';

export interface IEtcdConfig {
    host: string,
    port: number,
    timeout: number
}

// ETCD PEERS_KEY
const PEERS_KEY = `IM_SERVER_${serverConfig.env}`;

export class EtcdClientManger {
    private static _instance: EtcdClientManger;
    private _conn: Etcd3;
    
    public static instance(): EtcdClientManger {
        if (EtcdClientManger._instance === undefined) {
            EtcdClientManger._instance = new EtcdClientManger();
        }
        return EtcdClientManger._instance;
    }
    
    private constructor() {
        this._conn = new Etcd3({hosts: `${etcdConfig.host}:${etcdConfig.port}`});
    }
    
    /**
     *  启动 ETCD
     *  1. 从 ETCD 服务中获取全部远程节点信息
     *  2. 启动 etcd.watch(), 监听远程节点变动
     *  3. 启动 etcd.lease(), 上传本地节点信息，并通过自动续租保证当前节点状态
     */
    public start() {
        this._fetch();
        this._watch();
        this._heartbeat();
    };
    
    /**
     * 从 ETCD 服务中获取全部远程节点信息
     */
    private _fetch() {
        if (this._conn === null) {
            return;
        }
        
        // 初始化连接
        const instance = GrpcClientManager.instance();
        
        // 获取所有在线的节点，并覆盖到本地
        this._conn.getAll().prefix(PEERS_KEY).then(r => {
            if (!r) {
                return;
            }
            for (let address of Object.values(r)) {
                instance.connect(address);
            }
        }).catch(e => console.log(e));
    }
    
    /**
     * 监测节点变动。
     */
    private _watch() {
        if (this._conn === null) {
            return;
        }
        
        // 检测节点变动
        this._conn.watch().prefix(PEERS_KEY).create().then(watcher => {
            watcher
            .on('disconnected', () => CommonTools.logger('[etcd] disconnected...'))
            .on('connected', () => CommonTools.logger('[etcd] successfully reconnected !'))
            .on('put', (r) => {
                if (!r || !r.hasOwnProperty('value')) {
                    return;
                }
                GrpcClientManager.instance().connect(r.value.toString())
            })
            .on('delete', (r) => {
                if (!r || !r.hasOwnProperty('value')) {
                    return;
                }
                GrpcClientManager.instance().disconnect(r.value.toString())
            });
        });
    }
    
    /**
     * 发送心跳包
     *
     * @private
     */
    private _heartbeat() {
        if (this._conn === null) {
            return;
        }
        
        // 自动续租，租约丢失，重新创建
        const lease = this._conn.lease(this._ttl());
        lease.on('lost', () => {
            CommonTools.logger('[etcd] Trying to re-grant it... !');
            this._heartbeat();
        });
        lease.put(`${PEERS_KEY}/${GrpcClientManager.grpcAddress}`).value(GrpcClientManager.grpcAddress).catch((e) => console.log(e));
    }
    
    /**
     * 计算过期时间
     *
     * @return {number}
     * @private
     */
    private _ttl() {
        return Math.round(etcdConfig.timeout + (etcdConfig.timeout / 4));
    }
}