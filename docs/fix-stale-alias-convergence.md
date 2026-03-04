# Fix: Stale AliasType Cache Entries in Circular Reference Recomputation

## Problem

When generating JSON schemas for TypeScript types that involve **circular references**, **union/intersection distribution**, and **type alias chains**, certain `anyOf` branches in the output schema contained incomplete properties.

For example, given this type structure (from `iwe-app-dsl`):

```typescript
type GenericIntermediaryBindingNode =
  | (BaseIntermediaryBindingNode & MandatoryAutoGenerationBindingNode)
  | (BaseFieldsIntermediaryBindingNode & OptionalAutoGenerationBindingNode);

type OptionalFieldsOptions<T> =
  | T
  | (T & MandatoryExpressionBinding)
  | (T & MandatoryRelationBinding);

type IntermediaryBindingNode = OptionalFieldsOptions<GenericIntermediaryBindingNode>;

type BindingNode = IntermediaryBindingNode | /* other types */;
```

Where `BaseFieldsIntermediaryBindingNode` has `fields: BindingNode[]` (creating a circular reference), the generated schema produced `anyOf` branches like:

```json
{ "properties": { "expression": { "type": "string" } } }
```

instead of the expected:

```json
{
  "properties": {
    "autoGeneration": { ... },
    "category": { ... },
    "description": { ... },
    "anchor": { ... },
    "orderIndex": { ... },
    "contextRef": { ... },
    "fields": { ... },
    "expression": { "type": "string" }
  }
}
```

## Root Cause

The fix involved three distinct but related issues:

### 1. Convergence Loop Only Tracked IntersectionType/UnionType

The `recomputeIntersections` method in `CircularReferenceTypeFormatter` iterates all cached type definitions and recomputes them to fix stale entries caused by circular reference placeholders. It uses a convergence loop that repeats until no entry changes.

However, the convergence check only monitored `IntersectionType` and `UnionType` entries. `AliasType` entries — which form wrapper chains between the corrected IntersectionType definitions and the consuming UnionType definitions — were recomputed but **not tracked for changes**.

The CRF cache entry processing order was determined by Map insertion order (first-encountered-first-cached):

| Index | Type | Role |
|-------|------|------|
| 30 | AliasType (depth-0) | `IntermediaryBindingNode` outer alias |
| 33 | UnionType (depth-3) | `OptionalFieldsOptions<GenericIBN>` inner union |
| 35 | IntersectionType | `GenericIBN & MandatoryExpressionBinding` |
| 38 | IntersectionType | `GenericIBN & MandatoryRelationBinding` |
| 57 | AliasType (depth-1) | Intermediate alias wrapper |
| 58 | AliasType (depth-2) | Intermediate alias wrapper |

The dependency chain had multiple "backward" edges (an entry depending on a later entry): depth-0 (30) → depth-1 (57) → depth-2 (58) → depth-3 UnionType (33) → IntersectionType (35). Propagating the fix through this chain required **4 iterations**, but the loop exited after only **2 iterations** (when IntersectionType/UnionType entries converged), leaving the AliasType entries stale.

### 2. Circular JS Object References in Definitions

The `getAllOfDefinitionReducer` uses `deepMerge` to combine properties from intersected types. `deepMerge` performs a shallow spread (`{ ...a, ...b }`), preserving references to the same sub-objects from the CRF cache. This creates **shared object references** between definitions:

```
BaseFieldsIBN.properties.fields  ──┐
                                    ├── same JS object (F)
anyOf[1].properties.fields       ──┘

F.items ── points to BindingNode def ── whose anyOf branches contain F
```

These circular JS object references caused `JSON.stringify` to fail with `TypeError: Converting circular structure to JSON`.

### 3. Incomplete Circular Reference Resolution

The `replaceCircularRefs` function walked definitions and replaced circular JS object references with `$ref` pointers. However, it could only resolve references to objects **directly registered** in the definitions map. When a circular reference went through an AliasType's cached definition (which shares its `anyOf` array with a named definition but is itself a different JS object), `replaceCircularRefs` couldn't find a `$ref` name for it and left the cycle intact.

## Fix

### `CircularReferenceTypeFormatter.ts`

Changed the convergence check to track **all** cached entries, not just IntersectionType/UnionType:

```typescript
// Before: only IntersectionType and UnionType were tracked
const convergenceIds = new Set<BaseType>();
for (const [type] of entries) {
    if (type instanceof IntersectionType || type instanceof UnionType) {
        convergenceIds.add(type);
    }
}

// After: every entry is checked for convergence
for (const [type, definition] of entries) {
    const oldJson = safeStringify(definition);
    // ... recompute ...
    if (safeStringify(definition) !== oldJson) {
        changed = true;
    }
}
```

### `replaceCircularRefs.ts`

Added `resolveRefName` — when a circular reference is detected to an object not directly in the definitions map, it checks whether the object's `anyOf`/`oneOf` array matches a named definition's array:

```typescript
function resolveRefName(val, objToName, arrayToName) {
    const direct = objToName.get(val) ?? arrayToName.get(val);
    if (direct) return direct;
    // Check if object shares anyOf/oneOf with a named definition
    if (val.anyOf) {
        const name = arrayToName.get(val.anyOf);
        if (name) return name;
    }
    // ... same for oneOf ...
}
```

Added `deepCloneDefinition` — a circular-reference-safe deep clone that converts cycles to `$ref` pointers during cloning, replacing the fragile `JSON.parse(JSON.stringify(...))` approach:

```typescript
function cloneValue(val, objToName, arrayToName, ancestors) {
    if (ancestors.has(val)) {
        const name = resolveRefName(val, objToName, arrayToName);
        return name ? { $ref: `#/definitions/${name}` } : {};
    }
    ancestors.add(val);
    // ... recursive clone ...
    ancestors.delete(val);
    return result;
}
```

### `removeUnreachable.ts`

Added a `WeakSet<object>` (`visited`) parameter to prevent infinite recursion when inline definitions contain circular JS object references:

```typescript
function addReachable(definition, definitions, reachable, visited = new WeakSet()) {
    if (visited.has(definition)) return;
    visited.add(definition);
    // ... recursive traversal ...
}
```

### `SchemaGenerator.ts`

Replaced `JSON.parse(JSON.stringify(def))` with the new `deepCloneDefinition` for both reachable definitions and the root type definition.

## Files Changed

| File | Change |
|------|--------|
| `src/CircularReferenceTypeFormatter.ts` | Track all entries for convergence, not just IntersectionType/UnionType |
| `src/Utils/replaceCircularRefs.ts` | Add `resolveRefName`, `deepCloneDefinition`, `buildNameMaps` exports |
| `src/Utils/removeUnreachable.ts` | Guard against circular object references with `WeakSet` |
| `src/SchemaGenerator.ts` | Use `deepCloneDefinition` instead of `JSON.parse(JSON.stringify(...))` |

## Test Coverage

- All 239 valid-data tests pass
- All 71 unit tests pass
- 8 intersection-union-nested tests cover the specific iwe-app-dsl patterns
- iwe-app-dsl `gen-schema.mjs` generates all schemas with 0 stale branches
