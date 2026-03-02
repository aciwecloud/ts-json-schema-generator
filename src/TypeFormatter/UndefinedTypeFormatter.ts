import type { Definition } from "../Schema/Definition.js";
import type { SubTypeFormatter } from "../SubTypeFormatter.js";
import type { BaseType } from "../Type/BaseType.js";
import { UndefinedType } from "../Type/UndefinedType.js";
import type { GetDefinitionOptions } from "../TypeFormatter.js";

export class UndefinedTypeFormatter implements SubTypeFormatter {
    public supportsType(type: BaseType): boolean {
        return type instanceof UndefinedType;
    }
    public getDefinition(type: UndefinedType, _options?: GetDefinitionOptions): Definition {
        return { not: {} };
    }
    public getChildren(type: UndefinedType): BaseType[] {
        return [];
    }
}
