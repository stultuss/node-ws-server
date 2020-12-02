import * as grpc from "grpc";
import {ISendPacketServer} from '../proto/packet_grpc_pb';
import {SendPacketRequest, SendPacketResponse} from '../proto/packet_pb';
import {PacketModel} from '../model/packet/PacketModel';
import {UserList} from '../model/user/UserList';
import {UserAction} from './action/user.action';

import {API_TYPE} from '../const/Common';
import {PrivateAction} from './action/private.action';
import {GroupAction} from './action/group.action';
import {WorldAction} from './action/world.action';

/**
 * 处理 Grpc 消息
 */
export class GrpcServerImpl implements ISendPacketServer {
    // 通过 SendPacket 接口获取的消息
    sendPacket(call: grpc.ServerUnaryCall<SendPacketRequest>, callback: grpc.sendUnaryData<SendPacketResponse>) {
        // 获取请求
        const request = call.request;
        const response = new SendPacketResponse();
        
        try {
            // 处理消息转发
            const pack = PacketModel.parse(request.getPacket());
            const user = UserList.instance().get(pack.body.uid);
            
            switch (pack.type) {
                case API_TYPE.IM_RELOGIN:
                    UserAction.logout(user, pack, true);
                    break;
                case API_TYPE.IM_PRIVATE_CHAT:
                case API_TYPE.IM_PRIVATE_ACTION:
                    PrivateAction.notice(user, pack, (pack.type == API_TYPE.IM_PRIVATE_ACTION));
                    break;
                case API_TYPE.IM_WORLD_CHAT:
                case API_TYPE.IM_WORLD_ACTION:
                    WorldAction.notice(user, pack, (pack.type == API_TYPE.IM_WORLD_ACTION));
                    break;
                case API_TYPE.IM_GROUP_CHAT:
                case API_TYPE.IM_GROUP_ACTION:
                    GroupAction.notice(user, pack, (pack.type == API_TYPE.IM_GROUP_ACTION));
                    break;
            }
            
            // 返回结果
            response.setCode(0);
            response.setMsg('succeed!');
        } catch (e) {
            console.log(e);
            // 返回错误
            const response = new SendPacketResponse();
            response.setCode(-1);
            response.setMsg('error!');
        }
        
        callback(null, response);
    };
}