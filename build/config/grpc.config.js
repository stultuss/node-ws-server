"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.grpcConfig = void 0;
exports.grpcConfig = {
    host: process.env.GRPC_HOST || '0.0.0.0',
    port: Number(process.env.GRPC_PORT) || 50051,
};
