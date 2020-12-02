import {IRedisConfig} from '../common/cache/CacheFactory.class';

// fixme: 目前仅实现 redis 的封装，并且 redis 已经可以有集群的功能了，不再需要配置多个 redis。 后期如果增加 memcache，可进行实现。
export const cacheType = 'Redis';
export const cacheConfig: Array<IRedisConfig> = [{
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: Number(process.env.REDIS_PORT) || 6379,
    options: {
        connect_timeout: 36000000,
        retry_delay: 2000
    }
}];

// 根据 ENV 增加密码
if (process.env.REDIS_PWD) {
    for (let config of cacheConfig) {
        config.options.password = process.env.REDIS_PWD;
    }
}

// 正常删除操作
// redis-cli -h 127.0.0.1 keys "demo:*" | xargs redis-cli -h 127.0.0.1 del

// 集群删除处理
// redis-cli -h 127.0.0.1 cluster nodes
// redis-cli -h 127.0.0.1 keys "demo:*" f0016c286197501b86828ba6678365018c4a1f73
// redis-cli -h 127.0.0.1 keys "demo:*" f0016c286197501b86828ba6678365018c4a1f73 | xargs -i redis-cli -h 127.0.0.1 del {}