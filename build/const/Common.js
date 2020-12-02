"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.API_MSG_TYPE = exports.API_RESPONSE = exports.API_FROM = exports.API_TYPE = exports.CACHE_USER_GRPC_ADDRESS = exports.CACHE_TOKEN = void 0;
// CACHE_KEY
exports.CACHE_TOKEN = 'IM:TOKEN:';
exports.CACHE_USER_GRPC_ADDRESS = 'IM:USER_GRPC_NODE:';
// 消息类型
exports.API_TYPE = {
    IM_KICK_USER: 101,
    IM_KICK_ALL_USER: 102,
    IM_LOGIN: 201,
    IM_LOGOUT: 202,
    IM_UPDATE_INFO: 203,
    IM_RELOGIN: 204,
    IM_PRIVATE_CHAT: 211,
    IM_PRIVATE_ACTION: 212,
    IM_WORLD_CHAT: 221,
    IM_WORLD_ACTION: 222,
    IM_GROUP_JOIN: 301,
    IM_GROUP_QUIT: 302,
    IM_GROUP_CHAT: 311,
    IM_GROUP_ACTION: 312,
};
// 来源类型
exports.API_FROM = {
    IM_FROM_TYPE_USER: 0,
    IM_FROM_TYPE_SYSTEM: 1,
    IM_FROM_TYPE_AI: 2,
    IM_FROM_TYPE_FORWARDING_USER: 3,
    IM_FROM_TYPE_FORWARDING_SYSTEM: 4,
};
// 回应类型
exports.API_RESPONSE = {
    IM_ERROR: 0,
    IM_SUCCEED: 1,
};
// 来源类型
exports.API_MSG_TYPE = {
    IM_CHAT: 0,
    IM_ACTION: 1,
};
