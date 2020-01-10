"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function resetObject(obj) {
    for (const key in obj) {
        delete obj[key];
    }
    return obj;
}
exports.resetObject = resetObject;
