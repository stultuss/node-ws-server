"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.serverConfig = void 0;
exports.serverConfig = {
    env: (process.env.NODE_ENV) ? process.env.NODE_ENV : 'development',
    mode: (process.env.NODE_ENV) ? process.env.MODE : 'default',
    name: 'im',
    host: '0.0.0.0',
    port: Number(process.env.PORT) || 8080,
    secret: {
        system: (process.env.NODE_ENV) ? process.env.SECRET_SYSTEM : 'Y#K&D*H.sys',
        player: (process.env.NODE_ENV) ? process.env.SECRET_PLAYER : 'Y#K&D*H.ply',
    }
};
