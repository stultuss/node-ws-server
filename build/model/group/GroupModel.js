"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const GroupManger_1 = require("./GroupManger");
const Utility_1 = require("../../common/Utility");
class GroupModel {
    constructor(groupId) {
        this._updateExpireTime();
        this._groupId = groupId;
        this._userIds = new Set();
        console.log(`Group Id: ${this._groupId} create!`);
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
        this._updateExpireTime();
        return this._userIds.add(userId.toString());
    }
    deleteUserId(userId) {
        this._updateExpireTime();
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
            console.log(`Group Id: ${this._groupId} delete!`);
            clearTimeout(this._expire);
            GroupManger_1.default.instance().delete(this._groupId);
        }
        else {
            GroupManger_1.default.instance().update(this);
        }
    }
    /**
     * 设置群组过期
     *
     * @param {number} expireTime
     * @return {number}
     */
    _updateExpireTime(expireTime = Utility_1.TimeTools.MINUTE * 10) {
        // 清除上一次定时器
        clearTimeout(this._expire);
        // 触发下一次定时器
        this._expire = setTimeout(() => {
            console.log(`Group Id: ${this._groupId} expire!`);
            GroupManger_1.default.instance().delete(this._groupId);
        }, expireTime * 1000);
    }
}
exports.default = GroupModel;
