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
exports.UserList = void 0;
const Utility_1 = require("../../common/Utility");
const CacheFactory_class_1 = require("../../common/cache/CacheFactory.class");
const GrpcClientManager_1 = require("../../lib/GrpcClientManager");
const Common_1 = require("../../const/Common");
class UserList {
    constructor() {
        this._list = new Map();
    }
    static instance() {
        if (UserList._instance === undefined) {
            UserList._instance = new UserList();
        }
        return UserList._instance;
    }
    get list() {
        return this._list;
    }
    has(id) {
        if (!id) {
            return;
        }
        return this._list.has(id.toString());
    }
    get(id) {
        if (!id) {
            return;
        }
        return this._list.get(id.toString());
    }
    update(user) {
        CacheFactory_class_1.CacheFactory.instance().getCache().set(Common_1.CACHE_USER_GRPC_ADDRESS + user.id, GrpcClientManager_1.GrpcClientManager.grpcAddress, Utility_1.TimeTools.HOURS12).then();
        this._list.set(user.id.toString(), user);
    }
    delete(id, onlyLocal = false) {
        if (!id) {
            return;
        }
        if (onlyLocal == false) {
            CacheFactory_class_1.CacheFactory.instance().getCache().del(Common_1.CACHE_USER_GRPC_ADDRESS + id).then();
        }
        this._list.delete(id.toString());
    }
    getGrpcAddress(id) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!id) {
                return;
            }
            return yield CacheFactory_class_1.CacheFactory.instance().getCache().get(Common_1.CACHE_USER_GRPC_ADDRESS + id);
        });
    }
}
exports.UserList = UserList;
