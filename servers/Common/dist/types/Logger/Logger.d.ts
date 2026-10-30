declare global {
    interface Window {
        loggerContext: LoggerContext;
    }
}
export declare enum LogLevel {
    Disabled = 0,
    Error = 1,
    Warning = 2,
    Info = 3,
    Debug = 4
}
/**
 * The global context for the logger configuration.
 * This cannot be stored statically in the Logger class because we sometimes have multiple execution
 * contexts, such as stats reporting. Instead we store the logger config context on the window object
 * to be shared with any Logger instances.
 */
export declare class LoggerContext {
    logLevel: LogLevel;
    includeStack: boolean;
}
export interface ILogger {
    InitLogging(logLevel: number, includeStack: boolean): void;
    Debug(message: string): void;
    Info(message: string): void;
    Warning(message: string): void;
    Error(message: string): void;
}
export declare function overrideLogger(logger: ILogger): void;
/**
 * A basic console logger utilized by the Pixel Streaming frontend to allow
 * logging to the browser console.
 */
export declare class LoggerType implements ILogger {
    context?: LoggerContext;
    /**
     * Set the log verbosity level
     */
    InitLogging(logLevel: number, includeStack: boolean): void;
    /**
     * Logging output for debugging
     * @param message - the message to be logged
     */
    Debug(message: string): void;
    /**
     * Basic logging output for standard messages
     * @param message - the message to be logged
     */
    Info(message: string): void;
    /**
     * Logging for warnings
     * @param message - the message to be logged
     */
    Warning(message: string): void;
    /**
     * Error logging
     * @param message - the message to be logged
     */
    Error(message: string): void;
    /**
     * The common log function that all other log functions call to.
     * @param level - the level of this log message.
     * @param stack - an optional stack trace string from where the log message was called.
     * @param message - the message to be logged.
     */
    private CommonLog;
    /**
     * Captures the stack and returns it
     * @returns the current stack
     */
    private GetStackTrace;
    /**
     * Since there can be multiple execution contexts, (stats reporting and some webxr logging comes from
     * different execution contexts we can end up with multiple static Logger instances. Here we try to
     * work around it by storing the context on the window object.
     */
    private ValidateContext;
}
export declare let Logger: ILogger;
