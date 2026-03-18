'use client';

import { useState, useMemo, Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useUser } from '@/contexts/user-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { sileo } from 'sileo';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs as KumoTabs } from '@cloudflare/kumo';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn, normalizeError } from '@/lib/utils';
import { Plus, Check, Search, Loader2, MoreHorizontal, Trash2, Zap, Link2Off, LinkIcon, Blocks, ArrowUpRight, Pencil, ChevronDown, Wrench } from 'lucide-react';
import { AppsIcon } from '@/components/icons/apps-icon';
import { parseAsString, useQueryState } from 'nuqs';
import { getMcpCatalogIcon, MCP_COMPONENT_ICON_URLS } from '@/lib/mcp/catalog-icons';
import { Github01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@/components/ui/hugeicons';


// ─── Types ────────────────────────────────────────────────────────────────────

type CatalogAuth = 'oauth' | 'apikey' | 'open';
type CategoryId = 'all' | 'dev' | 'productivity' | 'design' | 'crm' | 'payments' | 'database' | 'search' | 'data' | 'travel' | 'email' | 'shopping' | 'other';

interface CatalogField {
  label: string;
  placeholder: string;
  headerName: string;
  hintText?: string;
  hintUrl?: string;
  steps?: Array<{ text: string; url?: string; urlLabel?: string }>;
}

interface OAuthSetupField {
  label: string;
  placeholder: string;
  hintText?: string;
  hintUrl?: string;
  key: 'oauthClientId' | 'oauthClientSecret';
}

interface CatalogItem {
  name: string;
  category: CategoryId;
  url: string;
  auth: CatalogAuth;
  maintainer: string;
  maintainerUrl: string;
  customIcon?: string;
  fields?: CatalogField[];
  oauthSetup?: OAuthSetupField[];
}

// ─── Catalog data ─────────────────────────────────────────────────────────────

const CATEGORIES: { id: CategoryId; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'dev', label: 'Dev Tools' },
  { id: 'productivity', label: 'Productivity' },
  { id: 'design', label: 'Design' },
  { id: 'crm', label: 'CRM' },
  { id: 'payments', label: 'Payments' },
  { id: 'database', label: 'Database' },
  { id: 'search', label: 'Search' },
  { id: 'data', label: 'Data' },
  { id: 'travel', label: 'Travel' },
  { id: 'email', label: 'Email' },
  { id: 'shopping', label: 'Shopping' },
  { id: 'other', label: 'Other' },
];

const CATALOG: CatalogItem[] = [
  { name: 'Asana', category: 'productivity', url: 'https://mcp.asana.com/sse', auth: 'oauth', maintainer: 'Asana', maintainerUrl: 'https://asana.com' },
  { name: 'Autosend', category: 'email', url: 'https://mcp.autosend.com/', auth: 'oauth', maintainer: 'Autosend', maintainerUrl: 'https://autosend.com' },
  {
    name: 'Google Workspace', category: 'productivity', url: 'https://google-mcp.scira.app/mcp', auth: 'apikey', maintainer: 'Google', maintainerUrl: 'https://google.com',
    fields: [{
      label: 'API Key', placeholder: 'gmc_…', headerName: 'Authorization',
      hintText: 'Get API key', hintUrl: 'https://google-mcp.scira.app',
      steps: [
        { text: 'Go to the Google MCP dashboard and sign in with Google', url: 'https://google-mcp.scira.app', urlLabel: 'Open dashboard' },
        { text: 'Google will show an "unverified app" warning — click Advanced → Go to Scira (unsafe) to continue. This is expected for developer tools.' },
        { text: 'Select all services you want: Google Calendar, Google Sheets, Gmail, Google Docs, Google Drive' },
        { text: 'Set API key expiration to Never (recommended)' },
        { text: 'Copy the generated API key (starts with gmc_) and paste it above' },
        { text: 'To Revoke or Manage the API Key, go to https://google-mcp.scira.app/revoke and paste the API key and click "Revoke".' },
      ],
    }],
  },
  { name: 'Atlassian', category: 'dev', url: 'https://mcp.atlassian.com/v1/sse', auth: 'oauth', maintainer: 'Atlassian', maintainerUrl: 'https://atlassian.com' },
  { name: 'Attio', category: 'crm', url: 'https://mcp.attio.com/mcp', auth: 'oauth', maintainer: 'Attio', maintainerUrl: 'https://attio.com' },
  { name: 'Box', category: 'productivity', url: 'https://mcp.box.com', auth: 'oauth', maintainer: 'Box', maintainerUrl: 'https://box.com' },
  // {
  //   name: 'Canva',
  //   category: 'design',
  //   url: 'https://mcp.canva.com/mcp',
  //   auth: 'oauth',
  //   maintainer: 'Canva',
  //   maintainerUrl: 'https://canva.com',
  //   oauthSetup: [
  //     {
  //       key: 'oauthClientId',
  //       label: 'Canva Client ID',
  //       placeholder: 'xxxxxxxxxxxxxxxx',
  //       hintText: 'Create a Canva app and copy Client ID',
  //       hintUrl: 'https://www.canva.com/developers',
  //     },
  //     {
  //       key: 'oauthClientSecret',
  //       label: 'Canva Client Secret',
  //       placeholder: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
  //       hintText: 'Allow your app host and add redirect URL in Canva app settings',
  //       hintUrl: 'https://www.canva.com/developers',
  //     },
  //   ],
  // },
  { name: 'Close CRM', category: 'crm', url: 'https://mcp.close.com/mcp', auth: 'oauth', maintainer: 'Close', maintainerUrl: 'https://close.com' },
  { name: 'Cloudflare', category: 'dev', url: 'https://mcp.cloudflare.com/mcp', auth: 'oauth', maintainer: 'Cloudflare', maintainerUrl: 'https://cloudflare.com' },
  { name: 'Cloudflare Workers', category: 'dev', url: 'https://bindings.mcp.cloudflare.com/sse', auth: 'oauth', maintainer: 'Cloudflare', maintainerUrl: 'https://cloudflare.com' },
  { name: 'Cloudflare Observability', category: 'dev', url: 'https://observability.mcp.cloudflare.com/sse', auth: 'oauth', maintainer: 'Cloudflare', maintainerUrl: 'https://cloudflare.com' },
  { name: 'Cloudinary', category: 'design', url: 'https://asset-management.mcp.cloudinary.com/sse', auth: 'oauth', maintainer: 'Cloudinary', maintainerUrl: 'https://cloudinary.com' },
  // { name: 'Figma', category: 'design', url: 'https://mcp.figma.com/mcp', auth: 'oauth', maintainer: 'Figma', maintainerUrl: 'https://figma.com' },
  { name: 'GitHub', category: 'dev', url: 'https://api.githubcopilot.com/mcp', auth: 'oauth', maintainer: 'GitHub', maintainerUrl: 'https://github.com' },
  { name: 'Hugging Face', category: 'dev', url: 'https://huggingface.co/mcp?login', auth: 'oauth', maintainer: 'Hugging Face', maintainerUrl: 'https://huggingface.co' },
  { name: 'Intercom', category: 'crm', url: 'https://mcp.intercom.com/sse', auth: 'oauth', maintainer: 'Intercom', maintainerUrl: 'https://intercom.com' },
  { name: 'Indeed', category: 'other', url: 'https://mcp.indeed.com/claude/mcp', auth: 'oauth', maintainer: 'Indeed', maintainerUrl: 'https://indeed.com' },
  { name: 'InVideo', category: 'other', url: 'https://mcp.invideo.io/sse', auth: 'oauth', maintainer: 'InVideo', maintainerUrl: 'https://invideo.io' },
  { name: 'Instant', category: 'dev', url: 'https://mcp.instantdb.com/mcp', auth: 'oauth', maintainer: 'Instant', maintainerUrl: 'https://instantdb.com' },
  { name: 'Jam', category: 'dev', url: 'https://mcp.jam.dev/mcp', auth: 'oauth', maintainer: 'Jam.dev', maintainerUrl: 'https://jam.dev' },
  { name: 'Knock', category: 'crm', url: 'https://mcp.knock.app/mcp', auth: 'oauth', maintainer: 'Knock', maintainerUrl: 'https://knock.app' },
  { name: 'Linear', category: 'productivity', url: 'https://mcp.linear.app/mcp', auth: 'oauth', maintainer: 'Linear', maintainerUrl: 'https://linear.app' },
  { name: 'Meta Ads', category: 'other', url: 'https://mcp.pipeboard.co/meta-ads-mcp', auth: 'oauth', maintainer: 'Pipeboard', maintainerUrl: 'https://pipeboard.co' },
  { name: 'Morningstar', category: 'data', url: 'https://mcp.morningstar.com/mcp', auth: 'oauth', maintainer: 'Morningstar', maintainerUrl: 'https://morningstar.com' },
  { name: 'monday.com', category: 'productivity', url: 'https://mcp.monday.com/sse', auth: 'oauth', maintainer: 'monday.com', maintainerUrl: 'https://monday.com' },
  { name: 'Neon', category: 'database', url: 'https://mcp.neon.tech/mcp', auth: 'oauth', maintainer: 'Neon', maintainerUrl: 'https://neon.tech' },
  { name: 'Netlify', category: 'dev', url: 'https://netlify-mcp.netlify.app/mcp', auth: 'oauth', maintainer: 'Netlify', maintainerUrl: 'https://netlify.com' },
  { name: 'Notion', category: 'productivity', url: 'https://mcp.notion.com/mcp', auth: 'oauth', maintainer: 'Notion', maintainerUrl: 'https://notion.so' },
  { name: 'Orshot', category: 'design', url: 'https://mcp.orshot.com/mcp', auth: 'oauth', maintainer: 'Orshot', maintainerUrl: 'https://orshot.com' },
  { name: 'Parallel Task', category: 'search', url: 'https://task-mcp.parallel.ai/mcp', auth: 'oauth', maintainer: 'Parallel AI', maintainerUrl: 'https://parallel.ai' },
  { name: 'Parallel Search', category: 'search', url: 'https://search-mcp.parallel.ai/mcp', auth: 'oauth', maintainer: 'Parallel AI', maintainerUrl: 'https://parallel.ai' },
  { name: 'PayPal', category: 'payments', url: 'https://mcp.paypal.com/sse', auth: 'oauth', maintainer: 'PayPal', maintainerUrl: 'https://paypal.com' },
  { name: 'Plaid', category: 'payments', url: 'https://api.dashboard.plaid.com/mcp/sse', auth: 'oauth', maintainer: 'Plaid', maintainerUrl: 'https://plaid.com' },
  { name: 'Port IO', category: 'dev', url: 'https://mcp.port.io/v1', auth: 'oauth', maintainer: 'Port IO', maintainerUrl: 'https://port.io' },
  { name: 'Prisma Postgres', category: 'database', url: 'https://mcp.prisma.io/mcp', auth: 'oauth', maintainer: 'Prisma', maintainerUrl: 'https://prisma.io' },
  { name: 'Ramp', category: 'payments', url: 'https://ramp-mcp-remote.ramp.com/mcp', auth: 'oauth', maintainer: 'Ramp', maintainerUrl: 'https://ramp.com' },
  { name: 'Rube', category: 'other', url: 'https://rube.app/mcp', auth: 'oauth', maintainer: 'Composio', maintainerUrl: 'https://rube.app' },
  { name: 'Scorecard', category: 'other', url: 'https://scorecard-mcp.dare-d5b.workers.dev/sse', auth: 'oauth', maintainer: 'Scorecard', maintainerUrl: 'https://scorecard.io' },
  { name: 'Sentry', category: 'dev', url: 'https://mcp.sentry.dev/sse', auth: 'oauth', maintainer: 'Sentry', maintainerUrl: 'https://sentry.io' },
  { name: 'Simplescraper', category: 'search', url: 'https://mcp.simplescraper.io/mcp', auth: 'oauth', maintainer: 'Simplescraper', maintainerUrl: 'https://simplescraper.io' },
  { name: 'Square', category: 'payments', url: 'https://mcp.squareup.com/sse', auth: 'oauth', maintainer: 'Square', maintainerUrl: 'https://squareup.com' },
  { name: 'Stack Overflow', category: 'dev', url: 'https://mcp.stackoverflow.com', auth: 'oauth', maintainer: 'Stack Overflow', maintainerUrl: 'https://stackoverflow.com' },
  { name: 'Stripe', category: 'payments', url: 'https://mcp.stripe.com/', auth: 'oauth', maintainer: 'Stripe', maintainerUrl: 'https://stripe.com' },
  { name: 'Supabase', category: 'database', url: 'https://mcp.supabase.com/mcp', auth: 'oauth', maintainer: 'Supabase', maintainerUrl: 'https://supabase.com' },
  { name: 'Vercel', category: 'dev', url: 'https://mcp.vercel.com', auth: 'oauth', maintainer: 'Vercel', maintainerUrl: 'https://vercel.com' },
  { name: 'Webflow', category: 'design', url: 'https://mcp.webflow.com/sse', auth: 'oauth', maintainer: 'Webflow', maintainerUrl: 'https://webflow.com' },
  { name: 'Wix', category: 'design', url: 'https://mcp.wix.com/sse', auth: 'oauth', maintainer: 'Wix', maintainerUrl: 'https://wix.com' },
  { name: 'Dropbox', category: 'productivity', url: 'https://mcp.dropbox.com/mcp', auth: 'oauth', maintainer: 'Dropbox', maintainerUrl: 'https://dropbox.com' },
  {
    name: 'Slack',
    category: 'productivity',
    url: 'https://mcp.slack.com/mcp',
    auth: 'oauth',
    maintainer: 'Slack',
    maintainerUrl: 'https://slack.com',
  },
  { name: 'Context7', category: 'dev', url: 'https://mcp.context7.com/mcp', auth: 'open', maintainer: 'Context7', maintainerUrl: 'https://context7.com' },
  { name: 'DeepWiki', category: 'search', url: 'https://mcp.deepwiki.com/mcp', auth: 'open', maintainer: 'Devin', maintainerUrl: 'https://devin.ai' },
  { name: 'Exa Search', category: 'search', url: 'https://mcp.exa.ai/mcp', auth: 'open', maintainer: 'Exa', maintainerUrl: 'https://exa.ai' },
  { name: 'Excalidraw', category: 'design', url: 'https://mcp.excalidraw.com/mcp', auth: 'open', maintainer: 'Excalidraw', maintainerUrl: 'https://excalidraw.com' },
  { name: 'GitMCP', category: 'dev', url: 'https://gitmcp.io/docs', auth: 'open', maintainer: 'GitMCP', maintainerUrl: 'https://gitmcp.io' },
  { name: 'Kiwi', category: 'travel', url: 'https://mcp.kiwi.com', auth: 'open', maintainer: 'Kiwi', maintainerUrl: 'https://kiwi.com' },
  { name: 'Lastminute', category: 'travel', url: 'https://mcp.lastminute.com/mcp', auth: 'open', maintainer: 'lastminute.com', maintainerUrl: 'https://lastminute.com' },
  { name: 'Trivago', category: 'travel', url: 'https://mcp.trivago.com/mcp', auth: 'open', maintainer: 'Trivago', maintainerUrl: 'https://trivago.com' },
  { name: 'Kensho Finance', category: 'data', url: 'https://kfinance.kensho.com/integrations/mcp', auth: 'open', maintainer: 'Kensho', maintainerUrl: 'https://kensho.com' },
  { name: 'PubMed', category: 'search', url: 'https://pubmed.mcp.claude.com/mcp', auth: 'open', maintainer: 'Anthropic', maintainerUrl: 'https://pubmed.ncbi.nlm.nih.gov' }, {
    name: 'Render', category: 'dev', url: 'https://mcp.render.com/mcp', auth: 'apikey', maintainer: 'Render', maintainerUrl: 'https://render.com',
    fields: [{ label: 'API Key', placeholder: 'rnd_…', headerName: 'Authorization', hintText: 'Get from Render dashboard', hintUrl: 'https://dashboard.render.com/u/settings#api-keys' }]
  },
  {
    name: 'Dodo Payments', category: 'payments', url: 'https://mcp.dodopayments.com/sse', auth: 'oauth', maintainer: 'Dodo Payments', maintainerUrl: 'https://dodopayments.com',
  },
  {
    name: 'Google BigQuery', category: 'data', url: 'https://bigquery.googleapis.com/mcp', auth: 'apikey', maintainer: 'Google', maintainerUrl: 'https://cloud.google.com/bigquery',
    fields: [{ label: 'Access Token', placeholder: 'ya29.…', headerName: 'Authorization', hintText: 'Get from Google Cloud credentials', hintUrl: 'https://console.cloud.google.com/apis/credentials' }]
  },
  {
    name: 'Google Compute', category: 'dev', url: 'https://compute.googleapis.com/mcp', auth: 'apikey', maintainer: 'Google', maintainerUrl: 'https://cloud.google.com/compute',
    fields: [{ label: 'Access Token', placeholder: 'ya29.…', headerName: 'Authorization', hintText: 'Get from Google Cloud credentials', hintUrl: 'https://console.cloud.google.com/apis/credentials' }]
  },
  {
    name: 'Google GKE', category: 'dev', url: 'https://container.googleapis.com/mcp', auth: 'apikey', maintainer: 'Google', maintainerUrl: 'https://cloud.google.com/kubernetes-engine',
    fields: [{ label: 'Access Token', placeholder: 'ya29.…', headerName: 'Authorization', hintText: 'Get from Google Cloud credentials', hintUrl: 'https://console.cloud.google.com/apis/credentials' }]
  },
  {
    name: 'Google Maps', category: 'other', url: 'https://mapstools.googleapis.com/mcp', auth: 'apikey', maintainer: 'Google', maintainerUrl: 'https://developers.google.com/maps',
    fields: [{ label: 'API Key', placeholder: 'AIza…', headerName: 'Authorization', hintText: 'Get from Google Cloud credentials', hintUrl: 'https://console.cloud.google.com/apis/credentials' }]
  },
  { name: 'HubSpot', category: 'crm', url: 'https://mcp.hubspot.com/', auth: 'oauth', maintainer: 'HubSpot', maintainerUrl: 'https://hubspot.com' },
  {
    name: 'Zapier', category: 'productivity', url: 'https://mcp.zapier.com/api/mcp/mcp', auth: 'apikey', maintainer: 'Zapier', maintainerUrl: 'https://zapier.com',
    fields: [{ label: 'API Key', placeholder: 'sk_…', headerName: 'Authorization', hintText: 'Get from Zapier developer settings', hintUrl: 'https://zapier.com/app/developer' }]
  },
  {
    name: 'Penny', category: 'other', url: 'https://penny.apps.trychannel3.com/mcp', auth: 'oauth', maintainer: 'Penny', maintainerUrl: 'https://penny.shop', customIcon: '/penny.png',
  },
];

const FEATURED_NAMES = ['Notion', 'Rube', 'GitHub', 'Exa Search', 'Vercel', 'Slack', 'Google Workspace', 'Hugging Face', 'Kiwi', 'Excalidraw', 'Context7', 'Penny'];
const CATALOG_URLS = new Set(CATALOG.map((i) => i.url.replace(/\/$/, '')));

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getTransportType(url: string): 'sse' | 'http' {
  const lower = url.toLowerCase();
  return lower.endsWith('/sse') || lower.includes('/sse?') ? 'sse' : 'http';
}

// Second-level TLDs that need 3 parts kept (e.g. mospi.gov.in → gov.in is the TLD)
const SLD_TLDS = new Set([
  'gov.in', 'co.in', 'org.in', 'net.in', 'ac.in',
  'co.uk', 'org.uk', 'me.uk', 'net.uk', 'ac.uk',
  'co.jp', 'co.nz', 'co.za', 'co.kr', 'co.il',
  'com.au', 'net.au', 'org.au',
  'com.br', 'net.br', 'org.br',
  'nih.gov'
]);

function rootDomain(serverUrl: string): string {
  try {
    const parts = new URL(serverUrl).hostname.split('.');
    if (parts.length <= 2) return parts.join('.');
    const last2 = parts.slice(-2).join('.');
    if (SLD_TLDS.has(last2)) return parts.slice(-3).join('.');
    return last2;
  } catch { return ''; }
}

function faviconUrl(serverUrl: string): string {
  const domain = rootDomain(serverUrl);
  if (!domain) return '';
  const google = `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
  return `/api/proxy-image?url=${encodeURIComponent(google)}`;
}

const AUTH_LABELS: Record<CatalogAuth, string> = { oauth: 'OAuth', apikey: 'API Key', open: 'Free' };

function isOauthWithClientSetup(item: CatalogItem) {
  return item.auth === 'oauth' && Boolean(item.oauthSetup?.length);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ServiceIcon({ url, name, size = 24, customIcon, serverUrl }: { url: string; name: string; size?: number; customIcon?: string; serverUrl?: string }) {
  const checkUrl = (serverUrl ?? url).replace(/\/+$/, '');
  if (MCP_COMPONENT_ICON_URLS.has(checkUrl)) {
    return <HugeiconsIcon icon={Github01Icon} size={size} className="text-foreground" />;
  }
  const src = customIcon ?? getMcpCatalogIcon(serverUrl ?? url) ?? faviconUrl(url);
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={name} width={size} height={size} className="object-contain rounded" loading="lazy" />
  ) : (
    <span
      className="flex items-center justify-center rounded-md bg-muted text-xs font-semibold text-muted-foreground/70"
      style={{ width: size, height: size }}
    >
      {name.slice(0, 2).toUpperCase()}
    </span>
  );
}

function CatalogCard({
  item, isConnected, isAdding, onAdd, canConnect = true,
}: {
  item: CatalogItem;
  isConnected: boolean;
  isAdding: boolean;
  onAdd: (item: CatalogItem) => void;
  canConnect?: boolean;
}) {
  const catLabel = CATEGORIES.find((c) => c.id === item.category)?.label ?? item.category;
  const needsClientSetup = isOauthWithClientSetup(item);

  return (
    <Card className="shadow-none bg-card/50 border border-border/60 hover:border-primary/30 hover:shadow-sm transition-all duration-200 h-full flex flex-col rounded-xl group">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="size-8 flex items-center justify-center overflow-hidden shrink-0">
            <ServiceIcon url={item.maintainerUrl} name={item.name} size={24} customIcon={item.customIcon ?? getMcpCatalogIcon(item.url)} serverUrl={item.url} />
          </div>
          {isConnected ? (
              <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                <Check className="size-3" /> Added
              </span>
          ) : (
              <button
                type="button"
                onClick={() => onAdd(item)}
                disabled={isAdding}
                aria-label={`Add ${item.name}`}
                className="text-xs font-medium text-muted-foreground hover:text-primary flex items-center gap-1.5 transition-colors disabled:opacity-50 px-2 py-1 rounded-md hover:bg-muted"
              >
                {isAdding ? <Loader2 className="size-3 animate-spin" /> : <Plus className="size-3" />}
                {isAdding ? 'Adding' : canConnect ? 'Add' : 'Upgrade'}
              </button>
          )}
        </div>
        <CardTitle className="text-sm font-medium group-hover:text-primary transition-colors line-clamp-1 mt-2 ml-1">
          {item.name}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 flex-1 flex flex-col justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap mt-1">
          <span className="inline-flex items-center rounded-md bg-secondary/50 px-2 py-0.5 text-xs font-medium text-secondary-foreground ring-1 ring-inset ring-secondary-foreground/10">
            {catLabel}
          </span>
          <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground ring-1 ring-inset ring-muted-foreground/10">
            {AUTH_LABELS[item.auth]}
          </span>
          {needsClientSetup && (
            <span className="inline-flex items-center rounded-md bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-600 dark:text-amber-400 ring-1 ring-inset ring-amber-500/20">
              Client setup
            </span>
          )}
        </div>
        <a
          href={item.maintainerUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 w-fit mt-3"
        >
          {item.maintainer}
          <ArrowUpRight className="size-3" />
        </a>
      </CardContent>
    </Card>
  );
}

function CardSkeleton() {
  return (
    <Card className="shadow-none h-full flex flex-col rounded-xl">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <Skeleton className="size-8 rounded-lg" />
          <Skeleton className="h-3 w-8" />
        </div>
        <Skeleton className="h-4 w-3/4 mt-2" />
      </CardHeader>
      <CardContent className="pt-0 flex-1 flex flex-col justify-between gap-2">
        <div className="flex items-center gap-2 mt-1">
          <Skeleton className="h-5 w-16 rounded-md" />
          <Skeleton className="h-5 w-12 rounded-md" />
        </div>
        <Skeleton className="h-3 w-20 mt-3" />
      </CardContent>
    </Card>
  );
}

// ─── Page content ─────────────────────────────────────────────────────────────

function McpMarketplaceContent() {
  const { user, isProUser, isLoading: isAuthLoading } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const mcpEnabled = process.env.NEXT_PUBLIC_MCP_ENABLED === 'true';

  useEffect(() => {
    if (!mcpEnabled) { router.replace('/'); return; }
    if (!isAuthLoading && !user) router.push('/sign-in');
  }, [mcpEnabled, isAuthLoading, user, router]);

  // Handle OAuth callback redirect
  useEffect(() => {
    const oauthStatus = searchParams.get('mcpOauth');
    const message = searchParams.get('message');
    if (!oauthStatus) return;
    if (oauthStatus === 'success') {
      sileo.success({ title: 'App connected', description: 'OAuth authorization successful' });
    } else {
      sileo.error({ title: 'OAuth failed', description: message ?? 'Authorization was not completed' });
    }
    // Strip the params from the URL without a re-render
    const clean = new URL(window.location.href);
    clean.searchParams.delete('mcpOauth');
    clean.searchParams.delete('message');
    window.history.replaceState({}, '', clean.toString());
  }, [searchParams]);

  const [activeTab, setActiveTab] = useState(() => searchParams.get('tab') === 'my-servers' ? 'my-servers' : 'browse');
  const [search, setSearch] = useQueryState('q', parseAsString.withDefault(''));
  const [category, setCategory] = useState<CategoryId>('all');
  const isReadOnlyMarketplace = !isProUser;

  const [apiKeyTarget, setApiKeyTarget] = useState<CatalogItem | null>(null);
  const [apiKeyValues, setApiKeyValues] = useState<Record<string, string>>({});
  const [oauthSetupTarget, setOauthSetupTarget] = useState<CatalogItem | null>(null);
  const [oauthSetupValues, setOauthSetupValues] = useState<Record<string, string>>({});
  const [addingUrl, setAddingUrl] = useState<string | null>(null);
  const oauthCallbackUri = useMemo(() => {
    const configuredOrigin = process.env.NEXT_PUBLIC_APP_URL?.trim();
    const origin = configuredOrigin
      ? configuredOrigin.replace(/\/+$/, '')
      : (typeof window !== 'undefined' ? window.location.origin.replace(/\/+$/, '') : '');
    return origin ? `${origin}/api/mcp/oauth/callback` : '/api/mcp/oauth/callback';
  }, []);

  const [showCustomDialog, setShowCustomDialog] = useState(false);
  const [customForm, setCustomForm] = useState({
    name: '', url: '',
    authType: 'none' as 'none' | 'bearer' | 'header' | 'oauth',
    bearerToken: '', headerName: '', headerValue: '',
  });
  const resetCustomForm = () => setCustomForm({ name: '', url: '', authType: 'none', bearerToken: '', headerName: '', headerValue: '' });

  type ServerRecord = {
    id: string; name: string; url: string;
    authType: 'none' | 'bearer' | 'header' | 'oauth';
    isEnabled: boolean; hasCredentials: boolean;
    isOAuthConnected: boolean; oauthConfigured: boolean;
    oauthError: string | null; lastError: string | null;
    lastTestedAt: string | null;
  };

  const { data: serversData, isLoading: serversLoading } = useQuery({
    queryKey: ['mcpServers', user?.id],
    queryFn: async () => {
      const r = await fetch('/api/mcp/servers');
      if (!r.ok) return { servers: [] as ServerRecord[] };
      return r.json() as Promise<{ servers: ServerRecord[] }>;
    },
    enabled: Boolean(user?.id && isProUser),
    staleTime: 10_000,
  });

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Tool management
  const [expandedToolsId, setExpandedToolsId] = useState<string | null>(null);
  const [serverToolsCache, setServerToolsCache] = useState<Record<string, Array<{ name: string; title: string | null; description: string | null }>>>({});
  const [toolsLoading, setToolsLoading] = useState<Record<string, boolean>>({});

  const fetchServerTools = async (serverId: string) => {
    if (serverToolsCache[serverId] || toolsLoading[serverId]) return;
    setToolsLoading((prev) => ({ ...prev, [serverId]: true }));
    try {
      const res = await fetch(`/api/mcp/servers/${serverId}/tools`);
      const data = await res.json() as { ok: boolean; tools: Array<{ name: string; title: string | null; description: string | null }> };
      if (data.ok) setServerToolsCache((prev) => ({ ...prev, [serverId]: data.tools }));
    } catch { /* ignore */ } finally {
      setToolsLoading((prev) => ({ ...prev, [serverId]: false }));
    }
  };

  const patchDisabledTools = async (serverId: string, disabledToolList: string[]) => {
    // Optimistic update first
    queryClient.setQueryData(['mcpServers', user?.id], (old: any) => {
      if (!old?.servers) return old;
      return { ...old, servers: old.servers.map((s: any) => s.id === serverId ? { ...s, disabledTools: disabledToolList } : s) };
    });
    const res = await fetch(`/api/mcp/servers/${serverId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ disabledTools: disabledToolList }),
    });
    // Only refetch on failure to revert optimistic update
    if (!res.ok) {
      queryClient.invalidateQueries({ queryKey: ['mcpServers', user?.id] });
    }
  };

  const saveDisabledTools = (serverId: string, disabledToolList: string[]) => {
    void patchDisabledTools(serverId, disabledToolList);
  };

  const toggleToolDisabled = (serverId: string, currentDisabled: string[], toolName: string) => {
    const next = currentDisabled.includes(toolName)
      ? currentDisabled.filter((t) => t !== toolName)
      : [...currentDisabled, toolName];
    saveDisabledTools(serverId, next);
  };

  type EditForm = {
    name: string; url: string;
    headerName: string; headerValue: string;
    bearerToken: string; oauthClientId: string;
  };
  const [editTarget, setEditTarget] = useState<ServerRecord | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({ name: '', url: '', headerName: '', headerValue: '', bearerToken: '', oauthClientId: '' });

  const openEdit = (server: ServerRecord) => {
    setEditTarget(server);
    setEditForm({ name: server.name, url: server.url, headerName: '', headerValue: '', bearerToken: '', oauthClientId: '' });
  };

  const [togglingId, setTogglingId] = useState<string | null>(null);
  const toggleMutation = useMutation({
    mutationFn: async ({ id, isEnabled }: { id: string; isEnabled: boolean }) => {
      setTogglingId(id);
      const r = await fetch(`/api/mcp/servers/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isEnabled }),
      });
      if (!r.ok) throw new Error('Failed to update');
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['mcpServers', user?.id] }),
    onError: () => sileo.error({ title: 'Update failed' }),
    onSettled: () => setTogglingId(null),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      setDeletingId(id);
      const r = await fetch(`/api/mcp/servers/${id}`, { method: 'DELETE' });
      if (!r.ok) throw new Error('Failed to delete');
    },
    onSuccess: () => {
      setDeletingId(null);
      queryClient.invalidateQueries({ queryKey: ['mcpServers', user?.id] });
      sileo.success({ title: 'App removed' });
    },
    onError: () => { setDeletingId(null); sileo.error({ title: 'Delete failed' }); },
  });

  const editMutation = useMutation({
    mutationFn: async () => {
      if (!editTarget) return;
      const lower = editForm.url.toLowerCase();
      const body: Record<string, unknown> = {
        name: editForm.name.trim(),
        url: editForm.url.trim(),
        transportType: lower.endsWith('/sse') || lower.includes('/sse?') ? 'sse' : 'http',
      };
      if (editTarget.authType === 'header' && editForm.headerValue.trim()) {
        body.headerName = editForm.headerName.trim() || 'Authorization';
        body.headerValue = editForm.headerValue.trim();
      }
      if (editTarget.authType === 'bearer' && editForm.bearerToken.trim()) {
        body.bearerToken = editForm.bearerToken.trim();
      }
      if (editTarget.authType === 'oauth' && editForm.oauthClientId.trim()) {
        body.oauthClientId = editForm.oauthClientId.trim();
      }
      const r = await fetch(`/api/mcp/servers/${editTarget.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data?.cause || data?.message || 'Failed to update');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mcpServers', user?.id] });
      sileo.success({ title: 'App updated' });
      setEditTarget(null);
    },
    onError: (error: Error) => sileo.error({ title: 'Update failed', description: normalizeError(error) }),
  });

  const testMutation = useMutation({
    mutationFn: async (id: string) => {
      setTestingId(id);
      const r = await fetch('/api/mcp/servers/test', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serverId: id }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data?.cause || data?.message || 'Test failed');
      return data as { toolCount: number };
    },
    onSuccess: (data) => {
      setTestingId(null);
      queryClient.invalidateQueries({ queryKey: ['mcpServers', user?.id] });
      sileo.success({ title: 'Connection successful', description: `${data.toolCount} tool${data.toolCount === 1 ? '' : 's'} loaded` });
    },
    onError: (error: Error) => { setTestingId(null); sileo.error({ title: 'Connection test failed', description: normalizeError(error) }); },
  });

  const oauthStartMutation = useMutation({
    mutationFn: async (id: string) => {
      setConnectingId(id);
      const r = await fetch(`/api/mcp/servers/${id}/oauth/start`, { method: 'POST' });
      const data = await r.json();
      if (!r.ok) throw new Error(data?.cause || data?.message || 'OAuth failed');
      return data as { authorizationUrl: string };
    },
    onSuccess: ({ authorizationUrl }) => { if (authorizationUrl) window.location.assign(authorizationUrl); },
    onError: (error: Error) => { setConnectingId(null); sileo.error({ title: 'Authorization failed', description: normalizeError(error) }); },
  });

  const oauthDisconnectMutation = useMutation({
    mutationFn: async (id: string) => {
      const r = await fetch(`/api/mcp/servers/${id}/oauth/disconnect`, { method: 'POST' });
      if (!r.ok) throw new Error('Failed to disconnect');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mcpServers', user?.id] });
      sileo.success({ title: 'Disconnected' });
    },
    onError: () => sileo.error({ title: 'Disconnect failed' }),
  });

  const connectedUrls = useMemo(
    () => new Set((serversData?.servers ?? []).map((s) => s.url.replace(/\/$/, ''))),
    [serversData],
  );

  const filteredItems = useMemo(() => {
    const q = search.toLowerCase().trim();
    const filtered = CATALOG.filter((item) => {
      if (category !== 'all' && item.category !== category) return false;
      if (!q) return true;
      return item.name.toLowerCase().includes(q) || item.maintainer.toLowerCase().includes(q);
    });

    // Prioritize true OAuth entries first, then OAuth requiring client setup.
    return [...filtered].sort((a, b) => {
      const rank = (item: CatalogItem) => {
        if (item.auth === 'oauth' && !isOauthWithClientSetup(item)) return 0;
        if (isOauthWithClientSetup(item)) return 1;
        return 2;
      };
      const rankDiff = rank(a) - rank(b);
      if (rankDiff !== 0) return rankDiff;
      return a.name.localeCompare(b.name);
    });
  }, [search, category]);

  const featuredItems = useMemo(() => {
    const catalogByName = new Map(CATALOG.map((item) => [item.name, item]));
    return FEATURED_NAMES
      .map((name) => catalogByName.get(name))
      .filter((item): item is CatalogItem => Boolean(item));
  }, []);

  const addMutation = useMutation({
    mutationFn: async ({ item, apiKey, fieldValues, oauthCredentials }: { item: CatalogItem; apiKey?: string; fieldValues?: Record<string, string>; oauthCredentials?: Record<string, string> }) => {
      const firstField = item.fields?.[0];
      const resolvedHeaderName = firstField?.headerName ?? 'Authorization';
      const resolvedValue = firstField ? (fieldValues?.[firstField.label] ?? apiKey ?? '') : (apiKey ?? '');
      const body: Record<string, unknown> = {
        name: item.name, url: item.url, isEnabled: true,
        transportType: getTransportType(item.url),
        authType: item.auth === 'oauth' ? 'oauth' : item.auth === 'apikey' ? 'header' : 'none',
        ...(item.auth === 'apikey' && resolvedValue ? {
          headerName: resolvedHeaderName,
          headerValue: resolvedHeaderName.toLowerCase() === 'authorization' ? `Bearer ${resolvedValue}` : resolvedValue,
        } : {}),
        ...(oauthCredentials?.oauthClientId ? { oauthClientId: oauthCredentials.oauthClientId } : {}),
        ...(oauthCredentials?.oauthClientSecret ? { oauthClientSecret: oauthCredentials.oauthClientSecret } : {}),
      };
      const r = await fetch('/api/mcp/servers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await r.json();
      if (!r.ok) throw new Error(data?.cause || data?.message || 'Failed to add server');
      if (item.auth === 'oauth') {
        const oauthR = await fetch(`/api/mcp/servers/${data.server.id}/oauth/start`, { method: 'POST' });
        const oauthData = await oauthR.json();
        if (!oauthR.ok) throw new Error(oauthData?.cause || oauthData?.message || 'Failed to start OAuth');
        if (oauthData.authorizationUrl) { window.location.assign(oauthData.authorizationUrl); return data; }
      }
      return data;
    },
    onSuccess: (_, { item }) => {
      if (item.auth !== 'oauth') sileo.success({ title: `${item.name} added` });
      queryClient.invalidateQueries({ queryKey: ['mcpServers', user?.id] });
      setApiKeyTarget(null); setApiKeyValues({});
      setOauthSetupTarget(null); setOauthSetupValues({});
    },
    onError: (error: Error) => sileo.error({ title: 'Failed to add app', description: normalizeError(error) }),
    onSettled: () => setAddingUrl(null),
  });

  const customMutation = useMutation({
    mutationFn: async () => {
      const { name, url, authType, bearerToken, headerName, headerValue } = customForm;
      const lower = url.toLowerCase();
      const body: Record<string, unknown> = {
        name: name.trim(), url: url.trim(), isEnabled: true, authType,
        transportType: lower.endsWith('/sse') || lower.includes('/sse?') ? 'sse' : 'http',
        ...(authType === 'bearer' && bearerToken ? { bearerToken: bearerToken.trim() } : {}),
        ...(authType === 'header' && headerName ? { headerName: headerName.trim(), headerValue: headerValue.trim() } : {}),
      };
      const r = await fetch('/api/mcp/servers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await r.json();
      if (!r.ok) throw new Error(data?.cause || data?.message || 'Failed to add server');
      if (authType === 'oauth') {
        const oauthR = await fetch(`/api/mcp/servers/${data.server.id}/oauth/start`, { method: 'POST' });
        const oauthData = await oauthR.json();
        if (!oauthR.ok) throw new Error(oauthData?.cause || oauthData?.message || 'Failed to start OAuth');
        if (oauthData.authorizationUrl) { window.location.assign(oauthData.authorizationUrl); return data; }
      }
      return data;
    },
    onSuccess: () => {
      if (customForm.authType !== 'oauth') sileo.success({ title: `${customForm.name} added` });
      queryClient.invalidateQueries({ queryKey: ['mcpServers', user?.id] });
      setShowCustomDialog(false); resetCustomForm();
    },
    onError: (error: Error) => sileo.error({ title: 'Failed to add app', description: normalizeError(error) }),
  });

  const handleAdd = (item: CatalogItem) => {
    if (!isProUser) { router.push('/pricing'); return; }
    if (item.auth === 'apikey') { setApiKeyTarget(item); setApiKeyValues({}); return; }
    if (item.auth === 'oauth' && item.oauthSetup?.length) { setOauthSetupTarget(item); setOauthSetupValues({}); return; }
    setAddingUrl(item.url);
    addMutation.mutate({ item });
  };

  const handleCustomOpen = () => {
    if (!isProUser) { router.push('/pricing'); return; }
    setShowCustomDialog(true);
  };

  useEffect(() => {
    if (isReadOnlyMarketplace && activeTab !== 'browse') {
      setActiveTab('browse');
    }
  }, [isReadOnlyMarketplace, activeTab]);

  if (!mcpEnabled) return null;

  if (isAuthLoading) {
    return (
      <div className="flex-1 min-h-dvh flex flex-col py-8">
        <div className="max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 space-y-6">
          <div className="flex items-center justify-center gap-3">
            <Skeleton className="size-5 rounded" />
            <Skeleton className="h-6 w-16" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => <CardSkeleton key={i} />)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-dvh flex flex-col">
      <div className="flex-1 flex flex-col py-8">
        <div className="max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8">

          {/* ── Page header ──────────────────────────────────────── */}
          <div className="mb-6 space-y-4">
            <div className="flex items-center justify-center gap-2 relative">
              <div className="md:hidden absolute left-0">
                <SidebarTrigger />
              </div>
              <AppsIcon width={24} height={24} className="text-foreground" />
              <h1 className="text-2xl font-light tracking-tight font-be-vietnam-pro">scira apps</h1>
            </div>

            {/* Tabs + search (desktop: side by side, mobile: stacked) */}
            <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
              <KumoTabs
                variant="segmented"
                value={activeTab}
                onValueChange={setActiveTab}
                className="w-full sm:w-auto **:[[role=tablist]]:w-full sm:**:[[role=tablist]]:w-auto **:[[role=tab]]:flex-1 **:[[role=tab]]:justify-center sm:**:[[role=tab]]:flex-none sm:**:[[role=tab]]:justify-start [--color-kumo-tint:var(--muted)] [--text-color-kumo-strong:var(--muted-foreground)] [--text-color-kumo-default:var(--foreground)] [--color-kumo-overlay:var(--background)] [--color-kumo-fill-hover:var(--border)]"
                tabs={isReadOnlyMarketplace ? [
                  { value: 'browse', label: 'Marketplace' },
                ] : [
                  { value: 'browse', label: 'Marketplace' },
                  { value: 'my-servers', label: `My Apps${connectedUrls.size > 0 ? ` (${connectedUrls.size})` : ''}` },
                ]}
              />
              {activeTab === 'browse' && (
                <div className="relative w-full sm:w-auto sm:flex-none">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground/40 pointer-events-none" />
                  <Input
                    placeholder="Search apps..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-8 h-8 text-sm w-full sm:w-52"
                  />
                </div>
              )}
            </div>

            {isReadOnlyMarketplace && (
              <div className="rounded-xl border border-border/50 bg-card/30 px-3.5 py-2.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <p className="text-xs text-muted-foreground">
                  Browse all apps for free. Upgrade to connect and run app tools in chat.
                </p>
                <Button size="sm" className="h-7 w-fit" onClick={() => router.push('/pricing')}>
                  Upgrade to Pro
                </Button>
              </div>
            )}

            {/* Category pills — browse only */}
            {activeTab === 'browse' && (
              <div className="flex flex-wrap gap-1.5">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategory(cat.id)}
                    className={cn(
                      'px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
                      category === cat.id
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground',
                    )}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ── Browse tab ───────────────────────────────────────── */}
          {activeTab === 'browse' && (
            <div className="space-y-8">
              {/* Featured section — only when no filter active */}
              {!search && category === 'all' && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-semibold">Featured</h2>
                    <span className="text-xs font-medium text-muted-foreground/50 tabular-nums bg-muted/50 px-2 py-0.5 rounded-full">
                      {featuredItems.length}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {featuredItems.map((item) => (
                      <CatalogCard
                        key={item.name}
                        item={item}
                        isConnected={connectedUrls.has(item.url.replace(/\/$/, ''))}
                        isAdding={addingUrl === item.url && addMutation.isPending}
                        onAdd={handleAdd}
                        canConnect={!isReadOnlyMarketplace}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* All servers grid */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-semibold">
                      {search || category !== 'all' ? 'Results' : 'All Servers'}
                    </h2>
                    <span className="text-xs font-medium text-muted-foreground/50 tabular-nums bg-muted/50 px-2 py-0.5 rounded-full">
                      {filteredItems.length}
                    </span>
                  </div>
                </div>

                {serversLoading ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {Array.from({ length: 8 }).map((_, i) => <CardSkeleton key={i} />)}
                  </div>
                ) : filteredItems.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {/* Add custom — always first */}
                    <Card
                      className="shadow-none bg-card/30 cursor-pointer border-dashed border border-border/60 hover:border-primary/40 hover:bg-card/50 transition-all duration-200 flex items-center justify-center min-h-[120px] group rounded-xl"
                      onClick={handleCustomOpen}
                    >
                      <div className="flex flex-col items-center gap-2 text-muted-foreground group-hover:text-primary transition-colors">
                        <div className="size-8 rounded-xl bg-muted/50 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                          <Plus className="size-4" />
                        </div>
                        <span className="text-xs font-medium text-muted-foreground mt-2">Add custom server</span>
                      </div>
                    </Card>
                    {filteredItems.map((item) => (
                      <CatalogCard
                        key={`${item.name}-${item.url}`}
                        item={item}
                        isConnected={connectedUrls.has(item.url.replace(/\/$/, ''))}
                        isAdding={addingUrl === item.url && addMutation.isPending}
                        onAdd={handleAdd}
                        canConnect={!isReadOnlyMarketplace}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 gap-2">
                    <p className="text-sm text-muted-foreground text-pretty text-center">
                      No servers match &ldquo;{search}&rdquo;
                    </p>
                    <button
                      type="button"
                      onClick={() => { setSearch(''); setCategory('all'); }}
                      className="text-xs font-medium text-primary hover:underline transition-colors mt-2"
                    >
                      Clear filters
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── My Apps tab ──────────────────────────────────────── */}
          {activeTab === 'my-servers' && (
            <div className="max-w-6xl space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-semibold">My Apps</h2>
                  {(serversData?.servers ?? []).length > 0 && (
                    <span className="text-xs font-medium text-muted-foreground/50 tabular-nums bg-muted/50 px-2 py-0.5 rounded-full">
                      {(serversData?.servers ?? []).length}
                    </span>
                  )}
                </div>
                <Button size="sm" variant="outline" className="h-7 gap-1.5 text-xs" onClick={handleCustomOpen}>
                  <Plus className="size-3" />
                  Add App
                </Button>
              </div>

              {serversLoading ? (
                <div className="rounded-xl border border-border/60 divide-y divide-border/40 overflow-hidden bg-card/50">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="px-4 py-3.5 flex items-center gap-3">
                      <Skeleton className="size-8 rounded-lg shrink-0" />
                      <div className="flex-1 space-y-1.5">
                        <Skeleton className="h-3.5 w-28" />
                        <Skeleton className="h-2.5 w-44" />
                      </div>
                      <Skeleton className="size-8 rounded-md shrink-0" />
                    </div>
                  ))}
                </div>
              ) : (serversData?.servers ?? []).length === 0 ? (
                <div className="rounded-xl border border-dashed border-border/60 py-12 flex flex-col items-center gap-3">
                  <div className="size-10 rounded-xl bg-muted/50 flex items-center justify-center">
                    <AppsIcon width={18} height={18} className="text-muted-foreground/50" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-muted-foreground">No apps connected</p>
                    <p className="text-sm text-muted-foreground/60 mt-1.5">
                      Browse to add your first app
                    </p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => setActiveTab('browse')} className="mt-1">
                    Browse Apps
                  </Button>
                </div>
              ) : (
                <div className="rounded-xl border border-border/60 divide-y divide-border/40 bg-card/50 overflow-hidden">
                  {[...(serversData?.servers ?? [])].sort((a, b) => {
                    const score = (s: ServerRecord) => {
                      const ready = s.authType !== 'oauth' || s.isOAuthConnected;
                      if (s.isEnabled && ready) return 3;
                      if (s.isEnabled && !ready) return 2;
                      if (!s.isEnabled && ready) return 1;
                      return 0;
                    };
                    return score(b) - score(a);
                  }).map((server) => {
                    const isToolsExpanded = expandedToolsId === server.id;
                    const tools = serverToolsCache[server.id] ?? [];
                    const isLoadingTools = toolsLoading[server.id] ?? false;
                    const disabledForServer: string[] = Array.isArray((server as any).disabledTools) ? (server as any).disabledTools : [];
                    const isReady = server.authType !== 'oauth' || server.isOAuthConnected;
                    return (
                    <div key={server.id} className="transition-colors hover:bg-muted/20">
                    <div className="px-5 py-4 flex items-center gap-4">
                      {/* Icon + info — dimmed when inactive */}
                      <div className={cn('flex items-center gap-4 flex-1 min-w-0 transition-opacity', (!server.isEnabled || (server.authType === 'oauth' && !server.isOAuthConnected)) && 'opacity-40')}>
                        <div className="size-8 flex items-center justify-center shrink-0 overflow-hidden">
                          <ServiceIcon url={server.url} name={server.name} size={22} customIcon={getMcpCatalogIcon(server.url)} />
                        </div>
                        <div className="flex-1 min-w-0 space-y-0.5">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-sm font-medium truncate">{server.name}</span>
                            {server.authType === 'oauth' && !server.isOAuthConnected && (
                              <span className="shrink-0 size-1.5 rounded-full bg-amber-400 dark:bg-amber-500" title="OAuth not connected" />
                            )}
                            {disabledForServer.length > 0 && (
                              <span className="shrink-0 text-xs font-medium text-muted-foreground/60 tabular-nums">
                                {disabledForServer.length} hidden
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground/60 truncate">
                            {(() => { try { return new URL(server.url).hostname; } catch { return server.url; } })()}
                          </p>
                          {(server.oauthError || server.lastError) && (
                            <p className="text-xs text-destructive/80 truncate mt-1">
                              {server.oauthError || server.lastError}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Actions — never dimmed */}
                      <div className="flex items-center gap-2 shrink-0">
                        {server.authType === 'oauth' && !server.isOAuthConnected && (
                          <Button
                            size="sm" variant="outline"
                            className="h-7 text-xs px-2.5 gap-1"
                            onClick={() => oauthStartMutation.mutate(server.id)}
                            disabled={connectingId === server.id && oauthStartMutation.isPending}
                          >
                            {connectingId === server.id && oauthStartMutation.isPending
                              ? <Loader2 className="size-3 animate-spin" />
                              : <LinkIcon className="size-3" />}
                            Connect
                          </Button>
                        )}

                        {/* Lock toggle for OAuth servers that aren't connected yet */}
                        {server.authType === 'oauth' && !server.isOAuthConnected ? (
                          <Switch checked={false} disabled className="opacity-30" />
                        ) : (
                          <Switch
                            checked={server.isEnabled}
                            onCheckedChange={(v) => toggleMutation.mutate({ id: server.id, isEnabled: v })}
                            disabled={togglingId === server.id}
                          />
                        )}

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="size-7 p-0 text-muted-foreground">
                              <MoreHorizontal className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44">
                            {!CATALOG_URLS.has(server.url.replace(/\/$/, '')) && (
                              <DropdownMenuItem onClick={() => openEdit(server)}>
                                <Pencil className="size-3.5 mr-2" />
                                Edit
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              onClick={() => testMutation.mutate(server.id)}
                              disabled={testingId === server.id && testMutation.isPending}
                            >
                              {testingId === server.id && testMutation.isPending
                                ? <Loader2 className="size-3.5 mr-2 animate-spin" />
                                : <Zap className="size-3.5 mr-2" />}
                              Test connection
                            </DropdownMenuItem>
                            {server.authType === 'oauth' && server.isOAuthConnected && (
                              <>
                                <DropdownMenuItem onClick={() => oauthStartMutation.mutate(server.id)}>
                                  <ArrowUpRight className="size-3.5 mr-2" />
                                  Reconnect OAuth
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => oauthDisconnectMutation.mutate(server.id)} className="text-muted-foreground">
                                  <Link2Off className="size-3.5 mr-2" />
                                  Disconnect OAuth
                                </DropdownMenuItem>
                              </>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => setConfirmDeleteId(server.id)}
                            >
                              <Trash2 className="size-3.5 mr-2" />
                              Remove
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                        {/* Tool management toggle */}
                        {isReady && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="size-7 p-0 text-muted-foreground"
                            title="Manage tools"
                            onClick={() => {
                              const next = isToolsExpanded ? null : server.id;
                              setExpandedToolsId(next);
                              if (next) fetchServerTools(next);
                            }}
                          >
                            <ChevronDown className={cn('size-4 transition-transform duration-150', isToolsExpanded && 'rotate-180')} />
                          </Button>
                        )}
                      </div>
                    </div>
                    {/* Tool list */}
                    {isToolsExpanded && isReady && (
                      <div className="px-5 pb-4">
                        <div className="rounded-lg border border-border/40 bg-muted/30 overflow-hidden">
                          <div className="px-3 py-2 border-b border-border/30 flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <Wrench className="size-3 text-muted-foreground/60" />
                              <span className="text-xs font-medium text-muted-foreground">Tools</span>
                              {!isLoadingTools && tools.length > 0 && (
                                <span className="text-xs text-muted-foreground/50 tabular-nums">
                                  {tools.length - disabledForServer.length}/{tools.length} enabled
                                </span>
                              )}
                            </div>
                            {!isLoadingTools && tools.length > 0 && disabledForServer.length > 0 && (
                              <button
                                type="button"
                                onClick={() => void saveDisabledTools(server.id, [])}
                                className="text-xs text-primary hover:text-primary/80 transition-colors font-medium"
                              >
                                Enable all
                              </button>
                            )}
                          </div>
                          {isLoadingTools ? (
                            <div className="px-3 py-3 flex items-center gap-2 text-xs text-muted-foreground/60">
                              <Loader2 className="size-3.5 animate-spin shrink-0" />
                              Loading tools…
                            </div>
                          ) : tools.length === 0 ? (
                            <div className="px-3 py-3 text-xs text-muted-foreground/60">No tools found</div>
                          ) : (
                            <div className="max-h-[280px] overflow-y-auto divide-y divide-border/30">
                              {tools.map((tool) => {
                                const isDisabled = disabledForServer.includes(tool.name);
                                return (
                                  <div
                                    key={tool.name}
                                    onClick={() => toggleToolDisabled(server.id, disabledForServer, tool.name)}
                                    className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-muted/40 transition-colors group"
                                  >
                                    <div className={cn('size-1.5 rounded-full shrink-0 transition-colors', isDisabled ? 'bg-muted-foreground/20' : 'bg-emerald-500')} />
                                    <span className={cn('flex-1 text-xs font-mono truncate transition-colors', isDisabled ? 'text-muted-foreground/40 line-through' : 'text-foreground/80')}>
                                      {tool.title ?? tool.name}
                                    </span>
                                    <Switch
                                      checked={!isDisabled}
                                      onCheckedChange={() => toggleToolDisabled(server.id, disabledForServer, tool.name)}
                                      onClick={(e) => e.stopPropagation()}
                                      className="shrink-0 scale-75"
                                    />
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    </div>
                  );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Edit dialog ──────────────────────────────────────────── */}
      <Dialog open={!!editTarget} onOpenChange={(v) => { if (!v) setEditTarget(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <div className="flex items-center gap-2.5 mb-1">
              <div className="size-7 flex items-center justify-center overflow-hidden shrink-0">
                {editTarget && <ServiceIcon url={editTarget.url} name={editTarget.name} size={20} />}
              </div>
              <DialogTitle>Edit {editTarget?.name}</DialogTitle>
            </div>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Name</Label>
              <Input value={editForm.name} onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))} autoFocus />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">URL</Label>
              <Input value={editForm.url} onChange={(e) => setEditForm((p) => ({ ...p, url: e.target.value }))} placeholder="https://…" />
            </div>
            {editTarget?.authType === 'header' && (
              <>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Header name</Label>
                  <Input value={editForm.headerName} onChange={(e) => setEditForm((p) => ({ ...p, headerName: e.target.value }))} placeholder="Authorization" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">New header value <span className="text-muted-foreground/50">(leave blank to keep existing)</span></Label>
                  <Input type="password" value={editForm.headerValue} onChange={(e) => setEditForm((p) => ({ ...p, headerValue: e.target.value }))} placeholder="Bearer sk-…" />
                </div>
              </>
            )}
            {editTarget?.authType === 'bearer' && (
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">New token <span className="text-muted-foreground/50">(leave blank to keep existing)</span></Label>
                <Input type="password" value={editForm.bearerToken} onChange={(e) => setEditForm((p) => ({ ...p, bearerToken: e.target.value }))} placeholder="sk-…" />
              </div>
            )}
            {editTarget?.authType === 'oauth' && (
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">OAuth Client ID <span className="text-muted-foreground/50">(leave blank to keep existing)</span></Label>
                <Input value={editForm.oauthClientId} onChange={(e) => setEditForm((p) => ({ ...p, oauthClientId: e.target.value }))} placeholder="Client ID…" />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setEditTarget(null)}>Cancel</Button>
            <Button
              size="sm"
              onClick={() => editMutation.mutate()}
              disabled={!editForm.name.trim() || !editForm.url.trim() || editMutation.isPending}
            >
              {editMutation.isPending ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete confirmation ──────────────────────────────────── */}
      <AlertDialog open={!!confirmDeleteId} onOpenChange={(v) => { if (!v) setConfirmDeleteId(null); }}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Remove app?</AlertDialogTitle>
            <AlertDialogDescription className="text-pretty">
              This will disconnect any OAuth sessions and cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { if (confirmDeleteId) { deleteMutation.mutate(confirmDeleteId); setConfirmDeleteId(null); } }}
              disabled={deletingId === confirmDeleteId && deleteMutation.isPending}
            >
              {deletingId === confirmDeleteId && deleteMutation.isPending ? <Loader2 className="size-3 animate-spin mr-1.5" /> : <Trash2 className="size-3 mr-1.5" />}
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Custom server dialog ─────────────────────────────────── */}
      <Dialog open={showCustomDialog} onOpenChange={(v) => { if (!v) { setShowCustomDialog(false); resetCustomForm(); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add custom app</DialogTitle>
            <DialogDescription className="text-pretty">
              Connect any MCP-compatible remote endpoint.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Name</Label>
                <Input placeholder="My Server" value={customForm.name} onChange={(e) => setCustomForm((p) => ({ ...p, name: e.target.value }))} autoFocus />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Auth</Label>
                <Select value={customForm.authType} onValueChange={(v: typeof customForm.authType) => setCustomForm((p) => ({ ...p, authType: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No auth</SelectItem>
                    <SelectItem value="bearer">Bearer token</SelectItem>
                    <SelectItem value="header">Custom header</SelectItem>
                    <SelectItem value="oauth">OAuth</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">URL</Label>
              <Input placeholder="https://your-mcp-server.com/mcp" value={customForm.url} onChange={(e) => setCustomForm((p) => ({ ...p, url: e.target.value }))} />
            </div>
            {customForm.authType === 'bearer' && (
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Bearer token</Label>
                <Input type="password" placeholder="sk-…" value={customForm.bearerToken} onChange={(e) => setCustomForm((p) => ({ ...p, bearerToken: e.target.value }))} />
              </div>
            )}
            {customForm.authType === 'header' && (
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Header name</Label>
                  <Input placeholder="x-api-key" value={customForm.headerName} onChange={(e) => setCustomForm((p) => ({ ...p, headerName: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Header value</Label>
                  <Input type="password" placeholder="sk-…" value={customForm.headerValue} onChange={(e) => setCustomForm((p) => ({ ...p, headerValue: e.target.value }))} />
                </div>
              </div>
            )}
            {customForm.authType === 'oauth' && (
              <p className="text-xs font-medium text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
                OAuth endpoints will be auto-discovered from the server URL after adding.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => { setShowCustomDialog(false); resetCustomForm(); }}>Cancel</Button>
            <Button size="sm" onClick={() => customMutation.mutate()} disabled={!customForm.name.trim() || !customForm.url.trim() || customMutation.isPending}>
              {customMutation.isPending ? 'Adding…' : customForm.authType === 'oauth' ? 'Add & Connect' : 'Add App'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── OAuth setup dialog (pre-registered client credentials) ── */}
      <Dialog open={!!oauthSetupTarget} onOpenChange={(v) => { if (!v) { setOauthSetupTarget(null); setOauthSetupValues({}); } }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <div className="flex items-center gap-2.5 mb-1">
              <div className="size-7 flex items-center justify-center overflow-hidden shrink-0">
                {oauthSetupTarget && <ServiceIcon url={oauthSetupTarget.url} name={oauthSetupTarget.name} size={20} />}
              </div>
              <DialogTitle>Connect {oauthSetupTarget?.name}</DialogTitle>
            </div>
            <DialogDescription className="text-pretty">
              {oauthSetupTarget?.name} requires a pre-registered OAuth app. You&apos;ll be redirected to authorize after entering your credentials.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-1">
            {oauthSetupTarget?.oauthSetup?.map((field, i) => (
              <div key={field.key} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-muted-foreground">{field.label}</Label>
                  {field.hintUrl && (
                      <a href={field.hintUrl} target="_blank" rel="noopener noreferrer"
                        className="text-xs text-muted-foreground/60 hover:text-primary flex items-center gap-0.5 transition-colors">
                        {field.hintText ?? 'Get credentials'}
                        <ArrowUpRight className="size-3 ml-0.5" />
                      </a>
                  )}
                </div>
                <Input
                  type="password"
                  placeholder={field.placeholder}
                  value={oauthSetupValues[field.key] ?? ''}
                  onChange={(e) => setOauthSetupValues((p) => ({ ...p, [field.key]: e.target.value }))}
                  autoFocus={i === 0}
                />
              </div>
            ))}
            <div className="space-y-1.5 rounded-lg border border-border/60 bg-muted/30 px-2.5 py-2">
              <div className="flex items-center justify-between gap-2">
                <Label className="text-xs text-muted-foreground">Redirect URI</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(oauthCallbackUri);
                      sileo.success({ title: 'Copied redirect URI' });
                    } catch {
                      sileo.error({ title: 'Copy failed' });
                    }
                  }}
                >
                  Copy
                </Button>
              </div>
              <code className="block text-xs text-foreground/80 wrap-break-word whitespace-pre-wrap">
                {oauthCallbackUri}
              </code>
            </div>
            <p className="text-xs font-medium text-muted-foreground/60">
              Stored securely · you&apos;ll be redirected to authorize
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => { setOauthSetupTarget(null); setOauthSetupValues({}); }}>Cancel</Button>
            <Button
              size="sm"
              onClick={() => {
                if (!oauthSetupTarget) return;
                const allFilled = oauthSetupTarget.oauthSetup?.every((f) => oauthSetupValues[f.key]?.trim());
                if (!allFilled) return;
                setAddingUrl(oauthSetupTarget.url);
                addMutation.mutate({ item: oauthSetupTarget, oauthCredentials: oauthSetupValues });
              }}
              disabled={
                addMutation.isPending ||
                !oauthSetupTarget?.oauthSetup?.every((f) => oauthSetupValues[f.key]?.trim())
              }
            >
              {addMutation.isPending ? 'Adding…' : 'Add & Connect'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── API Key dialog ───────────────────────────────────────── */}
      <Dialog open={!!apiKeyTarget} onOpenChange={(v) => { if (!v) { setApiKeyTarget(null); setApiKeyValues({}); } }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <div className="flex items-center gap-2.5 mb-1">
              <div className="size-7 flex items-center justify-center overflow-hidden shrink-0">
                {apiKeyTarget && <ServiceIcon url={apiKeyTarget.maintainerUrl} name={apiKeyTarget.name} size={20} />}
              </div>
              <DialogTitle>Connect {apiKeyTarget?.name}</DialogTitle>
            </div>
            <DialogDescription className="text-pretty">
              {apiKeyTarget?.fields?.length
                ? 'Enter your credentials to connect this app.'
                : <>Sent as <code className="text-xs bg-muted px-1 py-0.5 rounded font-mono">Authorization: Bearer …</code></>}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-1">
            {apiKeyTarget?.fields?.length ? (
              apiKeyTarget.fields.map((field, i) => (
                <div key={field.label} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-muted-foreground">{field.label}</Label>
                    {field.hintUrl && (
                      <a href={field.hintUrl} target="_blank" rel="noopener noreferrer"
                        className="text-xs text-muted-foreground/60 hover:text-primary flex items-center gap-0.5 transition-colors">
                        {field.hintText ?? 'Get key'}
                        <ArrowUpRight className="size-3 ml-0.5" />
                      </a>
                    )}
                  </div>
                  <Input
                    type="password"
                    placeholder={field.placeholder}
                    value={apiKeyValues[field.label] ?? ''}
                    onChange={(e) => setApiKeyValues((p) => ({ ...p, [field.label]: e.target.value }))}
                    autoFocus={i === 0}
                  />
                  {field.steps && field.steps.length > 0 && (
                    <div className="rounded-lg border border-border/50 bg-muted/30 px-3 py-2.5 space-y-2">
                      <p className="text-xs font-medium text-muted-foreground">How to get your token</p>
                      <ol className="space-y-2">
                        {field.steps.map((step, si) => {
                          const scopeMatch = step.text.match(/^(.*?add:\s*)(.+)$/);
                          const scopes = scopeMatch ? scopeMatch[2].split(',').map(s => s.trim()).filter(Boolean) : null;
                          return (
                            <li key={si} className="flex gap-2 text-xs text-muted-foreground/80 leading-relaxed">
                              <span className="shrink-0 font-medium text-muted-foreground/50 tabular-nums">{si + 1}.</span>
                              <span className="space-y-1.5">
                                <span className="block">
                                  {scopes ? scopeMatch![1] : step.text}
                                  {step.url && (
                                    <a href={step.url} target="_blank" rel="noopener noreferrer"
                                      className="ml-1 text-primary hover:text-primary/80 inline-flex items-center gap-0.5 transition-colors">
                                      {step.urlLabel ?? step.url}
                                      <ArrowUpRight className="size-3" />
                                    </a>
                                  )}
                                </span>
                                {scopes && (
                                  <span className="flex flex-wrap gap-1">
                                    {scopes.map(scope => (
                                      <code key={scope} className="text-xs bg-background border border-border/60 rounded px-1.5 py-0.5 font-mono text-foreground/70">{scope}</code>
                                    ))}
                                    <button
                                      type="button"
                                      onClick={() => navigator.clipboard.writeText(scopes.join(' '))}
                                      className="text-xs text-muted-foreground/50 hover:text-primary transition-colors ml-0.5 flex items-center gap-0.5"
                                    >
                                      Copy all
                                    </button>
                                  </span>
                                )}
                              </span>
                            </li>
                          );
                        })}
                      </ol>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">API Key</Label>
                <Input
                  type="password"
                  placeholder="sk-…"
                  value={apiKeyValues['key'] ?? ''}
                  onChange={(e) => setApiKeyValues({ key: e.target.value })}
                  autoFocus
                />
              </div>
            )}
            <p className="text-xs font-medium text-muted-foreground/60">
              Stored securely · editable later in My Apps
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => { setApiKeyTarget(null); setApiKeyValues({}); }}>Cancel</Button>
            <Button
              size="sm"
              onClick={() => {
                if (!apiKeyTarget) return;
                const firstVal = apiKeyTarget.fields?.length
                  ? Object.values(apiKeyValues)[0]
                  : apiKeyValues['key'];
                if (!firstVal?.trim()) return;
                setAddingUrl(apiKeyTarget.url);
                addMutation.mutate({ item: apiKeyTarget, fieldValues: apiKeyValues });
              }}
              disabled={
                addMutation.isPending ||
                !Object.values(apiKeyValues).some((v) => v.trim())
              }
            >
              {addMutation.isPending ? 'Adding…' : 'Add App'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function AppsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex-1 min-h-dvh flex flex-col py-8">
          <div className="max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 space-y-6">
            <div className="flex items-center justify-center gap-3">
              <Skeleton className="size-5 rounded" />
              <Skeleton className="h-6 w-16" />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {Array.from({ length: 12 }).map((_, i) => <CardSkeleton key={i} />)}
            </div>
          </div>
        </div>
      }
    >
      <McpMarketplaceContent />
    </Suspense>
  );
}
