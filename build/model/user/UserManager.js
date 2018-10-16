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
const Cluster_1 = require("../../cluster/Cluster");
const CacheFactory_class_1 = require("../../common/cache/CacheFactory.class");
const Utility_1 = require("../../common/Utility");
const Const_1 = require("../../const/Const");
// 用户列表
class UserManager {
    static instance() {
        if (UserManager._instance === undefined) {
            UserManager._instance = new UserManager();
        }
        return UserManager._instance;
    }
    constructor() {
        this._list = new Map();
    }
    get list() {
        return this._list;
    }
    has(id) {
        return this._list.has(id.toString());
    }
    get(id) {
        return this._list.get(id.toString());
    }
    update(user) {
        CacheFactory_class_1.CacheFactory.instance().getCache().set(Const_1.CACHE_SERVER_ADDRESS + user.id, Cluster_1.default.instance().nodeAddress, Utility_1.TimeTools.HOURS12).then();
        this._list.set(user.id.toString(), user);
    }
    delete(id, onlyLocal = false) {
        if (onlyLocal == false) {
            CacheFactory_class_1.CacheFactory.instance().getCache().del(Const_1.CACHE_SERVER_ADDRESS + id).then();
        }
        this._list.delete(id.toString());
    }
    getServerAddress(id) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield CacheFactory_class_1.CacheFactory.instance().getCache().get(Const_1.CACHE_SERVER_ADDRESS + id);
        });
    }
}
exports.default = UserManager;
