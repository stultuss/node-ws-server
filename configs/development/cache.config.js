// 缓存配置，目前只支持 redis
module.exports = [{
  host: '127.0.0.1',
  port: 6379,
  authPasswd: '',
  options: {
    connect_timeout: 36000000, // redis服务断开重连超时时间
    retry_delay: 2000 // redis服务断开，每2000ms重连一次
  }
}];