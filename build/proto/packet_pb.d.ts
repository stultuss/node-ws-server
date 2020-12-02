// package: com.packet
// file: packet.proto

import * as jspb from 'google-protobuf';

export class SendPacketRequest extends jspb.Message {
  getPacket(): string;
  setPacket(value: string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): SendPacketRequest.AsObject;
  static toObject(includeInstance: boolean, msg: SendPacketRequest): SendPacketRequest.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: SendPacketRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): SendPacketRequest;
  static deserializeBinaryFromReader(message: SendPacketRequest, reader: jspb.BinaryReader): SendPacketRequest;
}

export namespace SendPacketRequest {
  export type AsObject = {
    packet: string,
  }
}

export class SendPacketResponse extends jspb.Message {
  getCode(): number;
  setCode(value: number): void;

  getMsg(): string;
  setMsg(value: string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): SendPacketResponse.AsObject;
  static toObject(includeInstance: boolean, msg: SendPacketResponse): SendPacketResponse.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: SendPacketResponse, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): SendPacketResponse;
  static deserializeBinaryFromReader(message: SendPacketResponse, reader: jspb.BinaryReader): SendPacketResponse;
}

export namespace SendPacketResponse {
  export type AsObject = {
    code: number,
    msg: string,
  }
}

