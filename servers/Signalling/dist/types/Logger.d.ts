import winston from 'winston';
import 'winston-daily-rotate-file';
/**
 * The actual logger object. This is just a winston logger.
 * You can use InitLogging to get a decent result, or you can
 * completely create your own winston logger and assign it.
 */
export declare let Logger: winston.Logger;
export interface IConfig {
    logDir?: string;
    logMessagesToConsole?: string;
    logLevelConsole?: string;
    logLevelFile?: string;
}
/**
 * Call this as early as possible to setup the logging module with your
 * preferred settings.
 * @param config - The settings to init the logger with. See IConfig interface
 */
export declare function InitLogging(config: IConfig): void;
