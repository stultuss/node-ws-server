"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WsService = void 0;
const _ = require("underscore");
const UserList_1 = require("../model/user/UserList");
const PacketModel_1 = require("../model/packet/PacketModel");
const PacketCode_1 = require("../model/packet/PacketCode");
const Common_1 = require("../const/Common");
const user_action_1 = require("./action/user.action");
const group_action_1 = require("./action/group.action");
const world_action_1 = require("./action/world.action");
const private_action_1 = require("./action/private.action");
/**
 * 处理 Ws 链接
 */
var WsService;
(function (WsService) {
    /**
     * 处理 WS 客户端消息
     */
    function onMessage(user, message) {
        try {
            const pack = PacketModel_1.PacketModel.parse(message);
            // 用户消息合法性检查
            checkUser(user);
            switch (pack.type) {
                case Common_1.API_TYPE.IM_LOGOUT:
                    user_action_1.UserAction.logout(user, pack, false);
                    break;
                case Common_1.API_TYPE.IM_UPDATE_INFO:
                    user_action_1.UserAction.update(user, pack);
                    break;
                case Common_1.API_TYPE.IM_PRIVATE_CHAT:
                case Common_1.API_TYPE.IM_PRIVATE_ACTION:
                    private_action_1.PrivateAction.notice(user, pack, (pack.type == Common_1.API_TYPE.IM_PRIVATE_ACTION));
                    break;
                case Common_1.API_TYPE.IM_WORLD_CHAT:
                case Common_1.API_TYPE.IM_WORLD_ACTION:
                    world_action_1.WorldAction.notice(user, pack, (pack.type == Common_1.API_TYPE.IM_WORLD_ACTION));
                    break;
                case Common_1.API_TYPE.IM_GROUP_CHAT:
                case Common_1.API_TYPE.IM_GROUP_ACTION:
                    group_action_1.GroupAction.notice(user, pack, (pack.type == Common_1.API_TYPE.IM_GROUP_ACTION));
                    break;
                case Common_1.API_TYPE.IM_GROUP_JOIN:
                    group_action_1.GroupAction.join(user, pack);
                    break;
                case Common_1.API_TYPE.IM_GROUP_QUIT:
                    group_action_1.GroupAction.quit(user, pack);
                    break;
                default:
                    if (user) {
                        user.logout(PacketCode_1.PacketCode.IM_ERROR_CODE_NOT_ALLOWED_TYPE);
                    }
                    break;
            }
        }
        catch (e) {
            if (user) {
                user.logout(e);
            }
        }
    }
    WsService.onMessage = onMessage;
    /**
     * 处理 WS 链接失败
     */
    function onClose(user) {
        // 判断玩家是正常退出，还是异常退出，如果是异常退出，则走正常退出流程
        let closeUser = UserList_1.UserList.instance().get(user.id);
        if (closeUser && closeUser.remote == user.remote) {
            closeUser.logout();
        }
    }
    WsService.onClose = onClose;
    /**
     * 处理 WS 客户端错误
     */
    function onError(user, e) {
        onClose(user);
    }
    WsService.onError = onError;
    /**
     * 验证用户是否存在
     *
     * @param user
     */
    function checkUser(user) {
        if (!user) {
            throw PacketCode_1.PacketCode.IM_ERROR_CODE_NOT_ALLOWED_TYPE;
        }
    }
    WsService.checkUser = checkUser;
    /**
     * 检查 Chat Message 数据结构
     *
     * @param {BaseChatBody} body
     */
    function checkChatMessage(body) {
        if (body.type !== Common_1.API_MSG_TYPE.IM_CHAT) {
            throw PacketCode_1.PacketCode.IM_ERROR_CODE_NOT_ALLOWED_TYPE;
        }
        if (!body.hasOwnProperty('msg') || !_.isString(body.msg)) {
            throw PacketCode_1.PacketCode.IM_ERROR_CODE_BODY_PROPERTY_WRONG;
        }
        if (body.msg == '') {
            throw PacketCode_1.PacketCode.IM_ERROR_CODE_MSG_EMPTY;
        }
        return body;
    }
    WsService.checkChatMessage = checkChatMessage;
    /**
     * 检查 Action Message 数据结构
     *
     * @param {BaseChatBody} body
     */
    function checkActionMessage(body) {
        if (body.type !== Common_1.API_MSG_TYPE.IM_ACTION) {
            throw PacketCode_1.PacketCode.IM_ERROR_CODE_NOT_ALLOWED_TYPE;
        }
        if (!body.hasOwnProperty('action')) {
            throw PacketCode_1.PacketCode.IM_ERROR_CODE_BODY_PROPERTY_WRONG;
        }
        return body;
    }
    WsService.checkActionMessage = checkActionMessage;
    /**
     * 处理从消息转发过来的 FromType
     */
    function convertFromTypeToForwardingType(fromType) {
        switch (fromType) {
            case Common_1.API_FROM.IM_FROM_TYPE_USER:
                return Common_1.API_FROM.IM_FROM_TYPE_FORWARDING_USER;
            case Common_1.API_FROM.IM_FROM_TYPE_SYSTEM:
                return Common_1.API_FROM.IM_FROM_TYPE_FORWARDING_SYSTEM;
            default:
                return fromType;
        }
    }
    WsService.convertFromTypeToForwardingType = convertFromTypeToForwardingType;
    /**
     * 处理从消息转发过来的 ForwardingType
     */
    function convertForwardingTypeToFromType(fromType) {
        switch (fromType) {
            case Common_1.API_FROM.IM_FROM_TYPE_FORWARDING_USER:
                return Common_1.API_FROM.IM_FROM_TYPE_USER;
            case Common_1.API_FROM.IM_FROM_TYPE_FORWARDING_SYSTEM:
                return Common_1.API_FROM.IM_FROM_TYPE_SYSTEM;
            default:
                return fromType;
        }
    }
    WsService.convertForwardingTypeToFromType = convertForwardingTypeToFromType;
    /**
     * 发送结果消息
     *
     * @param {UserModel} user
     * @param {PacketModel} pack
     * @param {any} data
     * @param {boolean} isError
     */
    function sendResponse(user, pack, data = [], isError = false) {
        if (!user) {
            return;
        }
        user.connSend(PacketModel_1.PacketModel.create((isError) ? Common_1.API_RESPONSE.IM_ERROR : Common_1.API_RESPONSE.IM_SUCCEED, Common_1.API_FROM.IM_FROM_TYPE_SYSTEM, pack.requestId, data));
    }
    WsService.sendResponse = sendResponse;
})(WsService = exports.WsService || (exports.WsService = {}));
