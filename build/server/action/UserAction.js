"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const _ = require("underscore");
const UserManager_1 = require("../../model/user/UserManager");
const PacketModel_1 = require("../../model/packet/PacketModel");
const WsConnHandler_1 = require("../lib/WsConnHandler");
// 操作分两种，一种系统转发操作，一种是玩家自己操作。系统允许操作任何玩家，但玩家只能操作自己
var UserAction;
(function (UserAction) {
    function logout(user, pack, isReLogin = false) {
        return __awaiter(this, void 0, void 0, function* () {
            const code = (isReLogin) ? 3011 /* IM_ERROR_CODE_RE_LOGIN */ : 3014 /* IM_ERROR_CODE_LOGOUT */;
            if (WsConnHandler_1.WsConnHandler.isForwarding(user, pack)) {
                let body = pack.body;
                let bodyUser = UserManager_1.default.instance().get(body.uid);
                if (bodyUser) {
                    bodyUser.logout(code);
                }
            }
            else {
                user.logout(code);
            }
        });
    }
    UserAction.logout = logout;
    function update(user, pack) {
        return __awaiter(this, void 0, void 0, function* () {
            let body = pack.body;
            if (WsConnHandler_1.WsConnHandler.isForwarding(user, pack)) {
                // 消息转发
                let body = pack.body;
                let bodyUser = UserManager_1.default.instance().get(body.uid);
                if (bodyUser) {
                    bodyUser.updateData(body.data);
                }
            }
            else {
                // 更新用户信息
                if (_.isObject(body.data)) {
                    user.updateData(body.data);
                }
                // 结果通知客户端
                user.connSend(PacketModel_1.default.create(1 /* IM_SUCCEED */, 1 /* IM_FROM_TYPE_SYSTEM */, pack.requestId, {}));
            }
        });
    }
    UserAction.update = update;
})(UserAction = exports.UserAction || (exports.UserAction = {}));
