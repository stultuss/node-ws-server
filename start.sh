nohup /tmp/etcd/etcd  \
     -name proxy \
     -proxy on  \
     -listen-client-urls http://0.0.0.0:2370  \
     -discovery https://discovery.etcd.io/5650d15aed71d2daf1cfdae60d52f498 >> /tmp/etcd/output.log 2>&1 & echo $! > run.pid

node ./build/index.js