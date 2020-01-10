"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const stackPool_1 = require("./pool/stackPool");
const util_1 = require("./util");
function buildInitialSystemQueryResults(system) {
    const results = {};
    for (const queryName of Object.keys(system.query)) {
        results[queryName] = [];
    }
    return results;
}
function createEntityAdmin() {
    const clock = {
        step: -1,
        tick: -1,
        time: 0,
    };
    const components = new Map();
    const entitiesByComponent = new WeakMap();
    const systemQueryResults = new WeakMap();
    const updatedEntities = new Set();
    const deletedEntities = new Set();
    const systems = [];
    let entitySequence = 0;
    function addSystem(system) {
        const results = buildInitialSystemQueryResults(system);
        systems.push(system);
        systemQueryResults.set(system, results);
        for (const entity of components.keys()) {
            updateQueryForEntity(system, entity);
        }
    }
    function removeSystem(system) {
        util_1.mutableRemove(systems, system);
    }
    function updateQueryForEntity(system, entity) {
        const entityComponents = components.get(entity);
        const results = systemQueryResults.get(system);
        if (!entityComponents) {
            for (const queryName in system.query) {
                util_1.mutableRemoveUnordered(results[queryName], entity);
            }
            return;
        }
        for (const queryName in system.query) {
            const selector = system.query[queryName];
            const selectorResults = results[queryName];
            const isSelected = util_1.contains(selectorResults, entity);
            const isQueryHit = selector.every(factory => entityComponents.find(component => component.$type === factory.$type));
            if (isQueryHit && !isSelected) {
                selectorResults.push(entity);
            }
            else if (!isQueryHit && isSelected) {
                util_1.mutableRemoveUnordered(selectorResults, entity);
            }
        }
    }
    function updateAllQueriesForEntity(entity) {
        for (let i = 0; i < systems.length; i++) {
            const system = systems[i];
            updateQueryForEntity(system, entity);
        }
    }
    function tick(timeStep) {
        clock.step = timeStep;
        clock.tick += 1;
        clock.time += timeStep;
        for (let i = 0; i < systems.length; i++) {
            const system = systems[i];
            const result = systemQueryResults.get(system);
            if (result) {
                system.update(world, result);
            }
        }
        updatedEntities.forEach(updateAllQueriesForEntity);
        updatedEntities.clear();
        deletedEntities.forEach(entity => {
            const entityComponents = components.get(entity);
            if (entityComponents) {
                for (let i = 0; i < entityComponents.length; i++) {
                    removeComponentFromEntity(entity, entityComponents[i]);
                }
            }
            components.delete(entity);
            updateAllQueriesForEntity(entity);
        });
        deletedEntities.clear();
    }
    function createEntity(...entityComponents) {
        const entity = (entitySequence += 1);
        components.set(entity, []);
        for (let i = 0; i < entityComponents.length; i++) {
            addComponentToEntity(entity, entityComponents[i]);
        }
        updatedEntities.add(entity);
        return entity;
    }
    function destroyEntity(entity) {
        deletedEntities.add(entity);
        return entity;
    }
    function addComponentToEntity(entity, component) {
        const entityComponents = components.get(entity);
        if (!entityComponents) {
            throw new Error(`Attempted to add component ${component.$type} to unregistered entity ${entity}.`);
        }
        const hasComponentOfSameType = entityComponents.find(c => c.$type === component.$type);
        if (hasComponentOfSameType) {
            throw new Error(`Attempted to add component ${component.$type} to ${entity}, which already has a component of that type.`);
        }
        entityComponents.push(component);
        updatedEntities.add(entity);
        let componentEntities = entitiesByComponent.get(component);
        if (!componentEntities) {
            componentEntities = new Set();
        }
        componentEntities.add(entity);
        entitiesByComponent.set(component, componentEntities);
        return entity;
    }
    function removeComponentFromEntity(entity, component) {
        const entityComponents = components.get(entity);
        if (!entityComponents) {
            throw new Error(`Attempted to remove component ${component.$type} to unregistered entity ${entity}.`);
        }
        const removed = util_1.mutableRemove(entityComponents, component);
        if (removed) {
            const componentEntities = entitiesByComponent.get(component);
            componentEntities.delete(entity);
            if (componentEntities.size === 0) {
                const pool = componentPools.get(component.$type);
                pool.release(component);
                entitiesByComponent.delete(component);
            }
            updatedEntities.add(entity);
        }
        return entity;
    }
    function getComponent(entity, componentFactory) {
        const entityComponents = components.get(entity);
        if (!entityComponents) {
            throw new Error(`Tried to get component ${componentFactory.$type} to unregistered entity ${entity}.`);
        }
        const { $type } = componentFactory;
        for (let i = 0; i < entityComponents.length; i++) {
            const component = entityComponents[i];
            if (component.$type === $type) {
                return component;
            }
        }
        throw new Error(`Component not found on entity ${entity}.`);
    }
    function tryGetComponent(entity, componentFactory) {
        try {
            return getComponent(entity, componentFactory);
        }
        catch (_a) {
            return null;
        }
    }
    const componentPools = new Map();
    function createComponentFactory(type, defaults, instantiate, poolSize) {
        const reset = (obj) => {
            Object.assign(obj, defaults);
            obj.$type = type;
            return obj;
        };
        const create = () => reset({});
        const release = (obj) => {
            util_1.resetObject(obj);
            return reset(obj);
        };
        const componentPool = stackPool_1.createStackPool(create, release, poolSize);
        function componentFactory(...args) {
            const component = componentPool.retain();
            instantiate(component, ...args);
            return component;
        }
        componentPools.set(type, componentPool);
        componentFactory.$type = type;
        return componentFactory;
    }
    const world = {
        addSystem,
        removeSystem,
        clock,
        tick,
        createEntity,
        destroyEntity,
        addComponentToEntity,
        removeComponentFromEntity,
        getComponent,
        tryGetComponent,
        createComponentFactory,
    };
    return world;
}
exports.createEntityAdmin = createEntityAdmin;
