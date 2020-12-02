import {API_FROM, API_MSG_TYPE, BaseBody} from '../../const/Common';
import {GrpcClientManager} from '../../lib/GrpcClientManager';
import {WsService} from '../ws.service';
import {PacketModel} from '../../model/packet/PacketModel';
import {PacketCode} from '../../model/packet/PacketCode';
import {UserModel} from '../../model/user/UserModel';
import {UserList} from '../../model/user/UserList';

export namespace PrivateAction {
    
    /**
     * 发送消息
     *
     * @param {UserModel} user
     * @param {PacketModel} pack
     * @param {boolean} isAction
     */
    export function notice(user: UserModel, pack: PacketModel, isAction = false) {
        _checkUser(pack);
        _checkMessage(pack, (isAction) ? API_MSG_TYPE.IM_ACTION : API_MSG_TYPE.IM_CHAT);
        
        // 消息由服务器进行转发
        broadcast(user, pack);
    
        // 结果通知客户端
        WsService.sendResponse(user, pack);
    }
    
    /**
     * 单播
     *
     * @param {UserModel} sender
     * @param {PacketModel} pack
     */
    function broadcast(sender: UserModel, pack: PacketModel) {
        // 消息 body
        const body = pack.body as BaseBody;
        if (sender) {
            body.sender = (pack.fromType == API_FROM.IM_FROM_TYPE_USER) ? sender.id : 'SYS'
        }
        
        // 消息 fromType
        const forwardingType = WsService.convertFromTypeToForwardingType(pack.fromType);
        const fromType = WsService.convertForwardingTypeToFromType(pack.fromType);
    
        // 发送本地消息
        const receiver = UserList.instance().get(body.receive);
        if (receiver) {
            receiver.connSend(PacketModel.create(pack.type, fromType, pack.requestId, body));
            return ;
        }
    
        // 发送远程消息
        UserList.instance().getGrpcAddress(body.receive).then((address) => {
            if (!address) {
                return;
            }
            GrpcClientManager.instance().forwarding(address, PacketModel.create(pack.type, forwardingType, pack.requestId, body));
        }).catch(e => console.log(e));
    }
    
    /**
     * 检查接受者ID
     *
     * @param {PacketModel} pack
     */
    function _checkUser(pack: PacketModel) {
        let body = pack.body as BaseBody;
        if (!body.hasOwnProperty('receive')) {
            throw PacketCode.IM_ERROR_CODE_BODY_PROPERTY_WRONG;
        }
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