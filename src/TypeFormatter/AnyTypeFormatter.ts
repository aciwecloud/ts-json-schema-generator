import type { Definition } from "../Schema/Definition.js";
import type { SubTypeFormatter } from "../SubTypeFormatter.js";
import { AnyType } from "../Type/AnyType.js";
import type { BaseType } from "../Type/BaseType.js";
import type { GetDefinitionOptions } from "../TypeFormatter.js";

export class AnyTypeFormatter implements SubTypeFormatter {
    public supportsType(type: BaseType): boolean {
        return type instanceof AnyType;
    }
    public getDefinition(type: AnyType, _options?: GetDefinitionOptions): Definition {
        return {};
    }
    public getChildren(type: AnyType): BaseType[] {
        return [];
    }
}
