import GroupModel from './GroupModel';

class GroupManger {
    private static _instance: GroupManger;
    private _list: Map<string, GroupModel>;

    public static instance(): GroupManger {
        if (GroupManger._instance === undefined) {
            GroupManger._instance = new GroupManger();
        }
        return GroupManger._instance;
    }

    private constructor() {
        this._list = new Map<string, GroupModel>();
    }

    public has(id: string): boolean {
        return this._list.has(id.toString());
    }

    public get(id: string) {
        return this._list.get(id.toString());
    }

    public update(group: GroupModel) {
        this._list.set(group.id.toString(), group);
    }

    public delete(id: string) {
        this._list.delete(id.toString());
    }
}

export default GroupManger;