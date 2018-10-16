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
        return this._list.has(id.toString());
    }
    get(id) {
        return this._list.get(id.toString());
    }
    update(group) {
        this._list.set(group.id.toString(), group);
    }
    delete(id) {
        this._list.delete(id.toString());
    }
}
exports.default = GroupManger;
