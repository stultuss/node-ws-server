import * as _ from 'underscore';
import {UserList} from '../model/user/UserList';
import {UserModel} from '../model/user/UserModel';
import {PacketModel} from '../model/packet/PacketModel';
import {PacketCode} from '../model/packet/PacketCode';
import {API_FROM, API_MSG_TYPE, API_RESPONSE, API_TYPE, BaseActionBody, BaseChatBody} from '../const/Common';
import {UserAction} from './action/user.action';
import {GroupAction} from './action/group.action';
import {WorldAction} from './action/world.action';
import {PrivateAction} from './action/private.action';

/**
 * 处理 Ws 链接
 */
export namespace WsService {
    /**
     * 处理 WS 客户端消息
     */
    export function onMessage(user: UserModel, message: any) {
        try {
            const pack = PacketModel.parse(message);
            
            // 用户消息合法性检查
            checkUser(user);
            
            switch (pack.type) {
                case API_TYPE.IM_LOGOUT:
                    UserAction.logout(user, pack, false);
                    break;
                    
                case API_TYPE.IM_UPDATE_INFO:
                    UserAction.update(user, pack);
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
                case API_TYPE.IM_GROUP_JOIN:
                    GroupAction.join(user, pack);
                    break;
                case API_TYPE.IM_GROUP_QUIT:
                    GroupAction.quit(user, pack);
                    break;
                default:
                    if (user) {
                        user.logout(PacketCode.IM_ERROR_CODE_NOT_ALLOWED_TYPE);
                    }
                    break;
            }
        } catch (e) {
            if (user) {
                user.logout(e);
            }
        }
    }
    
    /**
     * 处理 WS 链接失败
     */
    export function onClose(user: UserModel) {
        // 判断玩家是正常退出，还是异常退出，如果是异常退出，则走正常退出流程
        let closeUser = UserList.instance().get(user.id);
        if (closeUser && closeUser.remote == user.remote) {
            closeUser.logout();
        }
    }
    
    /**
     * 处理 WS 客户端错误
     */
    export function onError(user: UserModel, e: Error) {
        onClose(user);
    }
    
    /**
     * 验证用户是否存在
     *
     * @param user
     */
    export function checkUser(user: UserModel) {
        if (!user) {
            throw PacketCode.IM_ERROR_CODE_NOT_ALLOWED_TYPE;
        }
    }
    
    /**
     * 检查 Chat Message 数据结构
     *
     * @param {BaseChatBody} body
     */
    export function checkChatMessage(body: BaseChatBody): BaseChatBody {
        if (body.type !== API_MSG_TYPE.IM_CHAT) {
            throw PacketCode.IM_ERROR_CODE_NOT_ALLOWED_TYPE;
        }

        if (!body.hasOwnProperty('msg') || !_.isString(body.msg)) {
            throw PacketCode.IM_ERROR_CODE_BODY_PROPERTY_WRONG;
        }

        if (body.msg == '') {
            throw PacketCode.IM_ERROR_CODE_MSG_EMPTY;
        }

        return body;
    }
    
    /**
     * 检查 Action Message 数据结构
     *
     * @param {BaseChatBody} body
     */
    export function checkActionMessage(body: BaseActionBody): BaseActionBody {
        if (body.type !== API_MSG_TYPE.IM_ACTION) {
            throw PacketCode.IM_ERROR_CODE_NOT_ALLOWED_TYPE;
        }

        if (!body.hasOwnProperty('action')) {
            throw PacketCode.IM_ERROR_CODE_BODY_PROPERTY_WRONG;
        }

        return body;
    }
    /**
     * 处理从消息转发过来的 FromType
     */
    export function convertFromTypeToForwardingType(fromType) {
        switch (fromType) {
            case API_FROM.IM_FROM_TYPE_USER:
                return API_FROM.IM_FROM_TYPE_FORWARDING_USER;
            case API_FROM.IM_FROM_TYPE_SYSTEM:
                return API_FROM.IM_FROM_TYPE_FORWARDING_SYSTEM;
            default:
                return fromType
        }
    }
    
    /**
     * 处理从消息转发过来的 ForwardingType
     */
    export function convertForwardingTypeToFromType(fromType) {
        switch (fromType) {
            case API_FROM.IM_FROM_TYPE_FORWARDING_USER:
                return API_FROM.IM_FROM_TYPE_USER;
            case API_FROM.IM_FROM_TYPE_FORWARDING_SYSTEM:
                return API_FROM.IM_FROM_TYPE_SYSTEM;
            default:
                return fromType
        }
    }
    
    /**
     * 发送结果消息
     *
     * @param {UserModel} user
     * @param {PacketModel} pack
     * @param {any} data
     * @param {boolean} isError
     */
    export function sendResponse(user: UserModel, pack: PacketModel, data: any = [], isError: boolean = false) {
        if (!user) {
            return;
        }
        
        user.connSend(PacketModel.create(
            (isError) ? API_RESPONSE.IM_ERROR : API_RESPONSE.IM_SUCCEED,
            API_FROM.IM_FROM_TYPE_SYSTEM,
            pack.requestId,
            data
        ));
    }
}
