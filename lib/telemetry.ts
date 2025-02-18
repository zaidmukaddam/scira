import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { SimpleSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { serverEnv } from '@/env/server';

// Configure the OpenTelemetry SDK
export const otelSDK = new NodeSDK({
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: serverEnv.OTEL_SERVICE_NAME || 'scira',
  }),
  spanProcessor: new SimpleSpanProcessor(
    new OTLPTraceExporter({
      url: serverEnv.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/traces',
    })
  ),
});

// Start the SDK only if telemetry is enabled
export function startTracing() {
  if (!serverEnv.TELEMETRY_ENABLED) {
    console.log('Telemetry is disabled');
    return;
  }

  try {
    otelSDK.start();
    console.log('Tracing initialized');
  } catch (error) {
    console.error('Error initializing tracing', error);
  }
}

// Shutdown the SDK
export function stopTracing() {
  otelSDK.shutdown()
    .then(() => console.log('Tracing terminated'))
    .catch((error) => console.error('Error terminating tracing', error));
}
