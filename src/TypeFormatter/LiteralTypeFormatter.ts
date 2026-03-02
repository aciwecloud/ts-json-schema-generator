import type { Definition } from "../Schema/Definition.js";
import type { SubTypeFormatter } from "../SubTypeFormatter.js";
import type { BaseType } from "../Type/BaseType.js";
import { LiteralType } from "../Type/LiteralType.js";
import type { GetDefinitionOptions } from "../TypeFormatter.js";
import { typeName } from "../Utils/typeName.js";

export class LiteralTypeFormatter implements SubTypeFormatter {
    public supportsType(type: BaseType): boolean {
        return type instanceof LiteralType;
    }
    public getDefinition(type: LiteralType, _options?: GetDefinitionOptions): Definition {
        return {
            type: typeName(type.getValue()),
            const: type.getValue(),
        };
    }
    public getChildren(type: LiteralType): BaseType[] {
        return [];
    }
}
