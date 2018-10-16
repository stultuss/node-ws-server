import GroupManger from './GroupManger';

class GroupModel {
    private readonly _groupId: string;
    private readonly _userIds: Set<string>;

    public constructor(groupId: string) {
        this._groupId = groupId;
        this._userIds = new Set<string>()
    }

    public get id() {
        return this._groupId;
    }

    public get userIds() {
        return [...Array.from(this._userIds.values())];
    }

    public hasUserId(userId: string) {
        return this._userIds.has(userId.toString());
    }

    public addUserId(userId: string) {
        return this._userIds.add(userId.toString());
    }

    public deleteUserId(userId: string) {
        return this._userIds.delete(userId.toString());
    }

    /**
     * 加入群组
     *
     * @param {string} uid
     */
    public join(uid: string): void {
        this.addUserId(uid);

        // 更新房间
        GroupManger.instance().update(this);
    }

    /**
     * 退出群组
     *
     * @param {string} uid
     */
    public quit(uid: string) {
        this.deleteUserId(uid);

        // 更新房间
        if (this._userIds.size == 0) {
            GroupManger.instance().delete(this._groupId);
        } else {
            GroupManger.instance().update(this);
        }
    }
}

export default GroupModel;