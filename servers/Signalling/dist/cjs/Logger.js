"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Logger = void 0;
exports.InitLogging = InitLogging;
// Copyright Epic Games, Inc. All Rights Reserved.
const Utils_1 = require("./Utils");
const path_1 = __importDefault(require("path"));
const winston_1 = __importDefault(require("winston"));
require("winston-daily-rotate-file");
const lib_pixelstreamingcommon_ue5_7_1 = require("@epicgames-ps/lib-pixelstreamingcommon-ue5.7");
const { combine, timestamp, printf, colorize, splat } = winston_1.default.format;
/**
 * The actual logger object. This is just a winston logger.
 * You can use InitLogging to get a decent result, or you can
 * completely create your own winston logger and assign it.
 */
exports.Logger = createDefaultLogger();
/**
 * A wrapper for the log calls in Common lib
 */
class CommonLogger {
    constructor(winstonLogger) {
        this.logger = winstonLogger;
    }
    InitLogging(_logLevel, _includeStack) { }
    Debug(message) {
        this.logger.debug(message);
    }
    Info(message) {
        this.logger.info(message);
    }
    Warning(message) {
        this.logger.warn(message);
    }
    Error(message) {
        this.logger.error(message);
    }
}
/**
 * Call this as early as possible to setup the logging module with your
 * preferred settings.
 * @param config - The settings to init the logger with. See IConfig interface
 */
function InitLogging(config) {
    const logDir = config.logDir || 'logs';
    const logLevelConsole = config.logLevelConsole || 'info';
    const logLevelFile = config.logLevelFile || 'info';
    logMessagesToConsole = config.logMessagesToConsole || 'none';
    exports.Logger = winston_1.default.createLogger({
        transports: [createConsoleTransport(logLevelConsole), createFileTransport(logDir, logLevelFile)]
    });
    const commonLogger = new CommonLogger(exports.Logger);
    (0, lib_pixelstreamingcommon_ue5_7_1.overrideLogger)(commonLogger);
}
let logMessagesToConsole = 'none';
function createDefaultLogger() {
    return winston_1.default.createLogger({
        level: 'info',
        format: winston_1.default.format.cli(),
        transports: [new winston_1.default.transports.Console()]
    });
}
function createConsoleTransport(logLevel) {
    return new winston_1.default.transports.Console({
        level: logLevel,
        format: combine(createProtoMessageFilter()(), timestamp({ format: 'HH:mm:ss.SSS' }), colorize(), splat(), createConsoleFormat())
    });
}
function isLogObject(object) {
    /* eslint-disable @typescript-eslint/no-unsafe-member-access */
    return ('event' in object &&
        object.event == 'proto_message' &&
        'direction' in object &&
        'protoMessage' in object);
    /* eslint-enable @typescript-eslint/no-unsafe-member-access */
}
function createConsoleFormat() {
    return printf((logObj) => {
        const prefix = `[${String(logObj['timestamp'])}] ${logObj.level}: `;
        if (typeof logObj.message === 'string') {
            return prefix + logObj.message;
        }
        else if (isLogObject(logObj.message)) {
            const { direction, receiver, sender, target, protoMessage } = logObj.message;
            switch (direction) {
                case 'incoming':
                    return prefix + `> ${receiver} :: ${formatMessageForConsole(protoMessage)}`;
                case 'outgoing':
                    return prefix + `< ${sender} :: ${formatMessageForConsole(protoMessage)}`;
                case 'forward':
                    return prefix + `${receiver} > ${target} :: ${formatMessageForConsole(protoMessage)}`;
                default:
                    return prefix + `Unknown proto direction: ${direction}`;
            }
        }
        return '';
    });
}
function formatMessageForConsole(message) {
    switch (logMessagesToConsole) {
        case 'verbose':
            return (0, Utils_1.stringify)(message);
        case 'formatted':
            return (0, Utils_1.beautify)(message);
        default:
            return `[${message.type}]`;
    }
}
function createProtoMessageFilter() {
    return winston_1.default.format((info, _opts) => {
        if (typeof info.message !== 'string' && isLogObject(info.message) && logMessagesToConsole == 'none') {
            return false;
        }
        return info;
    });
}
function createFileTransport(logDirPath, logLevel) {
    return new winston_1.default.transports.DailyRotateFile({
        level: logLevel,
        filename: path_1.default.join(logDirPath, 'server-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        maxFiles: '14d',
        format: combine(timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }), splat(), createFileFormat())
    });
}
function createFileFormat() {
    return printf((logObj) => {
        if (typeof logObj.message === 'string') {
            const { timestamp, level, message } = logObj;
            return JSON.stringify({
                timestamp,
                level,
                event: 'message',
                message
            });
        }
        else if (isLogObject(logObj.message)) {
            const { timestamp, level, message } = logObj;
            return JSON.stringify(Object.assign({ timestamp,
                level }, message));
        }
        return '';
    });
}
//# sourceMappingURL=Logger.js.map