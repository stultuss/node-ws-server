// import ClusterNodes from '../../cluster/ClusterNodes';
// import PacketModel from '../../model/packet/PacketModel';
// import UserModel from '../../model/user/UserModel';
// import UserManager from '../../model/user/UserManager';
// import {WsConnHandler} from '../lib/WsConnHandler';
// import {CodeConfig} from '../../config/ErrorCode';
// import {API_FROM, API_MSG_TYPE, API_RESPONSE, BaseBody} from '../../const/Const';
//
// export namespace PrivateAction {
//
//     export async function notice(user: UserModel, pack: PacketModel, isAction = false) {
//         checkUser(pack);
//         checkMessage(pack, (isAction) ? API_MSG_TYPE.IM_ACTION : API_MSG_TYPE.IM_CHAT);
//
//         if (WsConnHandler.isForwarding(user, pack)) {
//             // 发送本地消息
//             let fromType = (pack.fromType == API_FROM.IM_FROM_TYPE_FORWARDING_USER) ? API_FROM.IM_FROM_TYPE_USER : API_FROM.IM_FROM_TYPE_SYSTEM;
//             let receiver = UserManager.instance().get(pack.body.receive);
//             if (receiver) {
//                 receiver.connSend(PacketModel.create(pack.type, fromType, pack.requestId, pack.body));
//             }
//         } else {
//             // 消息由服务器进行转发
//             await broadcast(user, pack);
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
//     async function broadcast(sender: UserModel, pack: PacketModel) {
//         // 消息 body
//         let body = pack.body as BaseBody;
//         body.sender = (pack.fromType == API_FROM.IM_FROM_TYPE_USER) ? sender.id : 'SYS';
//         let fromType = (pack.fromType == API_FROM.IM_FROM_TYPE_USER) ? API_FROM.IM_FROM_TYPE_FORWARDING_USER : API_FROM.IM_FROM_TYPE_FORWARDING_SYSTEM;
//
//         // 查询玩家是否在本地服务，否则远程转发
//         let receiver = UserManager.instance().get(body.receive);
//         if (receiver) {
//             receiver.connSend(PacketModel.create(pack.type, pack.fromType, pack.requestId, body));
//         } else {
//             let address = await UserManager.instance().getServerAddress(body.receive);
//             await ClusterNodes.instance().forwarding(address, PacketModel.create(pack.type, fromType, pack.requestId, body));
//         }
//     }
//
//     function checkUser(pack: PacketModel) {
//         let body = pack.body as BaseBody;
//         if (!body.hasOwnProperty('receive')) {
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
