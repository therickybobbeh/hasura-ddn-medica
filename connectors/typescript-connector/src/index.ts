/**
 * Custom TypeScript Connector for Hasura DDN v3
 *
 * This connector provides custom business logic functions that can be accessed via GraphQL.
 *
 * Example functions included:
 * - hello: Simple greeting function
 * - calculator: Basic arithmetic operations
 *
 * TODO: Replace these with your own business logic functions
 * See examples/typescript-connector/HOW_TO_USE.md for detailed guide
 */

import express, { Request, Response } from 'express';
import { Pool } from 'pg';
import pino from 'pino';
import { initializeTracing } from './telemetry';
import {
  hello,
  calculator,
} from './functions';

// Initialize tracing
initializeTracing();

// Initialize logger
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport:
    process.env.NODE_ENV !== 'production'
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
          },
        }
      : undefined,
});

// Initialize database connection pool (optional - only if your functions need database access)
// TODO: Remove this if you don't need database connectivity
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

// Test database connection
pool.on('connect', () => {
  logger.info('Database connection established');
});

pool.on('error', (err) => {
  logger.error({ err }, 'Unexpected database error');
  process.exit(-1);
});

// Create Express app
const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  logger.info({
    method: req.method,
    path: req.path,
    query: req.query,
  }, 'Incoming request');
  next();
});

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Ready check endpoint
app.get('/ready', async (req: Request, res: Response) => {
  try {
    // TODO: Remove database check if you don't use database
    await pool.query('SELECT 1');
    res.json({ status: 'ready', timestamp: new Date().toISOString() });
  } catch (error) {
    logger.error({ error }, 'Database not ready');
    res.status(503).json({ status: 'not ready', error: 'Database connection failed' });
  }
});

// Connector metadata endpoint
// TODO: Update this with your function definitions
app.get('/schema', (req: Request, res: Response) => {
  res.json({
    connector: {
      name: 'typescript-connector',
      version: '1.0.0',
      capabilities: {
        query: true,
        mutation: true,
      },
    },
    functions: [
      {
        name: 'hello',
        description: 'Simple greeting function that returns a personalized message',
        arguments: [
          { name: 'name', type: 'string', required: true },
        ],
        result_type: 'HelloOutput',
      },
      {
        name: 'calculator',
        description: 'Performs basic arithmetic operations (add, subtract, multiply, divide)',
        arguments: [
          { name: 'operation', type: 'string', required: true },
          { name: 'a', type: 'number', required: true },
          { name: 'b', type: 'number', required: true },
        ],
        result_type: 'CalculatorOutput',
      },
      // TODO: Add your custom function definitions here
    ],
  });
});

// Function execution endpoint
// TODO: Add your function routing here
app.post('/query', async (req: Request, res: Response) => {
  const { function_name, arguments: args } = req.body;

  logger.info({ function_name, arguments: args }, 'Executing function');

  try {
    let result;

    switch (function_name) {
      case 'hello':
        result = await hello(args);
        break;

      case 'calculator':
        result = await calculator(args);
        break;

      // TODO: Add your custom function cases here
      // case 'myFunction':
      //   result = await myFunction(args);
      //   break;

      default:
        return res.status(400).json({
          error: `Unknown function: ${function_name}`,
        });
    }

    res.json({ result });
  } catch (error) {
    logger.error({ error, function_name, arguments: args }, 'Function execution error');
    res.status(500).json({
      error: 'Function execution failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: Function) => {
  logger.error({ err, path: req.path }, 'Unhandled error');
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV !== 'production' ? err.message : undefined,
  });
});

// Start server
app.listen(PORT, () => {
  logger.info({ port: PORT }, 'TypeScript Connector started');
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await pool.end();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  await pool.end();
  process.exit(0);
});
