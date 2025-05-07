import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { GeistSans } from "geist/font/sans";
import "katex/dist/katex.min.css";
import "mapbox-gl/dist/mapbox-gl.css";
import { Metadata, Viewport } from "next";
import { Syne } from "next/font/google";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { Toaster } from "sonner";
import "./globals.css";
import { Providers } from "./providers";
import { getLocale } from "gt-next/server";
import { GTProvider } from "gt-next";

export const metadata: Metadata = {
	metadataBase: new URL("https://scira.ai"),
	title: "Scira AI",
	description:
		"Scira AI is a minimalistic AI-powered search engine that helps you find information on the internet.",
	openGraph: {
		url: "https://scira.ai",
		siteName: "Scira AI",
	},
	keywords: [
		"scira.ai",
		"scira ai",
		"Scira AI",
		"scira AI",
		"SCIRA.AI",
		"scira github",
		"ai search engine",
		"Scira",
		"scira",
		"scira.app",
		"scira ai",
		"scira ai app",
		"scira",
		"MiniPerplx",
		"Scira AI",
		"open source ai search engine",
		"minimalistic ai search engine",
		"ai search engine",
		"Scira (Formerly MiniPerplx)",
		"AI Search Engine",
		"mplx.run",
		"mplx ai",
		"zaid mukaddam",
		"scira.how",
		"search engine",
		"AI",
		"perplexity",
	],
};

export const viewport: Viewport = {
	width: "device-width",
	initialScale: 1,
	minimumScale: 1,
	maximumScale: 1,
	userScalable: false,
	themeColor: [
		{ media: "(prefers-color-scheme: light)", color: "#ffffff" },
		{ media: "(prefers-color-scheme: dark)", color: "#0A0A0A" },
	],
};

const syne = Syne({
	subsets: ["latin"],
	variable: "--font-syne",
	preload: true,
	display: "swap",
});

export default async function RootLayout({
	children,
}: Readonly<{ children: React.ReactNode }>) {
	return (
		<html suppressHydrationWarning lang={await getLocale()}>
			<body
				className={`${GeistSans.variable} ${syne.variable} font-sans antialiased`}
				suppressHydrationWarning
			>
				<GTProvider>
					<NuqsAdapter>
						<Providers>
							<Toaster position="top-center" />
							{children}
						</Providers>
					</NuqsAdapter>
					<Analytics />
					<SpeedInsights />
				</GTProvider>
			</body>
		</html>
	);
}
