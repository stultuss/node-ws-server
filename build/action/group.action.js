// import {WsService} from '../service/ws.service';
// import UserList from '../model/user/UserList';
// import UserModel from '../model/user/UserModel';
// import PacketModel from '../model/packet/PacketModel';
// import {BaseBody} from '../const/Common';
//
// export namespace GroupAction {
//
//     export async function join(user: UserModel, pack: PacketModel) {
//         checkGroup(pack);
//
//         let body: BaseBody = pack.body;
//         let groupId = body.groupId;
//
//         if (WsService.isForwarding(user, pack)) {
//             // 消息转发
//             let body: BaseBody = pack.body;
//             let bodyUser = UserList.instance().get(body.uid);
//             if (bodyUser) {
//                 bodyUser.updateData(body.data);
//             }
//         } else {
//             // 加入 group
//             user.joinGroup(groupId);
//
//             // 结果通知客户端
//             await sendResponse(user, pack);
//         }
//     }
//
//     export async function quit(user: UserModel, pack: PacketModel) {
//         checkGroup(pack);
//
//         let body: BaseBody = pack.body;
//         let groupId = body.groupId;
//
//         if (WsService.isForwarding(user, pack)) {
//             // 消息转发
//             let body: BaseBody = pack.body;
//             let bodyUser = UserList.instance().get(body.uid);
//             if (bodyUser) {
//                 if (bodyUser && bodyUser.hasGroup(groupId) == false) {
//                     return;
//                 }
//                 bodyUser.quitGroup(groupId);
//             }
//         } else {
//             // 不属于自己群组, 无法退出
//             if (user && user.hasGroup(groupId) == false) {
//                 user.connSend(PacketModel.create(API_RESPONSE.IM_ERROR, API_FROM.IM_FROM_TYPE_SYSTEM, pack.requestId, {
//                     code: CodeConfig.IM_ERROR_CODE_NOT_ALLOWED_TYPE
//                 }));
//                 return;
//             }
//
//             // 加入 group
//             user.quitGroup(groupId);
//
//             // 结果通知客户端
//             await sendResponse(user, pack);
//         }
//     }
//
//     export async function notice(user: UserModel, pack: PacketModel, isAction = false) {
//         checkGroup(pack);
//         checkMessage(pack, (isAction) ? API_MSG_TYPE.IM_ACTION : API_MSG_TYPE.IM_CHAT);
//
//         let body = pack.body as BaseBody;
//         let groupId = body.groupId;
//
//         if (WsService.isForwarding(user, pack)) {
//             // 发送本地消息
//             let fromType = (pack.fromType == API_FROM.IM_FROM_TYPE_FORWARDING_USER) ? API_FROM.IM_FROM_TYPE_USER : API_FROM.IM_FROM_TYPE_SYSTEM;
//             let group = GroupManger.instance().get(groupId);
//             if (group) {
//                 let forwardPack = PacketModel.create(pack.type, fromType, pack.requestId, pack.body);
//                 group.userIds.forEach((userId) => {
//                     const receiver = UserManager.instance().get(userId);
//                     if (receiver) {
//                         receiver.connSend(forwardPack);
//                     }
//                 });
//             }
//         } else {
//             if (pack.fromType == API_FROM.IM_FROM_TYPE_USER) {
//                 if (user && user.hasGroup(groupId) == false) {
//                     await sendResponse(user, pack, {code: CodeConfig.IM_WARNING_NOT_IN_GROUP}, true);
//                     return;
//                 }
//             }
//
//             // 消息由服务器进行转发
//             await broadcast(user, pack, groupId);
//             await sendResponse(user, pack);
//         }
//     }
//
//     async function sendResponse(user: UserModel, pack: PacketModel, data: any = [], isError: boolean = false) {
//         if (!user) {
//             return;
//         }
//
//         user.connSend(PacketModel.create(
//             (isError) ? API_RESPONSE.IM_ERROR : API_RESPONSE.IM_SUCCEED,
//             API_FROM.IM_FROM_TYPE_SYSTEM,
//             pack.requestId,
//             data
//         ));
//     }
//
//     async function broadcast(sender: UserModel, pack: PacketModel, groupId: string) {
//         // 消息 body
//         let body = pack.body as BaseChatBody;
//         body.sender = (pack.fromType == API_FROM.IM_FROM_TYPE_USER) ? sender.id : 'SYS';
//         let fromType = (pack.fromType == API_FROM.IM_FROM_TYPE_USER) ? API_FROM.IM_FROM_TYPE_FORWARDING_USER : API_FROM.IM_FROM_TYPE_FORWARDING_SYSTEM;
//
//         // 发送远程消息
//         await ClusterNodes.instance().forwardingAll(PacketModel.create(pack.type, fromType, pack.requestId, body));
//
//         // 发送本地消息
//         let group = GroupManger.instance().get(groupId);
//         if (group) {
//             let forwardPack = PacketModel.create(pack.type, pack.fromType, pack.requestId, body);
//             group.userIds.forEach((userId) => {
//                 const receiver = UserManager.instance().get(userId);
//                 if (receiver) {
//                     receiver.connSend(forwardPack);
//                 }
//             });
//         }
//     }
//
//     function checkGroup(pack: PacketModel) {
//         let body = pack.body as BaseBody;
//         if (!body.hasOwnProperty('groupId')) {
//             throw CodeConfig.IM_ERROR_CODE_BODY_PROPERTY_WRONG;
//         }
//     }
//
//     function checkMessage(pack: PacketModel, msgType: number) {
//         switch (msgType) {
//             case API_MSG_TYPE.IM_CHAT:
//                 WsConnHandler.checkChatMessage(pack.body);
//                 break;
//             case API_MSG_TYPE.IM_ACTION:
//                 WsConnHandler.checkActionMessage(pack.body);
//                 break;
//             default:
//                 throw CodeConfig.IM_ERROR_CODE_NOT_ALLOWED_TYPE;
//         }
//     }
// }
