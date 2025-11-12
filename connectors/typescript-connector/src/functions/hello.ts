/**
 * Hello World Function
 *
 * A simple example function that demonstrates:
 * - Basic input/output types
 * - String manipulation
 * - Function structure
 *
 * This is a minimal example to show how custom functions work.
 * Replace with your own business logic.
 */

export interface HelloInput {
  name: string;
}

export interface HelloOutput {
  message: string;
  timestamp: string;
}

export async function hello(input: HelloInput): Promise<HelloOutput> {
  return {
    message: `Hello, ${input.name}!`,
    timestamp: new Date().toISOString(),
  };
}
