import {IEtcdConfig} from '../lib/EtcdClientManger';

export const etcdConfig: IEtcdConfig = {
    host: process.env.ETCD_HOST || '148.70.218.120',
    port: Number(process.env.ETCD_PORT) ||80,
    timeout: 30 // etcd key 过期时间，单位：秒
};