import * as _ from 'underscore';

import {ErrorCode} from '../../config/ErrorCode';

type PacketType = number;
type PacketFromType = number;
type PacketRequestId = number;
type PacketBody = any;
type PacketHeader = [PacketType, PacketFromType, PacketRequestId]; // type, fromType, requestId
type PacketMessage = [PacketHeader, PacketBody]

class PacketModel {
    private _type: PacketType;
    private _fromType: PacketFromType;
    private _requestId: PacketRequestId;
    private _body: PacketBody;

    constructor() {
        // do nothing
    }

    public get type(): PacketType {
        return this._type;
    }

    public get fromType(): PacketFromType {
        return this._fromType;
    }

    public get requestId(): PacketRequestId {
        return this._requestId;
    }

    public get body(): PacketBody {
        return this._body;
    }

    /**
     * 解析 Message
     *
     * @param {string} message
     * @return {PacketModel}
     */
    public static parse(message: string): PacketModel {
        let packetMessage: PacketMessage = JSON.parse(message);

        // 验证消息结构
        if (!_.isArray(packetMessage) || packetMessage.length !== 2) {
            throw ErrorCode.IM_ERROR_CODE_PACKET_READ;
        }

        // 验证消息header
        let header: PacketHeader = packetMessage[0];
        if (!_.isArray(header) || header.length !== 3) {
            throw ErrorCode.IM_ERROR_CODE_PACKET_HEADER;
        }

        // 验证消息body
        let body: PacketBody = packetMessage[1];
        if (!_.isObject(body)) {
            throw ErrorCode.IM_ERROR_CODE_PACKET_BODY;
        }

        let packet = new PacketModel();
        packet._type = header[0];
        packet._fromType = header[1];
        packet._requestId = header[2];
        packet._body = body;
        return packet;
    }

    /**
     * 创建一个 Packet
     *
     * @param {PacketType} type
     * @param {PacketFromType} fromType
     * @param {PacketRequestId} requestId
     * @param {PacketBody} body
     * @return {PacketModel}
     */
    public static create(type: PacketType, fromType: PacketFromType, requestId: PacketRequestId, body: PacketBody): PacketModel {
        let packet = new PacketModel();
        packet._type = type;
        packet._fromType = fromType;
        packet._requestId = requestId;
        packet._body = body;
        return packet;
    }

    /**
     * 格式化数据
     *
     * @return {string}
     */
    public format(): string {
        let header: PacketHeader = [this.type, this.fromType, this.requestId];
        let body: PacketBody = this.body;
        let message: PacketMessage = [header, body];
        return JSON.stringify(message);
    }
}

export default PacketModel;