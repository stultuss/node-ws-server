# ETCD 

--

## 创建 ETCD 集群

生成 discovery
```bash
curl -s http://discovery.etcd.io/new?size=3
// https://discovery.etcd.io/42095158d2326df5e897a1bbb365be4c
```

启动 etcd0
```
--data-dir=/etcd-data
--name
etcd0
--proxy 
on
--initial-advertise-peer-urls
http://127.0.0.1:2380
--listen-peer-urls
http://0.0.0.0:2380
--listen-client-urls
http://0.0.0.0:2379
--advertise-client-urls
http://127.0.0.1:2379
--discovery
http://discovery.etcd.io/42095158d2326df5e897a1bbb365be4c
```

启动 etcd1
```
--data-dir=/etcd-data
--name
etcd1
--proxy 
on
--initial-advertise-peer-urls
http://127.0.0.1:2380
--listen-peer-urls
http://0.0.0.0:2380
--listen-client-urls
http://0.0.0.0:2379
--advertise-client-urls
http://127.0.0.1:2379
--discovery
http://discovery.etcd.io/42095158d2326df5e897a1bbb365be4c
```

启动 etcd2
```
--data-dir=/etcd-data
--name
etcd2
--proxy 
on
--initial-advertise-peer-urls
http://127.0.0.1:2380
--listen-peer-urls
http://0.0.0.0:2380
--listen-client-urls
http://0.0.0.0:2379
--advertise-client-urls
http://127.0.0.1:2379
--discovery
http://discovery.etcd.io/42095158d2326df5e897a1bbb365be4c
```