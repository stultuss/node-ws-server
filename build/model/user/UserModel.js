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
exports.UserModel = void 0;
const _ = require("underscore");
const WebSocket = require("ws");
const GrpcClientManager_1 = require("../../lib/GrpcClientManager");
const Utility_1 = require("../../common/Utility");
const PacketModel_1 = require("../packet/PacketModel");
const PacketCode_1 = require("../packet/PacketCode");
const GroupModel_1 = require("../group/GroupModel");
const GroupList_1 = require("../group/GroupList");
const UserList_1 = require("./UserList");
const Common_1 = require("../../const/Common");
class UserModel {
    constructor(uid, conn, req) {
        this._updateExpireTime();
        this._conn = conn;
        this._req = req;
        this._id = uid;
        this._data = {};
        this._groups = new Set();
        this._queue = [];
        this._queueDeflating = false;
    }
    get id() {
        return this._id;
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
    /**
     * 判断是否已经加入过群组
     *
     * @param groupId
     */
    hasGroup(groupId) {
        return this._groups.has(groupId.toString());
    }
    /**
     * 加入群组
     *
     * @param groupId
     */
    joinGroup(groupId) {
        this._updateExpireTime();
        let group = GroupList_1.GroupList.instance().get(groupId);
        if (!group) {
            group = new GroupModel_1.GroupModel(groupId);
        }
        group.join(this.id);
        this._groups.add(groupId.toString());
    }
    /**
     * 退出群组
     *
     * @param groupId
     */
    quitGroup(groupId) {
        this._updateExpireTime();
        let group = GroupList_1.GroupList.instance().get(groupId);
        if (group) {
            group.quit(this.id);
        }
        this._groups.delete(groupId.toString());
    }
    /**
     * 更新扩展信息
     *
     * @param {PacketModel} pack
     */
    updateData(pack) {
        this._updateExpireTime();
        const body = pack.body;
        if (!body.hasOwnProperty('data') || _.isObject(body.data)) {
            return;
        }
        for (let key of Object.keys(body.data)) {
            this._data[key] = body.data[key];
        }
    }
    /**
     * 用户登陆
     */
    login() {
        return __awaiter(this, void 0, void 0, function* () {
            // 从本地节点获取用户信息
            const user = UserList_1.UserList.instance().get(this.id);
            // 确定玩家在本地节点 - 当前节点踢人
            if (user) {
                UserList_1.UserList.instance().get(this.id).logout(PacketCode_1.PacketCode.IM_ERROR_CODE_RE_LOGIN);
                return;
            }
            // 确定玩家是否在远程节点 - 远程节点踢人
            const address = yield UserList_1.UserList.instance().getGrpcAddress(this.id);
            if (address) {
                GrpcClientManager_1.GrpcClientManager.instance().forwarding(address, PacketModel_1.PacketModel.create(Common_1.API_TYPE.IM_RELOGIN, Common_1.API_FROM.IM_FROM_TYPE_FORWARDING_SYSTEM, 0, { uid: this.id }));
            }
            // 重新登录
            UserList_1.UserList.instance().update(this);
        });
    }
    /**
     * 用户登出
     *
     * @param code
     */
    logout(code = PacketCode_1.PacketCode.IM_ERROR_CODE_LOGOUT) {
        this.groups.forEach((groupId) => {
            this.quitGroup(groupId.toString());
        });
        this._connClose(code);
    }
    /**
     * 关闭连接
     *
     * @param code
     * @private
     */
    _connClose(code) {
        clearTimeout(this._expire);
        if (this._conn.readyState == WebSocket.OPEN) {
            this._conn.close(code);
        }
        UserList_1.UserList.instance().delete(this.id, (code == PacketCode_1.PacketCode.IM_ERROR_CODE_RE_LOGIN));
    }
    /**
     * 发送信息
     *
     * @param pack
     */
    connSend(pack) {
        if (this._conn.bufferedAmount >= 2048) { // SLOW CONNECTED throttle
            this.logout(PacketCode_1.PacketCode.IM_ERROR_CODE_CLIENT_SLOW_CONNECTED);
        }
        else {
            this._enqueue(pack);
            this._dequeue();
        }
    }
    /**
     * 消息队列进栈
     *
     * @param pack
     */
    _enqueue(pack) {
        if (this._queue.length >= 2048) {
            this.logout(PacketCode_1.PacketCode.IM_ERROR_CODE_CLIENT_SLOW_CONNECTED);
        }
        else {
            this._queue.push(pack);
        }
    }
    /**
     * 消息队列出栈
     */
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
    /**
     * 设置过期
     *
     * @param {number} expire
     * @return {number}
     */
    _updateExpireTime(expire = Utility_1.TimeTools.HOURS12) {
        clearTimeout(this._expire);
        this._expire = setTimeout(() => {
            UserList_1.UserList.instance().delete(this.id);
        }, expire * 1000);
    }
}
exports.UserModel = UserModel;
