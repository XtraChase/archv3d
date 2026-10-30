"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// Copyright Epic Games, Inc. All Rights Reserved.
const express_1 = __importDefault(require("express"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const lib_pixelstreamingsignalling_ue5_7_1 = require("@epicgames-ps/lib-pixelstreamingsignalling-ue5.7");
const Utils_1 = require("./Utils");
const InputHandler_1 = require("./InputHandler");
const commander_1 = require("commander");
const express_openapi_1 = require("express-openapi");
// eslint-disable-next-line  @typescript-eslint/no-unsafe-assignment
const pjson = require('../package.json');
/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument */
// possible config file options
let config_file = {};
const configArgsParser = new commander_1.Command()
    .option('--no_config', 'Skips the reading of the config file. Only CLI options will be used.', false)
    .option('--config_file <path>', 'Sets the path of the config file.', `${path_1.default.resolve(__dirname, '..', 'config.json')}`)
    .helpOption(false)
    .allowUnknownOption() // ignore unknown options as we are doing a minimal parse here
    .parse()
    .opts();
// If we do not get passed `--no_config` then attempt open the config file
if (!configArgsParser.no_config) {
    try {
        if (fs_1.default.existsSync(configArgsParser.config_file)) {
            console.log(`Config file configured as: ${configArgsParser.config_file}`);
            const configData = fs_1.default.readFileSync(configArgsParser.config_file, { encoding: 'utf8' });
            config_file = JSON.parse(configData);
        }
        else {
            // Even though proper logging is not intialized, logging here is better than nothing.
            console.log(`No config file found at: ${configArgsParser.config_file}`);
        }
    }
    catch (error) {
        console.error(error);
    }
}
const program = new commander_1.Command();
program
    .name('node dist/index.js')
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    .description(pjson.description)
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    .version(pjson.version);
// For any switch that doesn't take an argument, like --serve, its important to give it a default value.
// Without the default, not supplying the default will mean the option is `undefined` in
// `cli_option`s` and loading from the configuration file will not work as intended.
// The way the configuration file works is that if it is found it will parsed for key/values that match
// the argument names specified below. If one is found it will become the new default value for that option.
// This allow the user to have values in the configuration file but also override them by specifying an argument on the command line.
program
    .option('--log_folder <path>', 'Sets the path for the log files.', config_file.log_folder || 'logs')
    .addOption(new commander_1.Option('--log_level_console <level>', 'Sets the logging level for console messages.')
    .choices(['debug', 'info', 'warning', 'error'])
    .default(config_file.log_level_console || 'info'))
    .addOption(new commander_1.Option('--log_level_file <level>', 'Sets the logging level for log files.')
    .choices(['debug', 'info', 'warning', 'error'])
    .default(config_file.log_level_file || 'info'))
    .addOption(new commander_1.Option('--console_messages [detail]', 'Displays incoming and outgoing signalling messages on the console.')
    .choices(['basic', 'verbose', 'formatted'])
    .preset(config_file.console_messages || 'basic'))
    .option('--streamer_port <port>', 'Sets the listening port for streamer connections.', config_file.streamer_port || '8888')
    .option('--player_port <port>', 'Sets the listening port for player connections.', config_file.player_port || '80')
    .option('--sfu_port <port>', 'Sets the listening port for SFU connections.', config_file.sfu_port || '8889')
    .option('--max_players <number>', 'Sets the maximum number of subscribers per streamer. 0 = unlimited', config_file.max_players || '0')
    .option('--serve', 'Enables the webserver on player_port.', config_file.serve || false)
    .option('--http_root <path>', 'Sets the path for the webserver root.', config_file.http_root || `${path_1.default.resolve(__dirname, '..', 'www')}`)
    .option('--homepage <filename>', 'The default html file to serve on the web server.', config_file.homepage || 'player.html')
    .option('--https', 'Enables the webserver on https_port and enabling SSL', config_file.https || false)
    .addOption(new commander_1.Option('--https_port <port>', 'Sets the listen port for the https server.')
    .implies({ https: true })
    .default(config_file.https_port || 443))
    .option('--ssl_key_path <path>', 'Sets the path for the SSL key file.', config_file.ssl_key_path || 'certificates/client-key.pem')
    .option('--ssl_cert_path <path>', 'Sets the path for the SSL certificate file.', config_file.ssl_cert_path || 'certificates/client-cert.pem')
    .option('--https_redirect', 'Enables the redirection of connection attempts on http to https. If this is not set the webserver will only listen on https_port. Player websockets will still listen on player_port.', config_file.https_redirect || false)
    .option('--rest_api', 'Enables the rest API interface that can be accessed at <server_url>/api/api-definition', config_file.rest_api || false)
    .addOption(new commander_1.Option('--peer_options <json-string>', 'Additional JSON data to send in peerConnectionOptions of the config message.')
    .argParser(JSON.parse)
    .default(config_file.peer_options || ''))
    .addOption(new commander_1.Option('--peer_options_file <filename>', 'Additional JSON data to send in peerConnectionOptions of the config message. This allows you to provide JSON data without having to deal with it on the command line.').default(config_file.peer_options_file || ''))
    .option('--reverse-proxy', 'Enables reverse proxy mode. This will trust the X-Forwarded-For header.', config_file.reverse_proxy || false)
    .addOption(new commander_1.Option('--reverse-proxy-num-proxies <number>', 'Sets the number of proxies to trust. This is used to calculate the real client IP address.')
    .implies({ reverse_proxy: true })
    .default(config_file.reverse_proxy_num_proxies || 1))
    .option('--log_config', 'Will print the program configuration on startup.', config_file.log_config || false)
    .option('--stdin', 'Allows stdin input while running.', config_file.stdin || false)
    .option('--save', 'After arguments are parsed the config.json is saved with whatever arguments were specified at launch.', config_file.save || false)
    .helpOption('-h, --help', 'Display this help text.')
    .allowUnknownOption() // ignore unknown options which will allow versions to be swapped out into existing scripts with maybe older/newer options
    .parse();
// parsed command line options
const cli_options = program.opts();
const options = Object.assign({}, cli_options);
// save out new configuration (unless disabled)
if (options.save) {
    // dont save certain options
    const save_options = Object.assign({}, options);
    delete save_options.no_config;
    delete save_options.config_file;
    delete save_options.save;
    // save out the config file with the current settings
    fs_1.default.writeFile(configArgsParser.config_file, (0, Utils_1.beautify)(save_options), (error) => {
        if (error)
            throw error;
    });
}
(0, lib_pixelstreamingsignalling_ue5_7_1.InitLogging)({
    logDir: options.log_folder,
    logMessagesToConsole: options.console_messages,
    logLevelConsole: options.log_level_console,
    logLevelFile: options.log_level_file
});
// read the peer_options_file
if (options.peer_options_file) {
    if (!fs_1.default.existsSync(options.peer_options_file)) {
        lib_pixelstreamingsignalling_ue5_7_1.Logger.error(`peer_options_file "${options.peer_options_file}" does not exist.`);
        throw Error(`Failed to find a peer options config file a file called ${options.peer_options_file}.`);
    }
    options.peer_options = JSON.parse(fs_1.default.readFileSync(options.peer_options_file, 'utf-8'));
}
else if (options.peer_options) {
    lib_pixelstreamingsignalling_ue5_7_1.Logger.warn(`The --peer_options cli flag has many issues with passing JSON data on the command line. It is recommended that you use --peer_options_file instead.`);
}
// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
lib_pixelstreamingsignalling_ue5_7_1.Logger.info(`${pjson.name} v${pjson.version} starting...`);
if (options.log_config) {
    lib_pixelstreamingsignalling_ue5_7_1.Logger.info('Config:');
    for (const key in options) {
        lib_pixelstreamingsignalling_ue5_7_1.Logger.info(`"${key}": ${JSON.stringify(options[key])}`);
    }
}
const app = (0, express_1.default)();
if (options.reverse_proxy) {
    app.set('trust proxy', options.reverse_proxy_num_proxies);
}
const serverOpts = {
    streamerPort: options.streamer_port,
    playerPort: options.player_port,
    sfuPort: options.sfu_port,
    peerOptions: options.peer_options,
    maxSubscribers: options.max_players
};
if (options.serve) {
    const webserverOptions = {
        httpPort: options.player_port,
        root: options.http_root,
        homepageFile: options.homepage
    };
    if (options.https) {
        webserverOptions.httpsPort = options.https_port;
        const sslKeyPath = path_1.default.join(__dirname, '..', options.ssl_key_path);
        const sslCertPath = path_1.default.join(__dirname, '..', options.ssl_cert_path);
        if (fs_1.default.existsSync(sslKeyPath) && fs_1.default.existsSync(sslCertPath)) {
            lib_pixelstreamingsignalling_ue5_7_1.Logger.info(`Reading SSL key and cert. Key path: ${sslKeyPath} | Cert path: ${sslCertPath}`);
            webserverOptions.ssl_key = fs_1.default.readFileSync(sslKeyPath);
            webserverOptions.ssl_cert = fs_1.default.readFileSync(sslCertPath);
        }
        else {
            lib_pixelstreamingsignalling_ue5_7_1.Logger.warn(`No SSL key/cert found. Key path: ${sslKeyPath} | Cert path: ${sslCertPath}`);
        }
        webserverOptions.https_redirect = options.https_redirect;
    }
    const webServer = new lib_pixelstreamingsignalling_ue5_7_1.WebServer(app, webserverOptions);
    if (!options.https || webserverOptions.https_redirect) {
        serverOpts.httpServer = webServer.httpServer;
    }
    serverOpts.httpsServer = webServer.httpsServer;
}
const signallingServer = new lib_pixelstreamingsignalling_ue5_7_1.SignallingServer(serverOpts);
// ArchViz: pick up refreshed TURN credentials without a restart (servers/gateway.mjs rewrites the file daily).
// New connections get the new options; the streamer keeps the ones it got when it connected.
if (options.peer_options_file) {
    fs_1.default.watchFile(options.peer_options_file, { interval: 10000 }, () => {
        try {
            signallingServer.protocolConfig.peerConnectionOptions = JSON.parse(fs_1.default.readFileSync(options.peer_options_file, 'utf-8'));
            lib_pixelstreamingsignalling_ue5_7_1.Logger.info(`Reloaded peer_options_file "${options.peer_options_file}".`);
        }
        catch (error) {
            lib_pixelstreamingsignalling_ue5_7_1.Logger.error(`Could not reload peer_options_file: ${String(error)}`);
        }
    });
}
if (options.stdin) {
    (0, InputHandler_1.initInputHandler)(options, signallingServer);
}
if (options.rest_api) {
    void (0, express_openapi_1.initialize)({
        app,
        docsPath: '/api-definition',
        exposeApiDocs: true,
        apiDoc: './apidoc/api-definition-base.yml',
        paths: './dist/paths',
        dependencies: {
            signallingServer
        }
    });
}
