/** Map of MCP server URL → custom icon path (served from /public). */
export const MCP_CATALOG_ICONS: Record<string, string> = {
  'https://penny.apps.trychannel3.com/mcp': '/penny.png',
  'https://mcp.exa.ai/mcp': '/exa-color.svg',
};

export function getMcpCatalogIcon(serverUrl: string): string | undefined {
  return MCP_CATALOG_ICONS[serverUrl.replace(/\/+$/, '')];
}

/** URLs that use a React component icon instead of an img src. */
export const MCP_COMPONENT_ICON_URLS = new Set([
  'https://api.githubcopilot.com/mcp',
]);
