// 客户端 / 服务器接入服务器所需要的 secret
const secretConfig = {
  server: 'Y#K&D*H.server',
  client: 'Y#K&D*H.client',
};

module.exports = {
  mode: 'default', // 验证 token 的模式，default ｜ strict
  port: 8081,
  secret: secretConfig
};