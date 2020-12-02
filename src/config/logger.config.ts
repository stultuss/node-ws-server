import * as LibPath from "path";
import {ILoggerConfig, LoggerLevels} from '../common/logger/LoggerManager';

export const loggerConfig: ILoggerConfig = {
    level: process.env.LOGGER_LEVEL || LoggerLevels.debug,
    dir: LibPath.resolve(__dirname, '..', '..', 'logs'),
};
