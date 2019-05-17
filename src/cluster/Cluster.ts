import * as _ from 'underscore';
import ClusterNodes from './ClusterNodes';
import {CommonTools, SettingSchema} from '../common/Utility';
import Logger from '../logger/Logger';

const ENV = process.env.PROJECT_ENV || 'development';
const PEERS_KEY = `IM_SERVER_${ENV}`;

interface NodeSchema {
    key: string,
    address: string,
    expire: number,
}

/**
 * 集群管理
 */
class Cluster {
    private static _instance: Cluster;

    private _initialized: boolean;
    private _conn: any;
    private _options: SettingSchema;
    private _nodes: Map<String, NodeSchema>;
    private _nodeAddress: string;

    public static instance(): Cluster {
        if (Cluster._instance === undefined) {
            Cluster._instance = new Cluster();
        }
        return Cluster._instance;
    }

    private constructor() {
        this._initialized = false;
        this._nodes = new Map<String, NodeSchema>();
    }

    public async init(options?: SettingSchema) {
        const ETCD = require('node-etcd');

        this._options = options;
        this._conn = new ETCD(`${this._options.cluster.host}:${this._options.cluster.port}`);
        this._nodeAddress = `${CommonTools.eth0()}:${this._options.port}`;
        this._initialized = true;
    };

    public get nodeAddress(): string {
        return this._nodeAddress;
    }

    public get nodes(): string[] {
        let now = new Date().getTime();
        let nodes = [];
        for (let node of this._nodes.values()) {
            if (node.expire < now) {
                this._nodes.delete(node.key);
            } else {
                nodes.push(node.address);
            }
        }
        return nodes;
    }

    /**
     * 启动节点，并启动心跳
     */
    public start() {
        if (this._initialized == false) {
            throw new Error('Cluster has not initialized!');
        }

        if (this._conn === null) {
            return;
        }

        // 启动心跳前，先获取线上的消息服务, 然后通过 watch 检测集群的变动。
        this._conn.get(PEERS_KEY, async (e: Error, v: any) => {
            // 处理报错
            if (e.message == 'All servers returned error') {
                Logger.instance().error('ETCD is out of service ...');
                this._conn = null;
                return;
            } else if (e) {
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

            await ClusterNodes.instance().update(this.nodes);
        });

        this._heartbeat();
    }

    /**
     * 监测集群变动，并更新消息服务集群的客户端。
     */
    public watch() {
        if (this._initialized == false) {
            throw new Error('Cluster has not initialized!');
        }

        if (this._conn === null) {
            return;
        }

        // 检测集群的变动，并动态更新消息服务器的客户端
        this._conn.watch(PEERS_KEY, {recursive: true} as any, async (e: Error, v: any) => {
            // 处理报错
            if (e.message == 'All servers returned error') {
                Logger.instance().error('ETCD is out of service ...');
                this._conn = null;
                return;
            } else if (e) {
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

            await ClusterNodes.instance().update(this.nodes);

            this.watch();
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

        // 发送心跳
        this._conn.set(`${PEERS_KEY}/${this._nodeAddress}`, this._nodeAddress, {ttl: this._ttl()});

        setTimeout(() => this._heartbeat(), this._options.cluster.timeout * 1000);
    }

    /**
     * 计算过期时间
     *
     * @return {number}
     * @private
     */
    private _ttl() {
        return Math.round(this._options.cluster.timeout + (this._options.cluster.timeout / 4));
    }
}

export default Cluster;