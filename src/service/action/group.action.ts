import {API_FROM, API_MSG_TYPE, BaseBody} from '../../const/Common';
import {GrpcClientManager} from '../../lib/GrpcClientManager';
import {WsService} from '../ws.service';
import {UserList} from '../../model/user/UserList';
import {UserModel} from '../../model/user/UserModel';
import {PacketModel} from '../../model/packet/PacketModel';
import {PacketCode} from '../../model/packet/PacketCode';
import {GroupList} from '../../model/group/GroupList';

export namespace GroupAction {
    
    /**
     * 加入群组
     *
     * @param {UserModel} user
     * @param {PacketModel} pack
     */
    export function join(user: UserModel, pack: PacketModel) {
        _checkGroup(pack);

        let body: BaseBody = pack.body;
        
        // 加入 group
        user.joinGroup(body.groupId);
    
        // 结果通知客户端
        WsService.sendResponse(user, pack);
    }
    
    /**
     * 退出群组
     *
     * @param {UserModel} user
     * @param {PacketModel} pack
     */
    export function quit(user: UserModel, pack: PacketModel) {
        _checkGroup(pack);

        let body: BaseBody = pack.body;
        
        // 不属于自己群组
        if (user && user.hasGroup(body.groupId) == false) {
            WsService.sendResponse(user, pack, {code: PacketCode.IM_ERROR_CODE_NOT_ALLOWED_TYPE}, true);
            return;
        }
    
        // 加入 group
        user.quitGroup(body.groupId);
    
        // 结果通知客户端
        WsService.sendResponse(user, pack);
    }
    
    /**
     * 发送消息
     *
     * @param {UserModel} user
     * @param {PacketModel} pack
     * @param {boolean} isAction
     */
    export function notice(user: UserModel, pack: PacketModel, isAction: boolean = false) {
        _checkGroup(pack);
        _checkMessage(pack, (isAction) ? API_MSG_TYPE.IM_ACTION : API_MSG_TYPE.IM_CHAT);

        let body = pack.body as BaseBody;
        
        // 不属于自己群组
        if (user && user.hasGroup(body.groupId) == false) {
            WsService.sendResponse(user, pack, {code: PacketCode.IM_WARNING_NOT_IN_GROUP}, true);
            return;
        }

        // 消息由服务器进行转发
        _broadcast(user, pack, body.groupId);
        
        // 结果通知客户端
        WsService.sendResponse(user, pack);
    }
    
    /**
     * 多播
     *
     * @param {UserModel} sender
     * @param {PacketModel} pack
     * @param {string} groupId
     */
    function _broadcast(sender: UserModel, pack: PacketModel, groupId: string) {
        // 消息 body
        const body = pack.body as BaseBody;
        if (sender) {
            body.sender = (pack.fromType == API_FROM.IM_FROM_TYPE_USER) ? sender.id : 'SYS'
        }
    
        // 消息 fromType
        const forwardingType = WsService.convertFromTypeToForwardingType(pack.fromType);
        const fromType = WsService.convertForwardingTypeToFromType(pack.fromType);
        
        // 验证是否存在 groupId
        let group = GroupList.instance().get(groupId);
        if (!group) {
            return ;
        }
        
        // 发送远程消息
        if (pack.fromType !== API_FROM.IM_FROM_TYPE_FORWARDING_USER && pack.fromType !== API_FROM.IM_FROM_TYPE_FORWARDING_SYSTEM) {
            GrpcClientManager.instance().forwardingAll(PacketModel.create(pack.type, forwardingType, pack.requestId, body));
        }
        
        // 发送本地消息
        group.uids.forEach((userId) => {
            const receiver = UserList.instance().get(userId);
            if (!receiver) {
                return;
            }
            receiver.connSend(PacketModel.create(pack.type, fromType, pack.requestId, body));
        });
    }
    
    /**
     * 检查群组ID
     *
     * @param {PacketModel} pack
     */
    function _checkGroup(pack: PacketModel) {
        let body = pack.body as BaseBody;
        if (!body.hasOwnProperty('groupId')) {
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