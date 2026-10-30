"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.stringify = stringify;
exports.beautify = beautify;
// Copyright Epic Games, Inc. All Rights Reserved.
const jsonc_1 = require("jsonc");
/**
 * Cirular reference safe version of JSON.stringify
 */
function stringify(obj) {
    return jsonc_1.jsonc.stringify(obj);
}
/**
 * Circular reference save version of JSON.stringify with extra formatting.
 */
function beautify(obj) {
    return jsonc_1.jsonc.stringify(obj, undefined, '\t');
}
