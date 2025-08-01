import * as React from 'react';
import { Html, Head, Body, Container, Section, Img, Text, Button, Tailwind, Markdown } from '@react-email/components';

interface SearchCompletedEmailProps {
  chatTitle: string;
  assistantResponse: string;
  chatId: string;
}

const SearchCompletedEmail = (props: SearchCompletedEmailProps) => {
  return (
    <Html lang="en" dir="ltr">
      <Tailwind>
        <Head />
        <Body className="bg-white font-sans py-[40px]">
          <Container className="max-w-[560px] mx-auto px-[24px] py-[48px] bg-[#FFFFFF] border border-solid border-neutral-300 rounded-lg my-[24px]">
            <Section className="text-center mb-6">
              <Img src="https://scira.ai/icon.png" alt="Scira AI" className="w-[48px] h-[48px] mx-auto mb-[24px]" />
              <Text className="text-[24px] font-semibold text-[#020304] mb-[16px] m-0">Daily Lookout Complete</Text>
              <Text className="text-[14px] font-medium text-[#374151] bg-[#F3F4F6] px-[16px] py-[8px] rounded-lg inline-block m-0 !mt-2">
                {props.chatTitle}
              </Text>
            </Section>

            <Section className="mb-6">
              <Markdown
                markdownCustomStyles={{
                  h1: {
                    color: '#020304',
                    fontSize: '20px',
                    fontWeight: '600',
                    marginBottom: '20px',
                    marginTop: '32px',
                  },
                  h2: {
                    color: '#020304',
                    fontSize: '18px',
                    fontWeight: '600',
                    marginBottom: '16px',
                    marginTop: '32px',
                  },
                  h3: {
                    color: '#020304',
                    fontSize: '16px',
                    fontWeight: '600',
                    marginBottom: '12px',
                    marginTop: '24px',
                  },
                  p: {
                    color: '#374151',
                    fontSize: '16px',
                    lineHeight: '1.65',
                    marginBottom: '20px',
                    marginTop: '0',
                  },
                  ul: {
                    color: '#374151',
                    fontSize: '16px',
                    lineHeight: '1.65',
                    marginBottom: '20px',
                    paddingLeft: '24px',
                    marginTop: '0',
                  },
                  ol: {
                    color: '#374151',
                    fontSize: '16px',
                    lineHeight: '1.65',
                    marginBottom: '20px',
                    paddingLeft: '24px',
                    marginTop: '0',
                  },
                  li: { marginBottom: '8px' },
                  bold: { fontWeight: '600', color: '#020304' },
                  italic: { fontStyle: 'italic', color: '#6B7280' },
                  codeInline: {
                    backgroundColor: '#F3F4F6',
                    color: '#374151',
                    padding: '3px 6px',
                    borderRadius: '4px',
                    fontSize: '14px',
                    fontFamily:
                      'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
                  },
                  blockQuote: {
                    borderLeft: '3px solid #D1D5DB',
                    paddingLeft: '20px',
                    margin: '24px 0',
                    fontStyle: 'italic',
                    color: '#6B7280',
                  },
                }}
                markdownContainerStyles={{
                  fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif",
                }}
              >
                {props.assistantResponse}
              </Markdown>
            </Section>

            <Section className="text-center mb-[40px]">
              <Button
                href={`https://scira.ai/search/${props.chatId}`}
                className="bg-[#020304] text-white px-[32px] py-[14px] rounded-[8px] text-[16px] font-medium no-underline inline-block box-border"
              >
                View Full Report
              </Button>
            </Section>

            <Section className="text-center border-t border-solid border-black/30 pt-[32px]">
              <Img src="https://scira.ai/icon.png" alt="Scira AI" className="w-[32px] h-[32px] mx-auto mb-[16px]" />
              <Text className="text-[14px] text-[#6B7280] m-0">
                Scira AI •{' '}
                <a href="https://scira.ai" className="text-[#6B7280] no-underline">
                  scira.ai
                </a>
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

SearchCompletedEmail.PreviewProps = {
  chatTitle: 'Latest AI Developments in Healthcare',
  assistantResponse:
    '# AI Healthcare Breakthrough\n\nRecent developments in AI-powered medical diagnostics have shown **remarkable progress** in early disease detection.\n\n## Key Findings:\n- 95% accuracy in cancer screening\n- Reduced diagnosis time by 60%\n- Cost-effective implementation\n\n*This represents a significant advancement in medical technology.*',
  chatId: 'chat-123-example',
};

export default SearchCompletedEmail;
