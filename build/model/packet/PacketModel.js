"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PacketModel = void 0;
const _ = require("underscore");
const PacketCode_1 = require("./PacketCode");
class PacketModel {
    constructor() {
        // do nothing
    }
    get type() {
        return this._type;
    }
    get fromType() {
        return this._fromType;
    }
    get requestId() {
        return this._requestId;
    }
    get body() {
        return this._body;
    }
    /**
     * 解析 Message
     *
     * @param {string} message
     * @return {PacketModel}
     */
    static parse(message) {
        let packetMessage = JSON.parse(message);
        // 验证消息结构
        if (!_.isArray(packetMessage) || packetMessage.length !== 2) {
            throw PacketCode_1.PacketCode.IM_ERROR_CODE_PACKET_READ;
        }
        // 验证消息header
        let header = packetMessage[0];
        if (!_.isArray(header) || header.length !== 3) {
            throw PacketCode_1.PacketCode.IM_ERROR_CODE_PACKET_HEADER;
        }
        // 验证消息body
        let body = packetMessage[1];
        if (!_.isObject(body)) {
            throw PacketCode_1.PacketCode.IM_ERROR_CODE_PACKET_BODY;
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
    static create(type, fromType, requestId, body) {
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
    format() {
        let header = [this.type, this.fromType, this.requestId];
        let body = this.body;
        let message = [header, body];
        return JSON.stringify(message);
    }
}
exports.PacketModel = PacketModel;
