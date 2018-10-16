import * as WebSocket from 'ws';
import * as program from 'commander';
import PacketModel from './model/packet/PacketModel';
import {API_FROM, API_MSG_TYPE, API_TYPE} from './const/Const';
import {CommonTools, TimeTools} from './common/Utility';

program
    .option('-u, --uid [uid]', `Add uid [0]`, '0')
    .option('-p, --path [path]', `Add login path [127.0.0.1:8080]`, '127.0.0.1:8080')
    .parse(process.argv);

console.log('----------------------------------------------------------------');
console.log(' TCP Client Commander:');
console.log('  - uid: %s', program.uid);
console.log('  - path: %s', program.path);
console.log('----------------------------------------------------------------');

// 创建WekSocket连接
class ClientUser {
    private readonly _uid: string;
    private _conn: WebSocket;

    constructor(uid) {
        this._uid = uid;
        this._conn = null;
        this.connect();
    }

    connect() {
        let headers = {};
        let protocols = null;
        if (this._uid !== '0') {
            headers = {
                id: this._uid,
                token: '1q2w3e4r'
            };
        } else {
            const address = CommonTools.eth0();
            const time = TimeTools.getTime();
            headers = {
                system: address,
                time: time.toString(),
            };
            protocols = CommonTools.genToken("*Y#KDF&D*H#", address, time);
        }
        console.log(protocols);
        let wss = new WebSocket(`ws://${program.path}`, protocols, {
            headers: headers
        });

        wss.on('open', () => {
            console.log('connected succeed');
        });

        wss.on('message', (data) => {
            console.log('------------------------response------------------------');
            console.log(data);
            console.log('------------------------response------------------------');
        });

        wss.on('error', (err) => {
            console.log(`Error: ${err.message}`);
            process.exit();
        });

        wss.on('close', (code) => {
            console.log(`ErrorCode: ${code}`);
            process.exit();
        });

        this._conn = wss;
    }

    public stdin() {
        setTimeout(() => {
            if (this._conn == null || this._conn.readyState !== WebSocket.OPEN) {
                this.stdin();
            } else {
                // 监控控制台输入
                process.stdin.resume();
                process.stdin.on('data', (text) => {
                    text = text.toString().replace(/\r?\n|\r/g, '').trim();
                    switch (text) {
                        case 'chat':
                            this._chat();
                            break;
                        case 'pchat':
                            this._pChat();
                            break;
                        case 'gjoin':
                            this._gJoin();
                            break;
                        case 'gchat':
                            this._gChat();
                            break;
                        case 'close':
                            this._logout();
                            break;
                    }
                });
            }
        }, 1000);
    }

    private _chat() {
        this._conn.send(PacketModel.create(
            API_TYPE.IM_WORLD_CHAT,
            (this._uid == '0') ? API_FROM.IM_FROM_TYPE_SYSTEM : API_FROM.IM_FROM_TYPE_USER,
            1,
            {type: API_MSG_TYPE.IM_CHAT, msg: 'This is world message from' + this._uid}
        ).format());
    }

    private _gJoin() {
        this._conn.send(PacketModel.create(
            API_TYPE.IM_GROUP_JOIN,
            API_FROM.IM_FROM_TYPE_USER,
            1,
            {groupId: 999}
        ).format());
    }

    private _gChat() {
        this._conn.send(PacketModel.create(
            API_TYPE.IM_GROUP_CHAT,
            (this._uid == '0') ? API_FROM.IM_FROM_TYPE_SYSTEM : API_FROM.IM_FROM_TYPE_USER,
            1,
            {type: API_MSG_TYPE.IM_CHAT, groupId: 999, msg: 'This is group message from' + this._uid}
        ).format());
    }

    private _pChat() {
        this._conn.send(PacketModel.create(
            API_TYPE.IM_PRIVATE_CHAT,
            (this._uid == '0') ? API_FROM.IM_FROM_TYPE_SYSTEM : API_FROM.IM_FROM_TYPE_USER,
            1,
            {type: API_MSG_TYPE.IM_CHAT, receive: 10002, msg: 'This is private message from' + this._uid}
        ).format());
    }

    private _logout() {
        this._conn.send(PacketModel.create(
            API_TYPE.IM_LOGOUT,
            API_FROM.IM_FROM_TYPE_USER,
            1,
            {uid: this._uid}
        ).format());
    }
}

new ClientUser(program.uid).stdin();