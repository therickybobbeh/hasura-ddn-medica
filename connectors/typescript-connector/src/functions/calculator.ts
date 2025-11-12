/**
 * Calculator Function
 *
 * A simple example function that demonstrates:
 * - Multiple input parameters
 * - Enum types (operation)
 * - Error handling
 * - Number operations
 *
 * This shows how to implement more complex logic with validation.
 * Replace with your own business calculations.
 */

export type Operation = 'add' | 'subtract' | 'multiply' | 'divide';

export interface CalculatorInput {
  operation: Operation;
  a: number;
  b: number;
}

export interface CalculatorOutput {
  result: number;
  operation: Operation;
}

export async function calculator(input: CalculatorInput): Promise<CalculatorOutput> {
  let result: number;

  switch (input.operation) {
    case 'add':
      result = input.a + input.b;
      break;
    case 'subtract':
      result = input.a - input.b;
      break;
    case 'multiply':
      result = input.a * input.b;
      break;
    case 'divide':
      if (input.b === 0) {
        throw new Error('Cannot divide by zero');
      }
      result = input.a / input.b;
      break;
    default:
      throw new Error(`Unknown operation: ${input.operation}`);
  }

  return {
    result,
    operation: input.operation,
  };
}
