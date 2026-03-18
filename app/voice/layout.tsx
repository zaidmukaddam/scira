import { Metadata } from "next";

const title = "Scira Voice";
const description = "Have a voice conversation with Scira AI. Ask questions, search the web, and get real-time responses with our advanced voice AI assistant.";

export const metadata: Metadata = {
  title,
  description,
  openGraph: {
    title,
    description,
    url: "https://scira.ai/voice",
    siteName: "Scira AI",
    type: "website",
    images: [
      {
        url: "https://scira.ai/voice/opengraph-image.png",
        width: 1200,
        height: 630,
        alt: "Scira Voice - AI Voice Assistant",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: ["https://scira.ai/voice/twitter-image.png"],
    creator: "@sciraai",
  },
  alternates: {
    canonical: "https://scira.ai/voice",
  },
};

export default function VoiceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
