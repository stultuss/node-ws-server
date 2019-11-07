im-server
==========================
[![Build][travis-image]][travis-url]
[![Linux Build][travis-linux-image]][travis-linux-url]
[![Windows Build][travis-windows-image]][travis-windows-url]
[![Test Coverage][coveralls-image]][coveralls-url]

> Distributed Message Service Cluster for Service Registration and Discovery via ETCD

## Aim

This project is to provide a reliable message service，By making this project into a docker image, you can quickly build a distributed message service cluster on the docker container platform.

You can also customize your message service cluster by modifying the code.

## How to use

 * Generate discovery url

```bash
curl -s http://discovery.etcd.io/new?size=3
// https://discovery.etcd.io/9c7d8d23b7d883e5a3348ae66fc85ec7
```

 * Modify `start.sh` to replace the discovery url

``` bash
nohup /tmp/etcd/etcd  \
     -name proxy \
     -proxy on  \
     -listen-client-urls http://0.0.0.0:2370  \
     -discovery https://discovery.etcd.io/9c7d8d23b7d883e5a3348ae66fc85ec7 >> /tmp/etcd/output.log 2>&1 & echo $! > run.pid

node ./build/index.js
```

 * Build and launch the docker container

``` bash
docker build -t im-server:latest .
docker run -d -p 8080:8080 im-server
```

## Client authentication mode
1. default

   > To allow any client access, the Token required to connect to the server must be generated in conjunction with `secret.user` in the server configuration.

2. strict

   > Allow only token authenticated client access。

## Token generating rule

``` typescript
const token = md5(“${secretKey}_${uid},${ipAddress},${loginTime}”).substr(0, 8)
```

[travis-image]: https://travis-ci.org/stultuss/node-ws-server.svg?branch=master
[travis-url]: https://travis-ci.org/stultuss/node-ws-server
[travis-linux-image]: https://img.shields.io/travis/stultuss/node-ws-server/master.svg?label=linux
[travis-linux-url]: https://travis-ci.org/stultuss/node-ws-server
[travis-windows-image]: https://img.shields.io/travis/stultuss/node-ws-server/master.svg?label=windows
[travis-windows-url]: https://travis-ci.org/stultuss/node-ws-server
[coveralls-image]: https://img.shields.io/coveralls/stultuss/node-ws-server/master.svg
[coveralls-url]: https://coveralls.io/r/stultuss/node-ws-server?branch=master
