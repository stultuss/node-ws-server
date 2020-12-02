"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GrpcSendPacketServerImpl = void 0;
const packet_pb_1 = require("../proto/packet_pb");
const PacketModel_1 = require("../model/packet/PacketModel");
class GrpcSendPacketServerImpl {
    sendPacket(call, callback) {
        // 获取请求
        const request = call.request;
        const response = new packet_pb_1.SendPacketResponse();
        try {
            // 处理消息转发
            const pack = PacketModel_1.default.parse(request.getPacket());
            switch (pack.type) {
                case 204 /* IM_RELOGIN */:
                    break;
                case 211 /* IM_PRIVATE_CHAT */:
                case 212 /* IM_PRIVATE_ACTION */:
                    break;
                case 221 /* IM_WORLD_CHAT */:
                case 222 /* IM_WORLD_ACTION */:
                    break;
                case 311 /* IM_GROUP_CHAT */:
                case 312 /* IM_GROUP_ACTION */:
                    break;
            }
            // 返回结果
            response.setCode(0);
            response.setMsg('succeed!');
        }
        catch (e) {
            // 返回错误
            const response = new packet_pb_1.SendPacketResponse();
            response.setCode(e);
            response.setMsg('error!');
        }
        callback(null, response);
    }
    ;
}
exports.GrpcSendPacketServerImpl = GrpcSendPacketServerImpl;
