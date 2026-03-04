/**
 * Reproduces: (Union | (Union & Extra)) & Base where Union is itself a union.
 * Each branch in the output anyOf must have both Base's properties and the union-branch properties.
 */
export interface ContextRef {
    contextRef?: string;
}

/** Class so it becomes $ref in schema (like iwe-app-dsl ContextRefNode). */
export class ContextRefNode {
    contextRef?: string;
}

export interface WithCategory {
    category: string;
    description?: string;
}

export interface WithExpression {
    expression?: string;
}

export interface WithRelation {
    relation?: string;
}

/** Required expression (like MandatoryExpressionBinding). */
export interface MandatoryExpression {
    expression: string;
}

/** Required relation (like MandatoryRelationBinding). */
export interface MandatoryRelation {
    relation: string;
}

// Inner union (like GenericIntermediaryBindingNode): two object types
type InnerUnion = WithCategory | (WithCategory & { extra: number });

// OptionalFieldsOptions<T> = T | (T & WithExpression); then & ContextRef
type OptionalFieldsOptions<T> = T | (T & WithExpression);
type AllOptionalFieldsOptions<T> = OptionalFieldsOptions<T> & ContextRef;

export type MyObject = AllOptionalFieldsOptions<InnerUnion>;

// Like iwe-app-dsl: OptionalFieldsOptions<T & ContextRef> so each branch is (T & ContextRef) | ...
// Intersection is (AliasToUnion & ContextRef) — alias must be detected via derefType
type AliasToUnion = WithCategory | (WithCategory & { extra: number });
export type AliasAndBase = AliasToUnion & ContextRef;

/**
 * Exactly like iwe-app-dsl OptionalFieldOptions: Base & (OptionA | OptionB).
 * Base is a class ($ref). Each anyOf branch MUST include base's properties (contextRef).
 * If ref is not resolved during distribution, branches would miss contextRef.
 */
type OptionalFieldOptions = ContextRefNode & (WithExpression | WithRelation);

export type BaseAndUnion = OptionalFieldOptions;

/**
 * Exactly like iwe-app-dsl IntermediaryBindingNode: top-level UNION of 3 intersections,
 * first member of each intersection is a type ALIAS to a union (GenericIntermediaryBindingNode).
 * Schema must not collapse to 3 branches with only contextRef / only expression / only relation.
 */
type GenericIntermediaryLike =
    | (WithCategory & { kind: "a" })
    | (WithCategory & { kind: "b"; extra: number });

export type IntermediaryBindingNodeLike =
    | (GenericIntermediaryLike & ContextRefNode)
    | ((GenericIntermediaryLike & ContextRefNode) & MandatoryExpression)
    | ((GenericIntermediaryLike & ContextRefNode) & MandatoryRelation);

/**
 * Same as IntermediaryBindingNodeLike but with the union inlined (no type alias).
 * Like the user's "It also doesn't work with this" variant.
 */
export type IntermediaryBindingNodeLikeExpanded =
    | ((WithCategory & { kind: "a" }) | (WithCategory & { kind: "b"; extra: number })) &
        ContextRefNode
    | (((WithCategory & { kind: "a" }) | (WithCategory & { kind: "b"; extra: number })) &
          ContextRefNode) &
          MandatoryExpression
    | (((WithCategory & { kind: "a" }) | (WithCategory & { kind: "b"; extra: number })) &
          ContextRefNode) &
          MandatoryRelation;

// ---------------------------------------------------------------------------
// Recursive-fields pattern (mirrors iwe-app-dsl BaseFieldsIntermediaryBindingNode)
// ---------------------------------------------------------------------------

/** Simple entry without recursive fields (like GenericBindingEntry). */
export class SimpleEntry {
    category?: string;
    description?: string;
}

/** Auto-generation node (like OptionalAutoGenerationBindingNode). */
export class OptionalAutoGen {
    autoGeneration?: boolean;
}

type RequiredAutoGen = Required<OptionalAutoGen>;

/**
 * Class with recursive `fields` property, creating a circular reference
 * (mirrors BaseFieldsIntermediaryBindingNode with fields: BindingNode[]).
 */
export class RecursiveFieldsNode extends SimpleEntry {
    fields: RecursiveBindingNode[];
}

/**
 * Union of intersections where one branch uses the recursive class.
 * Mirrors GenericIntermediaryBindingNode = ((GenericBindingEntry & RequiredAutoGen) | (BaseFieldsIntermediaryBindingNode & OptionalAutoGen)) & ContextRefNode
 */
type GenericRecursiveNode = (
    | (SimpleEntry & RequiredAutoGen)
    | (RecursiveFieldsNode & OptionalAutoGen)
) &
    ContextRefNode;

type RecursiveOptionalFieldsOptions<T> =
    | T
    | (T & MandatoryExpression)
    | (T & MandatoryRelation);

/**
 * Final recursive type: union of intersections involving the recursive class.
 * Mirrors IntermediaryBindingNode = AllOptionalFieldsOptions<GenericIntermediaryBindingNode>.
 * Each anyOf branch must retain all properties (category, fields, contextRef, etc.)
 * even though RecursiveFieldsNode triggers circular reference processing.
 */
export type RecursiveIntermediaryNode = RecursiveOptionalFieldsOptions<GenericRecursiveNode>;

type RecursiveBindingNodeWithoutTable = RecursiveIntermediaryNode | MandatoryExpression;
type RecursiveBindingNode = RecursiveBindingNodeWithoutTable;

// ---------------------------------------------------------------------------
// Inline recursive pattern (mirrors iwe-app-dsl with default expose: "export")
//
// Non-exported intermediary types are inlined instead of producing $ref,
// triggering the stale IntersectionType cache bug in CircularReferenceTypeFormatter.
// ---------------------------------------------------------------------------

/** Non-exported: mirrors GenericIntermediaryBindingNode */
type InlineGenericNode = (
    | (SimpleEntry & RequiredAutoGen)
    | (InlineFieldsNode & OptionalAutoGen)
) & ContextRefNode;

/** Non-exported: mirrors IntermediaryBindingNode */
type InlineIntermediaryNode =
    | InlineGenericNode
    | (InlineGenericNode & MandatoryExpression)
    | (InlineGenericNode & MandatoryRelation);

/** Non-exported: mirrors BindingNode */
type InlineBindingNode = InlineIntermediaryNode | MandatoryExpression;

/** Exported class with recursive fields (like BaseFieldsIntermediaryBindingNode). */
export class InlineFieldsNode extends SimpleEntry {
    fields: InlineBindingNode[];
}

/** Exported root class: entry point for schema generation. */
export class InlineRoot {
    definition: InlineIntermediaryNode;
}
