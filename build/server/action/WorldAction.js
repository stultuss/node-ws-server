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
const WsConnHandler_1 = require("../lib/WsConnHandler");
var WorldAction;
(function (WorldAction) {
    function notice(user, pack, isAction = false) {
        return __awaiter(this, void 0, void 0, function* () {
            checkMessage(pack, (isAction) ? 1 /* IM_ACTION */ : 0 /* IM_CHAT */);
            if (WsConnHandler_1.WsConnHandler.isForwarding(user, pack)) {
                // 发送本地消息
                let fromType = (pack.fromType == 3 /* IM_FROM_TYPE_FORWARDING_USER */) ? 0 /* IM_FROM_TYPE_USER */ : 1 /* IM_FROM_TYPE_SYSTEM */;
                let forwardPack = PacketModel_1.default.create(pack.type, fromType, pack.requestId, pack.body);
                UserManager_1.default.instance().list.forEach((receiver) => {
                    receiver.connSend(forwardPack.format());
                });
            }
            else {
                // 消息由服务器进行转发
                yield broadcast(user, pack);
                // 结果通知客户端
                user.connSend(PacketModel_1.default.create(1 /* IM_SUCCEED */, 1 /* IM_FROM_TYPE_SYSTEM */, pack.requestId, {}));
            }
        });
    }
    WorldAction.notice = notice;
    function broadcast(sender, pack) {
        return __awaiter(this, void 0, void 0, function* () {
            // 消息 body
            let body = pack.body;
            body.sender = (pack.fromType == 0 /* IM_FROM_TYPE_USER */) ? sender.id : 'SYS';
            let fromType = (pack.fromType == 0 /* IM_FROM_TYPE_USER */) ? 3 /* IM_FROM_TYPE_FORWARDING_USER */ : 4 /* IM_FROM_TYPE_FORWARDING_SYSTEM */;
            // 发送远程消息
            yield ClusterNodes_1.default.instance().forwardingAll(PacketModel_1.default.create(pack.type, fromType, pack.requestId, body));
            // 发送本地消息
            let forwardPack = PacketModel_1.default.create(pack.type, pack.fromType, pack.requestId, body);
            UserManager_1.default.instance().list.forEach((receiver) => {
                receiver.connSend(forwardPack.format());
            });
        });
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
})(WorldAction = exports.WorldAction || (exports.WorldAction = {}));
