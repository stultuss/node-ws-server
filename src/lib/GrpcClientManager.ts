import * as grpc from 'grpc';
import {CommonTools} from '../common/Utility';
import {PacketModel} from '../model/packet/PacketModel';
import {GrpcServerImpl} from '../service/grpc.service';
import {SendPacketRequest, SendPacketResponse} from '../proto/packet_pb';
import {SendPacketClient, SendPacketService} from '../proto/packet_grpc_pb';
import {grpcConfig} from '../config/grpc.config';

export interface IGrpcConfig {
    host: string,
    port: number
}

export class GrpcClientManager {
    private static _instance: GrpcClientManager;
    private _conns: Map<string, SendPacketClient>;

    public static instance(): GrpcClientManager {
        if (GrpcClientManager._instance === undefined) {
            GrpcClientManager._instance = new GrpcClientManager();
        }
        return GrpcClientManager._instance;
    }

    private constructor() {
        this._conns = new Map<string, SendPacketClient>();
        
        // 创建 Grpc 服务器
        const server = new grpc.Server();
        server.addService(SendPacketService, new GrpcServerImpl());
        server.bind(`${grpcConfig.host}:${grpcConfig.port}`, grpc.ServerCredentials.createInsecure());
        server.start();
    }
    
    public static get grpcAddress(): string {
        return `${CommonTools.eth0()}:${grpcConfig.port}`;
    }
    
    /**
     * 连接远程 Grpc 服务节点
     *
     * @param address
     */
    public connect(address: string): SendPacketClient {
        // 判断是否本机，如果是则跳过
        if (address == GrpcClientManager.grpcAddress) {
            return;
        }
        
        // 判断连接是否已经存在，存在则不需要重连
        let conn = this._conns.get(address);
        if (conn) {
            return conn;
        }
        
        // 创建 grpc 连接
        conn = new SendPacketClient(address, grpc.credentials.createInsecure());
        this._conns.set(address, conn);
    
        CommonTools.logger(`[grpc] Client: ${address} connected!`);
        
        return conn;
    }
    
    /**
     * 断开远程 Grpc 服务节点
     *
     * @param address
     */
    public disconnect(address: string) {
        // 判断连接是否已经存在，存在则不需要重连
        let conn = this._conns.get(address);
        if (!conn) {
            return;
        }
        
        // 关闭 grpc 连接
        conn.close();
        
        // 删除 grpc 连接
        this._conns.delete(address);
    }
    
    
    public forwarding(address: string, packet?: PacketModel) {
        // 获取 grpc 连接
        let conn = this.connect(address);
        if (conn == null) {
            return null; // 本机不需要发送。
        }
    
        // 创建消息体
        const request = new SendPacketRequest();
        request.setPacket(packet.format());
        conn.sendPacket(request, (err, res: SendPacketResponse) => {
            if (err != null) {
                CommonTools.logger(`[grpc] Send Error, message: ${err.message}`);
            } else if (res.getCode() > 0) {
                CommonTools.logger(`[grpc] Packet Error, code: ${res.getCode()} message: ${res.getMsg()}`);
            }
        });
    }

    public forwardingAll(packet: PacketModel) {
        for (let ip of Array.from(this._conns.keys())) {
            this.forwarding(ip, packet)
        }
    }
}