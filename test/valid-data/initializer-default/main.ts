export class MyObject {
    /**
     * @default false
     */
    fromJsDocOnly?: boolean;

    /**
     * @default false
     */
    initializerWins?: boolean = true;

    boolInit?: boolean = false;
    strInit?: string = "hello";
    emptyObject?: Record<string, unknown> = {};
    emptyArray?: string[] = [];
    mode?: "search" | "select" = "search";

    /** non-literal — must not emit default from initializer */
    skipped?: number = Math.random();
}
