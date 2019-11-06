im-server
==========================

> im-server 是一款基于 ETCD + WebSocket 的分布式消息服务。

## 使用

 * 生成 discovery

```bash
curl -s http://discovery.etcd.io/new?size=3
// https://discovery.etcd.io/42095158d2326df5e897a1bbb365be4c
```

 * 修改 start.sh，替换 `discovery.etcd.io` 的地址

``` bash
nohup /tmp/etcd/etcd  \
     -name proxy \
     -proxy on  \
     -listen-client-urls http://0.0.0.0:2370  \
     -discovery https://discovery.etcd.io/42095158d2326df5e897a1bbb365be4c >> /tmp/etcd/output.log 2>&1 & echo $! > run.pid

node ./build/index.js
```

 * 通过 docker 启动

``` bash
docker build -t im-server-demo:latest .
docker run -d -p 8080:8080 im-server-demo
```

 * 其他
 
    1. 目前版本是通过 Gateway API (未提供)，为玩家创建一个登陆 token.
    2. 参考 client.ts，将登陆 token 放到 websocket 的 options 中，服务器以此验证用户是否合法。


## Feature

* ver 2.0 将通过 golang 实现
