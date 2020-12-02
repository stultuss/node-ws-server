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
const etcd3_1 = require("etcd3");
const Utility_1 = require("../common/Utility");
const grpc_service_1 = require("./grpc.service");
const server_config_1 = require("../config/server.config");
const etcd_config_1 = require("../config/etcd.config");
// ETCD PEERS_KEY
const PEERS_KEY = `IM_SERVER_${server_config_1.serverConfig.env}`;
class EtcdService {
    constructor() {
        this._conn = new etcd3_1.Etcd3({ hosts: `${etcd_config_1.etcdConfig.host}:${etcd_config_1.etcdConfig.port}` });
    }
    static instance() {
        if (EtcdService._instance === undefined) {
            EtcdService._instance = new EtcdService();
        }
        return EtcdService._instance;
    }
    /**
     *  启动 ETCD
     *  1. 从 ETCD 服务中获取全部远程节点信息
     *  2. 启动 etcd.watch(), 监听远程节点变动
     *  3. 启动 etcd.lease(), 上传本地节点信息，并通过自动续租保证当前节点状态
     */
    start() {
        return __awaiter(this, void 0, void 0, function* () {
            this._fetch();
            this._watch();
            this._heartbeat();
        });
    }
    ;
    /**
     * 从 ETCD 服务中获取全部远程节点信息
     */
    _fetch() {
        if (this._conn === null) {
            return;
        }
        // 获取所有在线的节点，并覆盖到本地
        this._conn.getAll().prefix(PEERS_KEY).then(r => {
            grpc_service_1.default.instance().connect(r.value.toString());
        });
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
                .on('put', (r) => grpc_service_1.default.instance().connect(r.value.toString()))
                .on('delete', (r) => grpc_service_1.default.instance().disconnect(r.value.toString()));
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
        lease.put(`${PEERS_KEY}/${grpc_service_1.default.grpcAddress}`).value(grpc_service_1.default.grpcAddress).catch((e) => console.log(e));
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
exports.default = EtcdService;
