"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function mutableRemove(arr, element) {
    const index = arr.indexOf(element);
    if (index === -1) {
        return false;
    }
    arr.splice(index, 1);
    return true;
}
exports.mutableRemove = mutableRemove;
