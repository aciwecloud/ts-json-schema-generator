import type { Definition } from "../Schema/Definition.js";
import type { SubTypeFormatter } from "../SubTypeFormatter.js";
import { ArrayType } from "../Type/ArrayType.js";
import type { BaseType } from "../Type/BaseType.js";
import { IntersectionType } from "../Type/IntersectionType.js";
import { TupleType } from "../Type/TupleType.js";
import { UnionType } from "../Type/UnionType.js";
import type { GetDefinitionOptions } from "../TypeFormatter.js";
import type { TypeFormatter } from "../TypeFormatter.js";
import type { RefResolver } from "../Utils/allOfDefinition.js";
import { getAllOfDefinitionReducer } from "../Utils/allOfDefinition.js";
import { derefType } from "../Utils/derefType.js";
import { uniqueArray } from "../Utils/uniqueArray.js";

function refResolverFromDefinitions(definitions?: Record<string, Definition>): RefResolver | undefined {
    if (!definitions) return undefined;
    return (ref: string) => {
        const key = ref.replace(/^#\/definitions\//, "");
        return definitions[decodeURIComponent(key)];
    };
}

/**
 * Recursively flatten nested IntersectionType members so each leaf type is
 * reduced individually.  This prevents CircularReferenceTypeFormatter from
 * caching incomplete intermediate IntersectionType definitions when one of the
 * members triggers a circular reference (e.g. a class with recursive fields).
 */
function flattenIntersectionMembers(types: readonly BaseType[]): BaseType[] {
    const result: BaseType[] = [];
    for (const t of types) {
        const derefed = derefType(t);
        if (derefed instanceof IntersectionType) {
            result.push(...flattenIntersectionMembers(derefed.getTypes()));
        } else {
            result.push(t);
        }
    }
    return result;
}

export class IntersectionTypeFormatter implements SubTypeFormatter {
    public constructor(protected childTypeFormatter: TypeFormatter) {}

    public supportsType(type: BaseType): boolean {
        return type instanceof IntersectionType;
    }

    public getDefinition(type: IntersectionType, options?: GetDefinitionOptions): Definition {
        const refResolver = refResolverFromDefinitions(options?.definitions);
        const reducer = getAllOfDefinitionReducer(this.childTypeFormatter, refResolver, options);
        const dependencies: Definition[] = [];
        const nonArrayLikeTypes: BaseType[] = [];

        const flatMembers = flattenIntersectionMembers(type.getTypes());

        for (const t of flatMembers) {
            if (t instanceof ArrayType || t instanceof TupleType) {
                dependencies.push(this.childTypeFormatter.getDefinition(t, options));
            } else {
                nonArrayLikeTypes.push(t);
            }
        }

        if (nonArrayLikeTypes.length) {
            const unionTypes = nonArrayLikeTypes
                .map((t) => derefType(t))
                .filter((t): t is UnionType => t instanceof UnionType);
            const unionMember = unionTypes[0];
            const nonUnionMembers = nonArrayLikeTypes.filter((t) => !(derefType(t) instanceof UnionType));

            if (!unionMember) {
                dependencies.push(
                    nonArrayLikeTypes.reduce(reducer, {
                        type: "object",
                        additionalProperties: false,
                    }),
                );
            } else {
                const base = nonUnionMembers.reduce(reducer, { type: "object", additionalProperties: false });
                const branchDefs = unionMember.getTypes().flatMap((branchType) => {
                    const derefed = derefType(branchType);
                    if (derefed instanceof UnionType) {
                        return derefed
                            .getTypes()
                            .map((innerType) =>
                                [innerType].reduce(reducer, JSON.parse(JSON.stringify(base)) as Definition),
                            );
                    }
                    const baseCopy = JSON.parse(JSON.stringify(base)) as Definition;
                    return [[branchType].reduce(reducer, baseCopy)];
                });
                dependencies.push(branchDefs.length === 1 ? branchDefs[0] : { anyOf: branchDefs });
            }
        }

        return dependencies.length === 1 ? dependencies[0] : { allOf: dependencies };
    }

    public getChildren(type: IntersectionType): BaseType[] {
        return uniqueArray(
            type
                .getTypes()
                .reduce((result: BaseType[], item) => [...result, ...this.childTypeFormatter.getChildren(item)], []),
        );
    }
}
