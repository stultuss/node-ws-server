import {GroupModel} from './GroupModel';

export class GroupList {
    private static _instance: GroupList;
    private _list: Map<string, GroupModel>;
    
    public static instance(): GroupList {
        if (GroupList._instance === undefined) {
            GroupList._instance = new GroupList();
        }
        return GroupList._instance;
    }
    
    private constructor() {
        this._list = new Map<string, GroupModel>();
    }
    
    /**
     * 验证 groupId 是否存在
     *
     * @param {string} id
     */
    public has(id: string): boolean {
        return this._list.has(id.toString());
    }
    
    /**
     * 获取 group 对象
     *
     * @param {string} id
     */
    public get(id: string) {
        return this._list.get(id.toString());
    }
    
    /**
     * 更新 group 对象
     *
     * @param {GroupModel} group
     */
    public update(group: GroupModel) {
        this._list.set(group.id.toString(), group);
    }
    
    /**
     * 删除 group 对象
     *
     * @param {string} id
     */
    public delete(id: string) {
        this._list.delete(id.toString());
    }
}