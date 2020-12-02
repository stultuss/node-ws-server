"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WsService = void 0;
const _ = require("underscore");
const Utility_1 = require("../common/Utility");
const UserList_1 = require("../model/user/UserList");
const PacketModel_1 = require("../model/packet/PacketModel");
/**
 * 处理 Ws 链接
 */
var WsService;
(function (WsService) {
    /**
     * 处理 WS 客户端消息
     */
    function onMessage(user, message) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const pack = PacketModel_1.default.parse(message);
                // 用户消息合法性检查
                checkUser(user, pack);
                switch (pack.type) {
                    case 202 /* IM_LOGOUT */:
                    case 204 /* IM_RELOGIN */:
                        yield UserAction.logout(user, pack, (pack.type == 204 /* IM_RELOGIN */));
                        break;
                    case 203 /* IM_UPDATE_INFO */:
                        yield UserAction.update(user, pack);
                        break;
                    case 211 /* IM_PRIVATE_CHAT */:
                    case 212 /* IM_PRIVATE_ACTION */:
                        yield PrivateAction.notice(user, pack, (pack.type == 212 /* IM_PRIVATE_ACTION */));
                        break;
                    case 221 /* IM_WORLD_CHAT */:
                    case 222 /* IM_WORLD_ACTION */:
                        yield WorldAction.notice(user, pack, (pack.type == 222 /* IM_WORLD_ACTION */));
                        break;
                    case 311 /* IM_GROUP_CHAT */:
                    case 312 /* IM_GROUP_ACTION */:
                        yield GroupAction.notice(user, pack, (pack.type == 312 /* IM_GROUP_ACTION */));
                        break;
                    case 301 /* IM_GROUP_JOIN */:
                        yield GroupAction.join(user, pack);
                        break;
                    case 302 /* IM_GROUP_QUIT */:
                        yield GroupAction.quit(user, pack);
                        break;
                    default:
                        if (user) {
                            user.logout(3013 /* IM_ERROR_CODE_NOT_ALLOWED_TYPE */);
                        }
                        break;
                }
            }
            catch (e) {
                if (user) {
                    user.logout(e);
                }
            }
        });
    }
    WsService.onMessage = onMessage;
    /**
     * 处理 WS 链接失败
     */
    function onClose(user) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                if (user) {
                    // 判断玩家是正常退出，还是异常退出，如果是异常退出，则走正常退出流程
                    let closeUser = UserList_1.default.instance().get(user.id);
                    if (closeUser && closeUser.remote == user.remote) {
                        closeUser.logout();
                    }
                }
            }
            catch (e) {
                Utility_1.CommonTools.logger(e.message);
            }
        });
    }
    WsService.onClose = onClose;
    /**
     * 处理 WS 客户端错误
     */
    function onError(user, e) {
        return __awaiter(this, void 0, void 0, function* () {
            Utility_1.CommonTools.logger(e.message);
            try {
                yield onClose(user);
            }
            catch (e) {
                Utility_1.CommonTools.logger(e.message);
            }
        });
    }
    WsService.onError = onError;
    function isForwarding(user, pack) {
        //Fixme 在验证系统登录（System）的这块，后续需要补上服务器白名单，目前只验证了系统密钥。
        return (user == null && (pack.fromType == 3 /* IM_FROM_TYPE_FORWARDING_USER */ || pack.fromType == 4 /* IM_FROM_TYPE_FORWARDING_SYSTEM */));
    }
    WsService.isForwarding = isForwarding;
    function checkUser(user, pack) {
        if (pack.fromType == 0 /* IM_FROM_TYPE_USER */ && !user) {
            throw 3013 /* IM_ERROR_CODE_NOT_ALLOWED_TYPE */;
        }
    }
    WsService.checkUser = checkUser;
    function checkChatMessage(body) {
        if (body.type !== 0 /* IM_CHAT */) {
            throw 3013 /* IM_ERROR_CODE_NOT_ALLOWED_TYPE */;
        }
        if (!body.hasOwnProperty('msg') || !_.isString(body.msg)) {
            throw 3007 /* IM_ERROR_CODE_BODY_PROPERTY_WRONG */;
        }
        if (body.msg == '') {
            throw 3010 /* IM_ERROR_CODE_MSG_EMPTY */;
        }
        return body;
    }
    WsService.checkChatMessage = checkChatMessage;
    function checkActionMessage(body) {
        if (body.type !== 1 /* IM_ACTION */) {
            throw 3013 /* IM_ERROR_CODE_NOT_ALLOWED_TYPE */;
        }
        if (!body.hasOwnProperty('action')) {
            throw 3007 /* IM_ERROR_CODE_BODY_PROPERTY_WRONG */;
        }
        return body;
    }
    WsService.checkActionMessage = checkActionMessage;
})(WsService = exports.WsService || (exports.WsService = {}));
