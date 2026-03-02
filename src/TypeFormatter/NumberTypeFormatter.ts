import type { Definition } from "../Schema/Definition.js";
import type { SubTypeFormatter } from "../SubTypeFormatter.js";
import type { BaseType } from "../Type/BaseType.js";
import { NumberType } from "../Type/NumberType.js";
import type { GetDefinitionOptions } from "../TypeFormatter.js";

export class NumberTypeFormatter implements SubTypeFormatter {
    public supportsType(type: BaseType): boolean {
        return type instanceof NumberType;
    }
    public getDefinition(type: NumberType, _options?: GetDefinitionOptions): Definition {
        return { type: "number" };
    }
    public getChildren(type: NumberType): BaseType[] {
        return [];
    }
}
