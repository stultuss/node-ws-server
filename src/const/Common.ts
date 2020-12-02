// CACHE_KEY
export const CACHE_TOKEN                = 'IM:TOKEN:';
export const CACHE_USER_GRPC_ADDRESS    = 'IM:USER_GRPC_NODE:';

// 消息类型
export const API_TYPE = {
    IM_KICK_USER                : 101,  // 踢用户下线
    IM_KICK_ALL_USER            : 102,  // 踢全部用户下线

    IM_LOGIN                    : 201,  // 用户登录
    IM_LOGOUT                   : 202,  // 用户退出
    IM_UPDATE_INFO              : 203,  // 用户信息更新
    IM_RELOGIN                  : 204,  // 用户重复登录

    IM_PRIVATE_CHAT             : 211,  // 私聊单播（单播聊天，不记录）
    IM_PRIVATE_ACTION           : 212,  // 私聊单播（单播行为，不记录）
    IM_WORLD_CHAT               : 221,  // 世界广播（广播聊天，不记录）
    IM_WORLD_ACTION             : 222,  // 世界广播（广播行为，不记录）

    IM_GROUP_JOIN               : 301,  // 加入频道
    IM_GROUP_QUIT               : 302,  // 退出频道
    IM_GROUP_CHAT               : 311,  // 频道广播（广播聊天，不记录）
    IM_GROUP_ACTION             : 312,  // 频道广播（广播行为，不记录）
};

// 来源类型
export const API_FROM = {
    IM_FROM_TYPE_USER               : 0, // 用户
    IM_FROM_TYPE_SYSTEM             : 1, // 系统
    IM_FROM_TYPE_AI                 : 2, // 机器人
    IM_FROM_TYPE_FORWARDING_USER    : 3, // 系统转发用户消息
    IM_FROM_TYPE_FORWARDING_SYSTEM  : 4, // 系统转发系统消息
};

// 回应类型
export const API_RESPONSE = {
    IM_ERROR                    : 0, // 给客户端返回一条错误消息
    IM_SUCCEED                  : 1, // 给客户端返回一条正确消息
};

// 来源类型
export const API_MSG_TYPE = {
    IM_CHAT                     : 0, // 聊天
    IM_ACTION                   : 1, // 行为
};

export interface BaseBody
{
    uid?: string;
    groupId?: string;
    sender?: string;
    receive?: string;
    data?: {[key: string]: string}
}

export interface BaseChatBody extends BaseBody
{
    type: number;
    msg: string;
}

export interface BaseActionBody extends BaseBody
{
    type: number;
    action: any;
}