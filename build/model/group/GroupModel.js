"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GroupModel = void 0;
const Utility_1 = require("../../common/Utility");
const GroupList_1 = require("./GroupList");
class GroupModel {
    constructor(groupId) {
        this._updateExpireTime();
        this._groupId = groupId;
        this._uids = new Set();
    }
    get id() {
        return this._groupId;
    }
    get uids() {
        return [...Array.from(this._uids.values())];
    }
    /**
     * 验证 uid 是否存在
     *
     * @param {string} uid
     */
    has(uid) {
        return this._uids.has(uid.toString());
    }
    /**
     * 加入群组
     *
     * @param {string} uid
     */
    add(uid) {
        this._updateExpireTime();
        return this._uids.add(uid.toString());
    }
    /**
     * 退出群组
     *
     * @param {string} uid
     */
    delete(uid) {
        this._updateExpireTime();
        return this._uids.delete(uid.toString());
    }
    /**
     * 加入群组
     *
     * @param {string} uid
     */
    join(uid) {
        this.add(uid);
        GroupList_1.GroupList.instance().update(this);
    }
    /**
     * 退出群组
     *
     * @param {string} uid
     */
    quit(uid) {
        this.delete(uid);
        if (this._uids.size == 0) {
            clearTimeout(this._expire);
            GroupList_1.GroupList.instance().delete(this._groupId);
        }
        else {
            GroupList_1.GroupList.instance().update(this);
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
            GroupList_1.GroupList.instance().delete(this._groupId);
        }, expire * 1000);
    }
}
exports.GroupModel = GroupModel;
