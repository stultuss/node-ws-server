ETCD_VER=v3.2.0-rc.0
ETCD_DIR=/tmp/etcd

rm -rf ${ETCD_DIR} && mkdir -p ${ETCD_DIR}

tar xzvf ./bin/etcd-${ETCD_VER}-linux-amd64.tar.gz -C ${ETCD_DIR} --strip-components=1

/tmp/etcd/etcd --version