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
const grpc = require("grpc");
const Utility_1 = require("../common/Utility");
const packet_pb_1 = require("../proto/packet_pb");
const packet_grpc_pb_1 = require("../proto/packet_grpc_pb");
const grpc_SendPacketServer_impl_1 = require("./grpc.SendPacketServer.impl");
const grpc_config_1 = require("../config/grpc.config");
class GrpcService {
    constructor() {
        this._conns = new Map();
    }
    static instance() {
        if (GrpcService._instance === undefined) {
            GrpcService._instance = new GrpcService();
        }
        return GrpcService._instance;
    }
    static get grpcAddress() {
        return `${Utility_1.CommonTools.eth0()}:${grpc_config_1.grpcConfig.port}`;
    }
    init() {
        return __awaiter(this, void 0, void 0, function* () {
            const server = new grpc.Server();
            server.addService(packet_grpc_pb_1.SendPacketService, new grpc_SendPacketServer_impl_1.GrpcSendPacketServerImpl());
            server.bind(`${grpc_config_1.grpcConfig.host}:${grpc_config_1.grpcConfig.port}`, grpc.ServerCredentials.createInsecure());
            server.start();
        });
    }
    ;
    connect(address) {
        // 判断是否本机，如果是则跳过
        if (address == GrpcService.grpcAddress) {
            return;
        }
        // 判断连接是否已经存在，存在则不需要重连
        let conn = this._conns.get(address);
        if (conn) {
            return conn;
        }
        // 创建 grpc 客户端
        conn = new packet_grpc_pb_1.SendPacketClient(address, grpc.credentials.createInsecure());
        this._conns.set(address, conn);
        return conn;
    }
    disconnect(address) {
        // 判断连接是否已经存在，存在则不需要重连
        let conn = this._conns.get(address);
        if (!conn) {
            return;
        }
        // 删除 grpc 客户端
        this._conns.delete(address);
    }
    forwarding(address, packet) {
        // 获取 grpc 客户端
        let conn = this.connect(address);
        if (conn == null) {
            return null; // 本机不需要发送。
        }
        // 创建消息体
        const request = new packet_pb_1.SendPacketRequest();
        request.setPacket(packet.format());
        conn.sendPacket(request, (err, res) => {
            if (err != null) {
                console.log(`[grpc] Send Error, message: ${err.message}`);
            }
            else if (res.getCode() > 0) {
                console.log(`[grpc] Packet Error, code: ${res.getCode()} message: ${res.getMsg()}`);
            }
        });
    }
    forwardingAll(packet) {
        for (let ip of Array.from(this._conns.keys())) {
            this.forwarding(ip, packet);
        }
    }
}
exports.default = GrpcService;
