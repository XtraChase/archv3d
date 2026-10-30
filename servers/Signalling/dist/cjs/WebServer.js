"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebServer = void 0;
// Copyright Epic Games, Inc. All Rights Reserved.
const express_1 = __importDefault(require("express"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const http_1 = __importDefault(require("http"));
const https_1 = __importDefault(require("https"));
const helmet_1 = __importDefault(require("helmet"));
const Logger_1 = require("./Logger");
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
const hsts = require('hsts');
/**
 * An object to manage the initialization of a web server. Used to serve the
 * pixel streaming frontend.
 */
class WebServer {
    constructor(app, config) {
        Logger_1.Logger.debug('Starting WebServer with config: %s', config);
        // only listen on the http port if we're not using https or if we want to redirect
        if (!config.httpsPort || config.https_redirect) {
            this.httpServer = http_1.default.createServer(app);
            this.httpServer.listen(config.httpPort, () => {
                Logger_1.Logger.info(`Http server listening on port ${config.httpPort}`);
            });
        }
        /* eslint-disable @typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-member-access */
        // if using https listen on the given ports and setup some details
        if (config.httpsPort) {
            const options = { key: config.ssl_key, cert: config.ssl_cert };
            this.httpsServer = https_1.default.createServer(options, app);
            this.httpsServer.listen(config.httpsPort, () => {
                Logger_1.Logger.info(`Https server listening on port ${config.httpsPort}`);
            });
            app.use((0, helmet_1.default)({
                contentSecurityPolicy: {
                    directives: {
                        'connect-src': ['*', "'self'"]
                    }
                }
            }));
            app.use(hsts({
                maxAge: 15552000 // 180 days in seconds
            }));
            // Setup http -> https redirect if requested
            if (config.https_redirect) {
                app.use((req, res, next) => {
                    if (!req.secure) {
                        if (req.get('Host')) {
                            const hostAddressParts = req.get('Host').split(':');
                            let hostAddress = hostAddressParts[0];
                            if (config.httpsPort != 443) {
                                hostAddress = `${hostAddress}:${config.httpsPort}`;
                            }
                            // eslint-disable-next-line @typescript-eslint/no-unsafe-return
                            return res.redirect(['https://', hostAddress, req.originalUrl].join(''));
                        }
                        else {
                            Logger_1.Logger.error(`Unable to get host name from header. Requestor ${req.ip}, url path: '${req.originalUrl}', available headers ${JSON.stringify(req.headers)}`);
                            // eslint-disable-next-line @typescript-eslint/no-unsafe-return
                            return res.status(400).send('Bad Request');
                        }
                    }
                    next();
                });
            }
        }
        app.use(express_1.default.static(config.root));
        const limiter = (0, express_rate_limit_1.default)({
            windowMs: 60 * 1000, // 1 minute
            max: config.perMinuteRateLimit ? config.perMinuteRateLimit : 3000
        });
        // apply rate limiter to all requests
        app.use(limiter);
        // Request has been sent to site root, send the homepage file
        app.get('/', function (req, res) {
            // Try a few paths, see if any resolve to a homepage file the user has set
            const p = path_1.default.resolve(path_1.default.join(config.root, config.homepageFile));
            if (fs_1.default.existsSync(p)) {
                // Send the file for browser to display it
                res.sendFile(p);
                return;
            }
            // Catch file doesn't exist, and send back 404 if not
            const error = 'Unable to locate file ' + config.homepageFile;
            Logger_1.Logger.error(error);
            res.status(404).send(error);
            return;
        });
        /* eslint-enable @typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-member-access */
    }
}
exports.WebServer = WebServer;
//# sourceMappingURL=WebServer.js.map