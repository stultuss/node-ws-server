"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErrorFormat = void 0;
const Utility_1 = require("../Utility");
const exception_config_1 = require("../../config/exception.config");
class ErrorFormat extends Error {
    /**
     * Construction, convert exception data from ErrorFormat format to Error format.
     *
     * @param {number} code
     * @param {any} argus default null, means no params given
     */
    constructor(code, ...argus) {
        super();
        this.code = code;
        this.message = this._formatMessage(argus);
    }
    /**
     * Get formatted error message.
     *
     * @param {any[]} argus
     * @return {string}
     */
    _formatMessage(argus) {
        return Utility_1.CommonTools.format((exception_config_1.ERROR_CODE.hasOwnProperty(this.code) ? exception_config_1.ERROR_CODE[this.code] : '%s'), ...argus);
    }
}
exports.ErrorFormat = ErrorFormat;
