"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loggerConfig = void 0;
const LibPath = require("path");
exports.loggerConfig = {
    level: process.env.LOGGER_LEVEL || "debug" /* debug */,
    dir: LibPath.resolve(__dirname, '..', '..', 'logs'),
};
