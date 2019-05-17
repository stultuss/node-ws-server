import GroupManger from './GroupManger';
import {TimeTools} from '../../common/Utility';

class GroupModel {
    private readonly _groupId: string;
    private readonly _userIds: Set<string>;
    private _expire: any;

    public constructor(groupId: string) {
        this._updateExpireTime();
        this._groupId = groupId;
        this._userIds = new Set<string>();
        console.log(`Group Id: ${this._groupId} create!`);
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
        this._updateExpireTime();
        return this._userIds.add(userId.toString());
    }

    public deleteUserId(userId: string) {
        this._updateExpireTime();
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
            console.log(`Group Id: ${this._groupId} delete!`);
            clearTimeout(this._expire);
            GroupManger.instance().delete(this._groupId);
        } else {
            GroupManger.instance().update(this);
        }
    }

    /**
     * 设置群组过期
     *
     * @param {number} expireTime
     * @return {number}
     */
    public _updateExpireTime(expireTime = TimeTools.MINUTE * 10) {
        // 清除上一次定时器
        clearTimeout(this._expire);
        // 触发下一次定时器
        this._expire = setTimeout(() => {
            console.log(`Group Id: ${this._groupId} expire!`);
            GroupManger.instance().delete(this._groupId);
        }, expireTime * 1000)
    }
}

export default GroupModel;