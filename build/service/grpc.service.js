"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GrpcServerImpl = void 0;
const packet_pb_1 = require("../proto/packet_pb");
const PacketModel_1 = require("../model/packet/PacketModel");
const UserList_1 = require("../model/user/UserList");
const user_action_1 = require("./action/user.action");
const Common_1 = require("../const/Common");
const private_action_1 = require("./action/private.action");
const group_action_1 = require("./action/group.action");
const world_action_1 = require("./action/world.action");
/**
 * 处理 Grpc 消息
 */
class GrpcServerImpl {
    // 通过 SendPacket 接口获取的消息
    sendPacket(call, callback) {
        // 获取请求
        const request = call.request;
        const response = new packet_pb_1.SendPacketResponse();
        try {
            // 处理消息转发
            const pack = PacketModel_1.PacketModel.parse(request.getPacket());
            const user = UserList_1.UserList.instance().get(pack.body.uid);
            switch (pack.type) {
                case Common_1.API_TYPE.IM_RELOGIN:
                    user_action_1.UserAction.logout(user, pack, true);
                    break;
                case Common_1.API_TYPE.IM_PRIVATE_CHAT:
                case Common_1.API_TYPE.IM_PRIVATE_ACTION:
                    private_action_1.PrivateAction.notice(user, pack, (pack.type == Common_1.API_TYPE.IM_PRIVATE_ACTION));
                    break;
                case Common_1.API_TYPE.IM_WORLD_CHAT:
                case Common_1.API_TYPE.IM_WORLD_ACTION:
                    world_action_1.WorldAction.notice(user, pack, (pack.type == Common_1.API_TYPE.IM_WORLD_ACTION));
                    break;
                case Common_1.API_TYPE.IM_GROUP_CHAT:
                case Common_1.API_TYPE.IM_GROUP_ACTION:
                    group_action_1.GroupAction.notice(user, pack, (pack.type == Common_1.API_TYPE.IM_GROUP_ACTION));
                    break;
            }
            // 返回结果
            response.setCode(0);
            response.setMsg('succeed!');
        }
        catch (e) {
            console.log(e);
            // 返回错误
            const response = new packet_pb_1.SendPacketResponse();
            response.setCode(-1);
            response.setMsg('error!');
        }
        callback(null, response);
    }
    ;
}
exports.GrpcServerImpl = GrpcServerImpl;
