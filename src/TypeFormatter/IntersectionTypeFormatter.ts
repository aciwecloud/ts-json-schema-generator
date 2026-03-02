import type { Definition } from "../Schema/Definition.js";
import type { SubTypeFormatter } from "../SubTypeFormatter.js";
import { ArrayType } from "../Type/ArrayType.js";
import type { BaseType } from "../Type/BaseType.js";
import { IntersectionType } from "../Type/IntersectionType.js";
import { TupleType } from "../Type/TupleType.js";
import type { GetDefinitionOptions } from "../TypeFormatter.js";
import type { TypeFormatter } from "../TypeFormatter.js";
import type { RefResolver } from "../Utils/allOfDefinition.js";
import { getAllOfDefinitionReducer } from "../Utils/allOfDefinition.js";
import { uniqueArray } from "../Utils/uniqueArray.js";

function refResolverFromDefinitions(definitions?: Record<string, Definition>): RefResolver | undefined {
    if (!definitions) return undefined;
    return (ref: string) => {
        const key = ref.replace(/^#\/definitions\//, "");
        return definitions[decodeURIComponent(key)];
    };
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

        for (const t of type.getTypes()) {
            // Filter out Array like definitions that cannot be
            // easily mergeable into a single json-schema object
            if (t instanceof ArrayType || t instanceof TupleType) {
                dependencies.push(this.childTypeFormatter.getDefinition(t, options));
            } else {
                nonArrayLikeTypes.push(t);
            }
        }

        if (nonArrayLikeTypes.length) {
            // There are non array (mergeable requirements)
            dependencies.push(
                nonArrayLikeTypes.reduce(reducer, {
                    type: "object",
                    additionalProperties: false,
                }),
            );
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
