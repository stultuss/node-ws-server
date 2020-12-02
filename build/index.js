"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const server_1 = require("./server");
// 初始化服务器
server_1.default.init().then(() => {
    // 启动服务器
    server_1.default.start();
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
