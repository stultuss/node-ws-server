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
const _ = require("underscore");
const ClusterNodes_1 = require("./ClusterNodes");
const Utility_1 = require("../common/Utility");
const Logger_1 = require("../logger/Logger");
const ENV = process.env.PROJECT_ENV || 'development';
const PEERS_KEY = `IM_SERVER_${ENV}`;
/**
 * 集群管理
 */
class Cluster {
    static instance() {
        if (Cluster._instance === undefined) {
            Cluster._instance = new Cluster();
        }
        return Cluster._instance;
    }
    constructor() {
        this._initialized = false;
        this._nodes = new Map();
    }
    init(options) {
        return __awaiter(this, void 0, void 0, function* () {
            const ETCD = require('node-etcd');
            this._options = options;
            this._conn = new ETCD(`${this._options.cluster.host}:${this._options.cluster.port}`);
            this._nodeAddress = `${Utility_1.CommonTools.eth0()}:${this._options.port}`;
            this._initialized = true;
        });
    }
    ;
    get nodeAddress() {
        return this._nodeAddress;
    }
    get nodes() {
        let now = new Date().getTime();
        let nodes = [];
        for (let node of this._nodes.values()) {
            if (node.expire < now) {
                this._nodes.delete(node.key);
            }
            else {
                nodes.push(node.address);
            }
        }
        return nodes;
    }
    /**
     * 启动节点，并启动心跳
     */
    start() {
        if (this._initialized == false) {
            throw new Error('Cluster has not initialized!');
        }
        if (this._conn === null) {
            return;
        }
        // 启动心跳前，先获取线上的消息服务, 然后通过 watch 检测集群的变动。
        this._conn.get(PEERS_KEY, (e, v) => __awaiter(this, void 0, void 0, function* () {
            // 处理报错
            if (e.message == 'All servers returned error') {
                Logger_1.default.instance().error('ETCD is out of service ...');
                this._conn = null;
                return;
            }
            else if (e) {
                console.log(e.message);
                return;
            }
            // 处理结构
            if (_.isUndefined(v) || !v.hasOwnProperty('node') || !v.node.hasOwnProperty('nodes')) {
                console.log(v);
                return;
            }
            // 同步集群整体
            for (let node of v.node.nodes) {
                this._nodes.set(node.key, {
                    key: node.key,
                    address: node.value,
                    expire: new Date(node.expiration).getTime(),
                });
            }
            yield ClusterNodes_1.default.instance().update(this.nodes);
        }));
        this._heartbeat();
    }
    /**
     * 监测集群变动，并更新消息服务集群的客户端。
     */
    watch() {
        if (this._initialized == false) {
            throw new Error('Cluster has not initialized!');
        }
        if (this._conn === null) {
            return;
        }
        // 检测集群的变动，并动态更新消息服务器的客户端
        this._conn.watch(PEERS_KEY, { recursive: true }, (e, v) => __awaiter(this, void 0, void 0, function* () {
            // 处理报错
            if (e.message == 'All servers returned error') {
                Logger_1.default.instance().error('ETCD is out of service ...');
                this._conn = null;
                return;
            }
            else if (e) {
                console.log(e.message);
                this.watch();
                return;
            }
            // 处理结构
            if (_.isUndefined(v) || !v.hasOwnProperty('node')) {
                console.log(v);
                this.watch();
                return;
            }
            // 同步集群数量
            switch (v.action) {
                case 'set':
                    this._nodes.set(v.node.key, {
                        key: v.node.key,
                        address: v.node.value,
                        expire: new Date(v.node.expiration).getTime(),
                    });
                    break;
                case 'expire':
                    this._nodes.delete(v.node.key);
                    break;
            }
            yield ClusterNodes_1.default.instance().update(this.nodes);
            this.watch();
        }));
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
        // 发送心跳
        this._conn.set(`${PEERS_KEY}/${this._nodeAddress}`, this._nodeAddress, { ttl: this._ttl() });
        setTimeout(() => this._heartbeat(), this._options.cluster.timeout * 1000);
    }
    /**
     * 计算过期时间
     *
     * @return {number}
     * @private
     */
    _ttl() {
        return Math.round(this._options.cluster.timeout + (this._options.cluster.timeout / 4));
    }
}
exports.default = Cluster;
