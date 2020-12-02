import {TimeTools} from '../../common/Utility';
import {GroupList} from './GroupList';

export class GroupModel {
    private readonly _groupId: string;
    private readonly _uids: Set<string>;
    private _expire: any;
    
    public constructor(groupId: string) {
        this._updateExpireTime();
        this._groupId = groupId;
        this._uids = new Set<string>();
    }
    
    public get id() {
        return this._groupId;
    }
    
    public get uids() {
        return [...Array.from(this._uids.values())];
    }
    
    /**
     * 验证 uid 是否存在
     *
     * @param {string} uid
     */
    public has(uid: string) {
        return this._uids.has(uid.toString());
    }
    
    /**
     * 加入群组
     *
     * @param {string} uid
     */
    public add(uid: string) {
        this._updateExpireTime();
        return this._uids.add(uid.toString());
    }
    
    /**
     * 退出群组
     *
     * @param {string} uid
     */
    public delete(uid: string) {
        this._updateExpireTime();
        return this._uids.delete(uid.toString());
    }
    
    /**
     * 加入群组
     *
     * @param {string} uid
     */
    public join(uid: string): void {
        this.add(uid);
        GroupList.instance().update(this);
    }
    
    /**
     * 退出群组
     *
     * @param {string} uid
     */
    public quit(uid: string) {
        this.delete(uid);
        if (this._uids.size == 0) {
            clearTimeout(this._expire);
            GroupList.instance().delete(this._groupId);
        } else {
            GroupList.instance().update(this);
        }
    }
    
    /**
     * 设置过期
     *
     * @param {number} expire
     * @return {number}
     */
    public _updateExpireTime(expire = TimeTools.HOURS12) {
        clearTimeout(this._expire);
        this._expire = setTimeout(() => {
            GroupList.instance().delete(this._groupId);
        }, expire * 1000)
    }
}