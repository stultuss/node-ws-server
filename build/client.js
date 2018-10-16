"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const WebSocket = require("ws");
const program = require("commander");
const PacketModel_1 = require("./model/packet/PacketModel");
const Utility_1 = require("./common/Utility");
program
    .option('-u, --uid [uid]', `Add uid [0]`, '0')
    // .option('-p, --path [path]', `Add login path [127.0.0.1:8080]`, '127.0.0.1:8080')
    .option('-p, --path [path]', `Add login path [172.81.229.187:8080]`, '172.81.229.187:8080')
    .parse(process.argv);
console.log('----------------------------------------------------------------');
console.log(' TCP Client Commander:');
console.log('  - uid: %s', program.uid);
console.log('  - path: %s', program.path);
console.log('----------------------------------------------------------------');
// 创建WekSocket连接
class ClientUser {
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
        }
        else {
            const address = Utility_1.CommonTools.eth0();
            const time = Utility_1.TimeTools.getTime();
            headers = {
                system: address,
                time: time.toString(),
            };
            protocols = Utility_1.CommonTools.genToken("*Y#KDF&D*H#", address, time);
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
                        case 'close':
                            this._logout();
                            break;
                    }
                });
            }
        }, 1000);
    }
    _chat() {
        this._conn.send(PacketModel_1.default.create(221 /* IM_WORLD_CHAT */, (this._uid == '0') ? 1 /* IM_FROM_TYPE_SYSTEM */ : 0 /* IM_FROM_TYPE_USER */, 1, { type: 0 /* IM_CHAT */, msg: 'This is world message from' + this._uid }).format());
    }
    _gJoin() {
        this._conn.send(PacketModel_1.default.create(301 /* IM_GROUP_JOIN */, 0 /* IM_FROM_TYPE_USER */, 1, { groupId: 999 }).format());
    }
    _gChat() {
        this._conn.send(PacketModel_1.default.create(311 /* IM_GROUP_CHAT */, (this._uid == '0') ? 1 /* IM_FROM_TYPE_SYSTEM */ : 0 /* IM_FROM_TYPE_USER */, 1, { type: 0 /* IM_CHAT */, groupId: 999, msg: 'This is group message from' + this._uid }).format());
    }
    _pChat() {
        this._conn.send(PacketModel_1.default.create(211 /* IM_PRIVATE_CHAT */, (this._uid == '0') ? 1 /* IM_FROM_TYPE_SYSTEM */ : 0 /* IM_FROM_TYPE_USER */, 1, { type: 0 /* IM_CHAT */, receive: 10002, msg: 'This is private message from' + this._uid }).format());
    }
    _logout() {
        this._conn.send(PacketModel_1.default.create(202 /* IM_LOGOUT */, 0 /* IM_FROM_TYPE_USER */, 1, { uid: this._uid }).format());
    }
}
new ClientUser(program.uid).stdin();
