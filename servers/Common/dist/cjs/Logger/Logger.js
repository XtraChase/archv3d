"use strict";
// Copyright Epic Games, Inc. All Rights Reserved.
Object.defineProperty(exports, "__esModule", { value: true });
exports.Logger = exports.LoggerType = exports.LoggerContext = exports.LogLevel = void 0;
exports.overrideLogger = overrideLogger;
var LogLevel;
(function (LogLevel) {
    LogLevel[LogLevel["Disabled"] = 0] = "Disabled";
    LogLevel[LogLevel["Error"] = 1] = "Error";
    LogLevel[LogLevel["Warning"] = 2] = "Warning";
    LogLevel[LogLevel["Info"] = 3] = "Info";
    LogLevel[LogLevel["Debug"] = 4] = "Debug";
})(LogLevel || (exports.LogLevel = LogLevel = {}));
/**
 * The global context for the logger configuration.
 * This cannot be stored statically in the Logger class because we sometimes have multiple execution
 * contexts, such as stats reporting. Instead we store the logger config context on the window object
 * to be shared with any Logger instances.
 */
class LoggerContext {
    constructor() {
        this.logLevel = LogLevel.Debug;
        this.includeStack = true;
    }
}
exports.LoggerContext = LoggerContext;
function overrideLogger(logger) {
    exports.Logger = logger;
}
/**
 * A basic console logger utilized by the Pixel Streaming frontend to allow
 * logging to the browser console.
 */
class LoggerType {
    /**
     * Set the log verbosity level
     */
    InitLogging(logLevel, includeStack) {
        this.ValidateContext();
        this.context.logLevel = logLevel;
        this.context.includeStack = includeStack;
    }
    /**
     * Logging output for debugging
     * @param message - the message to be logged
     */
    Debug(message) {
        this.ValidateContext();
        if (this.context.logLevel >= LogLevel.Debug) {
            this.CommonLog('Debug', message);
        }
    }
    /**
     * Basic logging output for standard messages
     * @param message - the message to be logged
     */
    Info(message) {
        this.ValidateContext();
        if (this.context.logLevel >= LogLevel.Info) {
            this.CommonLog('Info', message);
        }
    }
    /**
     * Logging for warnings
     * @param message - the message to be logged
     */
    Warning(message) {
        this.ValidateContext();
        if (this.context.logLevel >= LogLevel.Warning) {
            this.CommonLog('Warning', message);
        }
    }
    /**
     * Error logging
     * @param message - the message to be logged
     */
    Error(message) {
        this.ValidateContext();
        if (this.context.logLevel >= LogLevel.Error) {
            this.CommonLog('Error', message);
        }
    }
    /**
     * The common log function that all other log functions call to.
     * @param level - the level of this log message.
     * @param stack - an optional stack trace string from where the log message was called.
     * @param message - the message to be logged.
     */
    CommonLog(level, message) {
        let logMessage = `[${level}] - ${message}`;
        if (this.context.includeStack) {
            logMessage += `\nStack: ${this.GetStackTrace()}`;
        }
        if (level === 'Error') {
            console.error(logMessage);
        }
        else if (level === 'Warning') {
            console.warn(logMessage);
        }
        else {
            console.log(logMessage);
        }
    }
    /**
     * Captures the stack and returns it
     * @returns the current stack
     */
    GetStackTrace() {
        const error = new Error();
        let formattedStack = 'No Stack Available for this browser';
        // format the error
        if (error.stack) {
            formattedStack = error.stack.toString().replace(/Error/g, '');
        }
        return formattedStack;
    }
    /**
     * Since there can be multiple execution contexts, (stats reporting and some webxr logging comes from
     * different execution contexts we can end up with multiple static Logger instances. Here we try to
     * work around it by storing the context on the window object.
     */
    ValidateContext() {
        if (!this.context) {
            if (typeof window == 'undefined' || !window) {
                // no window object so we can only store a local context.
                this.context = new LoggerContext();
            }
            else if (!window.loggerContext) {
                this.context = new LoggerContext();
                window.loggerContext = this.context;
            }
            else {
                this.context = window.loggerContext;
            }
        }
    }
}
exports.LoggerType = LoggerType;
exports.Logger = new LoggerType();
//# sourceMappingURL=Logger.js.map