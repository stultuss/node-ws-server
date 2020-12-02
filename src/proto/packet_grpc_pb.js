// GENERATED CODE -- DO NOT EDIT!

'use strict';
var grpc = require('grpc');
var packet_pb = require('./packet_pb.js');

function serialize_com_packet_SendPacketRequest(arg) {
  if (!(arg instanceof packet_pb.SendPacketRequest)) {
    throw new Error('Expected argument of type com.packet.SendPacketRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_com_packet_SendPacketRequest(buffer_arg) {
  return packet_pb.SendPacketRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_com_packet_SendPacketResponse(arg) {
  if (!(arg instanceof packet_pb.SendPacketResponse)) {
    throw new Error('Expected argument of type com.packet.SendPacketResponse');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_com_packet_SendPacketResponse(buffer_arg) {
  return packet_pb.SendPacketResponse.deserializeBinary(new Uint8Array(buffer_arg));
}


var SendPacketService = exports.SendPacketService = {
  sendPacket: {
    path: '/com.packet.SendPacket/SendPacket',
    requestStream: false,
    responseStream: false,
    requestType: packet_pb.SendPacketRequest,
    responseType: packet_pb.SendPacketResponse,
    requestSerialize: serialize_com_packet_SendPacketRequest,
    requestDeserialize: deserialize_com_packet_SendPacketRequest,
    responseSerialize: serialize_com_packet_SendPacketResponse,
    responseDeserialize: deserialize_com_packet_SendPacketResponse,
  },
};

exports.SendPacketClient = grpc.makeGenericClientConstructor(SendPacketService);
