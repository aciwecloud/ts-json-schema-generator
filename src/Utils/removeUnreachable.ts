import type { JSONSchema7Definition } from "json-schema";
import { DefinitionError } from "../Error/Errors.js";
import type { Definition } from "../Schema/Definition.js";
import type { StringMap } from "./StringMap.js";

const DEFINITION_OFFSET = "#/definitions/".length;

function addReachable(
    definition: Definition | JSONSchema7Definition,
    definitions: StringMap<Definition>,
    reachable: Set<string>,
    visited: WeakSet<object> = new WeakSet(),
) {
    if (typeof definition === "boolean") {
        return;
    }

    if (visited.has(definition)) {
        return;
    }
    visited.add(definition);

    if (definition.$ref) {
        const typeName = decodeURIComponent(definition.$ref.slice(DEFINITION_OFFSET));
        if (reachable.has(typeName) || !isLocalRef(definition.$ref)) {
            return;
        }
        reachable.add(typeName);
        const refDefinition = definitions[typeName];

        if (!refDefinition) {
            throw new DefinitionError("Encountered a reference to a missing definition, this is a bug.", definition);
        }

        addReachable(refDefinition, definitions, reachable, visited);
    } else if (definition.anyOf) {
        for (const def of definition.anyOf) {
            addReachable(def, definitions, reachable, visited);
        }
    } else if (definition.allOf) {
        for (const def of definition.allOf) {
            addReachable(def, definitions, reachable, visited);
        }
    } else if (definition.oneOf) {
        for (const def of definition.oneOf) {
            addReachable(def, definitions, reachable, visited);
        }
    } else if (definition.not) {
        addReachable(definition.not, definitions, reachable, visited);
    } else if (definition.type?.includes("object")) {
        for (const prop in definition.properties || {}) {
            const propDefinition = definition.properties![prop];
            addReachable(propDefinition, definitions, reachable, visited);
        }

        const additionalProperties = definition.additionalProperties;
        if (additionalProperties) {
            addReachable(additionalProperties, definitions, reachable, visited);
        }
    } else if (definition.type?.includes("array")) {
        const items = definition.items;
        if (Array.isArray(items)) {
            for (const item of items) {
                addReachable(item, definitions, reachable, visited);
            }
        } else if (items) {
            addReachable(items, definitions, reachable, visited);
        }
    } else if (definition.then) {
        addReachable(definition.then, definitions, reachable, visited);
    }
}

export function removeUnreachable(
    rootTypeDefinition: Definition | undefined,
    definitions: StringMap<Definition>,
): StringMap<Definition> {
    if (!rootTypeDefinition) {
        return definitions;
    }

    const reachable = new Set<string>();

    addReachable(rootTypeDefinition, definitions, reachable);

    const out: StringMap<Definition> = {};

    for (const def of reachable) {
        out[def] = definitions[def];
    }

    return out;
}

function isLocalRef(ref: string) {
    return ref.charAt(0) === "#";
}
