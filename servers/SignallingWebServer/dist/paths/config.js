"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = default_1;
/* eslint-disable @typescript-eslint/no-unsafe-call,
                  @typescript-eslint/no-unsafe-member-access */
function default_1(signallingServer) {
    const operations = {
        GET
    };
    function GET(req, res, _next) {
        res.status(200).json({
            config: signallingServer.config,
            protocolConfig: signallingServer.protocolConfig
        });
    }
    GET.apiDoc = {
        summary: 'Returns the current configuration of the server.',
        operationId: 'getConfig',
        responses: {
            200: {
                description: 'The current configuration of the server.',
                content: {
                    'application/json': {
                        schema: {
                            type: 'object',
                            properties: {
                                config: {
                                    type: 'object'
                                },
                                protocol: {
                                    type: 'object'
                                }
                            }
                        }
                    }
                }
            }
        }
    };
    return operations;
}
