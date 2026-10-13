import { assertValidSchema } from "../../utils";
import { test } from "node:test";

test("valid-data - initializer-default", assertValidSchema("initializer-default", "MyObject"));
