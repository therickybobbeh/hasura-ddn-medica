/**
 * OpenTelemetry initialization for distributed tracing
 */

import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-grpc';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { ExpressInstrumentation } from '@opentelemetry/instrumentation-express';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';

export function initializeTracing(): void {
  const serviceName = process.env.OTEL_SERVICE_NAME || 'typescript-connector';
  const otlpEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;

  if (!otlpEndpoint) {
    console.warn('OTEL_EXPORTER_OTLP_ENDPOINT not set, skipping tracing initialization');
    return;
  }

  const sdk = new NodeSDK({
    resource: new Resource({
      [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
      [SemanticResourceAttributes.SERVICE_VERSION]: '1.0.0',
    }),
    traceExporter: new OTLPTraceExporter({
      url: otlpEndpoint,
    }),
    instrumentations: [
      new HttpInstrumentation(),
      new ExpressInstrumentation(),
    ],
  });

  sdk.start();

  console.log(`OpenTelemetry tracing initialized for ${serviceName}`);

  // Gracefully shutdown tracing on process exit
  process.on('SIGTERM', () => {
    sdk.shutdown().then(() => console.log('Tracing terminated'));
  });
}
