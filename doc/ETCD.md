# ETCD 

> 由于通过固定 IP (--initial-cluster) 来自定义集群的方式不够灵活，不满足我的需求，所以下文中都是以基于 Discovery 服务协议对 etcd 集群进行学习和部署。

| 名称 | 版本 |
| ---- | ---- |
| etcd | v3.4 |

## 快速开始

**配置存储卷**

```shell
docker volume create --name etcd-data
```

**启动ETCD**

由于 etcd v3.4 默认关闭的 v2 的 API，所以在需要 v2 API 的时候，需要增加参数 `--enable-v2=true`

```shell
DATA_DIR="etcd-data"
REGISTRY=quay.io/coreos/etcd
#REGISTRY=gcr.io/etcd-development/etcd

sudo docker run -d \
  -p 2379:2379 \
  -p 2380:2380 \
  --volume=${DATA_DIR}:/etcd-data \
  --name etcd ${REGISTRY}:latest \
  /usr/local/bin/etcd \
  --data-dir=/etcd-data \
  --name etcd-reg \
  --enable-v2=true \
  --listen-client-urls http://0.0.0.0:2379 \
  --listen-peer-urls http://0.0.0.0:2380 \
  --advertise-client-urls http://127.0.0.1:2379 \
  --initial-advertise-peer-urls http://127.0.0.1:2380 \
  --initial-cluster etcd-reg=http://127.0.0.1:2380
```

**发现服务**

```shell
# 生成将标识新集群的唯一令牌, 一个令牌只能代表一个etcd集群
UUID=${uuidgen}

# 指定预期集群大小
curl -X PUT http://127.0.0.1:2379/v2/keys/_etcd/registry/${UUID}/_config/size -d value=3

# 访问公共发现服务
curl https://discovery.etcd.io/new?size=3
```

通过 etcd 的 `--discovery ${URL}` 

## 单机部署

```shell
NETWORK="etcd_cluster"
REGISTRY=quay.io/coreos/etcd

#docker pull busybox
#docker network create --subnet 10.1.1.1/10 ${NETWORK}
#docker network inspect ${NETWORK}
#docker network ls
#docker network rm etcd_cluster

# For each machine
TOKEN=metcd-token
CLUSTER_STATE=new
NAME_1=etcd0
NAME_2=etcd1
NAME_3=etcd2
HOST_1=10.1.1.10
HOST_2=10.1.1.11
HOST_3=10.1.1.12
CLUSTER=${NAME_1}=http://${HOST_1}:2380,${NAME_2}=http://${HOST_2}:2380,${NAME_3}=http://${HOST_3}:2380

# SERVER 1
THIS_IP=${HOST_1}
THIS_NAME=${NAME_1}
CLIENT_PORT=12379
PEER_PORT=12380
sudo docker run -itd \
  -p ${CLIENT_PORT}:2379 \
  -p ${PEER_PORT}:2380 \
	--restart=always \
	--ip ${THIS_IP} \
	--network ${NETWORK} \
	--hostname ${THIS_NAME} \
	--name ${THIS_NAME} ${REGISTRY}:latest \
  /usr/local/bin/etcd \
  --name ${THIS_NAME} \
  --listen-client-urls http://${THIS_IP}:2379,http://127.0.0.1:2379 \
  --listen-peer-urls http://${THIS_IP}:2380 \
  --advertise-client-urls http://${THIS_IP}:2379 \
  --initial-advertise-peer-urls http://${THIS_IP}:2380 \
  --initial-cluster ${CLUSTER} \
  --initial-cluster-state ${CLUSTER_STATE} \
	--initial-cluster-token ${TOKEN}

# SERVER 2
THIS_IP=10.1.1.11
THIS_NAME=etcd1
CLIENT_PORT=22379
PEER_PORT=22380
sudo docker run -itd \
  -p ${CLIENT_PORT}:2379 \
  -p ${PEER_PORT}:2380 \
	--restart=always \
	--ip ${THIS_IP} \
	--network ${NETWORK} \
	--hostname ${THIS_NAME} \
	--name ${THIS_NAME} ${REGISTRY}:latest \
  /usr/local/bin/etcd \
  --name ${THIS_NAME} \
  --listen-client-urls http://${THIS_IP}:2379,http://127.0.0.1:2379 \
  --listen-peer-urls http://${THIS_IP}:2380 \
  --advertise-client-urls http://${THIS_IP}:2379 \
  --initial-advertise-peer-urls http://${THIS_IP}:2380 \
  --initial-cluster ${CLUSTER} \
  --initial-cluster-state ${CLUSTER_STATE} \
	--initial-cluster-token ${TOKEN}
  
# SERVER 3
THIS_IP=10.1.1.12
THIS_NAME=etcd2
CLIENT_PORT=32379
PEER_PORT=32380
sudo docker run -itd \
  -p ${CLIENT_PORT}:2379 \
  -p ${PEER_PORT}:2380 \
	--restart=always \
	--ip ${THIS_IP} \
	--network ${NETWORK} \
	--hostname ${THIS_NAME} \
	--name ${THIS_NAME} ${REGISTRY}:latest \
  /usr/local/bin/etcd \
  --name ${THIS_NAME} \
  --listen-client-urls http://${THIS_IP}:2379,http://127.0.0.1:2379 \
  --listen-peer-urls http://${THIS_IP}:2380 \
  --advertise-client-urls http://${THIS_IP}:2379 \
  --initial-advertise-peer-urls http://${THIS_IP}:2380 \
  --initial-cluster ${CLUSTER} \
  --initial-cluster-state ${CLUSTER_STATE} \
	--initial-cluster-token ${TOKEN}
```

**测试**

```shell
./etcdctl --write-out=table --endpoints=http://127.0.0.1:12379 member list
./etcdctl --endpoints=http://127.0.0.1:12379 put foo bar
./etcdctl --endpoints=http://127.0.0.1:12379 get foo
```

> **值得注意的是：集群模式下，当 peer 节点仅剩下一个时，etcd 集群是无法工作的，也就是说，最多允许1个 peer 节点失效**

## 代理服务

### v2 proxy

ETCD 集群中有两种节点：

- 代理节点(proxy)：不参与选举，可以部署在任何服务器上，proxy 只负责向 etcd 集群进行消息转发。
- 核心节点(peer):     核心节点都参与选举，由 3 个以上的 peer 节点组成 etcd 集群，建议部署在独立服务器上，peer 节点对服务器性能消耗较大。



```shell
NETWORK="etcd_cluster"
REGISTRY=quay.io/coreos/etcd

TOKEN=metcd-token
CLUSTER_STATE=new
NAME_1=etcd0
NAME_2=etcd1
NAME_3=etcd2
HOST_1=10.1.1.10
HOST_2=10.1.1.11
HOST_3=10.1.1.12
CLUSTER=${NAME_1}=http://${HOST_1}:2380,${NAME_2}=http://${HOST_2}:2380,${NAME_3}=http://${HOST_3}:2380

# PROXY
THIS_IP=10.1.1.13
THIS_NAME=etcd-proxy
CLIENT_PORT=23790
sudo docker run -itd \
  -p ${CLIENT_PORT}:2379 \
	--restart=always \
	--ip ${THIS_IP} \
	--network ${NETWORK} \
	--hostname ${THIS_NAME} \
	--name ${THIS_NAME} ${REGISTRY}:latest \
  /usr/local/bin/etcd \
  --name ${THIS_NAME} \
  --proxy on  \
  --listen-client-urls http://${THIS_IP}:2379,http://127.0.0.1:2379 \
  --initial-cluster ${CLUSTER} \
  --initial-cluster-state ${CLUSTER_STATE} \
	--initial-cluster-token ${TOKEN}
```

### v3 grpc proxy

```shell
NETWORK="etcd_cluster"
REGISTRY=quay.io/coreos/etcd

HOST_1=10.1.1.10
HOST_2=10.1.1.11
HOST_3=10.1.1.12
ENDPOINTS=${HOST_1}:2379,${HOST_2}:2379,${HOST_3}:2379

# 单代理
# ./etcd grpc-proxy start --endpoints=${ENDPOINTS} --listen-addr=127.0.0.1:2379

# 多代理
# ./etcd grpc-proxy start --endpoints=${ENDPOINTS} --listen-addr=127.0.0.1:2379 --advertise-client-url=127.0.0.1:2379 --resolver-prefix="___grpc_proxy_endpoint" --resolver-ttl=60

# GRPC PROXY0
THIS_IP=10.1.1.20
THIS_NAME=etcd-proxy0
CLIENT_PORT=2379
sudo docker run -itd \
  -p ${CLIENT_PORT}:2379 \
	--restart=always \
	--ip ${THIS_IP} \
	--network ${NETWORK} \
	--hostname ${THIS_NAME} \
	--name ${THIS_NAME} ${REGISTRY}:latest \
  /usr/local/bin/etcd grpc-proxy start --endpoints=${ENDPOINTS} \
  --listen-addr=0.0.0.0:2379 \
	--advertise-client-url=0.0.0.0:2379 \
  --resolver-prefix="___grpc_proxy_endpoint" \
  --resolver-ttl=60
```

