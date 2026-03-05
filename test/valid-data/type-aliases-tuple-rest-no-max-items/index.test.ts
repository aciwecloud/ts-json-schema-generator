import assert from "node:assert";
import path from "node:path";
import { test } from "node:test";
import { createGenerator } from "../../../factory/generator.js";
import { DEFAULT_CONFIG } from "../../../src/Config.js";
import { assertValidSchema } from "../../utils";

const testDir = "type-aliases-tuple-rest-no-max-items";

test("valid-data - type-aliases-tuple-rest-no-max-items", assertValidSchema(testDir, "TupleWithRestRef"));

test("tuple with rest type must not have maxItems in schema", async () => {
    const config = {
        ...DEFAULT_CONFIG,
        path: path.resolve("test/valid-data", testDir, "*.ts"),
        type: "TupleWithRestRef" as const,
        skipTypeCheck: !!process.env.FAST_TEST,
    };

    const generator = createGenerator(config);
    const schema = generator.createSchema(config.type);

    const defs = schema.definitions ?? {};
    const tupleDef = defs["TupleWithRestRef"] as Record<string, unknown> | undefined;
    assert.ok(tupleDef && typeof tupleDef === "object", "TupleWithRestRef definition should exist");
    assert.strictEqual(tupleDef.type, "array", "TupleWithRestRef should be an array type");
    assert.ok(
        !("maxItems" in tupleDef),
        "Tuple with rest element must not have maxItems (variable-length tuple)",
    );
    assert.ok("additionalItems" in tupleDef, "Tuple with rest type must have additionalItems");
    const additionalItems = tupleDef.additionalItems as Record<string, unknown> | undefined;
    assert.ok(
        additionalItems && typeof additionalItems === "object",
        "additionalItems should be an object schema",
    );
    assert.strictEqual(
        additionalItems.type,
        "string",
        "additionalItems should describe the rest element type (RestItems = string[])",
    );
});
