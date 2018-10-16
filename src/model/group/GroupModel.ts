import GroupManger from './GroupManger';

class GroupModel {
    private readonly _groupId: string;
    private readonly _userIds: Set<string>;

    public constructor(groupId: string) {
        this._groupId = groupId;
        this._userIds = new Set();
    }

    public get id() {
        return this._groupId;
    }

    public get userIds() {
        return this._userIds;
    }

    /**
     * 加入群组
     *
     * @param {string} uid
     */
    public join(uid: string): void {
        this._userIds.add(uid);

        // 更新房间
        GroupManger.instance().update(this);
    }

    /**
     * 退出群组
     *
     * @param {string} uid
     */
    public quit(uid: string) {
        this._userIds.delete(uid);

        // 更新房间
        if (this._userIds.size == 0) {
            GroupManger.instance().delete(this._groupId);
        } else {
            GroupManger.instance().update(this);
        }
    }
}

export default GroupModel;