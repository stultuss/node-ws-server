import * as _ from 'underscore';
import UserModel from '../../model/user/UserModel';
import UserManager from '../../model/user/UserManager';
import PacketModel from '../../model/packet/PacketModel';
import {WsConnHandler} from '../lib/WsConnHandler';
import {ErrorCode} from '../../config/ErrorCode';
import {API_FROM, API_RESPONSE, BaseBody} from '../../const/Const';

// 操作分两种，一种系统转发操作，一种是玩家自己操作。系统允许操作任何玩家，但玩家只能操作自己
export namespace UserAction {
    export async function logout(user: UserModel, pack: PacketModel, isReLogin = false) {
        const code = (isReLogin) ? ErrorCode.IM_ERROR_CODE_RE_LOGIN : ErrorCode.IM_ERROR_CODE_LOGOUT;
        if (WsConnHandler.isForwarding(user, pack)) {
            let body: BaseBody = pack.body;
            let bodyUser = UserManager.instance().get(body.uid);
            if (bodyUser) {
                bodyUser.logout(code);
            }
        } else {
            if (user) {
                user.logout(code);
            }
        }
    }

    export async function update(user: UserModel, pack: PacketModel) {
        let body: BaseBody = pack.body;

        if (WsConnHandler.isForwarding(user, pack)) {
            // 消息转发
            let body: BaseBody = pack.body;
            let bodyUser = UserManager.instance().get(body.uid);
            if (bodyUser) {
                bodyUser.updateData(body.data);
            }
        } else {
            if (user) {
                // 更新用户信息
                if (_.isObject(body.data)) {
                    user.updateData(body.data);
                }

                // 结果通知客户端
                await sendResponse(user, pack);
            }
        }
    }

    async function sendResponse(user: UserModel, pack: PacketModel, data: any = [], isError: boolean = false) {
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