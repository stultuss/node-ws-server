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
const ClusterNodes_1 = require("../../cluster/ClusterNodes");
const PacketModel_1 = require("../../model/packet/PacketModel");
const UserManager_1 = require("../../model/user/UserManager");
const GroupManger_1 = require("../../model/group/GroupManger");
const WsConnHandler_1 = require("../lib/WsConnHandler");
var GroupAction;
(function (GroupAction) {
    function join(user, pack) {
        return __awaiter(this, void 0, void 0, function* () {
            checkGroup(pack);
            let body = pack.body;
            let groupId = body.groupId;
            if (WsConnHandler_1.WsConnHandler.isForwarding(user, pack)) {
                // 消息转发
                let body = pack.body;
                let bodyUser = UserManager_1.default.instance().get(body.uid);
                if (bodyUser) {
                    bodyUser.updateData(body.data);
                }
            }
            else {
                // 加入 group
                user.joinGroup(groupId);
                // 结果通知客户端
                user.connSend(PacketModel_1.default.create(1 /* IM_SUCCEED */, 1 /* IM_FROM_TYPE_SYSTEM */, pack.requestId, {}));
            }
        });
    }
    GroupAction.join = join;
    function quit(user, pack) {
        return __awaiter(this, void 0, void 0, function* () {
            checkGroup(pack);
            let body = pack.body;
            let groupId = body.groupId;
            if (WsConnHandler_1.WsConnHandler.isForwarding(user, pack)) {
                // 消息转发
                let body = pack.body;
                let bodyUser = UserManager_1.default.instance().get(body.uid);
                if (bodyUser) {
                    if (bodyUser && bodyUser.groups.has(groupId) == false) {
                        return;
                    }
                    bodyUser.quitGroup(groupId);
                }
            }
            else {
                // 不属于自己群组, 无法退出
                if (user && user.groups.has(groupId) == false) {
                    user.connSend(PacketModel_1.default.create(0 /* IM_ERROR */, 1 /* IM_FROM_TYPE_SYSTEM */, pack.requestId, {
                        code: 3013 /* IM_ERROR_CODE_NOT_ALLOWED_TYPE */
                    }));
                    return;
                }
                // 加入 group
                user.quitGroup(groupId);
                // 结果通知客户端
                user.connSend(PacketModel_1.default.create(1 /* IM_SUCCEED */, 1 /* IM_FROM_TYPE_SYSTEM */, pack.requestId, {}));
            }
        });
    }
    GroupAction.quit = quit;
    function notice(user, pack, isAction = false) {
        return __awaiter(this, void 0, void 0, function* () {
            checkGroup(pack);
            checkMessage(pack, (isAction) ? 1 /* IM_ACTION */ : 0 /* IM_CHAT */);
            let body = pack.body;
            let groupId = body.groupId;
            if (WsConnHandler_1.WsConnHandler.isForwarding(user, pack)) {
                // 发送本地消息
                let fromType = (pack.fromType == 3 /* IM_FROM_TYPE_FORWARDING_USER */) ? 0 /* IM_FROM_TYPE_USER */ : 1 /* IM_FROM_TYPE_SYSTEM */;
                let group = GroupManger_1.default.instance().get(groupId);
                if (group) {
                    let forwardPack = PacketModel_1.default.create(pack.type, fromType, pack.requestId, pack.body);
                    group.userIds.forEach((userId) => {
                        const receiver = UserManager_1.default.instance().get(userId);
                        if (receiver) {
                            receiver.connSend(forwardPack.format());
                        }
                    });
                }
            }
            else {
                if (pack.fromType == 0 /* IM_FROM_TYPE_USER */) {
                    if (user && user.groups.has(groupId) == false) {
                        user.connSend(PacketModel_1.default.create(0 /* IM_ERROR */, 1 /* IM_FROM_TYPE_SYSTEM */, pack.requestId, {
                            code: 3013 /* IM_ERROR_CODE_NOT_ALLOWED_TYPE */
                        }));
                        return;
                    }
                }
                // 消息由服务器进行转发
                yield broadcast(user, pack, groupId);
                // 结果通知客户端
                user.connSend(PacketModel_1.default.create(1 /* IM_SUCCEED */, 1 /* IM_FROM_TYPE_SYSTEM */, pack.requestId, {}));
            }
        });
    }
    GroupAction.notice = notice;
    function broadcast(sender, pack, groupId) {
        return __awaiter(this, void 0, void 0, function* () {
            // 消息 body
            let body = pack.body;
            body.sender = (pack.fromType == 0 /* IM_FROM_TYPE_USER */) ? sender.id : 'SYS';
            let fromType = (pack.fromType == 0 /* IM_FROM_TYPE_USER */) ? 3 /* IM_FROM_TYPE_FORWARDING_USER */ : 4 /* IM_FROM_TYPE_FORWARDING_SYSTEM */;
            // 发送远程消息
            yield ClusterNodes_1.default.instance().forwardingAll(PacketModel_1.default.create(pack.type, fromType, pack.requestId, body));
            // 发送本地消息
            let group = GroupManger_1.default.instance().get(groupId);
            if (group) {
                let forwardPack = PacketModel_1.default.create(pack.type, pack.fromType, pack.requestId, body);
                group.userIds.forEach((userId) => {
                    const receiver = UserManager_1.default.instance().get(userId);
                    if (receiver) {
                        receiver.connSend(forwardPack.format());
                    }
                });
            }
        });
    }
    function checkGroup(pack) {
        let body = pack.body;
        if (!body.hasOwnProperty('groupId')) {
            throw 3007 /* IM_ERROR_CODE_BODY_PROPERTY_WRONG */;
        }
    }
    function checkMessage(pack, msgType) {
        switch (msgType) {
            case 0 /* IM_CHAT */:
                WsConnHandler_1.WsConnHandler.checkChatMessage(pack.body);
                break;
            case 1 /* IM_ACTION */:
                WsConnHandler_1.WsConnHandler.checkActionMessage(pack.body);
                break;
            default:
                throw 3013 /* IM_ERROR_CODE_NOT_ALLOWED_TYPE */;
        }
    }
})(GroupAction = exports.GroupAction || (exports.GroupAction = {}));
