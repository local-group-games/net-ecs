"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function mutableRemoveUnordered(arr, element) {
    const length = arr.length;
    const index = arr.indexOf(element);
    if (index === -1) {
        return false;
    }
    const last = arr.pop();
    if (index < length - 1) {
        arr[index] = last;
    }
    return true;
}
exports.mutableRemoveUnordered = mutableRemoveUnordered;
