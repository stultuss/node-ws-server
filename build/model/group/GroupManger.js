"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class GroupManger {
    static instance() {
        if (GroupManger._instance === undefined) {
            GroupManger._instance = new GroupManger();
        }
        return GroupManger._instance;
    }
    constructor() {
        this._list = new Map();
    }
    has(id) {
        return this._list.has(id);
    }
    get(id) {
        return this._list.get(id);
    }
    update(group) {
        this._list.set(group.id, group);
    }
    delete(id) {
        this._list.delete(id);
    }
}
exports.default = GroupManger;
