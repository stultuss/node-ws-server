import server from './server';


// 初始化服务器
server.init().then(() => {
    // 启动服务器
    server.start();
}).catch((err) => {
    // 捕获启动报错
    console.error(`process init failed error = ${err}`);
});

process.on('uncaughtException', (err) => {
    console.error(`process on uncaughtException error = ${err}`);
});

process.on('unhandledRejection', (err) => {
    console.error(`process on unhandledRejection error = ${err}`);
});

process.on('SIGINT', () => {
    console.warn('process shutdown by SIGINT');
    process.exit(0);
});
