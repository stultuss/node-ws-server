import * as WebSocket from 'ws';
import Cluster from './Cluster';
import Logger from '../logger/Logger';
import PacketModel from '../model/packet/PacketModel';
import {CommonTools, TimeTools} from '../common/Utility';

class ClusterNodes {
    private static _instance: ClusterNodes;

    private _initialized: boolean;
    private _secret: string;
    private _conns: Map<string, WebSocket>;

    public static instance(): ClusterNodes {
        if (ClusterNodes._instance === undefined) {
            ClusterNodes._instance = new ClusterNodes();
        }
        return ClusterNodes._instance;
    }

    private constructor() {
        this._conns = new Map<string, WebSocket>();
    }

    public async init(secret: string) {
        this._secret = secret;
        this._initialized = true;
    };

    public get conns() {
        return this._conns;
    }

    /**
     * 更新消息服务集群的节点
     *
     * @param {string[]} nodeIps
     * @return {Promise<void>}
     */
    public async update(nodeIps: string[]) {
        if (this._initialized == false) {
            throw new Error('ClusterNodes has not initialized!');
        }

        // 验证集群是否有变动，没有变动则不做处理
        if (nodeIps === [...Array.from(this._conns.keys())]) {
            return;
        }

        const conns = this._conns;
        this._conns = new Map<string, WebSocket>();

        // 添加节点
        let queue = [];
        for (let nodeIp of nodeIps) {
            if (conns.has(nodeIp)) {
                this._conns.set(nodeIp, conns.get(nodeIp)); // 保持链接
            } else {
                queue.push(this._connect(nodeIp)); // 与新节点建立连接
            }
        }

        try {
            await Promise.all(queue);
        } catch (e) {
            console.log(e);
        }
    }

    private _connect(remoteAddress: string): Promise<WebSocket> {
        return new Promise((resolve) => {
            // 判断连接是否已经存在，存在则不需要重连
            let conn = this._conns.get(remoteAddress);
            if (conn) {
                resolve(conn);
                return;
            }

            // 判断是否是本机
            const nodeAddress = Cluster.instance().nodeAddress;
            if (remoteAddress == nodeAddress) {
                this._conns.set(remoteAddress, null);
                resolve(null);
                return;
            }

            // 创建 WS 客户端
            const time = TimeTools.getTime();
            conn = new WebSocket(`ws://${remoteAddress}`, {
                headers: {
                    token: CommonTools.genToken(this._secret, nodeAddress, time),
                    system: nodeAddress,
                    time: time.toString(),
                }
            });

            conn.on('open', () => {
                Logger.instance().info(`${remoteAddress} connected!`);
                this._conns.set(remoteAddress, conn);
                resolve(conn);
            });

            conn.on('message', (message: string) => {
                // do nothing
            });

            conn.on('error', (e) => {
                Logger.instance().error(`${remoteAddress} error! msg:${e.message}`);
                this._conns.delete(remoteAddress);
                resolve(null);
            });

            conn.on('close', () => {
                Logger.instance().info(`${remoteAddress} close!`);
                this._conns.delete(remoteAddress);
                resolve(null);
            });
        });
    }

    public async forwarding(address: string, packet?: PacketModel) {
        if (this._initialized == false) {
            throw new Error('ClusterNodes has not initialized!');
        }

        // 判断消息服务器是否已经下线
        if (!this._conns.has(address)) {
            return null;
        }

        // 转发到指定消息服务器
        let conn = await this._connect(address);
        if (conn == null || conn.readyState !== WebSocket.OPEN) {
            return null; // 本机不需要发送。
        }

        conn.send(packet.format());
    }

    public async forwardingAll(packet: PacketModel) {
        if (this._initialized == false) {
            throw new Error('ClusterNodes has not initialized!');
        }

        // 转发到所有消息服务器
        let queue = [];
        for (let nodeIp of Array.from(this._conns.keys())) {
            queue.push(this.forwarding(nodeIp, packet));
        }

        await Promise.all(queue);
    }
}

export default ClusterNodes;