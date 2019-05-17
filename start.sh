nohup /tmp/etcd/etcd  \
     -name proxy \
     -proxy on  \
     -listen-client-urls http://0.0.0.0:2370  \
     -discovery https://discovery.etcd.io/cfd40877b86a7fb9708f966f85e6a0e1 >> /tmp/etcd/output.log 2>&1 & echo $! > run.pid

node ./build/index.js