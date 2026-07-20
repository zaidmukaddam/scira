import 'server-only';

import { createVercelSpanExporter } from '@agentpond/vercel';
import { isOpenInferenceSpan, OpenInferenceSimpleSpanProcessor } from '@arizeai/openinference-vercel';
import { registerOTel } from '@vercel/otel';

export function registerAgentPond() {
  registerOTel({
    serviceName: 'scira',
    spanProcessors: [
      new OpenInferenceSimpleSpanProcessor({
        exporter: createVercelSpanExporter(),
        spanFilter: isOpenInferenceSpan,
        reparentOrphanedSpans: true,
      }),
    ],
  });
}
