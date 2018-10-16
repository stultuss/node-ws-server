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
const WebSocket = require("ws");
const PacketModel_1 = require("../packet/PacketModel");
const GroupManger_1 = require("../group/GroupManger");
const GroupModel_1 = require("../group/GroupModel");
const UserManager_1 = require("./UserManager");
const ClusterNodes_1 = require("../../cluster/ClusterNodes");
class UserModel {
    constructor(client, req) {
        this._conn = client;
        this._req = req;
        this._data = {};
        this._groups = new Set();
        this._queue = [];
        this._queueDeflating = false;
    }
    get id() {
        return this._req.headers.id;
    }
    get token() {
        return this._req.headers.token;
    }
    get remote() {
        return `${this._req.socket.remoteAddress}:${this._req.socket.remotePort}`;
    }
    get conn() {
        return this._conn;
    }
    get req() {
        return this._req;
    }
    get data() {
        return this._data;
    }
    get groups() {
        return [...Array.from(this._groups.values())];
    }
    hasGroup(groupId) {
        return this._groups.has(groupId.toString());
    }
    addGroup(groupId) {
        return this._groups.add(groupId.toString());
    }
    deleteGroup(groupId) {
        return this._groups.delete(groupId.toString());
    }
    joinGroup(groupId) {
        let group = GroupManger_1.default.instance().get(groupId);
        if (!group) {
            group = new GroupModel_1.default(groupId);
        }
        group.join(this.id);
        this.addGroup(groupId);
    }
    quitGroup(groupId) {
        let group = GroupManger_1.default.instance().get(groupId);
        if (group) {
            group.quit(this.id);
        }
        this.deleteGroup(groupId);
    }
    updateData(data) {
        for (let key of Object.keys(data)) {
            this._data[key] = data[key];
        }
    }
    login() {
        return __awaiter(this, void 0, void 0, function* () {
            // 处理重复登录
            let user = UserManager_1.default.instance().get(this.id);
            if (user) {
                user.logout(3011 /* IM_ERROR_CODE_RE_LOGIN */);
            }
            else {
                let address = yield UserManager_1.default.instance().getServerAddress(this.id);
                yield ClusterNodes_1.default.instance().forwarding(address, PacketModel_1.default.create(204 /* IM_RELOGIN */, 4 /* IM_FROM_TYPE_FORWARDING_SYSTEM */, 0, {
                    uid: this.id
                }));
            }
            // 重新登录
            UserManager_1.default.instance().update(this);
        });
    }
    logout(code = 3014 /* IM_ERROR_CODE_LOGOUT */) {
        // 退出用户所在群组
        this.groups.forEach((groupId) => {
            this.quitGroup(groupId.toString());
        });
        // 关闭连接
        this._connClose(code);
    }
    _connClose(code) {
        if (this._conn.readyState == WebSocket.OPEN) {
            this._conn.close(code);
        }
        UserManager_1.default.instance().delete(this.id, (code == 3011 /* IM_ERROR_CODE_RE_LOGIN */));
    }
    connSend(pack) {
        if (this._conn.bufferedAmount >= 2048) { // SLOW CONNECTED throttle
            this.logout(3010 /* IM_ERROR_CODE_CLIENT_SLOW_CONNECTED */);
        }
        else {
            this._enqueue(pack);
            this._dequeue();
        }
    }
    _enqueue(pack) {
        if (this._queue.length >= 2048) {
            this.logout(3010 /* IM_ERROR_CODE_CLIENT_SLOW_CONNECTED */);
        }
        else {
            this._queue.push(pack);
        }
    }
    _dequeue() {
        if (this._queueDeflating) {
            return;
        }
        while (this._queue.length) {
            // 客户端下线
            if (this.conn.readyState !== WebSocket.OPEN) {
                this.logout();
                return;
            }
            // 弹出队列第一个信息，并进行消息推送
            let pack = this._queue.shift();
            if (!pack) {
                this._dequeue();
                continue;
            }
            // 阻塞式消息队列
            this._queueDeflating = true;
            this.conn.send(pack.format(), () => {
                this._queueDeflating = false;
                this._dequeue();
            });
        }
    }
}
exports.default = UserModel;
