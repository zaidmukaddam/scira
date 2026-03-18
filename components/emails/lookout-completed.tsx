import * as React from 'react';
import {
  Html,
  Head,
  Preview,
  Body,
  Container,
  Section,
  Img,
  Text,
  Button,
  Link,
  Hr,
  Tailwind,
  Markdown,
  pixelBasedPreset,
  type TailwindConfig,
} from '@react-email/components';

interface LookoutCompletedEmailProps {
  chatTitle: string;
  assistantResponse: string;
  chatId: string;
}

// Brand colors derived from globals.css (OKLCH converted to hex)
const colors = {
  primary: '#654a3a', // warm brown - oklch(0.4341 0.0392 41.9938)
  primaryForeground: '#ffffff',
  secondary: '#ede4d3', // cream/beige - oklch(0.92 0.0651 74.3695)
  secondaryForeground: '#5c4533', // oklch(0.3499 0.0685 40.8288)
  foreground: '#1f1f1f', // near black - oklch(0.2435 0 0)
  background: '#fafafa', // off-white - oklch(0.9821 0 0)
  card: '#fdfdfd', // almost white - oklch(0.9911 0 0)
  muted: '#f3f3f3', // light gray - oklch(0.9521 0 0)
  mutedForeground: '#787878', // medium gray - oklch(0.5032 0 0)
  border: '#dedede', // light gray - oklch(0.8822 0 0)
};

const tailwindConfig = {
  presets: [pixelBasedPreset],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: colors.primary,
          'primary-foreground': colors.primaryForeground,
          secondary: colors.secondary,
          'secondary-foreground': colors.secondaryForeground,
          foreground: colors.foreground,
          background: colors.background,
          card: colors.card,
          muted: colors.muted,
          'muted-foreground': colors.mutedForeground,
          border: colors.border,
        },
      },
    },
  },
} satisfies TailwindConfig;

const markdownStyles = {
  h1: {
    color: colors.foreground,
    fontSize: '22px',
    fontWeight: '600',
    marginBottom: '16px',
    marginTop: '28px',
    letterSpacing: '-0.02em',
  },
  h2: {
    color: colors.foreground,
    fontSize: '18px',
    fontWeight: '600',
    marginBottom: '12px',
    marginTop: '24px',
    letterSpacing: '-0.015em',
  },
  h3: {
    color: colors.foreground,
    fontSize: '16px',
    fontWeight: '600',
    marginBottom: '10px',
    marginTop: '20px',
  },
  p: {
    color: colors.mutedForeground,
    fontSize: '15px',
    lineHeight: '1.7',
    marginBottom: '16px',
    marginTop: '0',
  },
  ul: {
    color: colors.mutedForeground,
    fontSize: '15px',
    lineHeight: '1.7',
    marginBottom: '16px',
    paddingLeft: '20px',
    marginTop: '0',
  },
  ol: {
    color: colors.mutedForeground,
    fontSize: '15px',
    lineHeight: '1.7',
    marginBottom: '16px',
    paddingLeft: '20px',
    marginTop: '0',
  },
  li: { marginBottom: '6px' },
  bold: { fontWeight: '600', color: colors.foreground },
  italic: { fontStyle: 'italic', color: colors.mutedForeground },
  codeInline: {
    backgroundColor: colors.muted,
    color: colors.foreground,
    padding: '2px 6px',
    borderRadius: '4px',
    fontSize: '13px',
    fontFamily:
      'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
  },
  blockQuote: {
    borderLeft: `3px solid ${colors.primary}`,
    paddingLeft: '16px',
    margin: '20px 0',
    fontStyle: 'italic',
    color: colors.mutedForeground,
  },
};

function LookoutCompletedEmail({
  chatTitle,
  assistantResponse,
  chatId,
}: LookoutCompletedEmailProps) {
  const previewText = `Your Daily Lookout is ready: ${chatTitle}`;

  return (
    <Html lang="en" dir="ltr">
      <Tailwind config={tailwindConfig}>
        <Head />
        <Preview>{previewText}</Preview>
        <Body className="bg-brand-background font-sans m-0 p-0">
          {/* Outer wrapper for mobile padding */}
          <Container
            className="mx-auto"
            style={{ maxWidth: '100%', width: '100%', padding: '16px' }}
          >
            {/* Inner card */}
            <Container
              className="mx-auto bg-brand-card overflow-hidden"
              style={{
                maxWidth: '580px',
                width: '100%',
                borderRadius: '12px',
              }}
            >
              {/* Header with accent bar */}
              <Section
                className="h-1.5"
                style={{ backgroundColor: colors.primary }}
              />

              {/* Logo and title */}
              <Section
                className="text-center"
                style={{ padding: '32px 24px 20px' }}
              >
                <Img
                  src="https://scira.ai/icon.png"
                  alt="Scira AI"
                  width={44}
                  height={44}
                  className="mx-auto"
                  style={{ marginBottom: '20px' }}
                />
                <Text
                  className="font-semibold text-brand-foreground m-0"
                  style={{ fontSize: '22px', marginBottom: '12px' }}
                >
                  Your Lookout is Ready
                </Text>
                <Text
                  className="font-medium text-brand-secondary-foreground bg-brand-secondary rounded-full inline-block m-0"
                  style={{
                    fontSize: '13px',
                    padding: '8px 16px',
                    maxWidth: '100%',
                    wordBreak: 'break-word',
                  }}
                >
                  {chatTitle}
                </Text>
              </Section>

              <Hr
                className="border-brand-border my-0"
                style={{ marginLeft: '24px', marginRight: '24px' }}
              />

              {/* Content */}
              <Section style={{ padding: '24px' }}>
                <Markdown
                  markdownCustomStyles={markdownStyles}
                  markdownContainerStyles={{
                    fontFamily:
                      "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                  }}
                >
                  {assistantResponse}
                </Markdown>
              </Section>

              {/* CTA */}
              <Section className="text-center" style={{ padding: '0 24px 32px' }}>
                <Button
                  href={`https://scira.ai/search/${chatId}`}
                  className="bg-brand-primary text-brand-primary-foreground font-medium no-underline"
                  style={{
                    display: 'inline-block',
                    padding: '12px 28px',
                    borderRadius: '8px',
                    fontSize: '14px',
                  }}
                >
                  View Full Report
                </Button>
              </Section>

              {/* Footer */}
              <Section
                className="bg-brand-muted text-center"
                style={{ padding: '24px' }}
              >
                <Img
                  src="https://scira.ai/icon.png"
                  alt="Scira AI"
                  width={24}
                  height={24}
                  className="mx-auto"
                  style={{ marginBottom: '12px', opacity: 0.7 }}
                />
                <Text
                  className="text-brand-muted-foreground m-0"
                  style={{ fontSize: '12px', marginBottom: '4px' }}
                >
                  This is an automated notification from your Daily Lookout.
                </Text>
                <Text
                  className="text-brand-muted-foreground m-0"
                  style={{ fontSize: '12px' }}
                >
                  <Link
                    href="https://scira.ai"
                    className="text-brand-primary no-underline"
                  >
                    scira.ai
                  </Link>
                </Text>
              </Section>
            </Container>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}

LookoutCompletedEmail.PreviewProps = {
  chatTitle: 'Latest AI Developments in Healthcare',
  assistantResponse:
    '# AI Healthcare Breakthrough\n\nRecent developments in AI-powered medical diagnostics have shown **remarkable progress** in early disease detection.\n\n## Key Findings\n\n- 95% accuracy in cancer screening\n- Reduced diagnosis time by 60%\n- Cost-effective implementation across hospitals\n\n> This represents a significant advancement in medical technology that could save millions of lives.\n\n*Stay informed with your daily AI-powered research updates.*',
  chatId: 'chat-123-example',
} satisfies LookoutCompletedEmailProps;

export default LookoutCompletedEmail;
