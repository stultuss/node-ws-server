"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GroupAction = void 0;
const Common_1 = require("../../const/Common");
const GrpcClientManager_1 = require("../../lib/GrpcClientManager");
const ws_service_1 = require("../ws.service");
const UserList_1 = require("../../model/user/UserList");
const PacketModel_1 = require("../../model/packet/PacketModel");
const PacketCode_1 = require("../../model/packet/PacketCode");
const GroupList_1 = require("../../model/group/GroupList");
var GroupAction;
(function (GroupAction) {
    /**
     * 加入群组
     *
     * @param {UserModel} user
     * @param {PacketModel} pack
     */
    function join(user, pack) {
        _checkGroup(pack);
        let body = pack.body;
        // 加入 group
        user.joinGroup(body.groupId);
        // 结果通知客户端
        ws_service_1.WsService.sendResponse(user, pack);
    }
    GroupAction.join = join;
    /**
     * 退出群组
     *
     * @param {UserModel} user
     * @param {PacketModel} pack
     */
    function quit(user, pack) {
        _checkGroup(pack);
        let body = pack.body;
        // 不属于自己群组
        if (user && user.hasGroup(body.groupId) == false) {
            ws_service_1.WsService.sendResponse(user, pack, { code: PacketCode_1.PacketCode.IM_ERROR_CODE_NOT_ALLOWED_TYPE }, true);
            return;
        }
        // 加入 group
        user.quitGroup(body.groupId);
        // 结果通知客户端
        ws_service_1.WsService.sendResponse(user, pack);
    }
    GroupAction.quit = quit;
    /**
     * 发送消息
     *
     * @param {UserModel} user
     * @param {PacketModel} pack
     * @param {boolean} isAction
     */
    function notice(user, pack, isAction = false) {
        _checkGroup(pack);
        _checkMessage(pack, (isAction) ? Common_1.API_MSG_TYPE.IM_ACTION : Common_1.API_MSG_TYPE.IM_CHAT);
        let body = pack.body;
        // 不属于自己群组
        if (user && user.hasGroup(body.groupId) == false) {
            ws_service_1.WsService.sendResponse(user, pack, { code: PacketCode_1.PacketCode.IM_WARNING_NOT_IN_GROUP }, true);
            return;
        }
        // 消息由服务器进行转发
        _broadcast(user, pack, body.groupId);
        // 结果通知客户端
        ws_service_1.WsService.sendResponse(user, pack);
    }
    GroupAction.notice = notice;
    /**
     * 多播
     *
     * @param {UserModel} sender
     * @param {PacketModel} pack
     * @param {string} groupId
     */
    function _broadcast(sender, pack, groupId) {
        // 消息 body
        const body = pack.body;
        if (sender) {
            body.sender = (pack.fromType == Common_1.API_FROM.IM_FROM_TYPE_USER) ? sender.id : 'SYS';
        }
        // 消息 fromType
        const forwardingType = ws_service_1.WsService.convertFromTypeToForwardingType(pack.fromType);
        const fromType = ws_service_1.WsService.convertForwardingTypeToFromType(pack.fromType);
        // 验证是否存在 groupId
        let group = GroupList_1.GroupList.instance().get(groupId);
        if (!group) {
            return;
        }
        // 发送远程消息
        if (pack.fromType !== Common_1.API_FROM.IM_FROM_TYPE_FORWARDING_USER && pack.fromType !== Common_1.API_FROM.IM_FROM_TYPE_FORWARDING_SYSTEM) {
            GrpcClientManager_1.GrpcClientManager.instance().forwardingAll(PacketModel_1.PacketModel.create(pack.type, forwardingType, pack.requestId, body));
        }
        // 发送本地消息
        group.uids.forEach((userId) => {
            const receiver = UserList_1.UserList.instance().get(userId);
            if (!receiver) {
                return;
            }
            receiver.connSend(PacketModel_1.PacketModel.create(pack.type, fromType, pack.requestId, body));
        });
    }
    /**
     * 检查群组ID
     *
     * @param {PacketModel} pack
     */
    function _checkGroup(pack) {
        let body = pack.body;
        if (!body.hasOwnProperty('groupId')) {
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
})(GroupAction = exports.GroupAction || (exports.GroupAction = {}));
