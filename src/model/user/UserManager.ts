import UserModel from './UserModel';
import Cluster from '../../cluster/Cluster';
import {CacheFactory} from '../../common/cache/CacheFactory.class';
import {TimeTools} from '../../common/Utility';
import {CACHE_SERVER_ADDRESS} from '../../const/Const';

// 用户列表
class UserManager {
    private static _instance: UserManager;
    private _list: Map<string, UserModel>;

    public static instance(): UserManager {
        if (UserManager._instance === undefined) {
            UserManager._instance = new UserManager();
        }
        return UserManager._instance;
    }

    private constructor() {
        this._list = new Map<string, UserModel>();
    }

    public get list() {
        return this._list;
    }

    public has(id: string): boolean {
        return this._list.has(id);
    }

    public get(id: string): UserModel {
        return this._list.get(id);
    }

    public update(user: UserModel) {
        CacheFactory.instance().getCache().set(CACHE_SERVER_ADDRESS + user.id, Cluster.instance().nodeAddress, TimeTools.HOURS12).then();
        this._list.set(user.id, user);
    }

    public delete(id: string, onlyLocal = false) {
        if (onlyLocal == false) {
            CacheFactory.instance().getCache().del(CACHE_SERVER_ADDRESS + id).then();
        }
        this._list.delete(id);
    }

    public async getServerAddress(id: string) {
        return await CacheFactory.instance().getCache().get(CACHE_SERVER_ADDRESS + id);
    }
}

export default UserManager;