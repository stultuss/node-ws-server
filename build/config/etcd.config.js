"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.etcdConfig = void 0;
exports.etcdConfig = {
    host: process.env.ETCD_HOST || '148.70.218.120',
    port: Number(process.env.ETCD_PORT) || 80,
    timeout: 30 // etcd key 过期时间，单位：秒
};
