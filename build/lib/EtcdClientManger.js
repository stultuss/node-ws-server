"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EtcdClientManger = void 0;
const etcd3_1 = require("etcd3");
const Utility_1 = require("../common/Utility");
const GrpcClientManager_1 = require("./GrpcClientManager");
const server_config_1 = require("../config/server.config");
const etcd_config_1 = require("../config/etcd.config");
// ETCD PEERS_KEY
const PEERS_KEY = `IM_SERVER_${server_config_1.serverConfig.env}`;
class EtcdClientManger {
    constructor() {
        this._conn = new etcd3_1.Etcd3({ hosts: `${etcd_config_1.etcdConfig.host}:${etcd_config_1.etcdConfig.port}` });
    }
    static instance() {
        if (EtcdClientManger._instance === undefined) {
            EtcdClientManger._instance = new EtcdClientManger();
        }
        return EtcdClientManger._instance;
    }
    /**
     *  启动 ETCD
     *  1. 从 ETCD 服务中获取全部远程节点信息
     *  2. 启动 etcd.watch(), 监听远程节点变动
     *  3. 启动 etcd.lease(), 上传本地节点信息，并通过自动续租保证当前节点状态
     */
    start() {
        this._fetch();
        this._watch();
        this._heartbeat();
    }
    ;
    /**
     * 从 ETCD 服务中获取全部远程节点信息
     */
    _fetch() {
        if (this._conn === null) {
            return;
        }
        // 初始化连接
        const instance = GrpcClientManager_1.GrpcClientManager.instance();
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
    _watch() {
        if (this._conn === null) {
            return;
        }
        // 检测节点变动
        this._conn.watch().prefix(PEERS_KEY).create().then(watcher => {
            watcher
                .on('disconnected', () => Utility_1.CommonTools.logger('[etcd] disconnected...'))
                .on('connected', () => Utility_1.CommonTools.logger('[etcd] successfully reconnected !'))
                .on('put', (r) => {
                if (!r || !r.hasOwnProperty('value')) {
                    return;
                }
                GrpcClientManager_1.GrpcClientManager.instance().connect(r.value.toString());
            })
                .on('delete', (r) => {
                if (!r || !r.hasOwnProperty('value')) {
                    return;
                }
                GrpcClientManager_1.GrpcClientManager.instance().disconnect(r.value.toString());
            });
        });
    }
    /**
     * 发送心跳包
     *
     * @private
     */
    _heartbeat() {
        if (this._conn === null) {
            return;
        }
        // 自动续租，租约丢失，重新创建
        const lease = this._conn.lease(this._ttl());
        lease.on('lost', () => {
            Utility_1.CommonTools.logger('[etcd] Trying to re-grant it... !');
            this._heartbeat();
        });
        lease.put(`${PEERS_KEY}/${GrpcClientManager_1.GrpcClientManager.grpcAddress}`).value(GrpcClientManager_1.GrpcClientManager.grpcAddress).catch((e) => console.log(e));
    }
    /**
     * 计算过期时间
     *
     * @return {number}
     * @private
     */
    _ttl() {
        return Math.round(etcd_config_1.etcdConfig.timeout + (etcd_config_1.etcdConfig.timeout / 4));
    }
}
exports.EtcdClientManger = EtcdClientManger;
