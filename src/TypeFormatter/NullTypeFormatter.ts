import type { Definition } from "../Schema/Definition.js";
import type { SubTypeFormatter } from "../SubTypeFormatter.js";
import type { BaseType } from "../Type/BaseType.js";
import { NullType } from "../Type/NullType.js";
import type { GetDefinitionOptions } from "../TypeFormatter.js";

export class NullTypeFormatter implements SubTypeFormatter {
    public supportsType(type: BaseType): boolean {
        return type instanceof NullType;
    }
    public getDefinition(type: NullType, _options?: GetDefinitionOptions): Definition {
        return { type: "null" };
    }
    public getChildren(type: NullType): BaseType[] {
        return [];
    }
}
