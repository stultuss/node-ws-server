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
        return this._userIds;
    }
    /**
     * 加入群组
     *
     * @param {string} uid
     */
    join(uid) {
        this._userIds.add(uid);
        // 更新房间
        GroupManger_1.default.instance().update(this);
    }
    /**
     * 退出群组
     *
     * @param {string} uid
     */
    quit(uid) {
        this._userIds.delete(uid);
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
