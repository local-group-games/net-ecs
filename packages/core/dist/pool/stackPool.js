"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function createStackPool(factory, reset, size) {
    const heap = [];
    const allocate = () => {
        for (let i = 0; i < size; i++) {
            heap.push(factory());
        }
    };
    const retain = () => {
        if (!heap.length) {
            allocate();
        }
        return heap.pop();
    };
    const release = (obj) => {
        heap.push(reset(obj));
    };
    return {
        allocate,
        retain,
        release,
    };
}
exports.createStackPool = createStackPool;
