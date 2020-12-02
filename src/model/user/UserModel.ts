import * as _ from 'underscore';
import * as WebSocket from 'ws';
import * as http from 'http';
import {GrpcClientManager} from '../../lib/GrpcClientManager';
import {TimeTools} from '../../common/Utility';
import {PacketModel} from '../packet/PacketModel';
import {PacketCode} from '../packet/PacketCode';
import {GroupModel} from '../group/GroupModel';
import {GroupList} from '../group/GroupList';
import {UserList} from './UserList';

import {API_FROM, API_TYPE, BaseBody} from '../../const/Common';

export class UserModel {
    private readonly _conn: WebSocket;
    private readonly _req: http.IncomingMessage;
    private _id: string;
    private _data: {[key: string]: any};    // 用户显示数据，消息传递中携带
    private _groups: Set<string>;    // 用户所在群组
    private _queue: PacketModel[];
    private _queueDeflating: boolean;
    private _expire: any;

    public constructor(uid: string, conn: WebSocket, req: http.IncomingMessage) {
        this._updateExpireTime();
        this._conn = conn;
        this._req = req;
        this._id = uid;
        this._data = {};
        this._groups = new Set<string>();
        this._queue = [];
        this._queueDeflating = false;
    }

    public get id() {
        return this._id;
    }

    public get remote() {
        return `${this._req.socket.remoteAddress}:${this._req.socket.remotePort}`;
    }

    public get conn() {
        return this._conn;
    }

    public get req() {
        return this._req;
    }

    public get data() {
        return this._data;
    }

    public get groups() {
        return [...Array.from(this._groups.values())];
    }
    
    /**
     * 判断是否已经加入过群组
     *
     * @param groupId
     */
    public hasGroup(groupId: string) {
        return this._groups.has(groupId.toString());
    }
    
    /**
     * 加入群组
     *
     * @param groupId
     */
    public joinGroup(groupId: string) {
        this._updateExpireTime();
        
        let group = GroupList.instance().get(groupId);
        if (!group) {
            group = new GroupModel(groupId);
        }
        group.join(this.id);
        this._groups.add(groupId.toString());
    }
    
    /**
     * 退出群组
     *
     * @param groupId
     */
    public quitGroup(groupId: string) {
        this._updateExpireTime();
        
        let group = GroupList.instance().get(groupId);
        if (group) {
            group.quit(this.id);
        }
        this._groups.delete(groupId.toString());
    }
    
    /**
     * 更新扩展信息
     *
     * @param {PacketModel} pack
     */
    public updateData(pack: PacketModel) {
        this._updateExpireTime();
        
        const body: BaseBody = pack.body;
        if (!body.hasOwnProperty('data') || _.isObject(body.data)) {
            return;
        }
        
        for (let key of Object.keys(body.data)) {
            this._data[key] = body.data[key];
        }
    }
    
    /**
     * 用户登陆
     */
    public async login() {
        // 从本地节点获取用户信息
        const user = UserList.instance().get(this.id);
        
        // 确定玩家在本地节点 - 当前节点踢人
        if (user) {
            UserList.instance().get(this.id).logout(PacketCode.IM_ERROR_CODE_RE_LOGIN);
            return ;
        }
        
        // 确定玩家是否在远程节点 - 远程节点踢人
        const address = await UserList.instance().getGrpcAddress(this.id);
        if (address) {
            GrpcClientManager.instance().forwarding(address, PacketModel.create(
                API_TYPE.IM_RELOGIN,
                API_FROM.IM_FROM_TYPE_FORWARDING_SYSTEM,
                0,
                {uid: this.id})
            );
        }
        
        // 重新登录
        UserList.instance().update(this);
    }
    
    /**
     * 用户登出
     *
     * @param code
     */
    public logout(code = PacketCode.IM_ERROR_CODE_LOGOUT) {
        this.groups.forEach((groupId) => {
            this.quitGroup(groupId.toString());
        });
        this._connClose(code);
    }
    
    /**
     * 关闭连接
     *
     * @param code
     * @private
     */
    private _connClose(code?: number) {
        clearTimeout(this._expire);
        
        if (this._conn.readyState == WebSocket.OPEN) {
            this._conn.close(code);
        }

        UserList.instance().delete(this.id, (code == PacketCode.IM_ERROR_CODE_RE_LOGIN));
    }
    
    /**
     * 发送信息
     *
     * @param pack
     */
    public connSend(pack: PacketModel) {
        if (this._conn.bufferedAmount >= 2048) { // SLOW CONNECTED throttle
            this.logout(PacketCode.IM_ERROR_CODE_CLIENT_SLOW_CONNECTED);
        } else {
            this._enqueue(pack);
            this._dequeue();
        }
    }
    
    /**
     * 消息队列进栈
     *
     * @param pack
     */
    private _enqueue(pack: PacketModel) {
        if (this._queue.length >= 2048) {
            this.logout(PacketCode.IM_ERROR_CODE_CLIENT_SLOW_CONNECTED);
        } else {
            this._queue.push(pack);
        }
    }
    
    /**
     * 消息队列出栈
     */
    private _dequeue() {
        if (this._queueDeflating) {
            return;
        }
        
        while (this._queue.length) {
            // 客户端下线
            if (this.conn.readyState !== WebSocket.OPEN) {
                this.logout();
                return;
            }

            // 弹出队列第一个信息，并进行消息推送
            let pack = this._queue.shift();
            if (!pack) {
                this._dequeue();
                continue;
            }

            // 阻塞式消息队列
            this._queueDeflating = true;
            this.conn.send(pack.format(), () => {
                this._queueDeflating = false;
                this._dequeue();
            });
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
            UserList.instance().delete(this.id);
        }, expire * 1000)
    }
}