const WebSocket = require('ws');
const program = require('commander');
const {PacketModel} = require('./build/model/packet/PacketModel');
const {API_FROM, API_MSG_TYPE, API_TYPE} = require('./build/const/Common');
const {CommonTools, TimeTools} = require('./build/common/Utility');

program
  .option('-u, --uid [uid]', `Add uid [999999]`, '999999')
  .option('-t, --token [token]', `Add token [1q2w3e4r]`, '1q2w3e4r')
  .option('-p, --path [path]', `Add login path [ws://127.0.0.1:8080]`, 'ws://127.0.0.1:8080')
  .parse(process.argv);

console.log('----------------------------------------------------------------');
console.log(' TCP Client Commander:');
console.log('  - uid: %s', program.uid);
console.log('  - token: %s', program.token);
console.log('  - path: %s', program.path);
console.log('----------------------------------------------------------------');

// 创建WekSocket连接
class ClientUser {
  
  _conn;

  constructor(uid) {
    this._uid = uid;
    this._conn = null;
    this.connect();
  }

  connect() {
    let ip = CommonTools.eth0();
    let time = TimeTools.getTime();
    let token = (program.mod === 'strict') ? program.token : CommonTools.genString(`Y#K&D*H.ply_${this._uid}`, ip, time);

    let ws = new WebSocket(program.path, `${this._uid}|${token}|${ip}|${time}`);
    ws.on('open', () => {
      console.log('connected succeed');
      this._heartbeat();
    });
    ws.on('message', (r) => {
      console.log('------------------------message------------------------');
      console.log(r);
      console.log('------------------------message------------------------');
    });
    ws.on('close', (code, reason) => {
      console.log('------------------------close------------------------');
      console.log(code, reason);
      console.log('------------------------close------------------------');
      process.exit();
    });
    ws.on('error', (e) => {
      console.log('------------------------error------------------------');
      console.log(e);
      console.log('------------------------error------------------------');
      process.exit();
    });
    this._conn = ws;
  }

  stdin() {
    setTimeout(() => {
      if (this._conn == null || this._conn.readyState !== WebSocket.OPEN) {
        this.stdin();
      } else {
        // 监控控制台输入
        process.stdin.resume();
        process.stdin.on('data', (text) => {
          const action = text.toString().replace(/\r?\n|\r/g, '').trim();
          switch (action) {
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
      this._conn.send(PacketModel.create(
        API_TYPE.IM_UPDATE_INFO,
        (this._uid == '0') ? API_FROM.IM_FROM_TYPE_SYSTEM : API_FROM.IM_FROM_TYPE_USER,
        1,
        {
          uid: this._uid,
          data: {
            heartbeat: TimeTools.getTime()
          }
        }
      ).format());
      this._heartbeat();
    }, 30000);
  }

  _chat() {
    this._conn.send(PacketModel.create(
      API_TYPE.IM_WORLD_CHAT,
      (this._uid == '0') ? API_FROM.IM_FROM_TYPE_SYSTEM : API_FROM.IM_FROM_TYPE_USER,
      1,
      {type: API_MSG_TYPE.IM_CHAT, msg: 'This is world message from' + this._uid}
    ).format());
  }

  _gJoin() {
    this._conn.send(PacketModel.create(
      API_TYPE.IM_GROUP_JOIN,
      API_FROM.IM_FROM_TYPE_USER,
      1,
      {groupId: '1_12_1'}
    ).format());
  }

  _gChat() {
    this._conn.send(PacketModel.create(
      API_TYPE.IM_GROUP_CHAT,
      (this._uid == '0') ? API_FROM.IM_FROM_TYPE_SYSTEM : API_FROM.IM_FROM_TYPE_USER,
      1,
      {type: API_MSG_TYPE.IM_CHAT, groupId: '1_12_1', msg: 'This is group message from' + this._uid}
    ).format());
  }

  _gAction() {
    this._conn.send(PacketModel.create(
      API_TYPE.IM_GROUP_ACTION,
      (this._uid == '0') ? API_FROM.IM_FROM_TYPE_SYSTEM : API_FROM.IM_FROM_TYPE_USER,
      1,
      {
        type: API_MSG_TYPE.IM_ACTION,
        action: 1,
        groupId: '1_1',
        data: {
          answerAddUp: 1,
          answerIsRight: 1
        }
      }
    ).format());
  }

  _pChat() {
    this._conn.send(PacketModel.create(
      API_TYPE.IM_PRIVATE_CHAT,
      (this._uid == '0') ? API_FROM.IM_FROM_TYPE_SYSTEM : API_FROM.IM_FROM_TYPE_USER,
      1,
      {type: API_MSG_TYPE.IM_CHAT, receive: 999999, msg: 'This is private message from' + this._uid}
    ).format());
  }

  _pAction() {
    this._conn.send(PacketModel.create(
      API_TYPE.IM_PRIVATE_ACTION,
      API_FROM.IM_FROM_TYPE_USER,
      1,
      {
        type: API_MSG_TYPE.IM_ACTION,
        action: 21,
        receive: 10001,
        data: {
          XXX: 'XXX'
        }
      }
    ).format());
  }

  _logout() {
    this._conn.send(PacketModel.create(
      API_TYPE.IM_LOGOUT,
      API_FROM.IM_FROM_TYPE_USER,
      1,
      {uid: this._uid}
    ).format());
  }
}

new ClientUser(program.uid).stdin();