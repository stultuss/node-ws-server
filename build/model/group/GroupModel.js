"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const GroupManger_1 = require("./GroupManger");
class GroupModel {
    constructor(groupId) {
        this._groupId = groupId;
        this._userIds = new Set();
    }
    get id() {
        return this._groupId;
    }
    get userIds() {
        return [...Array.from(this._userIds.values())];
    }
    hasUserId(userId) {
        return this._userIds.has(userId.toString());
    }
    addUserId(userId) {
        return this._userIds.add(userId.toString());
    }
    deleteUserId(userId) {
        return this._userIds.delete(userId.toString());
    }
    /**
     * 加入群组
     *
     * @param {string} uid
     */
    join(uid) {
        this.addUserId(uid);
        // 更新房间
        GroupManger_1.default.instance().update(this);
    }
    /**
     * 退出群组
     *
     * @param {string} uid
     */
    quit(uid) {
        this.deleteUserId(uid);
        // 更新房间
        if (this._userIds.size == 0) {
            GroupManger_1.default.instance().delete(this._groupId);
        }
        else {
            GroupManger_1.default.instance().update(this);
        }
    }
}
exports.default = GroupModel;
