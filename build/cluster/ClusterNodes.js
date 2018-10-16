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
const WebSocket = require("ws");
const Cluster_1 = require("./Cluster");
const Logger_1 = require("../logger/Logger");
const Utility_1 = require("../common/Utility");
class ClusterNodes {
    static instance() {
        if (ClusterNodes._instance === undefined) {
            ClusterNodes._instance = new ClusterNodes();
        }
        return ClusterNodes._instance;
    }
    constructor() {
        this._conns = new Map();
    }
    init(options) {
        return __awaiter(this, void 0, void 0, function* () {
            this._options = options;
            this._initialized = true;
        });
    }
    ;
    get conns() {
        return this._conns;
    }
    /**
     * 更新消息服务集群的节点
     *
     * @param {string[]} nodeIps
     * @return {Promise<void>}
     */
    update(nodeIps) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this._initialized == false) {
                throw new Error('ClusterNodes has not initialized!');
            }
            // 验证集群是否有变动，没有变动则不做处理
            if (nodeIps === [...Array.from(this._conns.keys())]) {
                return;
            }
            const conns = this._conns;
            this._conns = new Map();
            // 添加节点
            let queue = [];
            for (let nodeIp of nodeIps) {
                if (conns.has(nodeIp)) {
                    this._conns.set(nodeIp, conns.get(nodeIp)); // 保持链接
                }
                else {
                    queue.push(this._connect(nodeIp)); // 与新节点建立连接
                }
            }
            try {
                yield Promise.all(queue);
            }
            catch (e) {
                console.log(e);
            }
        });
    }
    _connect(remoteAddress) {
        return new Promise((resolve) => {
            // 判断连接是否已经存在，存在则不需要重连
            let conn = this._conns.get(remoteAddress);
            if (conn) {
                resolve(conn);
                return;
            }
            // 判断是否是本机
            const nodeAddress = Cluster_1.default.instance().nodeAddress;
            if (remoteAddress == nodeAddress) {
                this._conns.set(remoteAddress, null);
                resolve(null);
                return;
            }
            // 创建 WS 客户端
            const time = Utility_1.TimeTools.getTime();
            conn = new WebSocket(`ws://${remoteAddress}`, Utility_1.CommonTools.genToken(this._options.secret.system, nodeAddress, time), {
                headers: {
                    system: nodeAddress,
                    time: time.toString(),
                }
            });
            conn.on('open', () => {
                Logger_1.default.instance().info(`${remoteAddress} connected!`);
                this._conns.set(remoteAddress, conn);
                resolve(conn);
            });
            conn.on('message', (message) => {
                // do nothing
            });
            conn.on('error', (e) => {
                Logger_1.default.instance().error(`${remoteAddress} error! msg:${e.message}`);
                this._conns.delete(remoteAddress);
                resolve(null);
            });
            conn.on('close', () => {
                Logger_1.default.instance().info(`${remoteAddress} close!`);
                this._conns.delete(remoteAddress);
                resolve(null);
            });
        });
    }
    forwarding(address, packet) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this._initialized == false) {
                throw new Error('ClusterNodes has not initialized!');
            }
            // 判断消息服务器是否已经下线
            if (!this._conns.has(address)) {
                return null;
            }
            // 转发到指定消息服务器
            let conn = yield this._connect(address);
            if (conn == null || conn.readyState !== WebSocket.OPEN) {
                return null; // 本机不需要发送。
            }
            conn.send(packet.format());
        });
    }
    forwardingAll(packet) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this._initialized == false) {
                throw new Error('ClusterNodes has not initialized!');
            }
            // 转发到所有消息服务器
            let queue = [];
            for (let nodeIp of Array.from(this._conns.keys())) {
                queue.push(this.forwarding(nodeIp, packet));
            }
            yield Promise.all(queue);
        });
    }
}
exports.default = ClusterNodes;
