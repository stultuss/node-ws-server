// proxy address, 参考 ../start.sh 的 listen-client-urls 参数
// fixme 如非必要，请勿修改
module.exports = {
  host: '127.0.0.1',
  port: 2370,
  timeout: 30 // etcd key 过期时间，单位：秒
};