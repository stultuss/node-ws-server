import * as _ from 'underscore';
import PacketModel from '../../model/packet/PacketModel';
import UserModel from '../../model/user/UserModel';
import UserManager from '../../model/user/UserManager';
import {UserAction} from '../action/UserAction';
import {WorldAction} from '../action/WorldAction';
import {GroupAction} from '../action/GroupAction';
import {PrivateAction} from '../action/PrivateAction';
import {ErrorCode} from '../../config/ErrorCode';
import {API_FROM, API_MSG_TYPE, API_TYPE, BaseActionBody, BaseChatBody} from '../../const/Const';

const debug = require('debug')('DEBUG:');

/**
 * 处理 Ws 链接
 */
export namespace WsConnHandler {
    /**
     * 处理 WS 客户端消息
     */
    export async function onMessage(user: UserModel, message: any) {
        try {
            const pack = PacketModel.parse(message);
            switch (pack.type) {
                case API_TYPE.IM_LOGOUT:
                case API_TYPE.IM_RELOGIN:
                    await UserAction.logout(user, pack, (pack.type == API_TYPE.IM_RELOGIN));
                    break;
                case API_TYPE.IM_UPDATE_INFO:
                    await UserAction.update(user, pack);
                    break;

                case API_TYPE.IM_PRIVATE_CHAT:
                case API_TYPE.IM_PRIVATE_ACTION:
                    await PrivateAction.notice(user, pack, (pack.type == API_TYPE.IM_PRIVATE_ACTION));
                    break;

                case API_TYPE.IM_WORLD_CHAT:
                case API_TYPE.IM_WORLD_ACTION:
                    await WorldAction.notice(user, pack, (pack.type == API_TYPE.IM_WORLD_ACTION));
                    break;

                case API_TYPE.IM_GROUP_CHAT:
                case API_TYPE.IM_GROUP_ACTION:
                    await GroupAction.notice(user, pack, (pack.type == API_TYPE.IM_GROUP_ACTION));
                    break;
                case API_TYPE.IM_GROUP_JOIN:
                    await GroupAction.join(user, pack);
                    break;
                case API_TYPE.IM_GROUP_QUIT:
                    await GroupAction.quit(user, pack);
                    break;
                default:
                    if (user) {
                        user.logout(ErrorCode.IM_ERROR_CODE_NOT_ALLOWED_TYPE);
                    }
                    break;
            }
        } catch (e) {
            debug(e);
        }
    }

    /**
     * 处理 WS 链接失败
     */
    export async function onClose(user: UserModel) {
        try {
            if (user) {
                // 判断玩家是正常退出，还是异常退出，如果是异常退出，则走正常退出流程
                let closeUser = UserManager.instance().get(user.id);
                if (closeUser && closeUser.remote == user.remote) {
                    closeUser.logout();
                }
            }
        } catch (e) {
            debug(e);
        }
    }

    /**
     * 处理 WS 客户端错误
     */
    export async function onError(user: UserModel, err: Error) {
        debug(err);

        try {
            await onClose(user);
        } catch (e) {
            debug(e);
        }
    }

    export function isForwarding(user: UserModel, pack: PacketModel) {
        //Fixme 在验证系统登录（System）的这块，后续需要补上服务器白名单，目前只验证了系统密钥。
        return (user == null && (pack.fromType == API_FROM.IM_FROM_TYPE_FORWARDING_USER || pack.fromType == API_FROM.IM_FROM_TYPE_FORWARDING_SYSTEM));
    }

    export function checkChatMessage(body: BaseChatBody): BaseChatBody {
        if (body.type !== API_MSG_TYPE.IM_CHAT) {
            throw ErrorCode.IM_ERROR_CODE_NOT_ALLOWED_TYPE;
        }

        if (!body.hasOwnProperty('msg') || _.isString(body.msg)) {
            throw ErrorCode.IM_ERROR_CODE_BODY_PROPERTY_WRONG;
        }

        if (body.msg == '') {
            throw ErrorCode.IM_ERROR_CODE_MSG_EMPTY;
        }

        return body;
    }

    export function checkActionMessage(body: BaseActionBody): BaseActionBody {
        if (body.type !== API_MSG_TYPE.IM_ACTION) {
            throw ErrorCode.IM_ERROR_CODE_NOT_ALLOWED_TYPE;
        }

        if (!body.hasOwnProperty('action')) {
            throw ErrorCode.IM_ERROR_CODE_BODY_PROPERTY_WRONG;
        }

        return body;
    }
}
