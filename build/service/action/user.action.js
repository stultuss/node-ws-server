"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserAction = void 0;
const ws_service_1 = require("../ws.service");
const PacketCode_1 = require("../../model/packet/PacketCode");
var UserAction;
(function (UserAction) {
    /**
     * 用户登出
     *
     * @param {UserModel} user
     * @param {PacketModel} pack
     * @param {boolean} isReLogin
     */
    function logout(user, pack, isReLogin = false) {
        if (!user) {
            return;
        }
        // 通知客户端属于什么情况下的退出
        user.logout((isReLogin) ? PacketCode_1.PacketCode.IM_ERROR_CODE_RE_LOGIN : PacketCode_1.PacketCode.IM_ERROR_CODE_LOGOUT);
    }
    UserAction.logout = logout;
    /**
     * 更新用户信息
     *
     * @param {UserModel} user
     * @param {PacketModel} pack
     */
    function update(user, pack) {
        if (!user) {
            return;
        }
        user.updateData(pack);
        ws_service_1.WsService.sendResponse(user, pack);
    }
    UserAction.update = update;
})(UserAction = exports.UserAction || (exports.UserAction = {}));
