"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLiteralInitializerDefault = getLiteralInitializerDefault;
const tslib_1 = require("tslib");
const typescript_1 = tslib_1.__importDefault(require("typescript"));
function parseLiteral(expr) {
    switch (expr.kind) {
        case typescript_1.default.SyntaxKind.TrueKeyword:
            return true;
        case typescript_1.default.SyntaxKind.FalseKeyword:
            return false;
        case typescript_1.default.SyntaxKind.NullKeyword:
            return null;
        case typescript_1.default.SyntaxKind.StringLiteral:
            return expr.text;
        case typescript_1.default.SyntaxKind.NoSubstitutionTemplateLiteral:
            return expr.text;
        case typescript_1.default.SyntaxKind.NumericLiteral:
            return Number(expr.text);
        case typescript_1.default.SyntaxKind.PrefixUnaryExpression: {
            const u = expr;
            if (u.operator === typescript_1.default.SyntaxKind.MinusToken && typescript_1.default.isNumericLiteral(u.operand)) {
                return -Number(u.operand.text);
            }
            return undefined;
        }
        case typescript_1.default.SyntaxKind.ParenthesizedExpression:
            return parseLiteral(expr.expression);
        case typescript_1.default.SyntaxKind.AsExpression:
            return parseLiteral(expr.expression);
        case typescript_1.default.SyntaxKind.TypeAssertionExpression:
            return parseLiteral(expr.expression);
        case typescript_1.default.SyntaxKind.ObjectLiteralExpression: {
            const o = expr;
            if (o.properties.length === 0) {
                return {};
            }
            return undefined;
        }
        case typescript_1.default.SyntaxKind.ArrayLiteralExpression: {
            const a = expr;
            if (a.elements.length === 0) {
                return [];
            }
            return undefined;
        }
        default:
            return undefined;
    }
}
function getLiteralInitializerDefault(node) {
    let initializer;
    if (typescript_1.default.isPropertyDeclaration(node) || typescript_1.default.isParameter(node)) {
        initializer = node.initializer;
    }
    if (!initializer) {
        return undefined;
    }
    return parseLiteral(initializer);
}
//# sourceMappingURL=getLiteralInitializerDefault.js.map