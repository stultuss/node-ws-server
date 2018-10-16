import * as WebSocket from 'ws';
import * as http from 'http';
import PacketModel from '../packet/PacketModel';
import GroupManger from '../group/GroupManger';
import GroupModel from '../group/GroupModel';
import UserManager from './UserManager';
import ClusterNodes from '../../cluster/ClusterNodes';
import {ErrorCode} from '../../config/ErrorCode';
import {API_FROM, API_TYPE} from '../../const/Const';

class UserModel {
    private readonly _conn: WebSocket;
    private readonly _req: http.IncomingMessage;
    private _data: {[key: string]: any};    // 用户显示数据，消息传递中携带
    private _groups: Set<string>;    // 用户所在群组
    private _queue: PacketModel[];
    private _queueDeflating: boolean;

    public constructor(client: WebSocket, req: http.IncomingMessage) {
        this._conn = client;
        this._req = req;
        this._data = {};
        this._groups = new Set<string>();
        this._queue = [];
        this._queueDeflating = false;
    }

    public get id() {
        return this._req.headers.id as string;
    }

    public get token() {
        return this._req.headers.token;
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

    public hasGroup(groupId: string) {
        return this._groups.has(groupId.toString());
    }

    public addGroup(groupId: string) {
        return this._groups.add(groupId.toString());
    }

    public deleteGroup(groupId: string) {
        return this._groups.delete(groupId.toString());
    }

    public joinGroup(groupId: string) {
        let group = GroupManger.instance().get(groupId);
        if (!group) {
            group = new GroupModel(groupId);
        }
        group.join(this.id);
        this.addGroup(groupId);
    }

    public quitGroup(groupId: string) {
        let group = GroupManger.instance().get(groupId);
        if (group) {
            group.quit(this.id);
        }
        this.deleteGroup(groupId);
    }

    public updateData(data: {[key: string]: any}) {
        for (let key of Object.keys(data)) {
            this._data[key] = data[key];
        }
    }

    public async login() {
        // 处理重复登录
        let user = UserManager.instance().get(this.id);
        if (user) {
            user.logout(ErrorCode.IM_ERROR_CODE_RE_LOGIN);
        } else {
            let address = await UserManager.instance().getServerAddress(this.id);
            await ClusterNodes.instance().forwarding(address, PacketModel.create(API_TYPE.IM_RELOGIN, API_FROM.IM_FROM_TYPE_FORWARDING_SYSTEM, 0, {
                uid: this.id
            }));
        }
        // 重新登录
        UserManager.instance().update(this);
    }

    public logout(code = ErrorCode.IM_ERROR_CODE_LOGOUT) {
        // 退出用户所在群组
        this.groups.forEach((groupId) => {
            this.quitGroup(groupId.toString());
        });

        // 关闭连接
        this._connClose(code);
    }

    private _connClose(code?: number) {
        if (this._conn.readyState == WebSocket.OPEN) {
            this._conn.close(code);
        }

        UserManager.instance().delete(this.id, (code == ErrorCode.IM_ERROR_CODE_RE_LOGIN));
    }

    public connSend(pack: PacketModel) {
        if (this._conn.bufferedAmount >= 2048) { // SLOW CONNECTED throttle
            this.logout(ErrorCode.IM_ERROR_CODE_CLIENT_SLOW_CONNECTED);
        } else {
            this._enqueue(pack);
            this._dequeue();
        }
    }

    private _enqueue(pack: PacketModel) {
        if (this._queue.length >= 2048) {
            this.logout(ErrorCode.IM_ERROR_CODE_CLIENT_SLOW_CONNECTED);
        } else {
            this._queue.push(pack);
        }
    }

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
}

export default UserModel;