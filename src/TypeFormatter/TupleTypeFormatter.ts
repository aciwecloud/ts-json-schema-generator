import type { Definition } from "../Schema/Definition.js";
import type { SubTypeFormatter } from "../SubTypeFormatter.js";
import { ArrayType } from "../Type/ArrayType.js";
import type { BaseType } from "../Type/BaseType.js";
import { OptionalType } from "../Type/OptionalType.js";
import { RestType } from "../Type/RestType.js";
import { TupleType } from "../Type/TupleType.js";
import type { GetDefinitionOptions } from "../TypeFormatter.js";
import type { TypeFormatter } from "../TypeFormatter.js";
import { notNever } from "../Utils/notNever.js";
import { uniqueArray } from "../Utils/uniqueArray.js";

function uniformRestType(type: RestType, check_type: BaseType): boolean {
    const inner = type.getType();
    return (
        (inner instanceof ArrayType && inner.getItem().getId() === check_type.getId()) ||
        (inner instanceof TupleType &&
            inner.getTypes().every((tuple_type) => {
                if (tuple_type instanceof RestType) {
                    return uniformRestType(tuple_type, check_type);
                } else {
                    return tuple_type?.getId() === check_type.getId();
                }
            }))
    );
}

export class TupleTypeFormatter implements SubTypeFormatter {
    public constructor(protected childTypeFormatter: TypeFormatter) {}

    public supportsType(type: BaseType): boolean {
        return type instanceof TupleType;
    }

    public getDefinition(type: TupleType, options?: GetDefinitionOptions): Definition {
        const subTypes = type.getTypes().filter(notNever);

        const requiredElements = subTypes.filter((t) => !(t instanceof OptionalType) && !(t instanceof RestType));
        const optionalElements = subTypes.filter((t): t is OptionalType => t instanceof OptionalType);
        // NOTE: A maximum of one rest type is assumed.
        const restType = subTypes.find((t): t is RestType => t instanceof RestType);
        const firstItemType = requiredElements.length > 0 ? requiredElements[0] : optionalElements[0]?.getType();

        // Check whether the tuple is of any of the following forms:
        //   [A, A, A]
        //   [A, A, A?]
        //   [A?, A?]
        //   [A, A, A, ...A[]],
        const isUniformArray =
            firstItemType &&
            requiredElements.every((item) => item.getId() === firstItemType.getId()) &&
            optionalElements.every((item) => item.getType().getId() === firstItemType.getId()) &&
            (!restType || uniformRestType(restType, firstItemType));

        // If so, generate a simple array with minItems (and possibly maxItems) instead.
        if (isUniformArray) {
            return {
                type: "array",
                items: this.childTypeFormatter.getDefinition(firstItemType, options),
                minItems: requiredElements.length,
                ...(restType ? {} : { maxItems: requiredElements.length + optionalElements.length }),
            };
        }

        const requiredDefinitions = requiredElements.map((item) =>
            this.childTypeFormatter.getDefinition(item, options),
        );
        const optionalDefinitions = optionalElements.map((item) =>
            this.childTypeFormatter.getDefinition(item, options),
        );
        const itemsTotal = requiredDefinitions.length + optionalDefinitions.length;
        let additionalItems = restType ? this.childTypeFormatter.getDefinition(restType, options).items : undefined;

        // When rest type is a $ref (e.g. exported alias RestItems = string[]), restDef has no .items.
        // Resolve the ref and use the array definition's .items as additionalItems.
        if (additionalItems === undefined && restType && options?.definitions) {
            const restDef = this.childTypeFormatter.getDefinition(restType, options);
            const ref = restDef.$ref;
            if (typeof ref === "string") {
                const key = ref.replace(/^#\/definitions\//, "");
                const resolved = options.definitions[decodeURIComponent(key)];
                if (
                    resolved &&
                    typeof resolved === "object" &&
                    resolved.type === "array" &&
                    resolved.items !== undefined &&
                    !Array.isArray(resolved.items)
                ) {
                    additionalItems = resolved.items;
                }
            }
        }

        return {
            type: "array",
            minItems: requiredDefinitions.length,
            ...(itemsTotal ? { items: requiredDefinitions.concat(optionalDefinitions) } : {}), // with items
            ...(!itemsTotal && additionalItems ? { items: additionalItems } : {}), // with only rest param
            ...(!itemsTotal && !additionalItems ? { maxItems: 0 } : {}), // empty
            ...(additionalItems && !Array.isArray(additionalItems) && itemsTotal
                ? { additionalItems: additionalItems }
                : {}), // with rest items
            ...(!additionalItems && itemsTotal && !restType ? { maxItems: itemsTotal } : {}), // without rest
        };
    }

    public getChildren(type: TupleType): BaseType[] {
        return uniqueArray(
            type
                .getTypes()
                .filter(notNever)
                .reduce((result: BaseType[], item) => [...result, ...this.childTypeFormatter.getChildren(item)], []),
        );
    }
}
