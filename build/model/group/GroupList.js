"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GroupList = void 0;
class GroupList {
    constructor() {
        this._list = new Map();
    }
    static instance() {
        if (GroupList._instance === undefined) {
            GroupList._instance = new GroupList();
        }
        return GroupList._instance;
    }
    /**
     * 验证 groupId 是否存在
     *
     * @param {string} id
     */
    has(id) {
        return this._list.has(id.toString());
    }
    /**
     * 获取 group 对象
     *
     * @param {string} id
     */
    get(id) {
        return this._list.get(id.toString());
    }
    /**
     * 更新 group 对象
     *
     * @param {GroupModel} group
     */
    update(group) {
        this._list.set(group.id.toString(), group);
    }
    /**
     * 删除 group 对象
     *
     * @param {string} id
     */
    delete(id) {
        this._list.delete(id.toString());
    }
}
exports.GroupList = GroupList;
