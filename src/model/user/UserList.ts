import {UserModel} from './UserModel';
import {TimeTools} from '../../common/Utility';
import {CacheFactory} from '../../common/cache/CacheFactory.class';
import {GrpcClientManager} from '../../lib/GrpcClientManager';

import {CACHE_USER_GRPC_ADDRESS} from '../../const/Common';

export class UserList {
    private static _instance: UserList;
    private readonly _list: Map<string, UserModel>;

    public static instance(): UserList {
        if (UserList._instance === undefined) {
            UserList._instance = new UserList();
        }
        return UserList._instance;
    }

    private constructor() {
        this._list = new Map<string, UserModel>();
    }

    public get list() {
        return this._list;
    }

    public has(id: string): boolean {
        if (!id) {
            return
        }
        return this._list.has(id.toString());
    }

    public get(id: string): UserModel {
        if (!id) {
            return
        }
        return this._list.get(id.toString());
    }

    public update(user: UserModel) {
        CacheFactory.instance().getCache().set(CACHE_USER_GRPC_ADDRESS + user.id, GrpcClientManager.grpcAddress, TimeTools.HOURS12).then();
        this._list.set(user.id.toString(), user);
    }

    public delete(id: string, onlyLocal = false) {
        if (!id) {
            return
        }
        if (onlyLocal == false) {
            CacheFactory.instance().getCache().del(CACHE_USER_GRPC_ADDRESS + id).then();
        }
        this._list.delete(id.toString());
    }

    public async getGrpcAddress(id: string) {
        if (!id) {
            return
        }
        return await CacheFactory.instance().getCache().get(CACHE_USER_GRPC_ADDRESS + id);
    }
}