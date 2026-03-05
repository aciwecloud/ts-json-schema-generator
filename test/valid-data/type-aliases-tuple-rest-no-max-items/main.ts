/**
 * Tuple with rest element where the rest type is an exported alias.
 * Ensures the schema does NOT emit maxItems (variable-length tuple).
 */
export type RestItems = string[];
export type TupleWithRestRef = [number, ...RestItems];
