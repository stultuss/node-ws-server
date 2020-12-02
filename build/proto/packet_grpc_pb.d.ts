// package: com.packet
// file: packet.proto

import * as grpc from 'grpc';
import * as packet_pb from './packet_pb';

interface ISendPacketService extends grpc.ServiceDefinition<grpc.UntypedServiceImplementation> {
  sendPacket: ISendPacketService_ISendPacket;
}

interface ISendPacketService_ISendPacket {
  path: string; // "/com.packet.SendPacket/SendPacket"
  requestStream: boolean; // false
  responseStream: boolean; // false
  requestSerialize: grpc.serialize<packet_pb.SendPacketRequest>;
  requestDeserialize: grpc.deserialize<packet_pb.SendPacketRequest>;
  responseSerialize: grpc.serialize<packet_pb.SendPacketResponse>;
  responseDeserialize: grpc.deserialize<packet_pb.SendPacketResponse>;
}

export const SendPacketService: ISendPacketService;
export interface ISendPacketServer {
  sendPacket: grpc.handleUnaryCall<packet_pb.SendPacketRequest, packet_pb.SendPacketResponse>;
}

export interface ISendPacketClient {
  sendPacket(request: packet_pb.SendPacketRequest, callback: (error: Error | null, response: packet_pb.SendPacketResponse) => void): grpc.ClientUnaryCall;
  sendPacket(request: packet_pb.SendPacketRequest, metadata: grpc.Metadata, callback: (error: Error | null, response: packet_pb.SendPacketResponse) => void): grpc.ClientUnaryCall;
}

export class SendPacketClient extends grpc.Client implements ISendPacketClient {
  constructor(address: string, credentials: grpc.ChannelCredentials, options?: object);
  public sendPacket(request: packet_pb.SendPacketRequest, callback: (error: Error | null, response: packet_pb.SendPacketResponse) => void): grpc.ClientUnaryCall;
  public sendPacket(request: packet_pb.SendPacketRequest, metadata: grpc.Metadata, callback: (error: Error | null, response: packet_pb.SendPacketResponse) => void): grpc.ClientUnaryCall;
}

