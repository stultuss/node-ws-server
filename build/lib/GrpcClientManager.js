"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GrpcClientManager = void 0;
const grpc = require("grpc");
const Utility_1 = require("../common/Utility");
const grpc_service_1 = require("../service/grpc.service");
const packet_pb_1 = require("../proto/packet_pb");
const packet_grpc_pb_1 = require("../proto/packet_grpc_pb");
const grpc_config_1 = require("../config/grpc.config");
class GrpcClientManager {
    constructor() {
        this._conns = new Map();
        // 创建 Grpc 服务器
        const server = new grpc.Server();
        server.addService(packet_grpc_pb_1.SendPacketService, new grpc_service_1.GrpcServerImpl());
        server.bind(`${grpc_config_1.grpcConfig.host}:${grpc_config_1.grpcConfig.port}`, grpc.ServerCredentials.createInsecure());
        server.start();
    }
    static instance() {
        if (GrpcClientManager._instance === undefined) {
            GrpcClientManager._instance = new GrpcClientManager();
        }
        return GrpcClientManager._instance;
    }
    static get grpcAddress() {
        return `${Utility_1.CommonTools.eth0()}:${grpc_config_1.grpcConfig.port}`;
    }
    /**
     * 连接远程 Grpc 服务节点
     *
     * @param address
     */
    connect(address) {
        // 判断是否本机，如果是则跳过
        if (address == GrpcClientManager.grpcAddress) {
            return;
        }
        // 判断连接是否已经存在，存在则不需要重连
        let conn = this._conns.get(address);
        if (conn) {
            return conn;
        }
        // 创建 grpc 连接
        conn = new packet_grpc_pb_1.SendPacketClient(address, grpc.credentials.createInsecure());
        this._conns.set(address, conn);
        Utility_1.CommonTools.logger(`[grpc] Client: ${address} connected!`);
        return conn;
    }
    /**
     * 断开远程 Grpc 服务节点
     *
     * @param address
     */
    disconnect(address) {
        // 判断连接是否已经存在，存在则不需要重连
        let conn = this._conns.get(address);
        if (!conn) {
            return;
        }
        // 关闭 grpc 连接
        conn.close();
        // 删除 grpc 连接
        this._conns.delete(address);
    }
    forwarding(address, packet) {
        // 获取 grpc 连接
        let conn = this.connect(address);
        if (conn == null) {
            return null; // 本机不需要发送。
        }
        // 创建消息体
        const request = new packet_pb_1.SendPacketRequest();
        request.setPacket(packet.format());
        conn.sendPacket(request, (err, res) => {
            if (err != null) {
                Utility_1.CommonTools.logger(`[grpc] Send Error, message: ${err.message}`);
            }
            else if (res.getCode() > 0) {
                Utility_1.CommonTools.logger(`[grpc] Packet Error, code: ${res.getCode()} message: ${res.getMsg()}`);
            }
        });
    }
    forwardingAll(packet) {
        for (let ip of Array.from(this._conns.keys())) {
            this.forwarding(ip, packet);
        }
    }
}
exports.GrpcClientManager = GrpcClientManager;
