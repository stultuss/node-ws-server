nohup /tmp/etcd/etcd  \
     -name proxy \
     -proxy on  \
     -listen-client-urls http://0.0.0.0:2370  \
     -discovery https://discovery.etcd.io/9c7d8d23b7d883e5a3348ae66fc85ec7 >> /tmp/etcd/output.log 2>&1 & echo $! > run.pid

node ./build/index.js