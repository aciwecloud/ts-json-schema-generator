import ts from "typescript";

function parseLiteral(expr: ts.Expression): unknown {
    switch (expr.kind) {
        case ts.SyntaxKind.TrueKeyword:
            return true;
        case ts.SyntaxKind.FalseKeyword:
            return false;
        case ts.SyntaxKind.NullKeyword:
            return null;
        case ts.SyntaxKind.StringLiteral:
            return (expr as ts.StringLiteral).text;
        case ts.SyntaxKind.NoSubstitutionTemplateLiteral:
            return (expr as ts.NoSubstitutionTemplateLiteral).text;
        case ts.SyntaxKind.NumericLiteral:
            return Number((expr as ts.NumericLiteral).text);
        case ts.SyntaxKind.PrefixUnaryExpression: {
            const u = expr as ts.PrefixUnaryExpression;
            if (u.operator === ts.SyntaxKind.MinusToken && ts.isNumericLiteral(u.operand)) {
                return -Number(u.operand.text);
            }
            return undefined;
        }
        case ts.SyntaxKind.ParenthesizedExpression:
            return parseLiteral((expr as ts.ParenthesizedExpression).expression);
        case ts.SyntaxKind.AsExpression:
            return parseLiteral((expr as ts.AsExpression).expression);
        case ts.SyntaxKind.TypeAssertionExpression:
            return parseLiteral((expr as ts.TypeAssertion).expression);
        case ts.SyntaxKind.ObjectLiteralExpression: {
            const o = expr as ts.ObjectLiteralExpression;
            if (o.properties.length === 0) {
                return {};
            }
            return undefined;
        }
        case ts.SyntaxKind.ArrayLiteralExpression: {
            const a = expr as ts.ArrayLiteralExpression;
            if (a.elements.length === 0) {
                return [];
            }
            return undefined;
        }
        default:
            return undefined;
    }
}

export function getLiteralInitializerDefault(node: ts.Node): unknown {
    let initializer: ts.Expression | undefined;
    if (ts.isPropertyDeclaration(node) || ts.isParameter(node)) {
        initializer = node.initializer;
    }
    if (!initializer) {
        return undefined;
    }
    return parseLiteral(initializer);
}
