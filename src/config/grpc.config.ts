import {IGrpcConfig} from '../lib/GrpcClientManager';

export const grpcConfig: IGrpcConfig = {
    host: process.env.GRPC_HOST || '0.0.0.0',
    port: Number(process.env.GRPC_PORT) ||50051,
};