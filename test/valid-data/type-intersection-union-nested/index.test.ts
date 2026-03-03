import assert from "node:assert";
import { test } from "node:test";
import { createGenerator } from "../../../factory/generator.js";
import { DEFAULT_CONFIG } from "../../../src/Config.js";
import path from "node:path";
import { assertValidSchema } from "../../utils";

test("valid-data - type-intersection-union-nested", assertValidSchema("type-intersection-union-nested", "MyObject"));

test("type-intersection-union-nested: each anyOf branch has base and union-branch properties", () => {
    const config = {
        ...DEFAULT_CONFIG,
        path: path.resolve("test/valid-data/type-intersection-union-nested", "*.ts"),
        type: "MyObject" as const,
    };
    const generator = createGenerator(config);
    const schema = generator.createSchema("MyObject");
    const def = schema.definitions?.MyObject as { anyOf?: Array<{ properties?: Record<string, unknown> }> } | undefined;
    assert(def && Array.isArray(def.anyOf), "MyObject should have anyOf");
    const branches = def.anyOf;
    assert(branches.length >= 2, "should have at least 2 branches (union distributed over intersection)");
    for (const branch of branches) {
        assert(branch.properties, "each branch should have properties");
        assert("category" in branch.properties, "each branch should have category (from union branch)");
        assert("contextRef" in branch.properties, "each branch should have contextRef (from intersection base)");
    }
});

test("type-intersection-union-nested: AliasToUnion & Base (alias-to-union as intersection member) has distributed branches", () => {
    const config = {
        ...DEFAULT_CONFIG,
        path: path.resolve("test/valid-data/type-intersection-union-nested", "*.ts"),
        type: "AliasAndBase" as const,
    };
    const generator = createGenerator(config);
    const schema = generator.createSchema("AliasAndBase");
    const def = schema.definitions?.AliasAndBase as { anyOf?: Array<{ properties?: Record<string, unknown> }> } | undefined;
    assert(def && Array.isArray(def.anyOf), "AliasAndBase should have anyOf (alias-to-union & base distributed)");
    assert(def.anyOf.length === 2, "AliasToUnion has 2 branches so anyOf should have 2");
    for (const branch of def.anyOf) {
        assert(branch.properties, "each branch should have properties");
        assert("category" in branch.properties, "each branch should have category (from union branch)");
        assert("contextRef" in branch.properties, "each branch should have contextRef (from intersection base)");
    }
});

test("type-intersection-union-nested: Base & Union with class Base ($ref) — every branch must have contextRef", () => {
    // Mirrors iwe-app-dsl: ContextRefNode & (MandatoryExpressionBinding | MandatoryRelationBinding).
    // Base is a class so it emits $ref; we must resolve it when distributing so each branch gets contextRef.
    const config = {
        ...DEFAULT_CONFIG,
        path: path.resolve("test/valid-data/type-intersection-union-nested", "*.ts"),
        type: "BaseAndUnion" as const,
        expose: "all" as const,
    };
    const generator = createGenerator(config);
    const schema = generator.createSchema("BaseAndUnion");
    const definitions = schema.definitions ?? {};
    type Def = { $ref?: string; anyOf?: Array<{ properties?: Record<string, unknown> }> };
    // Root may be inline anyOf or a $ref (e.g. to OptionalFieldOptions); follow $ref until we have the real def
    let def: Def = schema.anyOf ? (schema as Def) : (schema as { $ref?: string });
    while (def?.$ref && !Array.isArray(def.anyOf)) {
        const refName = decodeURIComponent(def.$ref.replace(/^#\/definitions\//, ""));
        def = definitions[refName] as Def | undefined;
        assert(def, `resolved $ref "${refName}" should exist in definitions`);
    }
    assert(def, "schema should have definition");
    assert(Array.isArray(def.anyOf), "definition should have anyOf (union distributed over intersection)");
    for (const branch of def.anyOf) {
        assert(branch.properties, "each branch should have properties");
        assert(
            "contextRef" in branch.properties,
            "each branch must include base (ContextRefNode) properties; ref must be resolved during distribution",
        );
    }
});

test("type-intersection-union-nested: Union of 3 intersections with alias-to-union (iwe IntermediaryBindingNode)", () => {
    // Top-level union: (G & C) | ((G & C) & M1) | ((G & C) & M2) where G is type alias to union.
    // Each anyOf branch must have contextRef (base) AND the union/option props (category, expression, relation).
    const config = {
        ...DEFAULT_CONFIG,
        path: path.resolve("test/valid-data/type-intersection-union-nested", "*.ts"),
        type: "IntermediaryBindingNodeLike" as const,
        expose: "all" as const,
    };
    const generator = createGenerator(config);
    const schema = generator.createSchema("IntermediaryBindingNodeLike");
    const definitions = schema.definitions ?? {};
    type Def = { $ref?: string; anyOf?: Array<{ properties?: Record<string, unknown> }> };
    let def: Def = schema.anyOf ? (schema as Def) : (schema as { $ref?: string });
    while (def?.$ref && !Array.isArray(def.anyOf)) {
        const refName = decodeURIComponent(def.$ref.replace(/^#\/definitions\//, ""));
        def = definitions[refName] as Def | undefined;
        assert(def, `resolved $ref "${refName}" should exist in definitions`);
    }
    assert(def, "schema should have definition");
    assert(Array.isArray(def.anyOf), "definition should have anyOf (union of 3 intersections)");
    for (const branch of def.anyOf) {
        assert(branch.properties, "each branch should have properties");
        assert(
            "contextRef" in branch.properties,
            "each branch must include base (ContextRefNode); got keys: " + Object.keys(branch.properties).join(", "),
        );
        // Each branch should also have props from GenericIntermediaryLike (e.g. category) or the mandatory option
        const hasBaseOrBranch =
            "category" in branch.properties ||
            "expression" in branch.properties ||
            "relation" in branch.properties ||
            "kind" in branch.properties;
        assert(
            hasBaseOrBranch,
            "each branch must include alias-union or option props; got keys: " + Object.keys(branch.properties).join(", "),
        );
    }
});

test("type-intersection-union-nested: Same with inline union (no alias) — every branch has contextRef + props", () => {
    // Top-level union with parenthesized union in each branch (no type alias). Same semantics as above.
    const config = {
        ...DEFAULT_CONFIG,
        path: path.resolve("test/valid-data/type-intersection-union-nested", "*.ts"),
        type: "IntermediaryBindingNodeLikeExpanded" as const,
        expose: "all" as const,
    };
    const generator = createGenerator(config);
    const schema = generator.createSchema("IntermediaryBindingNodeLikeExpanded");
    const definitions = schema.definitions ?? {};
    type Def = { $ref?: string; anyOf?: Array<{ properties?: Record<string, unknown> }> };
    let def: Def = schema.anyOf ? (schema as Def) : (schema as { $ref?: string });
    while (def?.$ref && !Array.isArray(def.anyOf)) {
        const refName = decodeURIComponent(def.$ref.replace(/^#\/definitions\//, ""));
        def = definitions[refName] as Def | undefined;
        assert(def, `resolved $ref "${refName}" should exist in definitions`);
    }
    assert(def, "schema should have definition");
    assert(Array.isArray(def.anyOf), "definition should have anyOf");
    for (const branch of def.anyOf) {
        assert(branch.properties, "each branch should have properties");
        assert(
            "contextRef" in branch.properties,
            "each branch must include contextRef; got keys: " + Object.keys(branch.properties).join(", "),
        );
        const hasBranch =
            "category" in branch.properties ||
            "expression" in branch.properties ||
            "relation" in branch.properties ||
            "kind" in branch.properties;
        assert(
            hasBranch,
            "each branch must include union/option props; got keys: " + Object.keys(branch.properties).join(", "),
        );
    }
});

test("type-intersection-union-nested: Recursive fields pattern (iwe BaseFieldsIntermediaryBindingNode)", () => {
    // Mirrors the exact iwe-app-dsl pattern:
    // - RecursiveFieldsNode is a class with `fields: RecursiveBindingNode[]` (circular ref)
    // - GenericRecursiveNode = ((SimpleEntry & RequiredAutoGen) | (RecursiveFieldsNode & OptionalAutoGen)) & ContextRefNode
    // - RecursiveIntermediaryNode = T | (T & MandatoryExpression) | (T & MandatoryRelation) where T = GenericRecursiveNode
    // Each anyOf branch must retain contextRef and category/fields — not just expression/relation alone.
    const config = {
        ...DEFAULT_CONFIG,
        path: path.resolve("test/valid-data/type-intersection-union-nested", "*.ts"),
        type: "RecursiveIntermediaryNode" as const,
        expose: "all" as const,
    };
    const generator = createGenerator(config);
    const schema = generator.createSchema("RecursiveIntermediaryNode");
    const definitions = schema.definitions ?? {};
    type Def = { $ref?: string; anyOf?: Array<{ properties?: Record<string, unknown> }>; properties?: Record<string, unknown> };

    function resolveRef(d: Def): Def {
        let resolved = d;
        while (resolved?.$ref && !resolved.anyOf && !resolved.properties) {
            const refName = decodeURIComponent(resolved.$ref.replace(/^#\/definitions\//, ""));
            resolved = definitions[refName] as Def | undefined;
            assert(resolved, `resolved $ref "${refName}" should exist in definitions`);
        }
        return resolved;
    }

    let def = resolveRef(schema.anyOf ? (schema as Def) : (schema as { $ref?: string }));
    assert(def, "schema should have definition");
    assert(Array.isArray(def.anyOf), `definition should have anyOf, got keys: ${Object.keys(def).join(", ")}`);

    function collectLeafBranches(d: Def): Array<{ properties: Record<string, unknown> }> {
        const resolved = resolveRef(d);
        if (resolved.anyOf) {
            return resolved.anyOf.flatMap((b) => collectLeafBranches(b as Def));
        }
        assert(resolved.properties, "leaf branch should have properties");
        return [resolved as { properties: Record<string, unknown> }];
    }

    const leafBranches = collectLeafBranches(def);
    assert(leafBranches.length >= 4, `should have at least 4 leaf branches (2 inner × expression/relation), got ${leafBranches.length}`);
    for (const branch of leafBranches) {
        assert(
            "contextRef" in branch.properties,
            "each branch must include contextRef (from ContextRefNode); got keys: " +
                Object.keys(branch.properties).join(", "),
        );
        const hasStructuralProps =
            "category" in branch.properties ||
            "description" in branch.properties ||
            "fields" in branch.properties ||
            "autoGeneration" in branch.properties;
        assert(
            hasStructuralProps,
            "each branch must retain structural props (category/fields/autoGeneration); got keys: " +
                Object.keys(branch.properties).join(", "),
        );
    }
});
