import express from 'express';
import http from 'http';
import https from 'https';
/**
 * An interface that describes the possible options to pass to
 * WebServer.
 */
export interface IWebServerConfig {
    httpPort: number;
    root: string;
    homepageFile: string;
    perMinuteRateLimit?: number;
    httpsPort?: number;
    ssl_key?: Buffer;
    ssl_cert?: Buffer;
    https_redirect?: boolean;
}
/**
 * An object to manage the initialization of a web server. Used to serve the
 * pixel streaming frontend.
 */
export declare class WebServer {
    httpServer: http.Server | undefined;
    httpsServer: https.Server | undefined;
    constructor(app: express.Express, config: IWebServerConfig);
}
