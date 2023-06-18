export enum BinaryLogicalOperator {
    AND = "AND",
    OR = "OR",
    XOR = "XOR",
}

export enum UnaryLogicalOperator {
    NOT = "NOT",
}

export interface LogicalOperation {
    operator: LogicalExpression
    left: boolean
}

export type LogicalExpression = BinaryOperation | UnaryOperation | Variable

export enum LogicalExpressionKind {
    BinaryOperation,
    UnaryOperation,
    Variable,
}

export interface BinaryOperation {
    kind: LogicalExpressionKind.BinaryOperation
    operator: BinaryLogicalOperator
    left: LogicalExpression
    right: LogicalExpression
}

export interface UnaryOperation {
    kind: LogicalExpressionKind.UnaryOperation
    operator: UnaryLogicalOperator
    operand: LogicalExpression
}

export interface Variable {
    kind: LogicalExpressionKind.Variable
    name: string
}

export type Variables = Record<string, Bit>

export const expression_to_string = (expression: LogicalExpression, variables?: Variables): string => {
    switch (expression.kind) {
        case LogicalExpressionKind.BinaryOperation: {
            const left = expression_to_string(expression.left, variables)
            const right = expression_to_string(expression.right, variables)
            return `(${left} ${expression.operator} ${right})`
        }
        case LogicalExpressionKind.UnaryOperation: {
            const operand = expression_to_string(expression.operand, variables)
            return `(${expression.operator} ${operand})`
        }
        case LogicalExpressionKind.Variable: {
            if (variables) {
                const value = variables[expression.name]
                if (!value) return expression.name
                return value.toString()
            }
            return expression.name
        }
    }
}

export enum Bit {
    Zero = 0,
    One = 1,
}

interface CalcProcess {
    operator: string
    left?: {
        value: Bit
        ref_index: number | string
    }
    right: {
        value: Bit
        ref_index: number | string
    }
    result: Bit
    index: number
}

export default class Calculator {
    // X=1, Y=0, X OR (NOT Y)
    // => NOT Y = 1
    // => X OR 1 = 1
    calc_processes: CalcProcess[]
    calc_processes_index: number = 0
    errors: string[] = []

    constructor(public variables: Variables) {
        this.calc_processes = []
    }

    calculate(expression: LogicalExpression): Bit | null {
        switch (expression.kind) {
            case LogicalExpressionKind.BinaryOperation:
                return this.calculateBinaryOperation(expression)
            case LogicalExpressionKind.UnaryOperation:
                return this.calculateUnaryOperation(expression)
            case LogicalExpressionKind.Variable:
                return this.calculateVariable(expression)
        }
    }

    private calculateBinaryOperation(expression: BinaryOperation): Bit | null {
        const left = this.calculate(expression.left)
        const right = this.calculate(expression.right)

        if (left === null || right === null) return null

        let result
        switch (expression.operator) {
            case BinaryLogicalOperator.AND:
                result = this.calculateAnd(left, right)
                break
            case BinaryLogicalOperator.OR:
                result = this.calculateOr(left, right)
                break
            case BinaryLogicalOperator.XOR:
                result = this.calculateXor(left, right)
                break
        }

        const left_ref_index = this.calc_processes_index - 2
        const right_ref_index = this.calc_processes_index - 1

        this.calc_processes.push({
            operator: expression.operator,
            left: left_ref_index >= 0 ? { value: left, ref_index: left_ref_index } : { value: left, ref_index: (expression.left as Variable).name },
            right: right_ref_index >= 0 ? { value: right, ref_index: right_ref_index } : { value: right, ref_index: (expression.left as Variable).name },
            result,
            index: this.calc_processes_index++,
        })

        return result
    }

    private calculateAnd(left: Bit, right: Bit): Bit {
        if (left === Bit.One && right === Bit.One) return Bit.One

        return Bit.Zero
    }

    private calculateOr(left: Bit, right: Bit): Bit {
        if (left === Bit.One || right === Bit.One) return Bit.One

        return Bit.Zero
    }

    private calculateXor(left: Bit, right: Bit): Bit {
        if (left === right) return Bit.Zero

        return Bit.One
    }

    private calculateUnaryOperation(expression: UnaryOperation): Bit | null {
        const operand = this.calculate(expression.operand)
        if (operand === null) return null

        let result

        switch (expression.operator) {
            case UnaryLogicalOperator.NOT:
                result = this.calculateNot(operand)
                break
        }

        const ref_index = this.calc_processes_index - 1

        this.calc_processes.push({
            operator: expression.operator,
            right: ref_index >= 0 ? { value: operand, ref_index } : { value: operand, ref_index: (expression.operand as Variable).name },
            result,
            index: this.calc_processes_index++,
        })

        return result
    }

    private calculateNot(operand: Bit): Bit {
        if (operand === Bit.Zero) return Bit.One

        return Bit.Zero
    }

    private calculateVariable(expression: Variable): Bit | null {
        const variable = this.variables[expression.name]
        if (variable === undefined) {
            this.errors.push(`Variable ${expression.name} not found`)
            return null
        }
        return variable
    }
}
