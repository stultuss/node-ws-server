export const enum ErrorCode {
    // ERROR，长链接消息退出错误吗
    IM_ERROR_UNKNOWN = 3000,  // 未知报错
    IM_ERROR_CODE_PACKET_READ = 3001,  // 读取协议包错误
    IM_ERROR_CODE_PACKET_HEADER = 3002,  // 解析协议包头内容错误
    IM_ERROR_CODE_PACKET_BODY = 3003,  // 解析协议包体内容错误
    IM_ERROR_CODE_SYSTEM_TOKEN_NOT_MATCHED = 3004,  // 系统token不匹配
    IM_ERROR_CODE_LOGIN_TOKEN_NOT_MATCHED = 3005,  // 登录token不匹配
    IM_ERROR_CODE_ACCESS_DENIED = 3006,  // 操作权限无效
    IM_ERROR_CODE_BODY_PROPERTY_WRONG = 3007,  // 包体属性错误
    IM_ERROR_CODE_CLIENT_SLOW_CONNECTED = 3010,  // 客户端慢连接

    IM_ERROR_CODE_MSG_EMPTY = 3010,  // 聊天内容为空
    IM_ERROR_CODE_RE_LOGIN = 3011,  // 重复登录
    IM_ERROR_CODE_NO_LOGIN = 3012,  // 未登录
    IM_ERROR_CODE_NOT_ALLOWED_TYPE = 3013,  // 不允许发送消息
    IM_ERROR_CODE_LOGOUT = 3014,  // 退出
    IM_ERROR_CODE_USER_NOT_EXIST = 3020,  // 用户不存在
    IM_ERROR_CODE_GROUP_NOT_EXIST = 3021,  // 频道不存在
    IM_ERROR_CODE_GROUP_EXCEED = 3022,  // 频道编号长度不合法
    IM_ERROR_CODE_EXTRA_EXCEED = 3031,  // 附加信息长度超出限制

    // WARNING，长链接消息返回异常码
    IM_WARNING_NOT_IN_GROUP = 4001,  // 尚未加入频道
}