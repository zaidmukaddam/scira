import type { MetadataRoute } from 'next'
import { getGT } from 'gt-next/server'
 
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const t = await getGT()
  return {
    name: t("Scira - AI-powered Search Engine"),
    short_name: "Scira",
    description: t("A minimalistic AI-powered search engine that helps you find information on the internet using advanced AI models like GPT-4, Claude, and Grok"),
    start_url: "/",
    display: "standalone",
    categories: ["search", "ai", "productivity"],
    background_color: "#171717",
    icons: [
      {
        src: "/icon-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable"
      },
      {
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon"
      },
      {
        src: "/icon.png",
        sizes: "512x512",
        type: "image/png"
      },
      {
        src: "/apple-icon.png",
        sizes: "180x180",
        type: "image/png"
      }
    ],
    screenshots: [
      {
        src: "/opengraph-image.png",
        type: "image/png",
        sizes: "1200x630",
      }
    ]
  }
}