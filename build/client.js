"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const WebSocket = require("ws");
const program = require("commander");
const PacketModel_1 = require("./model/packet/PacketModel");
const Utility_1 = require("./common/Utility");
program
    .option('-u, --uid [uid]', `Add uid [0]`, '0')
    .option('-p, --path [path]', `Add login path [ws://127.0.0.1:8080]`, 'ws://127.0.0.1:8080')
    .parse(process.argv);
console.log('----------------------------------------------------------------');
console.log(' TCP Client Commander:');
console.log('  - uid: %s', program.uid);
console.log('  - path: %s', program.path);
console.log('----------------------------------------------------------------');
const tokens = {
    10001: '1q2w3e4r',
};
// 创建WekSocket连接
class ClientUser {
    constructor(uid) {
        this._uid = uid;
        this._token = tokens[this._uid];
        this._conn = null;
        this.connect();
    }
    connect() {
        let headers = {};
        let protocols = this._token;
        if (this._uid == '0') {
            const address = Utility_1.CommonTools.eth0();
            const time = Utility_1.TimeTools.getTime();
            headers = {
                token: Utility_1.CommonTools.genToken('*Y#KDF&D*H#', address, time),
                system: address,
                time: time.toString(),
            };
            protocols = null;
        }
        let ws = new WebSocket(program.path, protocols, {
            headers: headers,
        });
        ws.on('open', () => {
            console.log('connected succeed');
            this._heartbeat();
        });
        ws.on('message', (data) => {
            console.log('------------------------response------------------------');
            console.log(data);
            console.log('------------------------response------------------------');
        });
        ws.on('error', (err) => {
            console.log(`Error: ${err.message}`);
            process.exit();
        });
        ws.on('close', (code, reason) => {
            console.log(`ErrorCode: ${code}`);
            console.log(`Reason: ${reason}`);
            process.exit();
        });
        this._conn = ws;
    }
    stdin() {
        setTimeout(() => {
            if (this._conn == null || this._conn.readyState !== WebSocket.OPEN) {
                this.stdin();
            }
            else {
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
                        case 'gaction':
                            this._gAction();
                            break;
                        case 'close':
                            this._logout();
                            break;
                    }
                });
            }
        }, 1000);
    }
    _heartbeat() {
        setTimeout(() => {
            this._conn.send(PacketModel_1.default.create(203 /* IM_UPDATE_INFO */, (this._uid == '0') ? 1 /* IM_FROM_TYPE_SYSTEM */ : 0 /* IM_FROM_TYPE_USER */, 1, {
                uid: this._uid,
                data: {
                    heartbeat: Utility_1.TimeTools.getTime(),
                },
            }).format());
            this._heartbeat();
        }, 30000);
    }
    _chat() {
        this._conn.send(PacketModel_1.default.create(221 /* IM_WORLD_CHAT */, (this._uid == '0') ? 1 /* IM_FROM_TYPE_SYSTEM */ : 0 /* IM_FROM_TYPE_USER */, 1, { type: 0 /* IM_CHAT */, msg: 'This is world message from' + this._uid }).format());
    }
    _gJoin() {
        this._conn.send(PacketModel_1.default.create(301 /* IM_GROUP_JOIN */, 0 /* IM_FROM_TYPE_USER */, 1, { groupId: '1_12_1' }).format());
    }
    _gChat() {
        this._conn.send(PacketModel_1.default.create(311 /* IM_GROUP_CHAT */, (this._uid == '0') ? 1 /* IM_FROM_TYPE_SYSTEM */ : 0 /* IM_FROM_TYPE_USER */, 1, { type: 0 /* IM_CHAT */, groupId: '1_1', msg: 'This is group message from' + this._uid }).format());
    }
    _gAction() {
        this._conn.send(PacketModel_1.default.create(312 /* IM_GROUP_ACTION */, (this._uid == '0') ? 1 /* IM_FROM_TYPE_SYSTEM */ : 0 /* IM_FROM_TYPE_USER */, 1, {
            type: 1 /* IM_ACTION */,
            action: 1,
            groupId: '1_1',
            data: {
                answerAddUp: 1,
                answerIsRight: 1,
            },
        }).format());
    }
    _pChat() {
        this._conn.send(PacketModel_1.default.create(211 /* IM_PRIVATE_CHAT */, (this._uid == '0') ? 1 /* IM_FROM_TYPE_SYSTEM */ : 0 /* IM_FROM_TYPE_USER */, 1, { type: 0 /* IM_CHAT */, receive: 10001, msg: 'This is private message from' + this._uid }).format());
    }
    _pAction() {
        this._conn.send(PacketModel_1.default.create(212 /* IM_PRIVATE_ACTION */, 0 /* IM_FROM_TYPE_USER */, 1, {
            type: 1 /* IM_ACTION */,
            action: 21,
            receive: 10001,
            data: {
                XXX: 'XXX',
            },
        }).format());
    }
    _logout() {
        this._conn.send(PacketModel_1.default.create(202 /* IM_LOGOUT */, 0 /* IM_FROM_TYPE_USER */, 1, { uid: this._uid }).format());
    }
}
new ClientUser(program.uid).stdin();
