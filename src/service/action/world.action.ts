import {WsService} from '../ws.service';
import {API_FROM, API_MSG_TYPE, BaseBody} from '../../const/Common';
import {GrpcClientManager} from '../../lib/GrpcClientManager';
import {PacketModel} from '../../model/packet/PacketModel';
import {PacketCode} from '../../model/packet/PacketCode';
import {UserModel} from '../../model/user/UserModel';
import {UserList} from '../../model/user/UserList';

export namespace WorldAction {
    
    /**
     * 发送消息
     *
     * @param {UserModel} user
     * @param {PacketModel} pack
     * @param {boolean} isAction
     */
    export function notice(user: UserModel, pack: PacketModel, isAction = false) {
        _checkMessage(pack, (isAction) ? API_MSG_TYPE.IM_ACTION : API_MSG_TYPE.IM_CHAT);

        // 消息由服务器进行转发
        _broadcast(user, pack);
        
        // 结果通知客户端
        WsService.sendResponse(user, pack);
    }
    
    /**
     * 多播
     *
     * @param {UserModel} sender
     * @param {PacketModel} pack
     */
    function _broadcast(sender: UserModel, pack: PacketModel) {
        // 消息 body
        const body = pack.body as BaseBody;
        if (sender) {
            body.sender = (pack.fromType == API_FROM.IM_FROM_TYPE_USER) ? sender.id : 'SYS'
        }
    
        // 消息 fromType
        const forwardingType = WsService.convertFromTypeToForwardingType(pack.fromType);
        const fromType = WsService.convertForwardingTypeToFromType(pack.fromType);
        
        // 发送远程消息
        if (pack.fromType !== API_FROM.IM_FROM_TYPE_FORWARDING_USER && pack.fromType !== API_FROM.IM_FROM_TYPE_FORWARDING_SYSTEM) {
            GrpcClientManager.instance().forwardingAll(PacketModel.create(pack.type, forwardingType, pack.requestId, body));
        }
        
        // 发送本地消息
        UserList.instance().list.forEach((receiver: UserModel) => {
            receiver.connSend(PacketModel.create(pack.type, fromType, pack.requestId, body));
        });
    }
    
    /**
     * 检查消息结构
     *
     * @param pack
     * @param msgType
     */
    function _checkMessage(pack: PacketModel, msgType: number) {
        switch (msgType) {
            case API_MSG_TYPE.IM_CHAT:
                WsService.checkChatMessage(pack.body);
                break;
            case API_MSG_TYPE.IM_ACTION:
                WsService.checkActionMessage(pack.body);
                break;
            default:
                throw PacketCode.IM_ERROR_CODE_NOT_ALLOWED_TYPE;
        }
    }
}