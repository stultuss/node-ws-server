import * as WebSocket from 'ws';
import * as program from 'commander';
import PacketModel from './model/packet/PacketModel';
import {API_FROM, API_MSG_TYPE, API_TYPE} from './const/Const';
import {CommonTools, TimeTools} from './common/Utility';

program
.option('-m, --mod [mod]', `verify mode`, 'default')
.option('-u, --uid [uid]', `Add uid [999999]`, '999999')
.option('-t, --token [token]', `Add token [1q2w3e4r]`, '1q2w3e4r')
.option('-p, --path [path]', `Add login path [ws://127.0.0.1:8081]`, 'ws://127.0.0.1:8081')
.parse(process.argv);

console.log('----------------------------------------------------------------');
console.log(' TCP Client Commander:');
console.log('  - mod: %s', program.mod);
console.log('  - uid: %s', program.uid);
console.log('  - token: %s', program.token);
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
    let ip = CommonTools.eth0();
    let time = TimeTools.getTime();
    
    if (this._uid == '0') {
      headers = {
        s: CommonTools.genToken('Y#K&D*H.server', ip, time),
        i: ip,
        t: time.toString()
      };
    } else {
      headers = {
        id: this._uid,
        i: ip,
        t: time.toString()
      };
      protocols = (program.mod == 'strict') ? program.token : CommonTools.genToken(`Y#K&D*H.client_${this._uid}`, ip, time);
    }
    let ws = new WebSocket(program.path, protocols, {
      headers: headers
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
  
  public stdin() {
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
  
  private _heartbeat() {
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
      {groupId: '1_12_1'}
    ).format());
  }
  
  private _gChat() {
    this._conn.send(PacketModel.create(
      API_TYPE.IM_GROUP_CHAT,
      (this._uid == '0') ? API_FROM.IM_FROM_TYPE_SYSTEM : API_FROM.IM_FROM_TYPE_USER,
      1,
      {type: API_MSG_TYPE.IM_CHAT, groupId: '1_1', msg: 'This is group message from' + this._uid}
    ).format());
  }
  
  private _gAction() {
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
  
  private _pChat() {
    this._conn.send(PacketModel.create(
      API_TYPE.IM_PRIVATE_CHAT,
      (this._uid == '0') ? API_FROM.IM_FROM_TYPE_SYSTEM : API_FROM.IM_FROM_TYPE_USER,
      1,
      {type: API_MSG_TYPE.IM_CHAT, receive: 10001, msg: 'This is private message from' + this._uid}
    ).format());
  }
  
  private _pAction() {
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