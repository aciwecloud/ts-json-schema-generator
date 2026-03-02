import type { Definition } from "../Schema/Definition.js";
import type { SubTypeFormatter } from "../SubTypeFormatter.js";
import { SymbolType } from "../Type/SymbolType.js";
import type { BaseType } from "../Type/BaseType.js";
import type { GetDefinitionOptions } from "../TypeFormatter.js";

export class SymbolTypeFormatter implements SubTypeFormatter {
    public supportsType(type: BaseType): boolean {
        return type instanceof SymbolType;
    }
    public getDefinition(type: SymbolType, _options?: GetDefinitionOptions): Definition {
        return {};
    }
    public getChildren(type: SymbolType): BaseType[] {
        return [];
    }
}
