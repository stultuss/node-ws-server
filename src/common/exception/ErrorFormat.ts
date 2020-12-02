import {CommonTools} from '../Utility';
import {ERROR_CODE} from '../../config/exception.config';

export class ErrorFormat extends Error {
  /**
   * 自定义错误代码
   */
  public code: number;
  
  /**
   * 自定义错误文本，通过 formatMessage 格式化过
   */
  public message: string;
  
  /**
   * Construction, convert exception data from ErrorFormat format to Error format.
   *
   * @param {number} code
   * @param {any} argus default null, means no params given
   */
  constructor(code: number, ...argus) {
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
  private _formatMessage(argus: any[]): string {
    return CommonTools.format((ERROR_CODE.hasOwnProperty(this.code) ? ERROR_CODE[this.code] : '%s'), ...argus);
  }
}