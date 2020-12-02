"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrivateAction = void 0;
const Common_1 = require("../../const/Common");
const GrpcClientManager_1 = require("../../lib/GrpcClientManager");
const ws_service_1 = require("../ws.service");
const PacketModel_1 = require("../../model/packet/PacketModel");
const PacketCode_1 = require("../../model/packet/PacketCode");
const UserList_1 = require("../../model/user/UserList");
var PrivateAction;
(function (PrivateAction) {
    /**
     * 发送消息
     *
     * @param {UserModel} user
     * @param {PacketModel} pack
     * @param {boolean} isAction
     */
    function notice(user, pack, isAction = false) {
        _checkUser(pack);
        _checkMessage(pack, (isAction) ? Common_1.API_MSG_TYPE.IM_ACTION : Common_1.API_MSG_TYPE.IM_CHAT);
        // 消息由服务器进行转发
        broadcast(user, pack);
        // 结果通知客户端
        ws_service_1.WsService.sendResponse(user, pack);
    }
    PrivateAction.notice = notice;
    /**
     * 单播
     *
     * @param {UserModel} sender
     * @param {PacketModel} pack
     */
    function broadcast(sender, pack) {
        // 消息 body
        const body = pack.body;
        if (sender) {
            body.sender = (pack.fromType == Common_1.API_FROM.IM_FROM_TYPE_USER) ? sender.id : 'SYS';
        }
        // 消息 fromType
        const forwardingType = ws_service_1.WsService.convertFromTypeToForwardingType(pack.fromType);
        const fromType = ws_service_1.WsService.convertForwardingTypeToFromType(pack.fromType);
        // 发送本地消息
        const receiver = UserList_1.UserList.instance().get(body.receive);
        if (receiver) {
            receiver.connSend(PacketModel_1.PacketModel.create(pack.type, fromType, pack.requestId, body));
            return;
        }
        // 发送远程消息
        UserList_1.UserList.instance().getGrpcAddress(body.receive).then((address) => {
            if (!address) {
                return;
            }
            GrpcClientManager_1.GrpcClientManager.instance().forwarding(address, PacketModel_1.PacketModel.create(pack.type, forwardingType, pack.requestId, body));
        }).catch(e => console.log(e));
    }
    /**
     * 检查接受者ID
     *
     * @param {PacketModel} pack
     */
    function _checkUser(pack) {
        let body = pack.body;
        if (!body.hasOwnProperty('receive')) {
            throw PacketCode_1.PacketCode.IM_ERROR_CODE_BODY_PROPERTY_WRONG;
        }
    }
    /**
     * 检查消息结构
     *
     * @param pack
     * @param msgType
     */
    function _checkMessage(pack, msgType) {
        switch (msgType) {
            case Common_1.API_MSG_TYPE.IM_CHAT:
                ws_service_1.WsService.checkChatMessage(pack.body);
                break;
            case Common_1.API_MSG_TYPE.IM_ACTION:
                ws_service_1.WsService.checkActionMessage(pack.body);
                break;
            default:
                throw PacketCode_1.PacketCode.IM_ERROR_CODE_NOT_ALLOWED_TYPE;
        }
    }
})(PrivateAction = exports.PrivateAction || (exports.PrivateAction = {}));
