import {WsService} from '../ws.service';
import {UserModel} from '../../model/user/UserModel';
import {PacketModel} from '../../model/packet/PacketModel';
import {PacketCode} from '../../model/packet/PacketCode';

export namespace UserAction {
    /**
     * 用户登出
     *
     * @param {UserModel} user
     * @param {PacketModel} pack
     * @param {boolean} isReLogin
     */
    export function logout(user: UserModel, pack: PacketModel, isReLogin = false) {
        if (!user) {
            return
        }
        
        // 通知客户端属于什么情况下的退出
        user.logout((isReLogin) ? PacketCode.IM_ERROR_CODE_RE_LOGIN : PacketCode.IM_ERROR_CODE_LOGOUT);
    }
    
    /**
     * 更新用户信息
     *
     * @param {UserModel} user
     * @param {PacketModel} pack
     */
    export function update(user: UserModel, pack: PacketModel) {
        if (!user) {
            return
        }
    
        user.updateData(pack);
        WsService.sendResponse(user, pack);
    }
}