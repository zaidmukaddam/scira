/* eslint-disable @next/next/no-img-element */
// /components/ui/form-component.tsx
import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { sileo } from 'sileo';
import { all } from 'better-all';
import { getBetterAllOptions } from '@/lib/better-all';
import { getMcpCatalogIcon, MCP_COMPONENT_ICON_URLS } from '@/lib/mcp/catalog-icons';
import { Github01Icon } from '@hugeicons/core-free-icons';
import { useDebouncer } from '@tanstack/react-pacer';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import {
  models,
  requiresAuthentication,
  requiresProSubscription,
  requiresMaxSubscription,
  hasVisionSupport,
  hasPdfSupport,
  getAcceptedFileTypes,
  shouldBypassRateLimits,
  getFilteredModels,
  isModelRestrictedInRegion,
  supportsExtremeMode,
  supportsCanvasMode,
  PROVIDERS,
  getModelProvider,
  getModelConfig,
  type ModelProvider,
} from '@/ai/models';
import {
  X,
  Check,
  Upload,
  CheckIcon,
  Zap,
  ArrowUpRight,
  Search,
  ChevronDown,
  Plus,
  Ghost,
  Star,
  AlertCircle,
  FileText,
  Lock,
} from 'lucide-react';
import { MagicWandIcon } from '@/components/ui/magic-wand-icon';
import { MagicEditIcon } from '@/components/ui/magic-edit-icon';
import { ProcessorIcon } from '@/components/ui/processor-icon';
import { Dialog, DialogContent, DialogTitle, DialogHeader, DialogDescription } from '@/components/ui/dialog';
import { cn, SearchGroup, SearchGroupId, getSearchGroups, SearchProvider } from '@/lib/utils';

import { track } from '@vercel/analytics';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ComprehensiveUserData } from '@/hooks/use-user-data';
import { enhancePrompt, getDiscountConfigAction, getUserCountryCode } from '@/app/actions';
import { DiscountConfig } from '@/lib/discount';
import { PRICING, SEARCH_LIMITS } from '@/lib/constants';
import { LockIcon, Eye, Brain, FilePdf, MagnifyingGlassIcon } from '@phosphor-icons/react';
import { HugeiconsIcon } from '@/components/ui/hugeicons';
import {
  GlobalSearchIcon,
  AtomicPowerIcon,
  Crown02Icon,
  DocumentAttachmentIcon,
  ConnectIcon,
  StarIcon,
} from '@hugeicons/core-free-icons';
import { AgentNetworkIcon } from '@/components/icons/agent-network-icon';
import { AudioLinesIcon } from '@/components/ui/audio-lines';
import { GripIcon } from '@/components/ui/grip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from '@/components/ui/drawer';
import { Kbd } from '@/components/ui/kbd';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import TextRotate from '@/components/ui/text-rotate';
import { AppsIcon } from '@/components/icons/apps-icon';
import { SarvamLogo } from '@/components/logos/sarvam-logo';
import type { SVGProps } from 'react';
import { UseChatHelpers } from '@ai-sdk/react';
import { ChatMessage } from '@/lib/types';
import { useLocation } from '@/hooks/use-location';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { useSyncedPreferences } from '@/hooks/use-synced-preferences';
import { useIsMobile } from '@/hooks/use-mobile';
import { CONNECTOR_CONFIGS, CONNECTOR_ICONS, type ConnectorProvider } from '@/lib/connectors';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { listUserConnectorsAction } from '@/app/actions';
import { CaretDownIcon } from '@phosphor-icons/react/dist/ssr';
import { useWebHaptics } from 'web-haptics/react';

type SvgIconComponent = React.ComponentType<React.SVGProps<SVGSVGElement>>;
type HugeiconsIconProp = React.ComponentProps<typeof HugeiconsIcon>['icon'];

const NVIDIA = (props: SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlSpace="preserve" viewBox="35.188 31.512 351.46 258.785">
    <path
      fill="currentColor"
      d="M384.195 282.109c0 3.771-2.769 6.302-6.047 6.302v-.023c-3.371.023-6.089-2.508-6.089-6.278 0-3.769 2.718-6.293 6.089-6.293 3.279-.001 6.047 2.523 6.047 6.292zm2.453 0c0-5.175-4.02-8.179-8.5-8.179-4.511 0-8.531 3.004-8.531 8.179 0 5.172 4.021 8.188 8.531 8.188 4.481 0 8.5-3.016 8.5-8.188m-9.91.692h.91l2.109 3.703h2.316l-2.336-3.859c1.207-.086 2.2-.661 2.2-2.286 0-2.019-1.392-2.668-3.75-2.668h-3.411v8.813h1.961v-3.703m.001-1.492v-2.122h1.364c.742 0 1.753.06 1.753.965 0 .985-.523 1.157-1.398 1.157h-1.719M329.406 237.027l10.598 28.993H318.48l10.926-28.993zm-11.35-11.289-24.423 61.88h17.246l3.863-10.934h28.903l3.656 10.934h18.722l-24.605-61.888-23.362.008zm-49.033 61.903h17.497v-61.922l-17.5-.004.003 61.926zm-121.467-61.926-14.598 49.078-13.984-49.074-18.879-.004 19.972 61.926h25.207l20.133-61.926h-17.851zm70.725 13.484h7.52c10.91 0 17.966 4.898 17.966 17.609 0 12.714-7.056 17.613-17.966 17.613h-7.52v-35.222zm-17.35-13.484v61.926h28.366c15.113 0 20.048-2.512 25.384-8.148 3.769-3.957 6.207-12.641 6.207-22.134 0-8.707-2.063-16.468-5.66-21.304-6.481-8.649-15.817-10.34-29.75-10.34h-24.547zm-165.743-.086v62.012h17.645v-47.086l13.672.004c4.527 0 7.754 1.128 9.934 3.457 2.765 2.945 3.894 7.699 3.894 16.395v27.23h17.098v-34.262c0-24.453-15.586-27.75-30.836-27.75H35.188zm137.583.086.007 61.926h17.489v-61.926h-17.496z"
    />
    <path
      fill="currentColor"
      d="M82.211 102.414s22.504-33.203 67.437-36.638V53.73c-49.769 3.997-92.867 46.149-92.867 46.149s24.41 70.565 92.867 77.026v-12.804c-50.237-6.32-67.437-61.687-67.437-61.687zm67.437 36.223v11.726c-37.968-6.769-48.507-46.237-48.507-46.237s18.23-20.195 48.507-23.47v12.867c-.023 0-.039-.007-.058-.007-15.891-1.907-28.305 12.938-28.305 12.938s6.958 24.991 28.363 32.183m0-107.125V53.73c1.461-.112 2.922-.207 4.391-.257 56.582-1.907 93.449 46.406 93.449 46.406s-42.343 51.488-86.457 51.488c-4.043 0-7.828-.375-11.383-1.005v13.739c3.04.386 6.192.613 9.481.613 41.051 0 70.738-20.965 99.484-45.778 4.766 3.817 24.278 13.103 28.289 17.168-27.332 22.883-91.031 41.329-127.144 41.329-3.481 0-6.824-.211-10.11-.528v19.306H305.68V31.512H149.648zm0 49.144V65.777c1.446-.101 2.903-.179 4.391-.226 40.688-1.278 67.382 34.965 67.382 34.965s-28.832 40.043-59.746 40.043c-4.449 0-8.438-.715-12.028-1.922V93.523c15.84 1.914 19.028 8.911 28.551 24.786l21.18-17.859s-15.461-20.277-41.524-20.277c-2.833-.001-5.544.198-8.206.483"
    />
  </svg>
);

function FlexibleIcon({
  icon,
  size,
  color = 'currentColor',
  strokeWidth,
  className,
}: {
  icon: HugeiconsIconProp | SvgIconComponent;
  size: number;
  color?: string;
  strokeWidth?: number;
  className?: string;
}) {
  if (typeof icon === 'function') {
    const Icon = icon;
    return <Icon width={size} height={size} color={color} strokeWidth={strokeWidth} className={className} />;
  }

  return <HugeiconsIcon icon={icon} size={size} color={color} strokeWidth={strokeWidth} className={className} />;
}

// Pro Badge Component
const ProBadge = ({ className = '' }: { className?: string }) => (
  <span
    className={`font-baumans inline-flex items-center gap-1 rounded-lg shadow-sm border-none! outline-0! ring-offset-1 ring-offset-background/50! bg-linear-to-br from-secondary/25 via-primary/20 to-accent/25 text-foreground px-2.5 pt-0.5 pb-2! sm:pt-1 leading-3 dark:bg-linear-to-br dark:from-primary dark:via-secondary dark:to-primary dark:text-foreground ${className}`}
  >
    <span>pro</span>
  </span>
);

// Provider Icon Component
const ProviderIcon = ({
  provider,
  size = 18,
  className = '',
}: {
  provider: ModelProvider;
  size?: number;
  className?: string;
}) => {
  const iconProps = { width: size, height: size, className: cn('shrink-0', className) };

  switch (provider) {
    case 'scira':
      return <HugeiconsIcon icon={StarIcon} {...iconProps} />;
    case 'sarvam':
      return <SarvamLogo width={size} height={size} className={className} />;
    case 'xai':
      return (
        <svg {...iconProps} className="shrink-0 size-4.5 p-0 m-0" fill="currentColor" viewBox="0 0 841.89 595.28">
          <path d="m557.09 211.99 8.31 326.37h66.56l8.32-445.18zM640.28 56.91H538.72L379.35 284.53l50.78 72.52zM201.61 538.36h101.56l50.79-72.52-50.79-72.53zM201.61 211.99l228.52 326.37h101.56L303.17 211.99z" />
        </svg>
      );
    case 'openai':
      return (
        <svg {...iconProps} viewBox="0 0 24 24" fill="currentColor">
          <path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.646zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.676l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.34 7.872zm16.597 3.855l-5.833-3.387L15.119 7.2a.076.076 0 0 1 .071 0l4.83 2.791a4.494 4.494 0 0 1-.676 8.105v-5.678a.79.79 0 0 0-.407-.667zm2.01-3.023l-.141-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.409 9.23V6.897a.066.066 0 0 1 .028-.061l4.83-2.787a4.5 4.5 0 0 1 6.68 4.66zm-12.64 4.135l-2.02-1.164a.08.08 0 0 1-.038-.057V6.075a4.5 4.5 0 0 1 7.375-3.453l-.142.08-4.778 2.758a.795.795 0 0 0-.392.681zm1.097-2.365l2.602-1.5 2.607 1.5v2.999l-2.597 1.5-2.607-1.5z" />
        </svg>
      );
    case 'anthropic':
      return (
        <svg {...iconProps} viewBox="0 0 24 24" fill="currentColor" fillRule="evenodd">
          <path d="M13.827 3.52h3.603L24 20h-3.603l-6.57-16.48zm-7.258 0h3.767L16.906 20h-3.674l-1.343-3.461H5.017l-1.344 3.46H0L6.57 3.522zm4.132 9.959L8.453 7.687 6.205 13.48H10.7z" />
        </svg>
      );
    case 'google':
      return (
        <svg {...iconProps} viewBox="0 0 24 24" fill="currentColor">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
        </svg>
      );
    case 'alibaba':
      return (
        <svg {...iconProps} fill="currentColor" fillRule="evenodd" viewBox="0 0 24 24">
          <path d="M12.604 1.34c.393.69.784 1.382 1.174 2.075a.18.18 0 00.157.091h5.552c.174 0 .322.11.446.327l1.454 2.57c.19.337.24.478.024.837-.26.43-.513.864-.76 1.3l-.367.658c-.106.196-.223.28-.04.512l2.652 4.637c.172.301.111.494-.043.77-.437.785-.882 1.564-1.335 2.34-.159.272-.352.375-.68.37-.777-.016-1.552-.01-2.327.016a.099.099 0 00-.081.05 575.097 575.097 0 01-2.705 4.74c-.169.293-.38.363-.725.364-.997.003-2.002.004-3.017.002a.537.537 0 01-.465-.271l-1.335-2.323a.09.09 0 00-.083-.049H4.982c-.285.03-.553-.001-.805-.092l-1.603-2.77a.543.543 0 01-.002-.54l1.207-2.12a.198.198 0 000-.197 550.951 550.951 0 01-1.875-3.272l-.79-1.395c-.16-.31-.173-.496.095-.965.465-.813.927-1.625 1.387-2.436.132-.234.304-.334.584-.335a338.3 338.3 0 012.589-.001.124.124 0 00.107-.063l2.806-4.895a.488.488 0 01.422-.246c.524-.001 1.053 0 1.583-.006L11.704 1c.341-.003.724.032.9.34zm-3.432.403a.06.06 0 00-.052.03L6.254 6.788a.157.157 0 01-.135.078H3.253c-.056 0-.07.025-.041.074l5.81 10.156c.025.042.013.062-.034.063l-2.795.015a.218.218 0 00-.2.116l-1.32 2.31c-.044.078-.021.118.068.118l5.716.008c.046 0 .08.02.104.061l1.403 2.454c.046.081.092.082.139 0l5.006-8.76.783-1.382a.055.055 0 01.096 0l1.424 2.53a.122.122 0 00.107.062l2.763-.02a.04.04 0 00.035-.02.041.041 0 000-.04l-2.9-5.086a.108.108 0 010-.113l.293-.507 1.12-1.977c.024-.041.012-.062-.035-.062H9.2c-.059 0-.073-.026-.043-.077l1.434-2.505a.107.107 0 000-.114L9.225 1.774a.06.06 0 00-.053-.031zm6.29 8.02c.046 0 .058.02.034.06l-.832 1.465-2.613 4.585a.056.056 0 01-.05.029.058.058 0 01-.05-.029L8.498 9.841c-.02-.034-.01-.052.028-.054l.216-.012 6.722-.012z" />
        </svg>
      );
    case 'mistral':
      return (
        <svg {...iconProps} preserveAspectRatio="xMidYMid" viewBox="0 0 256 233">
          <path fill="currentColor" d="M186.18182 0h46.54545v46.54545h-46.54545z" />
          <path fill="currentColor" d="M209.45454 0h46.54545v46.54545h-46.54545z" />
          <path
            fill="currentColor"
            d="M0 0h46.54545v46.54545H0zM0 46.54545h46.54545V93.0909H0zM0 93.09091h46.54545v46.54545H0zM0 139.63636h46.54545v46.54545H0zM0 186.18182h46.54545v46.54545H0z"
          />
          <path fill="currentColor" d="M23.27273 0h46.54545v46.54545H23.27273z" />
          <path
            fill="currentColor"
            d="M209.45454 46.54545h46.54545V93.0909h-46.54545zM23.27273 46.54545h46.54545V93.0909H23.27273z"
          />
          <path fill="currentColor" d="M139.63636 46.54545h46.54545V93.0909h-46.54545z" />
          <path
            fill="currentColor"
            d="M162.90909 46.54545h46.54545V93.0909h-46.54545zM69.81818 46.54545h46.54545V93.0909H69.81818z"
          />
          <path
            fill="currentColor"
            d="M116.36364 93.09091h46.54545v46.54545h-46.54545zM162.90909 93.09091h46.54545v46.54545h-46.54545zM69.81818 93.09091h46.54545v46.54545H69.81818z"
          />
          <path fill="currentColor" d="M93.09091 139.63636h46.54545v46.54545H93.09091z" />
          <path fill="currentColor" d="M116.36364 139.63636h46.54545v46.54545h-46.54545z" />
          <path
            fill="currentColor"
            d="M209.45454 93.09091h46.54545v46.54545h-46.54545zM23.27273 93.09091h46.54545v46.54545H23.27273z"
          />
          <path fill="currentColor" d="M186.18182 139.63636h46.54545v46.54545h-46.54545z" />
          <path fill="currentColor" d="M209.45454 139.63636h46.54545v46.54545h-46.54545z" />
          <path fill="currentColor" d="M186.18182 186.18182h46.54545v46.54545h-46.54545z" />
          <path fill="currentColor" d="M23.27273 139.63636h46.54545v46.54545H23.27273z" />
          <path
            fill="currentColor"
            d="M209.45454 186.18182h46.54545v46.54545h-46.54545zM23.27273 186.18182h46.54545v46.54545H23.27273z"
          />
        </svg>
      );
    case 'deepseek':
      return (
        <svg {...iconProps} viewBox="0 0 24 24">
          <path
            fill="currentColor"
            d="M23.748 4.482c-.254-.124-.364.113-.512.234-.051.039-.094.09-.137.136-.372.397-.806.657-1.373.626-.829-.046-1.537.214-2.163.848-.133-.782-.575-1.248-1.247-1.548-.352-.156-.708-.311-.955-.65-.172-.241-.219-.51-.305-.774-.055-.16-.11-.323-.293-.35-.2-.031-.278.136-.356.276-.313.572-.434 1.202-.422 1.84.027 1.436.633 2.58 1.838 3.393.137.093.172.187.129.323-.082.28-.18.552-.266.833-.055.179-.137.217-.329.14a5.526 5.526 0 0 1-1.736-1.18c-.857-.828-1.631-1.742-2.597-2.458a11.365 11.365 0 0 0-.689-.471c-.985-.957.13-1.743.388-1.836.27-.098.093-.432-.779-.428-.872.004-1.67.295-2.687.684a3.055 3.055 0 0 1-.465.137 9.597 9.597 0 0 0-2.883-.102c-1.885.21-3.39 1.102-4.497 2.623C.082 8.606-.231 10.684.152 12.85c.403 2.284 1.569 4.175 3.36 5.653 1.858 1.533 3.997 2.284 6.438 2.14 1.482-.085 3.133-.284 4.994-1.86.47.234.962.327 1.78.397.63.059 1.236-.03 1.705-.128.735-.156.684-.837.419-.961-2.155-1.004-1.682-.595-2.113-.926 1.096-1.296 2.746-2.642 3.392-7.003.05-.347.007-.565 0-.845-.004-.17.035-.237.23-.256a4.173 4.173 0 0 0 1.545-.475c1.396-.763 1.96-2.015 2.093-3.517.02-.23-.004-.467-.247-.588zM11.581 18c-2.089-1.642-3.102-2.183-3.52-2.16-.392.024-.321.471-.235.763.09.288.207.486.371.739.114.167.192.416-.113.603-.673.416-1.842-.14-1.897-.167-1.361-.802-2.5-1.86-3.301-3.307-.774-1.393-1.224-2.887-1.298-4.482-.02-.386.093-.522.477-.592a4.696 4.696 0 0 1 1.529-.039c2.132.312 3.946 1.265 5.468 2.774.868.86 1.525 1.887 2.202 2.891.72 1.066 1.494 2.082 2.48 2.914.348.292.625.514.891.677-.802.09-2.14.11-3.054-.614zm1-6.44a.306.306 0 0 1 .415-.287.302.302 0 0 1 .2.288.306.306 0 0 1-.31.307.303.303 0 0 1-.304-.308zm3.11 1.596c-.2.081-.399.151-.59.16a1.245 1.245 0 0 1-.798-.254c-.274-.23-.47-.358-.552-.758a1.73 1.73 0 0 1 .016-.588c.07-.327-.008-.537-.239-.727-.187-.156-.426-.199-.688-.199a.559.559 0 0 1-.254-.078.253.253 0 0 1-.114-.358c.028-.054.16-.186.192-.21.356-.202.767-.136 1.146.016.352.144.618.408 1.001.782.391.451.462.576.685.914.176.265.336.537.445.848.067.195-.019.354-.25.452z"
          />
        </svg>
      );
    case 'zhipu':
      return (
        <svg {...iconProps} fill="currentColor" fillRule="evenodd" viewBox="0 0 24 24">
          <path d="M12.105 2L9.927 4.953H.653L2.83 2h9.276zM23.254 19.048L21.078 22h-9.242l2.174-2.952h9.244zM24 2L9.264 22H0L14.736 2H24z" />
        </svg>
      );
    case 'cohere':
      return (
        <svg {...iconProps} viewBox="0 0 75 75">
          <path
            fill="currentColor"
            fillRule="evenodd"
            clipRule="evenodd"
            d="M24.3 44.7c2 0 6-.1 11.6-2.4 6.5-2.7 19.3-7.5 28.6-12.5 6.5-3.5 9.3-8.1 9.3-14.3C73.8 7 66.9 0 58.3 0h-36C10 0 0 10 0 22.3s9.4 22.4 24.3 22.4z"
          />
          <path
            fill="currentColor"
            fillRule="evenodd"
            clipRule="evenodd"
            d="M30.4 60c0-6 3.6-11.5 9.2-13.8l11.3-4.7C62.4 36.8 75 45.2 75 57.6 75 67.2 67.2 75 57.6 75H45.3c-8.2 0-14.9-6.7-14.9-15z"
          />
          <path
            fill="currentColor"
            d="M12.9 47.6C5.8 47.6 0 53.4 0 60.5v1.7C0 69.2 5.8 75 12.9 75c7.1 0 12.9-5.8 12.9-12.9v-1.7c-.1-7-5.8-12.8-12.9-12.8z"
          />
        </svg>
      );
    case 'moonshot':
      return (
        <svg {...iconProps} fill="currentColor" fillRule="evenodd" viewBox="0 0 24 24">
          <path d="M1.052 16.916l9.539 2.552a21.007 21.007 0 00.06 2.033l5.956 1.593a11.997 11.997 0 01-5.586.865l-.18-.016-.044-.004-.084-.009-.094-.01a11.605 11.605 0 01-.157-.02l-.107-.014-.11-.016a11.962 11.962 0 01-.32-.051l-.042-.008-.075-.013-.107-.02-.07-.015-.093-.019-.075-.016-.095-.02-.097-.023-.094-.022-.068-.017-.088-.022-.09-.024-.095-.025-.082-.023-.109-.03-.062-.02-.084-.025-.093-.028-.105-.034-.058-.019-.08-.026-.09-.031-.066-.024a6.293 6.293 0 01-.044-.015l-.068-.025-.101-.037-.057-.022-.08-.03-.087-.035-.088-.035-.079-.032-.095-.04-.063-.028-.063-.027a5.655 5.655 0 01-.041-.018l-.066-.03-.103-.047-.052-.024-.096-.046-.062-.03-.084-.04-.086-.044-.093-.047-.052-.027-.103-.055-.057-.03-.058-.032a6.49 6.49 0 01-.046-.026l-.094-.053-.06-.034-.051-.03-.072-.041-.082-.05-.093-.056-.052-.032-.084-.053-.061-.039-.079-.05-.07-.047-.053-.035a7.785 7.785 0 01-.054-.036l-.044-.03-.044-.03a6.066 6.066 0 01-.04-.028l-.057-.04-.076-.054-.069-.05-.074-.054-.056-.042-.076-.057-.076-.059-.086-.067-.045-.035-.064-.052-.074-.06-.089-.073-.046-.039-.046-.039a7.516 7.516 0 01-.043-.037l-.045-.04-.061-.053-.07-.062-.068-.06-.062-.058-.067-.062-.053-.05-.088-.084a13.28 13.28 0 01-.099-.097l-.029-.028-.041-.042-.069-.07-.05-.051-.05-.053a6.457 6.457 0 01-.168-.179l-.08-.088-.062-.07-.071-.08-.042-.049-.053-.062-.058-.068-.046-.056a7.175 7.175 0 01-.027-.033l-.045-.055-.066-.082-.041-.052-.05-.064-.02-.025a11.99 11.99 0 01-1.44-2.402zm-1.02-5.794l11.353 3.037a20.468 20.468 0 00-.469 2.011l10.817 2.894a12.076 12.076 0 01-1.845 2.005L.657 15.923l-.016-.046-.035-.104a11.965 11.965 0 01-.05-.153l-.007-.023a11.896 11.896 0 01-.207-.741l-.03-.126-.018-.08-.021-.097-.018-.081-.018-.09-.017-.084-.018-.094c-.026-.141-.05-.283-.071-.426l-.017-.118-.011-.083-.013-.102a12.01 12.01 0 01-.019-.161l-.005-.047a12.12 12.12 0 01-.034-2.145zm1.593-5.15l11.948 3.196c-.368.605-.705 1.231-1.01 1.875l11.295 3.022c-.142.82-.368 1.612-.668 2.365l-11.55-3.09L.124 10.26l.015-.1.008-.049.01-.067.015-.087.018-.098c.026-.148.056-.295.088-.442l.028-.124.02-.085.024-.097c.022-.09.045-.18.07-.268l.028-.102.023-.083.03-.1.025-.082.03-.096.026-.082.031-.095a11.896 11.896 0 011.01-2.232zm4.442-4.4L17.352 4.59a20.77 20.77 0 00-1.688 1.721l7.823 2.093c.267.852.442 1.744.513 2.665L2.106 5.213l.045-.065.027-.04.04-.055.046-.065.055-.076.054-.072.064-.086.05-.065.057-.073.055-.07.06-.074.055-.069.065-.077.054-.066.066-.077.053-.06.072-.082.053-.06.067-.074.054-.058.073-.078.058-.06.063-.067.168-.17.1-.098.059-.056.076-.071a12.084 12.084 0 012.272-1.677zM12.017 0h.097l.082.001.069.001.054.002.068.002.046.001.076.003.047.002.06.003.054.002.087.005.105.007.144.011.088.007.044.004.077.008.082.008.047.005.102.012.05.006.108.014.081.01.042.006.065.01.207.032.07.012.065.011.14.026.092.018.11.022.046.01.075.016.041.01L14.7.3l.042.01.065.015.049.012.071.017.096.024.112.03.113.03.113.032.05.015.07.02.078.024.073.023.05.016.05.016.076.025.099.033.102.036.048.017.064.023.093.034.11.041.116.045.1.04.047.02.06.024.041.018.063.026.04.018.057.025.11.048.1.046.074.035.075.036.06.028.092.046.091.045.102.052.053.028.049.026.046.024.06.033.041.022.052.029.088.05.106.06.087.051.057.034.053.032.096.059.088.055.098.062.036.024.064.041.084.056.04.027.062.042.062.043.023.017c.054.037.108.075.161.114l.083.06.065.048.056.043.086.065.082.064.04.03.05.041.086.069.079.065.085.071c.712.6 1.353 1.283 1.909 2.031L7.222.994l.062-.027.065-.028.081-.034.086-.035c.113-.045.227-.09.341-.131l.096-.035.093-.033.084-.03.096-.031c.087-.03.176-.058.264-.085l.091-.027.086-.025.102-.03.085-.023.1-.026L9.04.37l.09-.023.091-.022.095-.022.09-.02.098-.021.091-.02.095-.018.092-.018.1-.018.091-.016.098-.017.092-.014.097-.015.092-.013.102-.013.091-.012.105-.012.09-.01.105-.01c.093-.01.186-.018.28-.024l.106-.008.09-.005.11-.006.093-.004.1-.004.097-.002.099-.002.197-.002z" />
        </svg>
      );
    case 'minimax':
      return (
        <svg {...iconProps} viewBox="0 0 24 24" fill="currentColor">
          <path d="M11.43 3.92a.86.86 0 1 0-1.718 0v14.236a1.999 1.999 0 0 1-3.997 0V9.022a.86.86 0 1 0-1.718 0v3.87a1.999 1.999 0 0 1-3.997 0V11.49a.57.57 0 0 1 1.139 0v1.404a.86.86 0 0 0 1.719 0V9.022a1.999 1.999 0 0 1 3.997 0v9.134a.86.86 0 0 0 1.719 0V3.92a1.998 1.998 0 1 1 3.996 0v11.788a.57.57 0 1 1-1.139 0zm10.572 3.105a2 2 0 0 0-1.999 1.997v7.63a.86.86 0 0 1-1.718 0V3.923a1.999 1.999 0 0 0-3.997 0v16.16a.86.86 0 0 1-1.719 0V18.08a.57.57 0 1 0-1.138 0v2a1.998 1.998 0 0 0 3.996 0V3.92a.86.86 0 0 1 1.719 0v12.73a1.999 1.999 0 0 0 3.996 0V9.023a.86.86 0 1 1 1.72 0v6.686a.57.57 0 0 0 1.138 0V9.022a2 2 0 0 0-1.998-1.997" />
        </svg>
      );
    case 'bytedance':
      return (
        <svg {...iconProps} viewBox="0 0 24 24" fill="currentColor">
          <path d="M19.8772 1.4685 24 2.5326v18.9426l-4.1228 1.0563V1.4685zm-13.3481 9.428 4.115 1.0641v8.9786l-4.115 1.0642v-11.107zM0 2.572l4.115 1.0642v16.7354L0 21.428V2.572zm17.4553 5.6205v11.107l-4.1228-1.0642V9.2568l4.1228-1.0642z" />
        </svg>
      );
    case 'arcee':
      return (
        <svg {...iconProps} viewBox="0 0 82 72" fill="none">
          <path
            d="M41 1L81 71H1L41 1ZM41 1L41 48.1579M1.09847 71L41 48.1579M41 48.1579L80.9015 71"
            stroke="currentColor"
            strokeWidth="2"
            strokeMiterlimit="10"
            strokeLinejoin="round"
          />
        </svg>
      );
    case 'vercel':
      return (
        <svg {...iconProps} viewBox="0 0 24 24" fill="currentColor">
          <path d="M24 22.525H0l12-21.05 12 21.05z" />
        </svg>
      );
    case 'amazon':
      return (
        <svg {...iconProps} viewBox="0 0 32 32" fillRule="evenodd">
          <path
            fill="currentColor"
            d="M28.312 28.26C25.003 30.7 20.208 32 16.08 32c-5.8 0-11.002-2.14-14.945-5.703-.3-.28-.032-.662.34-.444C5.73 28.33 11 29.82 16.426 29.82a29.73 29.73 0 0 0 11.406-2.332c.56-.238 1.03.367.48.773m1.376-1.575c-.42-.54-2.796-.255-3.86-.13-.325.04-.374-.243-.082-.446 1.9-1.33 4.994-.947 5.356-.5s-.094 3.56-1.87 5.044c-.273.228-.533.107-.4-.196.4-.996 1.294-3.23.87-3.772"
          />
          <path
            fill="currentColor"
            d="M18.43 13.864c0 1.692.043 3.103-.812 4.605-.7 1.22-1.8 1.973-3.005 1.973-1.667 0-2.644-1.27-2.644-3.145 0-3.7 3.316-4.373 6.462-4.373v.94m4.38 10.584c-.287.257-.702.275-1.026.104-1.44-1.197-1.704-1.753-2.492-2.895-2.382 2.43-4.074 3.157-7.158 3.157-3.658 0-6.498-2.254-6.498-6.767 0-3.524 1.905-5.924 4.63-7.097 2.357-1.038 5.65-1.22 8.165-1.5V8.9c0-1.032.08-2.254-.53-3.145-.525-.8-1.54-1.13-2.437-1.13-1.655 0-3.127.85-3.487 2.608-.073.4-.36.776-.757.794L7 7.555c-.354-.08-.75-.366-.647-.9C7.328 1.54 11.945 0 16.074 0c2.113 0 4.874.562 6.54 2.162 2.113 1.973 1.912 4.605 1.912 7.47V16.4c0 2.034.843 2.925 1.637 4.025.275.4.336.86-.018 1.154a184.26 184.26 0 0 0-3.328 2.883l-.006-.012"
          />
        </svg>
      );
    case 'xiaomi':
      return (
        <svg {...iconProps} viewBox="0 0 24 24" fill="currentColor">
          <path d="M19.96 20a.32.32 0 0 1-.32-.32V4.32a.32.32 0 0 1 .32-.32h3.71a.32.32 0 0 1 .33.32v15.36a.32.32 0 0 1-.33.32zm-6.22 0s-.3-.09-.3-.32v-9.43A2.18 2.18 0 0 0 11.24 8H4.3c-.4 0-.3.3-.3.3v11.38c0 .27-.3.32-.3.32H.33a.32.32 0 0 1-.33-.32V4.32A.32.32 0 0 1 .33 4h12.86a4.28 4.28 0 0 1 4.25 4.27l.01 11.41a.32.32 0 0 1-.32.32zm-6.9 0a.3.3 0 0 1-.3-.3v-9a.3.3 0 0 1 .3-.3h3.77a.3.3 0 0 1 .29.3v9a.3.3 0 0 1-.3.3z" />
        </svg>
      );
    case 'kwaipilot':
      return (
        <svg {...iconProps} fill="currentColor" fillRule="evenodd" viewBox="0 0 24 24">
          <path
            clipRule="evenodd"
            d="M11.765.03C5.327.03.108 5.25.108 11.686c0 3.514 1.556 6.665 4.015 8.804L9.89 8.665h6.451L9.31 23.083c.807.173 1.63.26 2.455.26 6.438 0 11.657-5.22 11.657-11.658S18.202.028 11.765.028V.03z"
          />
        </svg>
      );
    case 'stepfun':
      return (
        <svg {...iconProps} fill="currentColor" fillRule="evenodd" viewBox="0 0 24 24">
          <path d="M22.012 0h1.032v.927H24v.968h-.956V3.78h-1.032V1.896h-1.878v-.97h1.878V0zM2.6 12.371V1.87h.969v10.502h-.97zm10.423.66h10.95v.918h-6.208v9.579h-4.742V13.03zM5.629 3.333v12.356H0v4.51h10.386V8L20.859 8l-.003-4.668-15.227.001z" />
        </svg>
      );
    case 'inception':
      return (
        <svg {...iconProps} fill="currentColor" fillRule="evenodd" viewBox="0 0 24 24">
          <path d="M14.767 1H7.884L1 7.883v6.884h6.884V7.883h6.883V1zM9.234 23h6.882L23 16.116V9.233h-6.884v6.883H9.234V23z" />
        </svg>
      );
    case 'nvidia':
      return <NVIDIA {...iconProps} />;
    default:
      return (
        <svg {...iconProps} viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="12" r="10" />
        </svg>
      );
  }
};

// Provider order for sidebar (most popular first)
const PROVIDER_ORDER: (ModelProvider | 'all')[] = [
  'all',
  'xai',
  'openai',
  'mistral',
  'anthropic',
  'google',
  'sarvam',
  'nvidia',
  'inception',
  'alibaba',
  'bytedance',
  'zhipu',
  'minimax',
  'deepseek',
  'moonshot',
  'cohere',
  'arcee',
  'vercel',
  'amazon',
  'xiaomi',
  'kwaipilot',
  'stepfun',
];

let modelUpgradeDialogModelValueCache: string | null = null;
let modelSwitcherOpenCache = false;
let cachedCountryCode: string | null = null;
let countryCodeRequest: Promise<string | null> | null = null;

async function getCountryCodeOnce(): Promise<string | null> {
  if (cachedCountryCode !== null) return cachedCountryCode;
  if (countryCodeRequest) return countryCodeRequest;

  countryCodeRequest = getUserCountryCode()
    .then((code) => {
      cachedCountryCode = code;
      return code;
    })
    .catch(() => null)
    .finally(() => {
      countryCodeRequest = null;
    });

  return countryCodeRequest;
}

interface TypewriterResumeCache {
  target: string;
  index: number;
  speed: number;
}

// Preserve in-progress prompt enhancement across transient remounts.
let pendingTypewriterResumeCache: TypewriterResumeCache | null = null;

interface ModelSwitcherProps {
  selectedModel: string;
  setSelectedModel: (value: string) => void;
  className?: string;
  attachments: Array<Attachment>;
  messages: Array<ChatMessage>;
  status: UseChatHelpers<ChatMessage>['status'];
  onModelSelect?: (model: (typeof models)[0]) => void;
  subscriptionData?: any;
  user?: ComprehensiveUserData | null;
  selectedGroup: SearchGroupId;
  autoRoutedModel?: { model: string; route: string } | null;
  inputRef?: React.RefObject<HTMLTextAreaElement | null>;
}

const ModelSwitcher: React.FC<ModelSwitcherProps> = React.memo(
  ({
    selectedModel,
    setSelectedModel,
    className,
    attachments,
    messages,
    onModelSelect,
    subscriptionData,
    user,
    selectedGroup,
    autoRoutedModel,
    inputRef: externalInputRef,
  }) => {
    const isProUser = useMemo(() => Boolean(user?.isProUser), [user?.isProUser]);
    const isMaxUser = useMemo(() => Boolean(user?.isMaxUser), [user?.isMaxUser]);

    const isSubscriptionLoading = useMemo(() => user && !subscriptionData, [user, subscriptionData]);

    const [countryCode, setCountryCode] = useState<string | null>(null);

    // Fetch country code on mount
    useEffect(() => {
      let mounted = true;
      getCountryCodeOnce().then((code) => {
        if (mounted) setCountryCode(code);
      });
      return () => {
        mounted = false;
      };
    }, []);

    const availableModels = useMemo(() => getFilteredModels(countryCode || undefined), [countryCode]);

    const [showUpgradeDialogState, setShowUpgradeDialogState] = useState(false);
    const [showSignInDialog, setShowSignInDialog] = useState(false);
    const [selectedProModelValue, setSelectedProModelValue] = useState<string | null>(
      () => modelUpgradeDialogModelValueCache,
    );
    const [selectedAuthModel, setSelectedAuthModel] = useState<(typeof models)[0] | null>(null);
    const [openState, setOpenState] = useState(() => modelSwitcherOpenCache);
    const setOpen = useCallback((nextOpen: boolean) => {
      modelSwitcherOpenCache = nextOpen;
      setOpenState(nextOpen);
    }, []);
    const open = openState;
    const showUpgradeDialog = showUpgradeDialogState;

    const setShowUpgradeDialog = useCallback((open: boolean) => {
      setShowUpgradeDialogState(open);
      if (!open) {
        modelUpgradeDialogModelValueCache = null;
        setSelectedProModelValue(null);
      }
    }, []);

    const selectedProModel = useMemo(
      () => models.find((model) => model.value === selectedProModelValue) ?? null,
      [selectedProModelValue],
    );
    const selectedRequiresMax = useMemo(
      () => (selectedProModel ? requiresMaxSubscription(selectedProModel.value) : false),
      [selectedProModel],
    );
    const setSelectedProModel = useCallback((model: (typeof models)[0] | null) => {
      const value = model?.value ?? null;
      modelUpgradeDialogModelValueCache = value;
      setSelectedProModelValue(value);
    }, []);

    useEffect(() => {
      if (!isMaxUser) return;
      setShowUpgradeDialog(false);
      modelUpgradeDialogModelValueCache = null;
      setSelectedProModelValue(null);
    }, [isMaxUser, setShowUpgradeDialog]);

    const isMobile = useIsMobile();
    const haptics = useWebHaptics();

    // ⌘M keyboard shortcut to toggle model switcher
    useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'm') {
          e.preventDefault();
          setOpen(!modelSwitcherOpenCache);
        }
      };
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }, [setOpen]);

    const [searchQuery, setSearchQuery] = useState('');
    const [selectedProvider, setSelectedProvider] = useState<ModelProvider | 'all'>('all');
    const [showScrollIndicator, setShowScrollIndicator] = useState(true);
    const providerSidebarRef = useRef<HTMLDivElement>(null);
    const [focusedIndex, setFocusedIndex] = useState<number>(-1);
    const modelListRef = useRef<HTMLDivElement>(null);

    // Preferred models: only show these in the picker (empty = show all)
    const [preferredModels, setPreferredModels] = useSyncedPreferences<string[]>('scira-preferred-models', []);

    const normalizeText = useCallback((input: string): string => {
      return input
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();
    }, []);

    const tokenize = useCallback(
      (input: string): string[] => {
        const normalized = normalizeText(input);
        if (!normalized) return [];
        const tokens = normalized.split(/\s+/).filter(Boolean);
        return Array.from(new Set(tokens));
      },
      [normalizeText],
    );

    type SearchIndexEntry = {
      normalized: string;
      labelNorm: string;
      normalizedNoSpace: string;
      labelNoSpace: string;
    };

    const searchIndex = useMemo<Record<string, SearchIndexEntry>>(() => {
      const index: Record<string, SearchIndexEntry> = {};
      for (const m of availableModels) {
        // Get provider name for indexing
        const providerKey = m.provider || getModelProvider(m.value, m.label);
        const providerName = PROVIDERS[providerKey]?.name || '';

        const aggregate = [
          m.label,
          m.description,
          m.category,
          providerName,
          m.value, // Include model ID for exact matches
          m.vision ? 'vision' : '',
          m.reasoning ? 'reasoning' : '',
          m.pdf ? 'pdf' : '',
          m.experimental ? 'experimental' : '',
          m.pro ? 'pro' : '',
          m.requiresAuth ? 'auth' : '',
          m.isNew ? 'new' : '',
          m.fast ? 'fast' : '',
        ].join(' ');
        const normalized = normalizeText(aggregate);
        const labelNorm = normalizeText(m.label);
        index[m.value] = {
          normalized,
          labelNorm,
          normalizedNoSpace: normalized.replace(/\s+/g, ''),
          labelNoSpace: labelNorm.replace(/\s+/g, ''),
        };
      }
      return index;
    }, [availableModels, normalizeText]);

    const computeScore = useCallback(
      (modelValue: string, query: string): number => {
        const entry = searchIndex[modelValue];
        if (!entry) return 0;

        const normalizedQuery = normalizeText(query);
        if (!normalizedQuery) return 0;

        let score = 0;

        // Check if the full query matches anywhere
        if (entry.normalized.includes(normalizedQuery)) {
          score += 5;
          // Bonus for label match
          if (entry.labelNorm.includes(normalizedQuery)) {
            score += 5;
          }
          // Bonus for starts with
          if (entry.labelNorm.startsWith(normalizedQuery)) {
            score += 3;
          }
        }

        // Also check individual tokens for partial matches
        const tokens = tokenize(query).filter((t) => t.length >= 1);
        for (const token of tokens) {
          if (entry.labelNorm.includes(token)) {
            score += 3;
          } else if (entry.normalized.includes(token)) {
            score += 1;
          }
        }

        return score;
      },
      [searchIndex, tokenize, normalizeText],
    );

    const escapeHtml = useCallback((input: string): string => {
      return input
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }, []);

    const escapeRegExp = useCallback((input: string): string => {
      return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }, []);

    const buildHighlightHtml = useCallback(
      (text: string): string => {
        const q = searchQuery.trim();
        if (!q) return escapeHtml(text);
        const safeText = escapeHtml(text);
        const pattern = new RegExp(`(${escapeRegExp(q)})`, 'gi');
        return safeText.replace(pattern, '<mark class="bg-primary/80 text-primary-foreground rounded px-px">$1</mark>');
      },
      [searchQuery, escapeHtml, escapeRegExp],
    );

    const pricing = useMemo(
      () => ({
        usd: {
          originalPrice: PRICING.PRO_MONTHLY,
          finalPrice: PRICING.PRO_MONTHLY,
          hasDiscount: false,
        },
      }),
      [],
    );

    const isFilePart = useCallback((p: unknown): p is { type: 'file'; mediaType?: string } => {
      return (
        typeof p === 'object' &&
        p !== null &&
        'type' in (p as Record<string, unknown>) &&
        (p as { type: unknown }).type === 'file'
      );
    }, []);

    const hasImageAttachments = useMemo(() => {
      const attachmentHasImage = attachments.some((att) => {
        const ct = att.contentType || att.mediaType || '';
        return ct.startsWith('image/');
      });
      const messagesHaveImage = messages.some((msg) =>
        (msg.parts || []).some(
          (part) => isFilePart(part) && typeof part.mediaType === 'string' && part.mediaType.startsWith('image/'),
        ),
      );
      return attachmentHasImage || messagesHaveImage;
    }, [attachments, messages, isFilePart]);

    const filteredModels = useMemo(() => {
      let filtered = availableModels;

      // Filter by preferred models only when viewing 'all' providers
      // When a specific provider is selected, show all models for that provider
      if (selectedProvider === 'all' && preferredModels && preferredModels.length > 0) {
        const preferredSet = new Set(preferredModels);
        filtered = filtered.filter((model) => preferredSet.has(model.value));
      }

      // Filter by attachment types
      // Note: PDF filtering removed - PDFs are processed via file_query_search tool which works with any model
      if (hasImageAttachments) {
        filtered = filtered.filter((model) => model.vision);
      }

      // Filter by extreme mode
      const isExtremeMode = selectedGroup === 'extreme';
      if (isExtremeMode) {
        filtered = filtered.filter((model) => supportsExtremeMode(model.value));
      }

      // Filter by canvas mode
      if (selectedGroup === 'canvas') {
        filtered = filtered.filter((model) => supportsCanvasMode(model.value));
      }

      // Filter by selected provider
      if (selectedProvider !== 'all') {
        filtered = filtered.filter((model) => {
          const modelProvider = model.provider || getModelProvider(model.value, model.label);
          return modelProvider === selectedProvider;
        });
      }

      // Auto-correct only after subscription state has settled to avoid reload jitter.
      if (
        user !== undefined &&
        !isSubscriptionLoading &&
        selectedGroup === 'canvas' &&
        filtered.length > 0 &&
        !filtered.some((m) => m.value === selectedModel)
      ) {
        const fallback = filtered.find((m) => m.value === 'scira-code') || filtered[0];
        if (fallback) {
          // Defer to avoid state update during render
          queueMicrotask(() => setSelectedModel(fallback.value));
        }
      }

      return filtered;
    }, [
      availableModels,
      preferredModels,
      hasImageAttachments,
      selectedGroup,
      selectedProvider,
      selectedModel,
      setSelectedModel,
      user,
      isSubscriptionLoading,
    ]);

    // Show all models (including Pro) for everyone; locked models will prompt auth/upgrade on click
    const visibleModelsForList = useMemo(() => {
      let modelsToShow = filteredModels;

      // Sort models: favorites first, then new models, then by auth/plan status
      // Locked models go last for users who can't access them (free, pro-without-max, or signed-out)
      const shouldSortLockedLast = !user || !isProUser || !isMaxUser;
      const preferredSet = new Set(preferredModels || []);

      if (modelsToShow.length > 0) {
        const favoriteModels: typeof modelsToShow = [];
        const newModels: typeof modelsToShow = [];
        const freeModels: typeof modelsToShow = [];
        const lockedModels: typeof modelsToShow = [];
        const regularModels: typeof modelsToShow = [];

        for (const model of modelsToShow) {
          const isFavorite = preferredSet.has(model.value);
          const isNew = model.isNew === true;
          const needsAuth = model.requiresAuth === true;
          const needsPro = requiresProSubscription(model.value) && !isProUser;
          const needsMax = requiresMaxSubscription(model.value) && !isMaxUser;
          const isLocked = needsAuth || needsPro || needsMax;

          if (isFavorite) {
            favoriteModels.push(model);
          } else if (isNew) {
            newModels.push(model);
          } else if (shouldSortLockedLast) {
            if (isLocked) {
              lockedModels.push(model);
            } else {
              freeModels.push(model);
            }
          } else {
            regularModels.push(model);
          }
        }

        if (shouldSortLockedLast) {
          return [...favoriteModels, ...newModels, ...freeModels, ...lockedModels];
        }
        return [...favoriteModels, ...newModels, ...regularModels];
      }

      return modelsToShow;
    }, [filteredModels, selectedProvider, isProUser, isMaxUser, user, preferredModels]);

    const rankedModels = useMemo(() => {
      const query = searchQuery.trim();
      if (!query) return null;
      const preferredSet = new Set(preferredModels || []);
      const scored = availableModels
        .map((m) => ({ model: m, score: computeScore(m.value, query) }))
        .filter((x) => x.score > 0);

      const normQuery = normalizeText(query);
      scored.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        // Prioritize favorites
        const aIsFavorite = preferredSet.has(a.model.value) ? 1 : 0;
        const bIsFavorite = preferredSet.has(b.model.value) ? 1 : 0;
        if (bIsFavorite !== aIsFavorite) return bIsFavorite - aIsFavorite;
        const aIsNew = a.model.isNew ? 1 : 0;
        const bIsNew = b.model.isNew ? 1 : 0;
        if (bIsNew !== aIsNew) return bIsNew - aIsNew;
        const aLabel = normalizeText(a.model.label);
        const bLabel = normalizeText(b.model.label);
        const aExact = aLabel === normQuery ? 1 : 0;
        const bExact = bLabel === normQuery ? 1 : 0;
        if (bExact !== aExact) return bExact - aExact;
        const aStarts = aLabel.startsWith(normQuery) ? 1 : 0;
        const bStarts = bLabel.startsWith(normQuery) ? 1 : 0;
        if (bStarts !== aStarts) return bStarts - aStarts;
        return a.model.label.localeCompare(b.model.label);
      });

      return scored.map((s) => s.model);
    }, [availableModels, searchQuery, computeScore, normalizeText, preferredModels]);

    const sortedModels = useMemo(() => visibleModelsForList, [visibleModelsForList]);

    const groupedModels = useMemo(
      () =>
        sortedModels.reduce(
          (acc, model) => {
            const category = model.category;
            if (!acc[category]) {
              acc[category] = [];
            }
            acc[category].push(model);
            return acc;
          },
          {} as Record<string, typeof availableModels>,
        ),
      [sortedModels],
    );

    // Persisted ordering: category order and per-category model order
    const [modelCategoryOrder] = useLocalStorage<string[]>(
      'scira-model-category-order',
      isProUser ? ['Pro', 'Experimental', 'Free'] : ['Free', 'Experimental', 'Pro'],
    );
    const [modelOrderMap] = useLocalStorage<Record<string, string[]>>('scira-model-order', {});

    const orderedGroupEntries = useMemo(() => {
      const baseOrder =
        modelCategoryOrder && modelCategoryOrder.length > 0
          ? modelCategoryOrder
          : isProUser
            ? ['Pro', 'Experimental', 'Free']
            : ['Free', 'Experimental', 'Pro'];
      const categoriesPresent = Object.keys(groupedModels);
      const normalizedOrder = [
        ...baseOrder.filter((c) => categoriesPresent.includes(c)),
        ...categoriesPresent.filter((c) => !baseOrder.includes(c)),
      ];
      const preferredSet = new Set(preferredModels || []);
      const normalizedByCategory = normalizedOrder
        .filter((category) => groupedModels[category] && groupedModels[category].length > 0)
        .map((category) => {
          const order = modelOrderMap[category] || [];
          const modelsInCategory = groupedModels[category];
          // Preserve original order when no overrides are set; apply only explicit positions
          const positionById = new Map(order.map((id, idx) => [id, idx] as const));
          const orderedModels = [...modelsInCategory].sort((a, b) => {
            // Prioritize favorites first
            const aIsFavorite = preferredSet.has(a.value) ? 1 : 0;
            const bIsFavorite = preferredSet.has(b.value) ? 1 : 0;
            if (bIsFavorite !== aIsFavorite) return bIsFavorite - aIsFavorite;
            // Then apply custom order if set
            const ia = positionById.get(a.value);
            const ib = positionById.get(b.value);
            if (ia !== undefined && ib !== undefined) return ia - ib;
            if (ia !== undefined) return -1;
            if (ib !== undefined) return 1;
            return 0; // keep insertion order
          });
          return [category, orderedModels] as const;
        });

      if (isProUser) {
        const flat = normalizedByCategory.flatMap(([, ms]) => ms);
        return [['all', flat] as const];
      }

      return normalizedByCategory;
    }, [groupedModels, isProUser, modelCategoryOrder, modelOrderMap, preferredModels]);

    const currentModel = useMemo(
      () => availableModels.find((m) => m.value === selectedModel),
      [availableModels, selectedModel],
    );

    // Auto-switch away from restricted or paid models when necessary
    useEffect(() => {
      if (user === undefined) return;
      if (isSubscriptionLoading) return;

      const currentModelRequiresPro = requiresProSubscription(selectedModel);
      const currentModelRequiresMax = requiresMaxSubscription(selectedModel);
      const currentModelExists = availableModels.find((m) => m.value === selectedModel);
      const isCurrentModelRestricted = isModelRestrictedInRegion(selectedModel, countryCode || undefined);

      // If current model is restricted in user's region, switch to default
      if (isCurrentModelRestricted && selectedModel !== 'scira-default') {
        console.log(
          `Auto-switching from restricted model '${selectedModel}' to 'scira-default' - model not available in region ${countryCode}`,
        );
        setSelectedModel('scira-default');
        return;
      }

      // If current model requires max but user is not max, switch to default
      if (user && currentModelExists && currentModelRequiresMax && !isMaxUser && selectedModel !== 'scira-default') {
        console.log(`Auto-switching from max model '${selectedModel}' to 'scira-default' - user lost max access`);
        setSelectedModel('scira-default');
        return;
      }

      // If current model requires pro but user is not pro, switch to default.
      // Skip this branch for Max-only models because those are handled above.
      if (
        user &&
        currentModelExists &&
        currentModelRequiresPro &&
        !currentModelRequiresMax &&
        !isProUser &&
        selectedModel !== 'scira-default'
      ) {
        console.log(`Auto-switching from pro model '${selectedModel}' to 'scira-default' - user lost pro access`);
        setSelectedModel('scira-default');
      }
    }, [selectedModel, isProUser, isMaxUser, isSubscriptionLoading, setSelectedModel, countryCode, user, currentModel]);

    const handleModelChange = useCallback(
      (value: string) => {
        const model = availableModels.find((m) => m.value === value);
        if (!model) return;

        const requiresAuth = requiresAuthentication(model.value) && !user;
        const requiresMax = requiresMaxSubscription(model.value) && !isMaxUser;
        const requiresPro = requiresProSubscription(model.value) && !isProUser;

        if (isSubscriptionLoading) {
          return;
        }

        if (requiresAuth) {
          haptics.trigger('warning');
          setSelectedAuthModel(model);
          setShowSignInDialog(true);
          return;
        }

        if (requiresMax) {
          haptics.trigger('warning');
          setSelectedProModel(model);
          setShowUpgradeDialog(true);
          return;
        }

        if (requiresPro) {
          haptics.trigger('warning');
          setSelectedProModel(model);
          setShowUpgradeDialog(true);
          return;
        }

        console.log('Selected model:', model.value);
        setSelectedModel(model.value.trim());
        haptics.trigger('selection');

        if (onModelSelect) {
          onModelSelect(model);
        }
      },
      [availableModels, user, isProUser, isMaxUser, isSubscriptionLoading, setSelectedModel, onModelSelect, haptics],
    );

    // Get providers that have models in the current filtered set
    const activeProviders = useMemo(() => {
      const providerSet = new Set<ModelProvider>();
      for (const model of availableModels) {
        const provider = model.provider || getModelProvider(model.value, model.label);
        providerSet.add(provider);
      }
      return PROVIDER_ORDER.filter((p) => p === 'all' || providerSet.has(p as ModelProvider));
    }, [availableModels]);

    // Get model count per provider
    // 'all' count reflects preferred models filter, individual providers show their full count
    const providerModelCounts = useMemo(() => {
      const allBase =
        preferredModels && preferredModels.length > 0
          ? availableModels.filter((m) => preferredModels.includes(m.value))
          : availableModels;
      const counts: Record<string, number> = { all: allBase.length };
      for (const model of availableModels) {
        const provider = model.provider || getModelProvider(model.value, model.label);
        counts[provider] = (counts[provider] || 0) + 1;
      }
      return counts;
    }, [availableModels, preferredModels]);

    // Providers manually flagged via PROVIDERS[x].hasNew
    const providersWithNewModels = useMemo(() => {
      const set = new Set<string>();
      for (const [key, info] of Object.entries(PROVIDERS)) {
        if (info.hasNew) set.add(key);
      }
      return set;
    }, []);

    // Flat list of models to display (after provider filter applied)
    const displayModels = useMemo(() => {
      const modelsToDisplay = rankedModels && searchQuery.trim() ? rankedModels : visibleModelsForList;
      return modelsToDisplay;
    }, [rankedModels, searchQuery, visibleModelsForList]);

    // Reset focused index when search query, provider, or popover open state changes
    useEffect(() => {
      setFocusedIndex(-1);
    }, [searchQuery, selectedProvider]);

    // When popover opens, focus the currently selected model
    useEffect(() => {
      if (open) {
        const idx = displayModels.findIndex((m) => m.value === selectedModel);
        setFocusedIndex(idx >= 0 ? idx : 0);
      } else {
        setFocusedIndex(-1);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    // Scroll focused model into view
    useEffect(() => {
      if (focusedIndex < 0 || !modelListRef.current) return;
      const items = modelListRef.current.querySelectorAll<HTMLElement>('[data-model-index]');
      const item = items[focusedIndex];
      if (item) {
        item.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }, [focusedIndex]);

    // Keyboard handler for model list navigation + provider cycling
    const handleModelListKeyDown = useCallback(
      (e: React.KeyboardEvent) => {
        const count = displayModels.length;

        // ArrowLeft / ArrowRight cycle through provider tabs
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
          e.preventDefault();
          const providerCount = activeProviders.length;
          if (providerCount === 0) return;
          const currentIdx = activeProviders.indexOf(selectedProvider);
          let nextIdx: number;
          if (e.key === 'ArrowLeft') {
            nextIdx = currentIdx > 0 ? currentIdx - 1 : providerCount - 1;
          } else {
            nextIdx = currentIdx < providerCount - 1 ? currentIdx + 1 : 0;
          }
          setSelectedProvider(activeProviders[nextIdx]);
          // Scroll the provider button into view
          if (providerSidebarRef.current) {
            const buttons = providerSidebarRef.current.querySelectorAll<HTMLElement>('button');
            buttons[nextIdx]?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
          }
          return;
        }

        if (count === 0) return;

        switch (e.key) {
          case 'ArrowDown': {
            e.preventDefault();
            setFocusedIndex((prev) => (prev < count - 1 ? prev + 1 : 0));
            break;
          }
          case 'ArrowUp': {
            e.preventDefault();
            setFocusedIndex((prev) => (prev > 0 ? prev - 1 : count - 1));
            break;
          }
          case 'Enter': {
            e.preventDefault();
            if (focusedIndex >= 0 && focusedIndex < count) {
              const model = displayModels[focusedIndex];
              const needsAuth = requiresAuthentication(model.value) && !user;
              const needsMax = requiresMaxSubscription(model.value) && !isMaxUser;
              const needsPro = requiresProSubscription(model.value) && !isProUser;

              if (isSubscriptionLoading) return;

              if (needsAuth) {
                setSelectedAuthModel(model);
                setShowSignInDialog(true);
                return;
              }

              if (needsMax) {
                setSelectedProModel(model);
                setShowUpgradeDialog(true);
                return;
              }

              if (needsPro) {
                setSelectedProModel(model);
                setShowUpgradeDialog(true);
                return;
              }

              handleModelChange(model.value);
              setOpen(false);
            }
            break;
          }
          case 'Home': {
            e.preventDefault();
            setFocusedIndex(0);
            break;
          }
          case 'End': {
            e.preventDefault();
            setFocusedIndex(count - 1);
            break;
          }
        }
      },
      [
        displayModels,
        focusedIndex,
        user,
        isProUser,
        isMaxUser,
        isSubscriptionLoading,
        handleModelChange,
        activeProviders,
        selectedProvider,
      ],
    );

    // Model card component
    const renderModelCard = (model: (typeof models)[0], index: number) => {
      const requiresAuth = requiresAuthentication(model.value) && !user;
      const requiresMax = requiresMaxSubscription(model.value) && !isMaxUser;
      const requiresPro = requiresProSubscription(model.value) && !isProUser;
      const isLocked = requiresAuth || requiresPro || requiresMax;
      const modelProvider = model.provider || getModelProvider(model.value, model.label);
      const isSelected = selectedModel === model.value;
      const isAutoRouter = model.value === 'scira-auto';
      const isFocused = focusedIndex === index;

      const handleClick = () => {
        if (isSubscriptionLoading) return;

        if (requiresAuth) {
          setSelectedAuthModel(model);
          setShowSignInDialog(true);
          return;
        }

        if (requiresMax) {
          setSelectedProModel(model);
          setShowUpgradeDialog(true);
          return;
        }

        if (requiresPro) {
          setSelectedProModel(model);
          setShowUpgradeDialog(true);
          return;
        }

        handleModelChange(model.value);
        setOpen(false);
      };

      return (
        <div
          key={model.value}
          id={`model-option-${model.value}`}
          data-model-index={index}
          role="option"
          aria-selected={isSelected}
          onClick={handleClick}
          onMouseEnter={() => setFocusedIndex(index)}
          className={cn(
            'group flex items-start gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer',
            'transition-all duration-150',
            isLocked ? 'opacity-50 hover:opacity-75' : 'hover:bg-accent/40 active:scale-[0.99]',
            isSelected && !isLocked && 'bg-primary/6 dark:bg-primary/8',
            isFocused && !isLocked && 'bg-accent/50 ring-1 ring-primary/20',
          )}
        >
          {/* Provider Icon */}
          <div
            className={cn(
              'shrink-0 mt-0.5 p-1.5 rounded-md transition-colors duration-150',
              isSelected
                ? 'bg-primary/12 text-primary'
                : 'bg-secondary/60 text-foreground/70 group-hover:bg-secondary/80',
            )}
          >
            {isAutoRouter ? (
              <MagicWandIcon size={isMobile ? 16 : 14} className={cn(isMobile ? 'size-4' : 'size-3.5')} />
            ) : (
              <ProviderIcon provider={modelProvider} size={isMobile ? 16 : 14} className="text-inherit!" />
            )}
          </div>

          {/* Model Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              {/* Model Name */}
              <span
                className={cn(
                  'font-medium truncate transition-colors duration-150',
                  isMobile ? 'text-sm' : 'text-xs',
                  isSelected && 'text-primary',
                )}
              >
                {searchQuery && !isMobile ? (
                  <span dangerouslySetInnerHTML={{ __html: buildHighlightHtml(model.label) }} />
                ) : (
                  model.label
                )}
              </span>

              {/* Badges */}
              {requiresMax && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-semibold bg-primary/10 text-primary leading-none">
                  MAX
                </span>
              )}
              {requiresPro && !isProUser && !requiresMax && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-semibold bg-primary/10 text-primary leading-none">
                  PRO
                </span>
              )}
              {requiresAuth && !user && <LockIcon className="size-3 text-muted-foreground/60" />}
              {isAutoRouter && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-semibold bg-primary/10 text-primary leading-none">
                  AUTO
                </span>
              )}
              {model.isNew && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 leading-none">
                  NEW
                </span>
              )}

              {/* Favorite Star */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      const isFav = preferredModels.includes(model.value);
                      if (isFav) {
                        setPreferredModels(preferredModels.filter((id) => id !== model.value));
                      } else {
                        setPreferredModels([...preferredModels, model.value]);
                      }
                    }}
                    className={cn(
                      'inline-flex items-center justify-center p-0.5 rounded transition-colors',
                      preferredModels.includes(model.value)
                        ? 'text-amber-500'
                        : 'text-muted-foreground/30 opacity-0 group-hover:opacity-100',
                      isMobile && 'opacity-100 p-1',
                    )}
                  >
                    <Star className={cn('size-3', preferredModels.includes(model.value) && 'fill-current')} />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  {preferredModels.includes(model.value) ? 'Remove from favorites' : 'Add to favorites'}
                </TooltipContent>
              </Tooltip>
            </div>

            {/* Description */}
            <p
              className={cn(
                'text-muted-foreground/70 truncate mt-0.5 leading-snug',
                isMobile ? 'text-xs' : 'text-[10px]',
              )}
            >
              {model.description}
            </p>
          </div>

          {/* Right side: capabilities + check */}
          <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
            {/* Capability Icons */}
            <div className="flex items-center gap-0.5">
              {model.fast && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className={cn('p-0.5 rounded', isMobile && 'p-1')}>
                      <Zap className={cn('text-amber-500/70', isMobile ? 'size-3' : 'size-2.5')} />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">
                    Fast
                  </TooltipContent>
                </Tooltip>
              )}
              {model.vision && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className={cn('p-0.5 rounded', isMobile && 'p-1')}>
                      <Eye className={cn('text-muted-foreground/50', isMobile ? 'size-3' : 'size-2.5')} />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">
                    Vision
                  </TooltipContent>
                </Tooltip>
              )}
              {model.reasoning && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className={cn('p-0.5 rounded', isMobile && 'p-1')}>
                      <Brain className={cn('text-muted-foreground/50', isMobile ? 'size-3' : 'size-2.5')} />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">
                    Reasoning
                  </TooltipContent>
                </Tooltip>
              )}
              {model.pdf && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className={cn('p-0.5 rounded', isMobile && 'p-1')}>
                      <FilePdf className={cn('text-muted-foreground/50', isMobile ? 'size-3' : 'size-2.5')} />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">
                    PDF Support
                  </TooltipContent>
                </Tooltip>
              )}
            </div>

            {/* Selected Check */}
            {isSelected && !isLocked && (
              <div className="size-4 rounded-full bg-primary flex items-center justify-center">
                <Check className="size-2.5 text-primary-foreground" strokeWidth={3} />
              </div>
            )}
          </div>
        </div>
      );
    };

    // Shared command content renderer with provider sidebar
    const renderModelCommandContent = () => (
      <TooltipProvider delayDuration={300}>
        <div className={cn('flex flex-1 min-h-0', isMobile ? 'flex-col' : 'flex-row h-full')}>
          {/* Provider Sidebar */}
          <div
            className={cn(
              'shrink-0 border-border/50 relative',
              isMobile ? 'flex flex-row border-b' : 'flex flex-col w-10 border-r',
            )}
          >
            <div
              ref={providerSidebarRef}
              onScroll={(e) => {
                const target = e.currentTarget;
                const isAtBottom = target.scrollHeight - target.scrollTop <= target.clientHeight + 10;
                setShowScrollIndicator(!isAtBottom);
              }}
              className={cn(
                isMobile
                  ? 'flex flex-row gap-0.5 px-2 py-1.5 overflow-x-auto'
                  : 'flex flex-col gap-0.5 p-1 overflow-y-auto flex-1',
              )}
            >
              {activeProviders.map((provider) => {
                const isAll = provider === 'all';
                const isActive = selectedProvider === provider;
                const count = providerModelCounts[provider] || 0;
                const hasNew = !isAll && providersWithNewModels.has(provider);

                return (
                  <Tooltip key={provider}>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => {
                          haptics.trigger('selection');
                          setSelectedProvider(provider);
                        }}
                        tabIndex={-1}
                        className={cn(
                          'relative flex items-center justify-center rounded-md transition-all duration-150',
                          isMobile ? 'p-2 shrink-0' : 'p-1.5 w-full',
                          isActive
                            ? 'bg-primary/10 text-primary'
                            : 'hover:bg-accent/60 text-muted-foreground/60 hover:text-foreground',
                        )}
                      >
                        <span className="relative">
                          {hasNew && (
                            <span className="absolute inset-0 -m-0.5 rounded-full bg-amber-400/15 dark:bg-amber-500/10 blur-[3px]" />
                          )}
                          {isAll ? (
                            <HugeiconsIcon icon={StarIcon} size={isMobile ? 16 : 14} />
                          ) : (
                            <ProviderIcon provider={provider as ModelProvider} size={isMobile ? 16 : 14} />
                          )}
                          {hasNew && (
                            <svg
                              className="absolute -top-1.5 -right-1.5 size-2.5 text-amber-500 dark:text-amber-400"
                              viewBox="0 0 24 24"
                              fill="none"
                            >
                              <path
                                d="M6 5.5C6 5.224 5.776 5 5.5 5s-.5.224-.5.5c0 .98-.217 1.573-.572 1.928C4.073 7.783 3.48 8 2.5 8c-.276 0-.5.224-.5.5s.224.5.5.5c.98 0 1.573.217 1.928.572C4.783 9.927 5 10.52 5 11.5c0 .276.224.5.5.5s.5-.224.5-.5c0-.98.217-1.573.572-1.928C6.927 9.217 7.52 9 8.5 9c.276 0 .5-.224.5-.5S8.776 8 8.5 8c-.98 0-1.573-.217-1.928-.572C6.217 7.073 6 6.48 6 5.5Z"
                                fill="currentColor"
                              />
                              <path
                                d="M11 1.5c0-.276-.224-.5-.5-.5s-.5.224-.5.5c0 .633-.141.975-.333 1.167-.192.192-.534.333-1.167.333-.276 0-.5.224-.5.5s.224.5.5.5c.633 0 .975.141 1.167.333.192.192.333.534.333 1.167 0 .276.224.5.5.5s.5-.224.5-.5c0-.633.141-.975.333-1.167.192-.192.534-.333 1.167-.333.276 0 .5-.224.5-.5s-.224-.5-.5-.5c-.633 0-.975-.141-1.167-.333C11.141 2.475 11 2.133 11 1.5Z"
                                fill="currentColor"
                              />
                              <path
                                fillRule="evenodd"
                                clipRule="evenodd"
                                d="M21 15c-5.556 0-8-2.444-8-8 0 5.556-2.444 8-8 8 5.556 0 8 2.444 8 8 0-5.556 2.444-8 8-8Z"
                                stroke="currentColor"
                                strokeWidth="1.5"
                                strokeLinejoin="round"
                              />
                            </svg>
                          )}
                        </span>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side={isMobile ? 'bottom' : 'left'} className="text-xs">
                      {isAll
                        ? preferredModels && preferredModels.length > 0
                          ? 'Favorites'
                          : 'All Models'
                        : PROVIDERS[provider as ModelProvider].name}
                      {hasNew ? ' (New Model!)' : ''} ({count})
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
            {/* Scroll fade indicator - desktop only */}
            {!isMobile && showScrollIndicator && (
              <div className="absolute bottom-0 left-0 right-0 h-8 pointer-events-none flex items-end justify-center pb-1 transition-opacity duration-300">
                <div className="absolute inset-0 bg-linear-to-t from-background via-background/80 to-transparent" />
                <ChevronDown className="size-3 text-muted-foreground/60 relative z-10 animate-bounce" />
              </div>
            )}
          </div>

          {/* Main Content */}
          <div className="flex flex-col min-w-0 min-h-0 flex-1 overflow-hidden">
            {/* Search Bar */}
            <div className="px-2 pt-2 pb-1.5 shrink-0">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground/50" />
                <input
                  type="text"
                  placeholder="Search models..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleModelListKeyDown}
                  autoFocus={!isMobile}
                  role="combobox"
                  aria-expanded={true}
                  aria-controls="model-listbox"
                  aria-activedescendant={
                    focusedIndex >= 0 ? `model-option-${displayModels[focusedIndex]?.value}` : undefined
                  }
                  className={cn(
                    'w-full pl-8 pr-3 py-1.5 text-xs rounded-lg',
                    'bg-secondary/30 border border-border/40',
                    'focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40',
                    'placeholder:text-muted-foreground/50',
                    'transition-[box-shadow,border-color] duration-200',
                  )}
                />
              </div>
            </div>

            {/* Provider Header */}
            {selectedProvider !== 'all' && (
              <div className="mx-2 mb-1 px-2 py-1.5 flex items-center gap-2 rounded-md bg-secondary/30 shrink-0">
                <ProviderIcon
                  provider={selectedProvider as ModelProvider}
                  size={13}
                  className="text-muted-foreground/70"
                />
                <span className="text-[11px] font-medium text-muted-foreground">
                  {PROVIDERS[selectedProvider as ModelProvider].name}
                </span>
                <span className="text-[10px] text-muted-foreground/50 ml-auto">
                  {providerModelCounts[selectedProvider] || 0} models
                </span>
              </div>
            )}

            {/* Upgrade Banner (for non-pro users) */}
            {!isProUser && (
              <div
                onClick={() => {
                  setShowUpgradeDialog(true);
                }}
                className="mx-2 mb-1 p-2 rounded-lg bg-linear-to-r from-primary/6 via-secondary/4 to-accent/6 border border-primary/15 cursor-pointer hover:border-primary/30 transition-colors duration-200 shrink-0"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-medium">Unlock all models</span>
                      <ProBadge className="scale-[0.7] origin-left" />
                    </div>
                    <p className="text-[10px] text-muted-foreground/60 mt-0.5">Starting at ${PRICING.PRO_MONTHLY}/mo</p>
                  </div>
                  <Button type="button" size="sm" className="h-6 text-[10px] px-2.5 rounded-md shrink-0">
                    Upgrade
                  </Button>
                </div>
              </div>
            )}

            {/* Model List */}
            <div
              ref={modelListRef}
              role="listbox"
              id="model-listbox"
              className="flex-1 overflow-y-auto px-1 py-0.5 min-h-0"
            >
              {displayModels.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 gap-2">
                  <Search className="size-5 text-muted-foreground/30" />
                  <p className="text-xs text-muted-foreground/60">No models found</p>
                </div>
              ) : (
                <div className="space-y-px">
                  {searchQuery.trim() && rankedModels && rankedModels.length > 0 && (
                    <div className="px-3 py-1 text-[10px] font-medium text-muted-foreground/60 uppercase tracking-wider">
                      Results
                    </div>
                  )}
                  {displayModels.map((model, index) => renderModelCard(model, index))}
                </div>
              )}
            </div>
          </div>
        </div>
      </TooltipProvider>
    );

    // Common trigger button component
    const currentModelProvider =
      currentModel?.provider || (currentModel ? getModelProvider(currentModel.value, currentModel.label) : undefined);

    const TriggerButton = React.forwardRef<
      React.ComponentRef<typeof Button>,
      React.ComponentPropsWithoutRef<typeof Button>
    >((props, ref) => (
      <Button
        ref={ref}
        type="button"
        variant="ghost"
        role="combobox"
        aria-expanded={open}
        size="sm"
        className={cn(
          'flex items-center gap-1.5 px-2.5 h-8 rounded-full',
          'bg-transparent text-foreground',
          'hover:bg-foreground/5! transition-all duration-200',
          'shadow-none',
          className,
        )}
        {...props}
      >
        {/* Mobile: show icon only */}
        <ProcessorIcon size={16} className="sm:hidden block" />

        {/* Desktop: show provider icon + label */}
        {selectedModel === 'scira-auto' ? (
          <>
            <span className="text-[13px] font-medium sm:hidden">Auto</span>
            {autoRoutedModel ? (
              <div className="items-center gap-1.5 sm:flex hidden">
                {(() => {
                  const routedConfig = getModelConfig(autoRoutedModel.model);
                  const routedProvider =
                    routedConfig?.provider || getModelProvider(autoRoutedModel.model, routedConfig?.label || '');
                  return <ProviderIcon provider={routedProvider} size={14} className="text-foreground/70" />;
                })()}
                <span className="text-[13px] font-medium">
                  {getModelConfig(autoRoutedModel.model)?.label || autoRoutedModel.model}
                </span>
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                  Auto
                </span>
              </div>
            ) : (
              <div className="items-center gap-1.5 sm:flex hidden">
                <MagicWandIcon size={14} className="text-foreground/70" />
                <span className="text-[13px] font-medium">Auto</span>
              </div>
            )}
          </>
        ) : (
          <div className="items-center gap-1.5 sm:flex hidden">
            {currentModelProvider && (
              <ProviderIcon provider={currentModelProvider} size={14} className="text-foreground/70" />
            )}
            <span className="text-[13px] font-medium">{currentModel?.label}</span>
          </div>
        )}
        <CaretDownIcon
          size={14}
          color="currentColor"
          strokeWidth={1.5}
          className={cn('transition-transform duration-200 opacity-50', open && 'rotate-180')}
        />
      </Button>
    ));

    TriggerButton.displayName = 'TriggerButton';

    // Refocus the main textarea when the model switcher closes (mobile drawer)
    const handleDrawerOpenChange = useCallback(
      (nextOpen: boolean) => {
        setOpen(nextOpen);
        if (nextOpen) haptics.trigger('light');
        if (!nextOpen) {
          requestAnimationFrame(() => {
            externalInputRef?.current?.focus();
          });
        }
      },
      [externalInputRef, haptics],
    );

    const handlePopoverOpenChange = useCallback(
      (nextOpen: boolean) => {
        setOpen(nextOpen);
        if (nextOpen) haptics.trigger('light');
      },
      [haptics],
    );

    return (
      <>
        {isMobile ? (
          <Drawer open={open} onOpenChange={handleDrawerOpenChange}>
            <DrawerTrigger asChild>
              <TriggerButton />
            </DrawerTrigger>
            <DrawerContent className="h-[85vh] flex flex-col">
              <DrawerHeader className="pb-2 shrink-0 p-2">
                <DrawerTitle className="text-left flex items-center gap-2.5 font-medium text-base">
                  <div className="p-1.5 rounded-lg bg-secondary/50">
                    <ProcessorIcon size={18} />
                  </div>
                  Select Model
                </DrawerTitle>
              </DrawerHeader>
              <div className="flex-1 flex flex-col min-h-0 overflow-hidden">{renderModelCommandContent()}</div>
            </DrawerContent>
          </Drawer>
        ) : (
          <Popover open={open} onOpenChange={handlePopoverOpenChange}>
            <Tooltip delayDuration={300}>
              <TooltipTrigger asChild>
                <PopoverTrigger asChild>
                  <TriggerButton />
                </PopoverTrigger>
              </TooltipTrigger>
              {!open && (
                <TooltipContent
                  side="bottom"
                  sideOffset={6}
                  className="border-0 backdrop-blur-xs py-2 px-3 shadow-none!"
                >
                  <span className="font-medium text-[11px]">Switch model</span>
                  <Kbd className="ml-1.5 h-4 min-w-4 text-[10px]">⌘M</Kbd>
                </TooltipContent>
              )}
            </Tooltip>
            <PopoverContent
              className="w-[90vw] sm:w-[26em] max-w-[26em] h-[300px] p-0 font-sans rounded-lg bg-popover z-40 border border-border/60 shadow-none overflow-hidden"
              align="end"
              side="bottom"
              sideOffset={6}
              avoidCollisions={true}
              collisionPadding={12}
              onOpenAutoFocus={(e) => e.preventDefault()}
              onCloseAutoFocus={(e) => {
                e.preventDefault();
                externalInputRef?.current?.focus();
              }}
            >
              {renderModelCommandContent()}
            </PopoverContent>
          </Popover>
        )}
        {/* Upgrade Dialog */}
        <Dialog
          open={showUpgradeDialog}
          onOpenChange={(nextOpen) => {
            // Prevent lifecycle/cleanup events from auto-closing this dialog.
            // We only allow explicit close actions (e.g. "Not now").
            if (nextOpen) setShowUpgradeDialog(true);
          }}
        >
          <DialogContent
            className="sm:max-w-[400px] p-0 gap-0 overflow-hidden"
            showCloseButton={false}
            onInteractOutside={(event) => event.preventDefault()}
            onFocusOutside={(event) => event.preventDefault()}
          >
            {/* Hero */}
            <div className="relative px-6 pt-8 pb-6 text-center">
              <div className="absolute inset-0 bg-[url('/placeholder.png')] bg-cover bg-center">
                <div className="absolute inset-0 bg-linear-to-t from-background via-background/80 to-background/40" />
              </div>
              <div className="relative z-10">
                {selectedProModel?.label ? (
                  <div className="space-y-1.5">
                    <p className="text-lg font-semibold tracking-tight">{selectedProModel.label}</p>
                    <div className="flex items-center justify-center gap-1.5">
                      <span className="text-xs text-muted-foreground">requires</span>
                      {selectedRequiresMax ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-primary/10 text-primary leading-none uppercase tracking-wider">
                          Max
                        </span>
                      ) : (
                        <ProBadge />
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2">
                    <p className="text-3xl font-semibold tracking-tight font-be-vietnam-pro">scira</p>
                    <ProBadge />
                  </div>
                )}

                <div className="flex items-baseline justify-center gap-1.5 mt-4">
                  {selectedRequiresMax ? (
                    <span className="text-2xl font-bold">$60</span>
                  ) : pricing.usd.hasDiscount ? (
                    <>
                      <span className="text-sm text-muted-foreground line-through">${pricing.usd.originalPrice}</span>
                      <span className="text-2xl font-bold">${pricing.usd.finalPrice.toFixed(2)}</span>
                    </>
                  ) : (
                    <span className="text-2xl font-bold">${pricing.usd.finalPrice}</span>
                  )}
                  <span className="font-pixel text-[10px] text-muted-foreground/50 uppercase tracking-wider">/mo</span>
                </div>
              </div>
            </div>

            {/* Features */}
            <div className="px-6 pb-6 space-y-4">
              <div className="rounded-xl border border-border/60 overflow-hidden grid grid-cols-2">
                {(selectedRequiresMax
                  ? [
                      { title: 'All paid features', desc: 'Unlimited searches & more' },
                      { title: 'Claude 4.6 Opus', desc: 'Most advanced Anthropic LLM' },
                      { title: 'Claude 4.6 Opus Thinking', desc: 'With extended reasoning' },
                      { title: 'Claude 4.5 Opus', desc: 'Previous advanced LLM' },
                      { title: 'Claude 4.6 Sonnet', desc: 'Latest Sonnet model' },
                      { title: 'Claude 4.5 Haiku', desc: 'Fast and efficient' },
                      { title: '1M context window', desc: 'For Anthropic models' },
                      { title: 'Canvas support', desc: 'Visualization mode' },
                    ]
                  : [
                      { title: 'All standard AI models', desc: 'GPT-5.2, Gemini 3.1, Grok 4.1' },
                      { title: 'Unlimited searches', desc: 'No daily limits' },
                      { title: 'Extreme research', desc: 'Multi-step deep analysis' },
                      { title: 'Voice mode', desc: 'Hands-free conversations' },
                      { title: 'XQL', desc: 'Natural language X search' },
                      { title: 'Lookout', desc: 'Scheduled monitoring' },
                      { title: 'Connectors', desc: 'Drive, Notion, OneDrive' },
                      { title: 'Prompt enhance', desc: 'AI-powered optimization' },
                    ]
                ).map((f, i) => (
                  <div
                    key={f.title}
                    className={cn(
                      'flex items-start gap-2 p-2.5',
                      i % 2 === 0 && 'border-r border-border/40',
                      i < 6 && 'border-b border-border/40',
                    )}
                  >
                    <CheckIcon className="size-3 text-primary shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <p className="text-[11px] font-medium leading-tight">{f.title}</p>
                      <p className="font-pixel text-[8px] text-muted-foreground/50 uppercase tracking-wider mt-0.5">
                        {f.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <Button
                onClick={() => {
                  window.location.href = '/pricing';
                }}
                className="w-full rounded-lg h-9"
              >
                {selectedRequiresMax ? 'Upgrade to Max' : 'Upgrade to Pro'}
              </Button>

              {selectedRequiresMax && isProUser && (
                <p className="text-[10px] text-center text-muted-foreground/60 leading-relaxed">
                  Your existing paid subscription will be automatically cancelled once Max is activated.
                </p>
              )}

              <div className="flex items-center justify-center gap-3">
                <p className="font-pixel text-[9px] text-muted-foreground/40 uppercase tracking-wider">
                  Cancel anytime · Secure payment
                </p>
              </div>

              <button
                onClick={() => setShowUpgradeDialog(false)}
                className="w-full text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors py-1"
              >
                Not now
              </button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Sign In Dialog */}
        <Dialog open={showSignInDialog} onOpenChange={setShowSignInDialog}>
          <DialogContent className="sm:max-w-[400px] p-0 gap-0 overflow-hidden" showCloseButton={false}>
            {/* Hero */}
            <div className="relative px-6 pt-8 pb-6 text-center">
              <div className="absolute inset-0 bg-[url('/placeholder.png')] bg-cover bg-center">
                <div className="absolute inset-0 bg-linear-to-t from-background via-background/80 to-background/40" />
              </div>
              <div className="relative z-10 space-y-1.5">
                <div className="w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center mx-auto mb-3">
                  <LockIcon className="w-5 h-5 text-muted-foreground" />
                </div>
                <p className="text-lg font-semibold tracking-tight">Sign in required</p>
                {selectedAuthModel?.label && (
                  <p className="font-pixel text-[10px] text-muted-foreground/50 uppercase tracking-wider">
                    for {selectedAuthModel.label}
                  </p>
                )}
              </div>
            </div>

            {/* Features */}
            <div className="px-6 pb-6 space-y-4">
              <div className="rounded-xl border border-border/60 overflow-hidden grid grid-cols-2">
                {[
                  { title: 'Better models', desc: 'GPT-5 Nano and more' },
                  { title: 'Search history', desc: 'Keep conversations' },
                  { title: 'Free to start', desc: 'No payment required' },
                  { title: 'All modes', desc: 'Web, X, Academic...' },
                ].map((f, i) => (
                  <div
                    key={f.title}
                    className={cn(
                      'flex items-start gap-2 p-2.5',
                      i % 2 === 0 && 'border-r border-border/40',
                      i < 2 && 'border-b border-border/40',
                    )}
                  >
                    <CheckIcon className="size-3 text-primary shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <p className="text-[11px] font-medium leading-tight">{f.title}</p>
                      <p className="font-pixel text-[8px] text-muted-foreground/50 uppercase tracking-wider mt-0.5">
                        {f.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <Button
                onClick={() => {
                  window.location.href = '/sign-in';
                }}
                className="w-full rounded-lg h-9"
              >
                Sign in
              </Button>

              <button
                onClick={() => setShowSignInDialog(false)}
                className="w-full text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors py-1"
              >
                Maybe later
              </button>
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  },
);

ModelSwitcher.displayName = 'ModelSwitcher';

interface Attachment {
  name: string;
  contentType?: string;
  mediaType?: string;
  url: string;
  size: number;
}

const ArrowUpIcon = ({ size = 16 }: { size?: number }) => {
  return (
    <svg height={size} strokeLinejoin="round" viewBox="0 0 16 16" width={size} style={{ color: 'currentcolor' }}>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M8.70711 1.39644C8.31659 1.00592 7.68342 1.00592 7.2929 1.39644L2.21968 6.46966L1.68935 6.99999L2.75001 8.06065L3.28034 7.53032L7.25001 3.56065V14.25V15H8.75001V14.25V3.56065L12.7197 7.53032L13.25 8.06065L14.3107 6.99999L13.7803 6.46966L8.70711 1.39644Z"
        fill="currentColor"
      ></path>
    </svg>
  );
};

const StopIcon = ({ size = 16 }: { size?: number }) => {
  return (
    <svg height={size} viewBox="0 0 16 16" width={size} style={{ color: 'currentcolor' }}>
      <path fillRule="evenodd" clipRule="evenodd" d="M3 3H13V13H3V3Z" fill="currentColor"></path>
    </svg>
  );
};

const MAX_FILES = 4;
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB for images
const MAX_DOCUMENT_SIZE = 50 * 1024 * 1024; // 50MB for documents
const MAX_INPUT_CHARS = 50000;

const isImageFile = (file: File): boolean => file.type.startsWith('image/');
const getMaxSizeForFile = (file: File): number => (isImageFile(file) ? MAX_IMAGE_SIZE : MAX_DOCUMENT_SIZE);

const truncateFilename = (filename: string, maxLength: number = 20) => {
  if (filename.length <= maxLength) return filename;
  const extension = filename.split('.').pop();
  const name = filename.substring(0, maxLength - 4);
  return `${name}...${extension}`;
};

const AttachmentPreview: React.FC<{
  attachment: Attachment | UploadingAttachment;
  onRemove: () => void;
  isUploading: boolean;
}> = React.memo(({ attachment, onRemove, isUploading }) => {
  const formatFileSize = useCallback((bytes: number): string => {
    if (bytes < 1024) return bytes + ' bytes';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    else return (bytes / 1048576).toFixed(1) + ' MB';
  }, []);

  const isUploadingAttachment = useCallback(
    (attachment: Attachment | UploadingAttachment): attachment is UploadingAttachment => {
      return 'progress' in attachment;
    },
    [],
  );

  const isPdf = useCallback(
    (attachment: Attachment | UploadingAttachment): boolean => {
      if (isUploadingAttachment(attachment)) {
        return attachment.file.type === 'application/pdf';
      }
      return (attachment as Attachment).contentType === 'application/pdf';
    },
    [isUploadingAttachment],
  );

  const getDocumentType = useCallback(
    (attachment: Attachment | UploadingAttachment): 'pdf' | 'csv' | 'xlsx' | 'docx' | 'image' | null => {
      const contentType = isUploadingAttachment(attachment)
        ? attachment.file.type
        : (attachment as Attachment).contentType;

      if (contentType === 'application/pdf') return 'pdf';
      if (contentType === 'text/csv') return 'csv';
      if (contentType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') return 'docx';
      if (
        contentType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        contentType === 'application/vnd.ms-excel'
      )
        return 'xlsx';
      if (contentType?.startsWith('image/')) return 'image';
      return null;
    },
    [isUploadingAttachment],
  );

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ duration: 0.2 }}
      className={cn(
        'relative flex items-center',
        'bg-background/90 backdrop-blur-xs',
        'border border-border/80',
        'rounded-lg p-2 pr-8 gap-2.5',
        'shrink-0 z-0',
        'hover:bg-background',
        'transition-all duration-200',
        'group',
        'shadow-none!',
      )}
    >
      {isUploading ? (
        <div className="w-8 h-8 flex items-center justify-center">
          <svg
            className="animate-spin h-4 w-4 text-muted-foreground"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
        </div>
      ) : isUploadingAttachment(attachment) ? (
        <div className="w-8 h-8 flex items-center justify-center">
          <div className="relative w-6 h-6">
            <svg className="w-full h-full" viewBox="0 0 100 100">
              <circle
                className="text-muted stroke-current"
                strokeWidth="8"
                cx="50"
                cy="50"
                r="40"
                fill="transparent"
              ></circle>
              <circle
                className="text-primary stroke-current"
                strokeWidth="8"
                strokeLinecap="round"
                cx="50"
                cy="50"
                r="40"
                fill="transparent"
                strokeDasharray={`${attachment.progress * 251.2}, 251.2`}
                transform="rotate(-90 50 50)"
              ></circle>
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-[10px] font-medium text-foreground">{Math.round(attachment.progress * 100)}%</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="w-8 h-8 rounded-lg overflow-hidden bg-muted shrink-0 ring-1 ring-border flex items-center justify-center">
          {(() => {
            const docType = getDocumentType(attachment);
            if (docType === 'image') {
              return (
                <img
                  src={(attachment as Attachment).url}
                  alt={`Preview of ${attachment.name}`}
                  className="h-full w-full object-cover"
                />
              );
            }
            // All document types (pdf, csv, xlsx, docx)
            return (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-muted-foreground"
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                {docType === 'pdf' && (
                  <>
                    <path d="M9 15v-2h6v2"></path>
                    <path d="M12 18v-5"></path>
                  </>
                )}
                {docType === 'csv' && (
                  <>
                    <line x1="8" y1="13" x2="16" y2="13"></line>
                    <line x1="8" y1="17" x2="16" y2="17"></line>
                  </>
                )}
                {docType === 'xlsx' && (
                  <>
                    <rect x="8" y="12" width="8" height="6" rx="1"></rect>
                    <line x1="12" y1="12" x2="12" y2="18"></line>
                    <line x1="8" y1="15" x2="16" y2="15"></line>
                  </>
                )}
                {docType === 'docx' && (
                  <>
                    <line x1="16" y1="13" x2="8" y2="13"></line>
                    <line x1="16" y1="17" x2="8" y2="17"></line>
                    <line x1="10" y1="9" x2="8" y2="9"></line>
                  </>
                )}
              </svg>
            );
          })()}
        </div>
      )}
      <div className="grow min-w-0">
        {!isUploadingAttachment(attachment) && (
          <p className="text-xs font-medium truncate text-foreground">{truncateFilename(attachment.name)}</p>
        )}
        <p className="text-[10px] text-muted-foreground">
          {isUploadingAttachment(attachment) ? 'Uploading...' : formatFileSize((attachment as Attachment).size)}
        </p>
      </div>
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        className={cn(
          'absolute -top-1.5 -right-1.5 p-0.5 m-0 rounded-full',
          'bg-background/90 backdrop-blur-xs',
          'border border-border/80',
          'transition-all duration-200 z-20',
          'opacity-0 group-hover:opacity-100',
          'scale-75 group-hover:scale-100',
          'hover:bg-muted/50',
          'shadow-none!',
        )}
      >
        <X className="h-3 w-3 text-muted-foreground" />
      </motion.button>
    </motion.div>
  );
});

AttachmentPreview.displayName = 'AttachmentPreview';

interface UploadingAttachment {
  file: File;
  progress: number;
}

interface FormComponentProps {
  input: string;
  setInput: (input: string) => void;
  attachments: Array<Attachment>;
  setAttachments: React.Dispatch<React.SetStateAction<Array<Attachment>>>;
  chatId: string;
  user: ComprehensiveUserData | null;
  subscriptionData?: any;
  fileInputRef: React.RefObject<HTMLInputElement>;
  inputRef: React.RefObject<HTMLTextAreaElement>;
  stop: () => void;
  messages: Array<ChatMessage>;
  sendMessage: UseChatHelpers<ChatMessage>['sendMessage'];
  selectedModel: string;
  setSelectedModel: (value: string) => void;
  resetSuggestedQuestions: () => void;
  lastSubmittedQueryRef: React.RefObject<string>;
  selectedGroup: SearchGroupId;
  setSelectedGroup: React.Dispatch<React.SetStateAction<SearchGroupId>>;
  showExperimentalModels: boolean;
  status: UseChatHelpers<ChatMessage>['status'];
  setHasSubmitted: React.Dispatch<React.SetStateAction<boolean>>;
  isLimitBlocked?: boolean;
  onOpenSettings?: (tab?: string) => void;
  selectedConnectors?: ConnectorProvider[];
  setSelectedConnectors?: React.Dispatch<React.SetStateAction<ConnectorProvider[]>>;
  usageData?: { messageCount: number; extremeSearchCount: number; error: string | null } | null;
  isTemporaryChatEnabled: boolean;
  isTemporaryChat: boolean;
  isTemporaryChatLocked: boolean;
  setIsTemporaryChatEnabled: (value: boolean | ((prev: boolean) => boolean)) => void;
  isMultiAgentModeEnabled?: boolean;
  setIsMultiAgentModeEnabled?: (value: boolean | ((prev: boolean) => boolean)) => void;
  autoRoutedModel?: { model: string; route: string } | null;
  onBeforeSubmit?: () => void;
}

interface GroupSelectorProps {
  selectedGroup: SearchGroupId;
  onGroupSelect: (group: SearchGroup) => void;
  status: UseChatHelpers<ChatMessage>['status'];
  onOpenSettings?: (tab?: string) => void;
  isProUser?: boolean;
  isAuthenticated?: boolean;
  usageData?: { messageCount: number; extremeSearchCount: number; error: string | null } | null;
  onShowUpgrade?: () => void;
}

interface ConnectorSelectorProps {
  selectedConnectors: ConnectorProvider[];
  onConnectorToggle: (provider: ConnectorProvider) => void;
  user: ComprehensiveUserData | null;
  isProUser?: boolean;
}

// Connector Selector Component
const ConnectorSelector: React.FC<ConnectorSelectorProps> = React.memo(
  ({ selectedConnectors, onConnectorToggle, user, isProUser }) => {
    const [open, setOpen] = useState(false);
    const isMobile = useIsMobile();
    const haptics = useWebHaptics();

    const { data: connectorsData } = useQuery({
      queryKey: ['connectors', user?.id],
      queryFn: listUserConnectorsAction,
      enabled: !!user && isProUser,
      staleTime: 1000 * 60 * 2,
    });

    const connectedProviders = connectorsData?.connections?.map((conn) => conn.provider) || [];
    const availableConnectors = Object.entries(CONNECTOR_CONFIGS).filter(([provider]) =>
      connectedProviders.includes(provider as ConnectorProvider),
    );

    const selectedCount = selectedConnectors.length;
    const isSingleConnector = availableConnectors.length === 1;

    React.useEffect(() => {
      if (isProUser && selectedCount === 0 && availableConnectors.length > 0) {
        availableConnectors.forEach(([provider]) => {
          onConnectorToggle(provider as ConnectorProvider);
        });
      }
    }, [isProUser, selectedCount, availableConnectors, onConnectorToggle]);

    if (!isProUser || availableConnectors.length === 0) return null;

    const handleToggle = (provider: ConnectorProvider) => {
      if (isSingleConnector && selectedConnectors.includes(provider)) return;
      haptics.trigger('selection');
      onConnectorToggle(provider);
    };

    const handleOpenChange = useCallback(
      (nextOpen: boolean) => {
        setOpen(nextOpen);
        if (nextOpen) haptics.trigger('light');
      },
      [haptics],
    );

    const connectorItems = availableConnectors.map(([provider, config]) => {
      const IconComponent = CONNECTOR_ICONS[config.icon];
      const isChecked = selectedConnectors.includes(provider as ConnectorProvider);
      const isDisabled = isSingleConnector && isChecked;
      return (
        <div
          key={provider}
          className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-md hover:bg-accent transition-colors"
        >
          {IconComponent && <IconComponent className="size-4 shrink-0" />}
          <span className="flex-1 text-[13px]">{config.name}</span>
          <Switch
            checked={isChecked}
            onCheckedChange={() => handleToggle(provider as ConnectorProvider)}
            disabled={isDisabled}
            className="scale-75 origin-right"
          />
        </div>
      );
    });

    if (isMobile) {
      return (
        <Drawer open={open} onOpenChange={handleOpenChange}>
          <DrawerTrigger asChild>
            <button className="flex items-center gap-1.5 px-2.5 h-8 rounded-full bg-primary/8 text-primary/80 text-[12px] font-medium hover:bg-primary/12 hover:text-primary transition-colors">
              <HugeiconsIcon icon={ConnectIcon} size={14} color="currentColor" strokeWidth={1.5} />
              <span>Connectors</span>
              <span className="text-primary/50">
                {selectedCount}/{availableConnectors.length}
              </span>
            </button>
          </DrawerTrigger>
          <DrawerContent className="max-h-[60vh]">
            <DrawerHeader className="text-left pb-1">
              <DrawerTitle className="text-sm">Select Connectors</DrawerTitle>
            </DrawerHeader>
            <div className="px-1 pb-4">{connectorItems}</div>
          </DrawerContent>
        </Drawer>
      );
    }

    return (
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <button className="flex items-center gap-1.5 px-2.5 h-8 rounded-full bg-primary/8 text-primary/80 text-[12px] font-medium hover:bg-primary/12 hover:text-primary transition-colors">
            <HugeiconsIcon icon={ConnectIcon} size={14} color="currentColor" strokeWidth={1.5} />
            <span>Connectors</span>
            <span className="text-primary/50">
              {selectedCount}/{availableConnectors.length}
            </span>
          </button>
        </PopoverTrigger>
        <PopoverContent
          className="w-52 p-1 font-sans rounded-lg bg-popover border shadow-lg"
          align="start"
          side="bottom"
          sideOffset={6}
        >
          {connectorItems}
        </PopoverContent>
      </Popover>
    );
  },
);

ConnectorSelector.displayName = 'ConnectorSelector';

interface McpServerSelectorProps {
  user: ComprehensiveUserData | null;
  isProUser?: boolean;
}

const McpServerSelector: React.FC<McpServerSelectorProps> = React.memo(({ user, isProUser }) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  const haptics = useWebHaptics();

  const { data, isLoading } = useQuery({
    queryKey: ['mcpServers', user?.id],
    queryFn: async () => {
      const response = await fetch('/api/mcp/servers', { cache: 'no-store' });
      if (!response.ok) throw new Error('Failed to load MCP servers');
      return response.json() as Promise<{
        servers: Array<{
          id: string;
          name: string;
          url: string;
          isEnabled: boolean;
          transportType: string;
          authType: string;
          isOAuthConnected: boolean;
        }>;
      }>;
    },
    enabled: Boolean(user?.id && isProUser),
    staleTime: 10_000,
  });

  const servers = data?.servers ?? [];
  // Only count servers that are actually usable (OAuth servers must be connected)
  const isReady = (s: { authType: string; isOAuthConnected: boolean }) => s.authType !== 'oauth' || s.isOAuthConnected;
  const enabledCount = servers.filter((s) => s.isEnabled && isReady(s)).length;
  const showSearch = servers.length > 6;

  const filteredServers = useMemo(() => {
    const list = search.trim()
      ? servers.filter(
          (s) =>
            s.name.toLowerCase().includes(search.toLowerCase()) || s.url.toLowerCase().includes(search.toLowerCase()),
        )
      : servers;
    return [...list].sort((a, b) => {
      const score = (server: (typeof list)[number]) => {
        const ready = isReady(server);
        if (server.isEnabled && ready) return 3;
        if (server.isEnabled && !ready) return 2;
        if (!server.isEnabled && ready) return 1;
        return 0;
      };

      const rankDiff = score(b) - score(a);
      if (rankDiff !== 0) return rankDiff;
      return a.name.localeCompare(b.name);
    });
  }, [servers, search]);

  const handleToggle = (id: string, currentEnabled: boolean) => {
    haptics.trigger('selection');
    // Optimistic update — flip instantly in cache
    queryClient.setQueryData(['mcpServers', user?.id], (old: any) => {
      if (!old?.servers) return old;
      return { ...old, servers: old.servers.map((s: any) => (s.id === id ? { ...s, isEnabled: !currentEnabled } : s)) };
    });
    // Fire-and-forget sync
    fetch(`/api/mcp/servers/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isEnabled: !currentEnabled }),
    }).catch(() => {
      // Revert on failure
      queryClient.setQueryData(['mcpServers', user?.id], (old: any) => {
        if (!old?.servers) return old;
        return {
          ...old,
          servers: old.servers.map((s: any) => (s.id === id ? { ...s, isEnabled: currentEnabled } : s)),
        };
      });
    });
  };

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      setOpen(nextOpen);
      if (nextOpen) haptics.trigger('light');
      if (!nextOpen) setSearch('');
    },
    [haptics],
  );

  if (!isProUser || servers.length === 0) return null;

  const serverItems = (
    <div className="flex flex-col min-h-0">
      {showSearch && (
        <div className="px-2 pt-2 pb-1.5">
          <input
            type="text"
            placeholder="Search apps..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-muted/60 text-xs rounded-md px-2.5 py-1.5 outline-none placeholder:text-muted-foreground/50 focus:ring-1 focus:ring-ring"
          />
        </div>
      )}

      <div className={cn('overflow-y-auto max-h-[70vh] sm:max-h-[260px] px-1.5 pb-1.5', !showSearch && 'pt-1.5')}>
        {filteredServers.length === 0 ? (
          <div className="px-3 py-6 text-center text-xs text-muted-foreground">No servers match</div>
        ) : (
          filteredServers.map((server) => {
            const ready = isReady(server);
            const hostname = (() => {
              try {
                return new URL(server.url).hostname;
              } catch {
                return server.url;
              }
            })();
            const rootDomain = (() => {
              const parts = hostname.split('.');
              if (parts.length <= 2) return hostname;
              const last2 = parts.slice(-2).join('.');
              const sldTlds = new Set([
                'gov.in',
                'co.in',
                'org.in',
                'net.in',
                'ac.in',
                'co.uk',
                'org.uk',
                'me.uk',
                'net.uk',
                'ac.uk',
                'co.jp',
                'co.nz',
                'co.za',
                'co.kr',
                'co.il',
                'com.au',
                'net.au',
                'org.au',
                'com.br',
                'net.br',
                'org.br',
                'nih.gov',
              ]);
              return sldTlds.has(last2) ? parts.slice(-3).join('.') : last2;
            })();
            const isGitHub = MCP_COMPONENT_ICON_URLS.has(server.url.replace(/\/+$/, ''));
            const faviconSrc = isGitHub
              ? null
              : (getMcpCatalogIcon(server.url) ??
                `/api/proxy-image?url=${encodeURIComponent(`https://www.google.com/s2/favicons?domain=${rootDomain}&sz=128`)}`);
            return (
              <div
                key={server.id}
                onClick={() => {
                  if (ready) {
                    handleToggle(server.id, server.isEnabled);
                    return;
                  }
                  haptics.trigger('warning');
                  window.location.href = '/apps';
                }}
                className={cn(
                  'flex items-center gap-2.5 px-2 py-2 rounded-md transition-colors',
                  ready ? 'hover:bg-accent cursor-pointer' : 'hover:bg-accent/50 cursor-pointer opacity-80',
                )}
              >
                {isGitHub ? (
                  <HugeiconsIcon icon={Github01Icon} size={20} className="shrink-0 text-foreground" />
                ) : (
                   
                  <img
                    src={faviconSrc!}
                    alt=""
                    width={20}
                    height={20}
                    className="shrink-0 rounded object-contain"
                    loading="lazy"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-medium truncate leading-tight">{server.name}</div>
                  {!ready && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        haptics.trigger('warning');
                        window.location.href = '/apps';
                      }}
                      className="inline-flex items-center gap-1 text-[11px] text-primary hover:text-primary/85 transition-colors"
                    >
                      Link app and complete setup
                      <ArrowUpRight className="size-3" />
                    </button>
                  )}
                </div>
                <Checkbox
                  checked={server.isEnabled && ready}
                  onCheckedChange={() => ready && handleToggle(server.id, server.isEnabled)}
                  onClick={(e) => e.stopPropagation()}
                  disabled={!ready}
                  className="shrink-0"
                />
              </div>
            );
          })
        )}
      </div>
    </div>
  );

  const triggerButton = (
    <button className="flex items-center gap-1.5 px-2.5 h-8 rounded-full bg-primary/8 text-primary/80 text-[12px] font-medium hover:bg-primary/12 hover:text-primary transition-colors">
      <AppsIcon width={14} height={14} />
      <span>Apps</span>
      {enabledCount > 0 && (
        <span className="flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-primary/15 text-[10px] font-mono tabular-nums leading-none">
          {enabledCount}
        </span>
      )}
    </button>
  );

  const drawerItems = (
    <div className="flex flex-col min-h-0 flex-1">
      {showSearch && (
        <div className="px-3 pt-2 pb-2 shrink-0">
          <input
            type="text"
            placeholder="Search apps..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-muted/60 text-sm rounded-lg px-3 py-2.5 outline-none placeholder:text-muted-foreground/50 focus:ring-1 focus:ring-ring"
          />
        </div>
      )}
      <div className={cn('overflow-y-auto flex-1 px-2 pb-2', !showSearch && 'pt-2')}>
        {filteredServers.length === 0 ? (
          <div className="px-3 py-8 text-center text-sm text-muted-foreground">No servers match</div>
        ) : (
          filteredServers.map((server) => {
            const ready = isReady(server);
            const hostname = (() => {
              try {
                return new URL(server.url).hostname;
              } catch {
                return server.url;
              }
            })();
            const rootDomain = (() => {
              const parts = hostname.split('.');
              if (parts.length <= 2) return hostname;
              const last2 = parts.slice(-2).join('.');
              const sldTlds = new Set([
                'gov.in',
                'co.in',
                'org.in',
                'net.in',
                'ac.in',
                'co.uk',
                'org.uk',
                'me.uk',
                'net.uk',
                'ac.uk',
                'co.jp',
                'co.nz',
                'co.za',
                'co.kr',
                'co.il',
                'com.au',
                'net.au',
                'org.au',
                'com.br',
                'net.br',
                'org.br',
                'nih.gov',
              ]);
              return sldTlds.has(last2) ? parts.slice(-3).join('.') : last2;
            })();
            const isGitHubMobile = MCP_COMPONENT_ICON_URLS.has(server.url.replace(/\/+$/, ''));
            const faviconSrcMobile = isGitHubMobile
              ? null
              : (getMcpCatalogIcon(server.url) ??
                `/api/proxy-image?url=${encodeURIComponent(`https://www.google.com/s2/favicons?domain=${rootDomain}&sz=128`)}`);
            return (
              <div
                key={server.id}
                onClick={() => {
                  if (ready) {
                    handleToggle(server.id, server.isEnabled);
                    return;
                  }
                  haptics.trigger('warning');
                  window.location.href = '/apps';
                }}
                className={cn(
                  'flex items-center gap-3.5 px-3 py-3 rounded-xl transition-colors',
                  ready
                    ? 'hover:bg-accent active:bg-accent cursor-pointer'
                    : 'hover:bg-accent/50 active:bg-accent/50 cursor-pointer opacity-80',
                )}
              >
                {isGitHubMobile ? (
                  <HugeiconsIcon icon={Github01Icon} size={28} className="shrink-0 text-foreground" />
                ) : (
                   
                  <img
                    src={faviconSrcMobile!}
                    alt=""
                    width={28}
                    height={28}
                    className="shrink-0 rounded-md object-contain"
                    loading="lazy"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-[15px] font-medium truncate leading-tight">{server.name}</div>
                  {!ready && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        haptics.trigger('warning');
                        window.location.href = '/apps';
                      }}
                      className="inline-flex items-center gap-1 text-[12px] text-primary hover:text-primary/85 transition-colors mt-0.5"
                    >
                      Link app and complete setup
                      <ArrowUpRight className="size-3.5" />
                    </button>
                  )}
                </div>
                <Checkbox
                  checked={server.isEnabled && ready}
                  onCheckedChange={() => ready && handleToggle(server.id, server.isEnabled)}
                  onClick={(e) => e.stopPropagation()}
                  disabled={!ready}
                  className="shrink-0 size-5"
                />
              </div>
            );
          })
        )}
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={handleOpenChange}>
        <DrawerTrigger asChild>{triggerButton}</DrawerTrigger>
        <DrawerContent className="max-h-[80vh] h-full flex flex-col overflow-hidden">
          <DrawerHeader className="text-left pb-1 shrink-0">
            <DrawerTitle className="text-lg font-light tracking-tight font-be-vietnam-pro">scira apps</DrawerTitle>
          </DrawerHeader>
          <div className="flex-1 flex flex-col min-h-0 px-1 pb-4">
            {isLoading ? <div className="px-3 py-3 text-sm text-muted-foreground">Loading…</div> : drawerItems}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>{triggerButton}</PopoverTrigger>
      <PopoverContent
        onOpenAutoFocus={(event) => event.preventDefault()}
        className="w-72 p-0 font-sans rounded-xl bg-popover border shadow-none overflow-hidden"
        align="start"
        side="bottom"
        sideOffset={4}
      >
        {isLoading ? <div className="px-3 py-3 text-xs text-muted-foreground">Loading…</div> : serverItems}
      </PopoverContent>
    </Popover>
  );
});

McpServerSelector.displayName = 'McpServerSelector';

const WEB_SEARCH_PROVIDERS: Array<{
  value: SearchProvider;
  label: string;
  description: string;
}> = [
  {
    value: 'exa',
    label: 'Exa',
    description: 'Enhanced and faster neural web search with images and filtering.',
  },
  {
    value: 'firecrawl',
    label: 'Firecrawl',
    description: 'Web, news, and image search with content scraping capabilities.',
  },
  {
    value: 'parallel',
    label: 'Parallel AI',
    description: 'Base and premium web search with Parallel’s Firecrawl image support.',
  },
];

const GroupModeToggle: React.FC<GroupSelectorProps> = React.memo(
  ({ selectedGroup, onGroupSelect, onOpenSettings, isProUser, isAuthenticated, usageData, onShowUpgrade }) => {
    const [open, setOpen] = useState(false);
    const isMobile = useIsMobile();
    const isExtreme = selectedGroup === 'extreme';

    // Check usage limits
    const messageCountExceeded = Boolean(
      !isProUser && usageData && usageData.messageCount >= SEARCH_LIMITS.DAILY_SEARCH_LIMIT,
    );
    const extremeSearchCountExceeded = Boolean(
      !isProUser && usageData && usageData.extremeSearchCount >= SEARCH_LIMITS.EXTREME_SEARCH_LIMIT,
    );

    // Get search provider from localStorage with reactive updates
    const [searchProvider, setSearchProvider] = useLocalStorage<SearchProvider>('scira-search-provider', 'exa');
    const [providerMenuOpen, setProviderMenuOpen] = useState(false);
    const currentProviderOption = useMemo(
      () => WEB_SEARCH_PROVIDERS.find((option) => option.value === searchProvider) ?? WEB_SEARCH_PROVIDERS[0],
      [searchProvider],
    );

    // Get dynamic search groups based on the selected search provider
    const dynamicSearchGroups = useMemo(() => getSearchGroups(searchProvider), [searchProvider]);

    // Memoize visible groups calculation
    const visibleGroups = useMemo(
      () =>
        dynamicSearchGroups.filter((group) => {
          if (!group.show) return false;
          if ('requireAuth' in group && group.requireAuth && !isAuthenticated) return false;
          // Don't filter out Pro-only groups, show them with Pro indicator
          if (group.id === 'extreme' || group.id === 'canvas') return false; // Exclude extreme/canvas from dropdown (accessed via / trigger)
          return true;
        }),
      [dynamicSearchGroups, isAuthenticated],
    );

    // Visible modes: only show selected modes (empty = show all)
    const [visibleModes] = useSyncedPreferences<string[]>('scira-visible-modes', []);
    const [modeOrderInner] = useSyncedPreferences<string[]>('scira-group-order', []);

    const orderedVisibleGroups = useMemo(() => {
      let groups =
        visibleModes && visibleModes.length > 0
          ? visibleGroups.filter((g) => new Set(visibleModes).has(g.id))
          : visibleGroups;
      if (modeOrderInner && modeOrderInner.length > 0) {
        const orderMap = new Map(modeOrderInner.map((id, i) => [id, i]));
        groups = [...groups].sort((a, b) => {
          const ai = orderMap.get(a.id) ?? Infinity;
          const bi = orderMap.get(b.id) ?? Infinity;
          return ai - bi;
        });
      }
      return groups;
    }, [visibleGroups, visibleModes, modeOrderInner]);

    const selectedGroupData = useMemo(
      () => orderedVisibleGroups.find((group) => group.id === selectedGroup),
      [orderedVisibleGroups, selectedGroup],
    );

    const groupTooltipContent = useMemo(() => {
      if (isExtreme) {
        return (
          <div className="grid gap-2 text-left">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10 text-primary">
                <HugeiconsIcon icon={GlobalSearchIcon} size={16} color="currentColor" />
              </div>
              <p className="text-xs font-semibold text-foreground">Switch back to search modes</p>
            </div>
            <p className="text-xs leading-snug text-muted-foreground">
              Choose a different search experience from the list.
            </p>
            {!isProUser && messageCountExceeded && (
              <div className="grid gap-1.5 border-t border-border pt-2">
                <p className="text-[11px] text-destructive/90">
                  Daily limit reached ({SEARCH_LIMITS.DAILY_SEARCH_LIMIT} searches)
                </p>
                <a
                  href="/pricing"
                  className="group inline-flex items-center gap-1 text-xs font-medium text-primary transition-colors hover:text-primary/80"
                >
                  Upgrade for unlimited
                  <ArrowUpRight className="size-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </a>
              </div>
            )}
          </div>
        );
      }

      if (!selectedGroupData) {
        return <p className="text-xs text-muted-foreground">Choose a search mode to get started.</p>;
      }

      return (
        <div className="grid gap-2 text-left">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10 text-primary">
              <FlexibleIcon icon={selectedGroupData.icon} size={16} color="currentColor" strokeWidth={2} />
            </div>
            <div className="flex items-center gap-2">
              <p className="text-xs font-semibold text-foreground">{selectedGroupData.name} Active</p>
              {'requirePro' in selectedGroupData && selectedGroupData.requirePro && !isProUser && (
                <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium bg-primary/10 text-primary border border-primary/20">
                  PRO
                </span>
              )}
            </div>
          </div>
          <p className="text-xs leading-snug text-muted-foreground">{selectedGroupData.description}</p>
          {!isProUser && usageData && (
            <p className="text-[11px] text-muted-foreground/80">
              {usageData.messageCount} / {SEARCH_LIMITS.DAILY_SEARCH_LIMIT} searches used today
            </p>
          )}
          <p className="text-[11px] text-muted-foreground/80 italic">Click to switch search mode.</p>
          {!isProUser && (
            <div className="grid gap-1.5 border-t border-border pt-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <HugeiconsIcon icon={Crown02Icon} size={16} color="currentColor" strokeWidth={2} />
                </div>
                <span>
                  {'requirePro' in selectedGroupData && selectedGroupData.requirePro
                    ? 'Unlock with Pro'
                    : 'Unlimited with Pro'}
                </span>
              </div>
              <a
                href="/pricing"
                className="group inline-flex items-center gap-1 text-xs font-medium text-primary transition-colors hover:text-primary/80"
              >
                {'requirePro' in selectedGroupData && selectedGroupData.requirePro
                  ? 'Explore pricing'
                  : 'Upgrade to Pro'}
                <ArrowUpRight className="size-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </a>
            </div>
          )}
        </div>
      );
    }, [isExtreme, selectedGroupData, isProUser, messageCountExceeded, usageData]);

    const extremeTooltipContent = useMemo(() => {
      // Check if extreme search limit is exceeded
      if (!isProUser && extremeSearchCountExceeded && !isExtreme) {
        return (
          <div className="grid gap-2 text-left">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-destructive/10 text-destructive">
                <HugeiconsIcon icon={AtomicPowerIcon} size={16} color="currentColor" strokeWidth={2} />
              </div>
              <p className="text-xs font-semibold text-foreground">Monthly Limit Reached</p>
            </div>
            <p className="text-xs leading-snug text-muted-foreground">
              You've used {SEARCH_LIMITS.EXTREME_SEARCH_LIMIT} extreme searches this month.
            </p>
            <div className="grid gap-1.5 border-t border-border pt-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <HugeiconsIcon icon={Crown02Icon} size={16} color="currentColor" strokeWidth={2} />
                </div>
                <span>Unlimited with Pro</span>
              </div>
              <a
                href="/pricing"
                className="group inline-flex items-center gap-1 text-xs font-medium text-primary transition-colors hover:text-primary/80"
              >
                Upgrade to Pro
                <ArrowUpRight className="size-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </a>
            </div>
          </div>
        );
      }

      const title = isExtreme ? 'Extreme Search Active' : isAuthenticated ? 'Extreme Search' : 'Sign in Required';

      return (
        <div className="grid gap-2 text-left">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10 text-primary">
              <HugeiconsIcon icon={AtomicPowerIcon} size={16} color="currentColor" strokeWidth={2} />
            </div>
            <p className="text-xs font-semibold text-foreground">{title}</p>
          </div>
          <p className="text-xs leading-snug text-muted-foreground">
            Extreme research with multiple sources and in-depth analysis with 3x sources.
          </p>
          {!isProUser && usageData && (
            <p className="text-[11px] text-muted-foreground/80">
              {usageData.extremeSearchCount} / {SEARCH_LIMITS.EXTREME_SEARCH_LIMIT} used this month
            </p>
          )}
          {!isProUser && (
            <div className="grid gap-1.5 border-t border-border pt-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <HugeiconsIcon icon={Crown02Icon} size={16} color="currentColor" strokeWidth={2} />
                </div>
                <span>Unlimited with Pro</span>
              </div>
              <a
                href="/pricing"
                className="group inline-flex items-center gap-1 text-xs font-medium text-primary transition-colors hover:text-primary/80"
              >
                Explore pricing
                <ArrowUpRight className="size-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </a>
            </div>
          )}
        </div>
      );
    }, [isExtreme, isProUser, isAuthenticated, extremeSearchCountExceeded, usageData]);

    const handleToggleExtreme = useCallback(() => {
      if (isExtreme) {
        // Switch back to web mode
        const webGroup = dynamicSearchGroups.find((group) => group.id === 'web');
        if (webGroup) {
          onGroupSelect(webGroup);
        }
      } else {
        // Check if user is authenticated before allowing extreme mode
        if (!isAuthenticated) {
          // Redirect to sign in page
          window.location.href = '/sign-in';
          return;
        }

        // Check if extreme search limit is exceeded (for non-Pro users)
        if (!isProUser && extremeSearchCountExceeded) {
          onShowUpgrade?.();
          return;
        }

        // Switch to extreme mode
        const extremeGroup = dynamicSearchGroups.find((group) => group.id === 'extreme');
        if (extremeGroup) {
          onGroupSelect(extremeGroup);
        }
      }
    }, [isExtreme, onGroupSelect, dynamicSearchGroups, isAuthenticated, isProUser, extremeSearchCountExceeded]);

    const handleWebProviderChange = useCallback(
      (provider: SearchProvider) => {
        setSearchProvider(provider);
        const label = WEB_SEARCH_PROVIDERS.find((option) => option.value === provider)?.label ?? provider;
        sileo.success({
          title: `Web search provider switched to ${label}`,
          description: 'This will be used for all future searches',
          icon: <Search className="h-4 w-4" />,
        });
      },
      [setSearchProvider],
    );

    // Shared handler for group selection
    const handleGroupSelect = useCallback(
      async (currentValue: string) => {
        const selectedGroup = visibleGroups.find((g) => g.id === currentValue);

        if (selectedGroup) {
          // Check if this is a Pro-only group and user is not Pro
          if ('requirePro' in selectedGroup && selectedGroup.requirePro && !isProUser) {
            setOpen(false);
            onShowUpgrade?.();
            return;
          }

          // Check if connectors group is selected but no connectors are connected
          if (selectedGroup.id === 'connectors' && isAuthenticated && onOpenSettings && isProUser) {
            try {
              const { listUserConnectorsAction } = await import('@/app/actions');
              const result = await listUserConnectorsAction();
              if (result.success && result.connections.length === 0) {
                // No connectors connected, open settings dialog to connectors tab
                onOpenSettings('connectors');
                setOpen(false);
                return;
              }
            } catch (error) {
              console.error('Error checking connectors:', error);
              // If there's an error, still allow group selection
            }
          }

          onGroupSelect(selectedGroup);
          setOpen(false);
        }
      },
      [visibleGroups, isProUser, onOpenSettings, isAuthenticated, onGroupSelect],
    );

    // Handle opening the dropdown/drawer
    const handleOpenChange = useCallback(
      (newOpen: boolean) => {
        if (newOpen && isExtreme) {
          // If trying to open in extreme mode, switch back to web mode instead
          const webGroup = dynamicSearchGroups.find((group) => group.id === 'web');
          if (webGroup) {
            onGroupSelect(webGroup);
          }
          return;
        }
        setOpen(newOpen);
      },
      [isExtreme, onGroupSelect, dynamicSearchGroups],
    );

    // Handle group selector button click (mobile only)
    const handleGroupSelectorClick = useCallback(() => {
      if (isExtreme) {
        // Switch back to web mode when clicking groups in extreme mode
        const webGroup = dynamicSearchGroups.find((group) => group.id === 'web');
        if (webGroup) {
          onGroupSelect(webGroup);
        }
      } else {
        setOpen(true);
      }
    }, [isExtreme, onGroupSelect, dynamicSearchGroups]);

    // Shared content component
    const GroupSelectionContent = () => (
      <div className="p-2">
        {/* Group grid */}
        <div className="grid grid-cols-5 gap-1.5">
          {orderedVisibleGroups.map((group) => {
            const isGroupDisabled = !isProUser && messageCountExceeded && !('requirePro' in group && group.requirePro);
            const isSelected = selectedGroup === group.id;

            return (
              <Tooltip key={group.id}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => {
                      if (!isGroupDisabled) {
                        handleGroupSelect(group.id);
                      }
                    }}
                    disabled={isGroupDisabled}
                    className={cn(
                      'flex flex-col items-center justify-center gap-1 p-2 rounded-lg',
                      'transition-all duration-150 aspect-square',
                      isGroupDisabled ? 'opacity-40 cursor-not-allowed' : 'hover:bg-accent/80 cursor-pointer',
                      isSelected && !isGroupDisabled && 'bg-accent ring-1 ring-primary/30',
                    )}
                  >
                    {/* Icon */}
                    <div
                      className={cn(
                        'flex items-center justify-center size-8 rounded-lg',
                        isSelected ? 'bg-primary/15 text-primary' : 'text-muted-foreground',
                      )}
                    >
                      <FlexibleIcon icon={group.icon} size={20} color="currentColor" strokeWidth={1.8} />
                    </div>

                    {/* Name */}
                    <span
                      className={cn(
                        'text-[9px] font-medium text-center leading-tight line-clamp-1',
                        isSelected ? 'text-foreground' : 'text-muted-foreground',
                      )}
                    >
                      {group.name}
                    </span>

                    {/* Badges */}
                    {'requirePro' in group && group.requirePro && !isProUser && (
                      <span className="inline-flex items-center px-1 rounded text-[7px] font-semibold bg-primary/10 text-primary">
                        PRO
                      </span>
                    )}
                    {isGroupDisabled && (
                      <span className="inline-flex items-center px-1 rounded text-[7px] font-semibold bg-destructive/10 text-destructive">
                        LIMIT
                      </span>
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs max-w-[160px]">
                  <p className="font-medium">{group.name}</p>
                  <p className="text-primary-foreground/80 text-[10px] leading-snug">{group.description}</p>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </div>
    );

    return (
      <div className="flex items-center">
        {/* Toggle Switch Container */}
        <div className="flex items-center bg-background border border-accent/50 rounded-lg gap-1! py-1! px-0.75! h-8!">
          {/* Group Selector Side - Conditional Rendering for Mobile/Desktop */}
          {isMobile ? (
            <Drawer open={open} onOpenChange={handleOpenChange}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DrawerTrigger asChild>
                    <Button
                      variant="ghost"
                      role="combobox"
                      aria-expanded={open}
                      size="sm"
                      onClick={handleGroupSelectorClick}
                      disabled={!isProUser && !isExtreme && messageCountExceeded}
                      className={cn(
                        'flex items-center gap-1.5 m-0! px-1.5! h-6! rounded-md! transition-all',
                        !isExtreme
                          ? !isProUser && messageCountExceeded
                            ? 'bg-accent/50 text-muted-foreground cursor-not-allowed opacity-50'
                            : 'bg-accent text-foreground hover:bg-accent/80 cursor-pointer'
                          : 'text-muted-foreground hover:bg-accent cursor-pointer',
                      )}
                    >
                      {selectedGroupData && !isExtreme && (
                        <>
                          <FlexibleIcon icon={selectedGroupData.icon} size={30} color="currentColor" />
                          <CaretDownIcon
                            size={18}
                            color="currentColor"
                            strokeWidth={1.5}
                            className={cn(open ? 'rotate-180' : 'rotate-0', 'transition-transform duration-200')}
                          />
                        </>
                      )}
                      {isExtreme && (
                        <>
                          <HugeiconsIcon icon={GlobalSearchIcon} size={30} color="currentColor" />
                        </>
                      )}
                    </Button>
                  </DrawerTrigger>
                </TooltipTrigger>
                <TooltipContent
                  side="bottom"
                  className="max-w-[200px] rounded-lg border border-border bg-popover p-2 text-left [&_svg.bg-primary]:bg-popover! [&_svg.fill-primary]:fill-popover!"
                >
                  {groupTooltipContent}
                </TooltipContent>
              </Tooltip>
              <DrawerContent className="max-h-[80vh]">
                <DrawerHeader className="text-left pb-4">
                  <DrawerTitle>Choose Search Mode</DrawerTitle>
                </DrawerHeader>
                <div className="px-4 pb-6 max-h-[calc(80vh-100px)] overflow-y-auto">
                  <div className="space-y-2">
                    {orderedVisibleGroups.map((group) => {
                      const isGroupDisabled =
                        !isProUser && messageCountExceeded && !('requirePro' in group && group.requirePro);
                      return (
                        <div key={group.id} className="space-y-2">
                          <button
                            onClick={() => {
                              if (!isGroupDisabled) {
                                handleGroupSelect(group.id);
                              }
                            }}
                            disabled={isGroupDisabled}
                            className={cn(
                              'w-full flex items-center justify-between p-4 rounded-lg text-left transition-all',
                              'border border-border',
                              isGroupDisabled ? 'opacity-50 cursor-not-allowed bg-background' : 'hover:bg-accent',
                              selectedGroup === group.id ? 'bg-accent border-primary/20' : 'bg-background',
                            )}
                          >
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <FlexibleIcon icon={group.icon} size={24} color="currentColor" />
                              <div className="flex flex-col min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-sm text-foreground">{group.name}</span>
                                  {'requirePro' in group && group.requirePro && !isProUser && (
                                    <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-primary/10 text-primary border border-primary/20">
                                      PRO
                                    </span>
                                  )}
                                  {isGroupDisabled && (
                                    <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-destructive/10 text-destructive border border-destructive/20">
                                      LIMIT
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs text-muted-foreground mt-0.5">{group.description}</div>
                              </div>
                            </div>
                            <div className="ml-3 flex items-center gap-1.5">
                              <Check
                                className={cn(
                                  'h-5 w-5 shrink-0',
                                  selectedGroup === group.id ? 'opacity-100' : 'opacity-0',
                                )}
                              />
                            </div>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </DrawerContent>
            </Drawer>
          ) : (
            <Popover open={open} onOpenChange={handleOpenChange}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <PopoverTrigger asChild>
                    <Button
                      variant="ghost"
                      role="combobox"
                      aria-expanded={open}
                      size="sm"
                      disabled={!isProUser && !isExtreme && messageCountExceeded}
                      className={cn(
                        'flex items-center m-0! px-2! h-6! rounded-md! transition-all',
                        !isExtreme
                          ? !isProUser && messageCountExceeded
                            ? 'bg-accent/50 text-muted-foreground cursor-not-allowed opacity-50'
                            : 'bg-accent text-foreground hover:bg-accent/80 cursor-pointer'
                          : 'text-muted-foreground hover:bg-accent cursor-pointer',
                      )}
                    >
                      {selectedGroupData && !isExtreme && (
                        <>
                          <FlexibleIcon
                            icon={selectedGroupData.icon}
                            size={30}
                            color="currentColor"
                            strokeWidth={1.5}
                          />
                          <CaretDownIcon
                            size={18}
                            color="currentColor"
                            strokeWidth={1.5}
                            className={cn(open ? 'rotate-180' : 'rotate-0', 'transition-transform duration-200')}
                          />
                        </>
                      )}
                      {isExtreme && (
                        <HugeiconsIcon icon={GlobalSearchIcon} size={30} color="currentColor" strokeWidth={1.5} />
                      )}
                    </Button>
                  </PopoverTrigger>
                </TooltipTrigger>
                <TooltipContent
                  side="bottom"
                  className="max-w-[200px] rounded-lg border border-border bg-popover p-2 text-left [&_svg.bg-primary]:bg-popover! [&_svg.fill-primary]:fill-popover!"
                >
                  {groupTooltipContent}
                </TooltipContent>
              </Tooltip>
              <PopoverContent
                className="w-[90vw] sm:w-auto p-0 font-sans rounded-lg bg-popover z-50 border shadow-none"
                align="start"
                side="bottom"
                sideOffset={4}
                avoidCollisions={true}
                collisionPadding={8}
              >
                <GroupSelectionContent />
              </PopoverContent>
            </Popover>
          )}

          {/* Extreme Mode Side */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleToggleExtreme}
                disabled={!isProUser && extremeSearchCountExceeded && !isExtreme}
                className={cn(
                  'flex items-center gap-1.5 px-3 h-6 rounded-md transition-all',
                  isExtreme
                    ? 'bg-accent text-foreground hover:bg-accent/80'
                    : !isAuthenticated
                      ? 'text-muted-foreground/50 cursor-pointer'
                      : !isProUser && extremeSearchCountExceeded
                        ? 'text-muted-foreground/30 cursor-not-allowed'
                        : 'text-muted-foreground hover:bg-accent',
                )}
              >
                <HugeiconsIcon icon={AtomicPowerIcon} size={30} color="currentColor" strokeWidth={1.5} />
              </Button>
            </TooltipTrigger>
            <TooltipContent
              side="bottom"
              className="max-w-[200px] rounded-lg border border-border bg-popover p-2 text-left [&_svg.bg-primary]:bg-popover! [&_svg.fill-primary]:fill-popover!"
            >
              {extremeTooltipContent}
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    );
  },
);

GroupModeToggle.displayName = 'GroupModeToggle';

const FormComponent: React.FC<FormComponentProps> = ({
  chatId,
  user,
  subscriptionData,
  input,
  setInput,
  attachments,
  setAttachments,
  sendMessage,
  fileInputRef,
  inputRef,
  stop,
  selectedModel,
  setSelectedModel,
  resetSuggestedQuestions,
  lastSubmittedQueryRef,
  selectedGroup,
  setSelectedGroup,
  messages,
  status,
  setHasSubmitted,
  isLimitBlocked = false,
  onOpenSettings,
  usageData,
  selectedConnectors = [],
  setSelectedConnectors,
  isTemporaryChatEnabled,
  isTemporaryChat,
  isTemporaryChatLocked,
  setIsTemporaryChatEnabled,
  isMultiAgentModeEnabled = false,
  setIsMultiAgentModeEnabled,
  autoRoutedModel,
  onBeforeSubmit,
}) => {
  const [uploadQueue, setUploadQueue] = useState<Array<string>>([]);
  const canvasEnabled = process.env.NEXT_PUBLIC_CANVAS_ENABLED === 'true';
  const mcpEnabled = process.env.NEXT_PUBLIC_MCP_ENABLED === 'true';
  const formQueryClient = useQueryClient();
  const isMounted = useRef(true);
  const isCompositionActive = useRef(false);
  const typewriterTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingTypewriterTargetRef = useRef<string | null>(null);
  const setInputRef = useRef(setInput);
  const latestInputRef = useRef(input);
  const typewriterSpeedRef = useRef(5);
  const postSubmitFileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [isTypewriting, setIsTypewriting] = useState(false);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [showSignInDialog, setShowSignInDialog] = useState(false);
  const [discountConfig, setDiscountConfig] = useState<DiscountConfig | null>(null);

  // Inline trigger popup state: '@' for sources, '/' for modes (extreme/connectors)
  const [triggerPopup, setTriggerPopup] = useState<'@' | '/' | null>(null);
  const [triggerFilter, setTriggerFilter] = useState('');
  const [triggerHighlightIndex, setTriggerHighlightIndex] = useState(0);
  const triggerPopupScrollRef = useRef<HTMLDivElement>(null);

  // Autocomplete suggestions state
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [suggestionIndex, setSuggestionIndex] = useState(-1);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestAbortRef = useRef<AbortController | null>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  const [plusMenuOpen, setPlusMenuOpen] = useState(false);
  const [plusMenuCanScroll, setPlusMenuCanScroll] = useState(true);
  const plusMenuScrollRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const isMobile = useIsMobile();
  const haptics = useWebHaptics();

  useEffect(() => {
    setInputRef.current = setInput;
  }, [setInput]);

  useEffect(() => {
    latestInputRef.current = input;
  }, [input]);

  const handlePlusMenuScroll = useCallback(() => {
    const el = plusMenuScrollRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 12;
    setPlusMenuCanScroll(!atBottom);
  }, []);

  const handlePlusMenuOpenChange = useCallback(
    (nextOpen: boolean) => {
      setPlusMenuOpen(nextOpen);
      if (nextOpen) haptics.trigger('light');
    },
    [haptics],
  );

  // Reset scroll indicator when menu opens
  useEffect(() => {
    if (plusMenuOpen) {
      setPlusMenuCanScroll(true);
      // Check after render if content is actually scrollable
      requestAnimationFrame(() => {
        const el = plusMenuScrollRef.current;
        if (el) {
          setPlusMenuCanScroll(el.scrollHeight > el.clientHeight);
        }
      });
    }
  }, [plusMenuOpen]);

  // Combined state for animations to avoid restart issues
  const isEnhancementActive = isEnhancing || isTypewriting;
  const audioLinesRef = useRef<any>(null);
  const gripIconRef = useRef<any>(null);

  const isProUser = useMemo(() => Boolean(user?.isProUser), [user?.isProUser]);

  const isProcessing = useMemo(() => status === 'submitted' || status === 'streaming', [status]);

  const hasInteracted = useMemo(() => messages.length > 0, [messages.length]);

  // Search groups for the plus menu
  const [searchProvider] = useSyncedPreferences<SearchProvider>('scira-search-provider', 'exa');
  const dynamicSearchGroups = useMemo(() => getSearchGroups(searchProvider), [searchProvider]);
  const [visibleModesOuter] = useSyncedPreferences<string[]>('scira-visible-modes', []);
  const [modeOrderOuter] = useSyncedPreferences<string[]>('scira-group-order', []);
  const isExtreme = selectedGroup === 'extreme';
  const extremeSearchCountExceeded = Boolean(
    !isProUser && usageData && usageData.extremeSearchCount >= SEARCH_LIMITS.EXTREME_SEARCH_LIMIT,
  );

  // Shared helper: sort groups by user-defined order (empty = default order)
  const applyModeOrder = useCallback(
    <T extends { id: string }>(groups: T[]): T[] => {
      if (!modeOrderOuter || modeOrderOuter.length === 0) return groups;
      const orderMap = new Map(modeOrderOuter.map((id, i) => [id, i]));
      return [...groups].sort((a, b) => {
        const ai = orderMap.get(a.id) ?? Infinity;
        const bi = orderMap.get(b.id) ?? Infinity;
        return ai - bi;
      });
    },
    [modeOrderOuter],
  );

  const plusMenuGroups = useMemo(() => {
    let filtered = dynamicSearchGroups.filter((group) => {
      if (!group.show) return false;
      if ('requireAuth' in group && group.requireAuth && !user) return false;
      if (group.id === 'extreme' || group.id === 'canvas' || group.id === 'mcp') return false;
      return true;
    });
    if (visibleModesOuter && visibleModesOuter.length > 0) {
      const modeSet = new Set(visibleModesOuter);
      filtered = filtered.filter((g) => modeSet.has(g.id));
    }
    return applyModeOrder(filtered);
  }, [dynamicSearchGroups, visibleModesOuter, user, applyModeOrder]);

  // Base groups for @ trigger (all visible groups)
  const sourceGroups = useMemo(() => {
    let allVisible = dynamicSearchGroups.filter((group) => {
      if (!group.show) return false;
      if ('requireAuth' in group && group.requireAuth && !user) return false;
      if (group.id === 'extreme' || group.id === 'connectors' || group.id === 'canvas' || group.id === 'mcp')
        return false;
      return true;
    });
    if (visibleModesOuter && visibleModesOuter.length > 0) {
      const modeSet = new Set(visibleModesOuter);
      allVisible = allVisible.filter((g) => modeSet.has(g.id));
    }
    return applyModeOrder(allVisible);
  }, [dynamicSearchGroups, visibleModesOuter, user, applyModeOrder]);

  // Base groups for / trigger (extreme, apps, multi-agent, canvas)
  const modeGroups = useMemo(() => {
    const modeIds = new Set(['extreme', 'multi-agent']);
    if (canvasEnabled) modeIds.add('canvas');
    if (mcpEnabled) modeIds.add('mcp');
    const filtered = dynamicSearchGroups.filter((group) => {
      if (!group.show) return false;
      return modeIds.has(group.id);
    });
    const order = ['extreme', 'mcp', 'multi-agent', 'canvas'];
    return filtered.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
  }, [dynamicSearchGroups, canvasEnabled, mcpEnabled]);

  useEffect(() => {
    if (!setIsMultiAgentModeEnabled) return;
    if (selectedGroup === 'multi-agent') {
      if (!isEnhancing && !isTypewriting) {
        setIsMultiAgentModeEnabled(true);
      }
      return;
    }
    setIsMultiAgentModeEnabled(false);
  }, [selectedGroup, isEnhancing, isTypewriting, setIsMultiAgentModeEnabled]);

  // Active group list based on which trigger is open
  const triggerBaseGroups = triggerPopup === '/' ? modeGroups : sourceGroups;

  const filteredTriggerGroups = useMemo(() => {
    if (!triggerFilter) return triggerBaseGroups;
    const lower = triggerFilter.toLowerCase();
    return triggerBaseGroups.filter((g) => g.name.toLowerCase().includes(lower) || g.id.toLowerCase().includes(lower));
  }, [triggerBaseGroups, triggerFilter]);

  // Whether the temp/private toggle appears in the / trigger popup (only before chat starts)
  const showTempInTrigger = useMemo(() => {
    if (triggerPopup !== '/') return false;
    if (!user || hasInteracted) return false;
    if (!triggerFilter) return true;
    const lower = triggerFilter.toLowerCase();
    return 'temporary'.includes(lower) || 'private'.includes(lower);
  }, [triggerPopup, user, hasInteracted, triggerFilter]);

  const showMultiAgentInTrigger = useMemo(() => {
    if (triggerPopup !== '/') return false;
    if (!user || !setIsMultiAgentModeEnabled) return false;
    const isAlreadyInModeGroups = filteredTriggerGroups.some((group) => group.id === 'multi-agent');
    if (isAlreadyInModeGroups) return false;
    if (!triggerFilter) return true;
    const lower = triggerFilter.toLowerCase();
    return 'multi-agent'.includes(lower) || 'multi agent'.includes(lower) || 'research'.includes(lower);
  }, [triggerPopup, user, setIsMultiAgentModeEnabled, triggerFilter, filteredTriggerGroups]);

  const triggerTotalItems =
    filteredTriggerGroups.length + (showMultiAgentInTrigger ? 1 : 0) + (showTempInTrigger ? 1 : 0);

  // Reset highlight when filter or trigger changes
  useEffect(() => {
    setTriggerHighlightIndex(0);
  }, [triggerFilter, triggerPopup]);

  // Auto-scroll highlighted item into view
  useEffect(() => {
    if (!triggerPopup) return;
    const container = triggerPopupScrollRef.current;
    if (!container) return;
    const item = container.querySelector(`[data-at-index="${triggerHighlightIndex}"]`);
    if (item) {
      item.scrollIntoView({ block: 'nearest' });
    }
  }, [triggerHighlightIndex, triggerPopup]);

  const cleanupMediaRecorder = useCallback(() => {
    if (mediaRecorderRef.current?.stream) {
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
    }
    mediaRecorderRef.current = null;
    setIsRecording(false);
  }, []);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      if (typewriterTimeoutRef.current) {
        clearTimeout(typewriterTimeoutRef.current);
        typewriterTimeoutRef.current = null;
      }
      // Persist progress so a transient remount can resume smoothly.
      if (pendingTypewriterTargetRef.current) {
        const target = pendingTypewriterTargetRef.current;
        const typedLength = Math.min(target.length, Math.max(latestInputRef.current.length, 1));
        pendingTypewriterResumeCache = {
          target,
          index: typedLength,
          speed: typewriterSpeedRef.current,
        };
        pendingTypewriterTargetRef.current = null;
      }
      cleanupMediaRecorder();
    };
  }, [cleanupMediaRecorder]);

  // Fetch discount config when needed
  const fetchDiscountConfigForm = useCallback(async () => {
    if (discountConfig) return; // Already fetched

    try {
      const config = await getDiscountConfigAction({
        isIndianUser: location.isIndia,
      });
      setDiscountConfig(config as DiscountConfig);
    } catch (error) {
      console.error('Failed to fetch discount config:', error);
    }
  }, [discountConfig, location.isIndia]);

  // Calculate pricing with student discounts
  const calculatePricing = useCallback(() => {
    const defaultUSDPrice = PRICING.PRO_MONTHLY;
    const defaultINRPrice = PRICING.PRO_MONTHLY_INR;

    // Check if student discount is active
    if (!discountConfig || !discountConfig.enabled || !discountConfig.isStudentDiscount) {
      return {
        usd: { originalPrice: defaultUSDPrice, finalPrice: defaultUSDPrice, hasDiscount: false },
        inr: location.isIndia
          ? { originalPrice: defaultINRPrice, finalPrice: defaultINRPrice, hasDiscount: false }
          : null,
      };
    }

    // USD pricing with student discount
    const usdPricing = discountConfig.finalPrice
      ? {
          originalPrice: defaultUSDPrice,
          finalPrice: discountConfig.finalPrice,
          hasDiscount: true,
        }
      : {
          originalPrice: defaultUSDPrice,
          finalPrice: defaultUSDPrice,
          hasDiscount: false,
        };

    // INR pricing with student discount - show if available in discount config
    let inrPricing: { originalPrice: number; finalPrice: number; hasDiscount: boolean } | null = null;
    if (discountConfig.inrPrice || location.isIndia) {
      inrPricing = discountConfig.inrPrice
        ? {
            originalPrice: defaultINRPrice,
            finalPrice: discountConfig.inrPrice,
            hasDiscount: true,
          }
        : {
            originalPrice: defaultINRPrice,
            finalPrice: defaultINRPrice,
            hasDiscount: false,
          };
    }

    return {
      usd: usdPricing,
      inr: inrPricing,
    };
  }, [discountConfig, location.isIndia]);

  const pricing = calculatePricing();

  // Control audio lines animation
  useEffect(() => {
    if (audioLinesRef.current) {
      if (isRecording) {
        audioLinesRef.current.startAnimation();
      } else {
        audioLinesRef.current.stopAnimation();
      }
    }
  }, [isRecording]);

  // Control grip icon animation using combined state to avoid restarts
  useEffect(() => {
    if (gripIconRef.current) {
      if (isEnhancementActive) {
        gripIconRef.current.startAnimation();
      } else {
        gripIconRef.current.stopAnimation();
      }
    }
  }, [isEnhancementActive]);

  // Global typing detection to auto-focus form
  useEffect(() => {
    const handleGlobalKeyDown = (event: KeyboardEvent) => {
      // Don't interfere if user is already typing in an input, textarea, or contenteditable
      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.contentEditable === 'true' ||
        target.closest('[contenteditable="true"]')
      ) {
        return;
      }

      // Don't interfere with keyboard shortcuts (Ctrl/Cmd + key)
      if (event.ctrlKey || event.metaKey || event.altKey) {
        return;
      }

      // Don't interfere with function keys, arrow keys, etc.
      if (
        event.key.length > 1 && // Multi-character keys like 'Enter', 'Escape', etc.
        !['Backspace', 'Delete', 'Space'].includes(event.key)
      ) {
        return;
      }

      // Don't focus if form is already focused
      if (inputRef.current && document.activeElement === inputRef.current) {
        return;
      }

      // Don't focus if recording is active
      if (isRecording) {
        return;
      }

      // Focus the input and add the typed character
      if (inputRef.current && event.key.length === 1) {
        inputRef.current.focus();
        // If it's a printable character, add it to the input
        if (event.key !== ' ' || input.length > 0) {
          // Allow space only if there's already content
          const newValue = input + event.key;
          setInput(newValue);
          event.preventDefault();

          // Check for @ or / trigger from global key handler
          if ((event.key === '@' || event.key === '/') && (input.length === 0 || /\s$/.test(input))) {
            setTriggerPopup(event.key as '@' | '/');
            setTriggerFilter('');
          }
        }
      }
    };

    document.addEventListener('keydown', handleGlobalKeyDown);

    return () => {
      document.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, [isRecording, input, setInput, inputRef]);

  // Typewriter effect for enhanced text
  const typewriterText = useCallback(
    (text: string, speed: number = 5, startIndex?: number) => {
      if (typewriterTimeoutRef.current) {
        clearTimeout(typewriterTimeoutRef.current);
        typewriterTimeoutRef.current = null;
      }
      typewriterSpeedRef.current = speed;
      pendingTypewriterTargetRef.current = text;
      if (!text || text.length === 0) {
        setIsTypewriting(false);
        pendingTypewriterTargetRef.current = null;
        pendingTypewriterResumeCache = null;
        return;
      }

      const initialIndex = Math.min(text.length, Math.max(startIndex ?? 1, 1));
      let currentIndex = initialIndex;

      setIsTypewriting(currentIndex < text.length);
      // Never start from an empty frame; this avoids "input reset to null" perception.
      setInputRef.current(text.slice(0, currentIndex));
      pendingTypewriterResumeCache = { target: text, index: currentIndex, speed };

      if (currentIndex >= text.length) {
        pendingTypewriterTargetRef.current = null;
        pendingTypewriterResumeCache = null;
        setIsTypewriting(false);
        inputRef.current?.focus();
        return;
      }

      const typeNextChar = () => {
        if (!isMounted.current) return;
        if (currentIndex < text.length) {
          currentIndex++;
          setInputRef.current(text.substring(0, currentIndex));
          pendingTypewriterResumeCache = { target: text, index: currentIndex, speed };
          typewriterTimeoutRef.current = setTimeout(typeNextChar, speed);
          return;
        }
        typewriterTimeoutRef.current = null;
        pendingTypewriterTargetRef.current = null;
        pendingTypewriterResumeCache = null;
        setIsTypewriting(false);
        inputRef.current?.focus();
      };

      typewriterTimeoutRef.current = setTimeout(typeNextChar, speed);
    },
    [inputRef],
  );

  // Resume in-progress typewriter after a transient remount.
  useEffect(() => {
    const pendingResume = pendingTypewriterResumeCache;
    if (!pendingResume) return;

    const currentInput = latestInputRef.current;
    if (!pendingResume.target.startsWith(currentInput)) {
      pendingTypewriterResumeCache = null;
      return;
    }

    pendingTypewriterResumeCache = null;
    const resumeIndex = Math.min(pendingResume.target.length, Math.max(pendingResume.index, currentInput.length, 1));

    typewriterText(pendingResume.target, pendingResume.speed, resumeIndex);
  }, [typewriterText]);

  const handleEnhance = useCallback(async () => {
    if (!isProUser) {
      haptics.trigger('warning');
      fetchDiscountConfigForm();
      setShowUpgradeDialog(true);
      return;
    }
    if (!input || input.trim().length === 0) {
      haptics.trigger('error');
      sileo.error({ title: 'Please enter a prompt to enhance' });
      return;
    }
    if (isProcessing || isEnhancing) return;

    const originalInput = input;
    setIsEnhancing(true);

    const enhanceAsync = async () => {
      const result = await enhancePrompt(input);
      if (result?.success && result.enhanced) {
        typewriterText(result.enhanced);
        setIsEnhancing(false);
        haptics.trigger('success');
        return result;
      }
      throw new Error(result?.error || 'Failed to enhance prompt');
    };

    sileo.promise(
      enhanceAsync().catch((e) => {
        setInput(originalInput);
        setIsEnhancing(false);
        haptics.trigger('error');
        throw e;
      }),
      {
        loading: { title: 'Enhancing your prompt...' },
        success: () => ({ title: 'Prompt enhanced successfully!' }),
        error: (err) => ({ title: (err as Error).message }),
      },
    );
  }, [
    input,
    haptics,
    isProcessing,
    isProUser,
    setInput,
    inputRef,
    typewriterText,
    isEnhancing,
    setShowUpgradeDialog,
    fetchDiscountConfigForm,
  ]);

  const handleRecord = useCallback(async () => {
    if (isRecording && mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      cleanupMediaRecorder();
      haptics.trigger('selection');
    } else {
      try {
        // Check if user is signed in
        if (!user) {
          haptics.trigger('warning');
          setShowSignInDialog(true);
          return;
        }

        // Environment and feature checks
        if (typeof window === 'undefined') {
          haptics.trigger('error');
          sileo.error({ title: 'Voice recording is only available in the browser.' });
          return;
        }

        if (!navigator.mediaDevices?.getUserMedia) {
          haptics.trigger('error');
          sileo.error({ title: 'Voice recording is not supported in this browser.' });
          return;
        }

        // Best-effort permissions hint (not supported in all browsers)
        try {
          const permApi: any = (navigator as any).permissions;
          if (permApi?.query) {
            const status = await permApi.query({ name: 'microphone' as any });
            if (status?.state === 'denied') {
              haptics.trigger('error');
              sileo.error({ title: 'Microphone access is denied. Enable it in your browser settings.' });
              return;
            }
          }
        } catch {
          // Ignore permissions API errors; proceed to request directly
        }

        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

        // Pick a supported MIME type to maximize cross-browser compatibility (e.g., Safari)
        const candidateMimeTypes = [
          'audio/webm;codecs=opus',
          'audio/webm',
          'audio/mp4;codecs=mp4a.40.2',
          'audio/mp4',
          'audio/ogg;codecs=opus',
          'audio/mpeg',
        ];
        const isTypeSupported = (type: string) =>
          typeof MediaRecorder !== 'undefined' && (MediaRecorder as any).isTypeSupported?.(type);
        const selectedMimeType = candidateMimeTypes.find((t) => isTypeSupported(t));

        let recorder: MediaRecorder;
        try {
          recorder = selectedMimeType
            ? new MediaRecorder(stream, { mimeType: selectedMimeType })
            : new MediaRecorder(stream);
        } catch (e) {
          // Fallback: try without options
          recorder = new MediaRecorder(stream);
        }
        mediaRecorderRef.current = recorder;

        recorder.addEventListener('dataavailable', async (event) => {
          if (event.data.size > 0) {
            const audioBlob = event.data;

            try {
              const formData = new FormData();
              const extension = (() => {
                const type = (audioBlob?.type || '').toLowerCase();
                if (type.includes('mp4')) return 'mp4';
                if (type.includes('ogg')) return 'ogg';
                if (type.includes('mpeg')) return 'mp3';
                return 'webm';
              })();
              formData.append('audio', audioBlob, `recording.${extension}`);
              const response = await fetch('/api/transcribe', {
                method: 'POST',
                body: formData,
              });

              if (!response.ok) {
                throw new Error(`Transcription failed: ${response.statusText}`);
              }

              const data = await response.json();

              if (data.text) {
                setInput(data.text);
              } else {
                console.error('Transcription response did not contain text:', data);
              }
            } catch (error) {
              console.error('Error during transcription request:', error);
              haptics.trigger('error');
              sileo.error({ title: 'Failed to transcribe audio. Please try again.' });
            } finally {
              cleanupMediaRecorder();
            }
          }
        });

        recorder.addEventListener('error', (e) => {
          console.error('MediaRecorder error:', e);
          haptics.trigger('error');
          sileo.error({ title: 'Recording failed. Please try again or switch browser.' });
          cleanupMediaRecorder();
        });

        recorder.addEventListener('stop', () => {
          stream.getTracks().forEach((track) => track.stop());
        });

        recorder.start();
        setIsRecording(true);
        haptics.trigger('medium');
      } catch (error) {
        console.error('Error accessing microphone:', error);
        haptics.trigger('error');
        sileo.error({ title: 'Could not access microphone. Please allow mic permission.' });
        setIsRecording(false);
      }
    }
  }, [isRecording, cleanupMediaRecorder, setInput, user, setShowSignInDialog, haptics]);

  // Autocomplete: in-memory cache for instant repeat lookups
  const suggestCacheRef = useRef<Map<string, string[]>>(new Map());

  const fetchSuggestions = useCallback(
    async (query: string) => {
      const q = query.trim().toLowerCase();
      if (hasInteracted || q.length < 1 || triggerPopup !== null) {
        setSuggestions([]);
        setShowSuggestions(false);
        return;
      }

      // Instant hit from memory cache
      const cached = suggestCacheRef.current.get(q);
      if (cached) {
        setSuggestions(cached);
        setSuggestionIndex(-1);
        setShowSuggestions(cached.length > 0);
        return;
      }

      // Abort any in-flight request
      suggestAbortRef.current?.abort();
      const controller = new AbortController();
      suggestAbortRef.current = controller;

      try {
        const res = await fetch(`/api/suggest?q=${encodeURIComponent(q)}`, {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error('suggest failed');
        const data = await res.json();
        const items: string[] = Array.isArray(data?.suggestions) ? data.suggestions : [];
        if (!controller.signal.aborted) {
          // Cache the result (cap at 200 entries to avoid memory leak)
          if (suggestCacheRef.current.size > 200) {
            const firstKey = suggestCacheRef.current.keys().next().value;
            if (firstKey) suggestCacheRef.current.delete(firstKey);
          }
          suggestCacheRef.current.set(q, items);
          setSuggestions(items);
          setSuggestionIndex(-1);
          setShowSuggestions(items.length > 0);
        }
      } catch {
        if (!controller.signal.aborted) {
          setSuggestions([]);
          setShowSuggestions(false);
        }
      }
    },
    [hasInteracted, triggerPopup],
  );

  const suggestDebouncer = useDebouncer(fetchSuggestions, { wait: 50, key: 'autocomplete' });

  // Cleanup abort controller on unmount
  useEffect(() => {
    return () => {
      suggestAbortRef.current?.abort();
    };
  }, []);

  // Hide suggestions when messages appear (conversation started)
  useEffect(() => {
    if (hasInteracted) {
      setSuggestions([]);
      setShowSuggestions(false);
      suggestAbortRef.current?.abort();
    }
  }, [hasInteracted]);

  const handleInput = useCallback(
    (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      event.preventDefault();
      const newValue = event.target.value;
      const cursorPos = event.target.selectionStart ?? newValue.length;

      if (newValue.length > MAX_INPUT_CHARS) {
        setInput(newValue);
        sileo.error({ title: `Your input exceeds the maximum of ${MAX_INPUT_CHARS} characters.` });
      } else {
        setInput(newValue);
      }

      // Detect @ or / trigger for inline popup
      // Walk backwards from cursor to find an active trigger character
      let foundTrigger: '@' | '/' | null = null;
      let triggerPos = -1;
      for (let i = cursorPos - 1; i >= 0; i--) {
        if (newValue[i] === '@' || newValue[i] === '/') {
          // Trigger must be at start of input or preceded by whitespace
          if (i === 0 || /\s/.test(newValue[i - 1])) {
            foundTrigger = newValue[i] as '@' | '/';
            triggerPos = i;
          }
          break;
        }
        // Stop at whitespace — no trigger in this word
        if (/\s/.test(newValue[i])) break;
      }

      if (foundTrigger && triggerPos !== -1) {
        const filter = newValue.slice(triggerPos + 1, cursorPos);
        setTriggerFilter(filter);
        setTriggerPopup(foundTrigger);
        // Hide autocomplete when trigger popup is active
        setShowSuggestions(false);
      } else {
        setTriggerPopup(null);
        setTriggerFilter('');
        // Trigger autocomplete fetch (debounced)
        suggestDebouncer.maybeExecute(newValue);
      }
    },
    [setInput, suggestDebouncer],
  );

  const handleGroupSelect = useCallback(
    (group: SearchGroup) => {
      if (!isEnhancing && !isTypewriting) {
        setSelectedGroup(group.id);
        setIsMultiAgentModeEnabled?.(group.id === 'multi-agent');

        if (group.id === 'multi-agent') {
          return;
        }

        // Auto-switch to extreme-enabled model when extreme mode is selected
        if (group.id === 'extreme' && !supportsExtremeMode(selectedModel)) {
          const extremeModels = models.filter((model) => {
            if (!supportsExtremeMode(model.value)) return false;
            if (requiresAuthentication(model.value) && !user) return false;
            if (requiresProSubscription(model.value) && !isProUser) return false;
            return true;
          });

          if (extremeModels.length > 0) {
            const defaultModel = extremeModels.find((m) => m.value === 'scira-default');
            const firstFreeModel = extremeModels.find((m) => !m.pro);
            const targetModel = defaultModel || firstFreeModel || extremeModels[0];
            setSelectedModel(targetModel.value);
            sileo.info({
              title: `Switched to ${targetModel.label} for extreme mode`,
              description: 'Model automatically changed for extreme search',
              icon: <Zap className="h-4 w-4" />,
            });
          }
        }

        // Auto-switch to canvas-supported model when canvas mode is selected
        if (group.id === 'canvas' && !supportsCanvasMode(selectedModel)) {
          const canvasModels = models.filter((m) => supportsCanvasMode(m.value));
          const preferred = canvasModels.find((m) => m.value === 'scira-code') || canvasModels[0];
          if (preferred) {
            setSelectedModel(preferred.value);
            sileo.info({
              title: `Switched to ${preferred.label} for canvas mode`,
              description: 'Model automatically changed for canvas mode',
              icon: <Zap className="h-4 w-4" />,
            });
          }
        }

        inputRef.current?.focus();
      }
    },
    [setSelectedGroup, inputRef, isEnhancing, isTypewriting, selectedModel, setSelectedModel, user, isProUser],
  );

  // Handle trigger popup group selection: switch mode + strip the trigger text from input
  const handleTriggerSelect = useCallback(
    (group: SearchGroup) => {
      // Check pro requirement
      if ('requirePro' in group && group.requirePro && !isProUser) {
        setTriggerPopup(null);
        setTriggerFilter('');
        setShowUpgradeDialog(true);
        return;
      }

      handleGroupSelect(group);

      // Strip the trigger text (@ or /) from input
      const trigger = triggerPopup;
      const textarea = inputRef.current;
      if (textarea && trigger) {
        const val = textarea.value;
        const cursorPos = textarea.selectionStart ?? val.length;
        // Walk backwards from cursor to find the trigger character
        let tPos = -1;
        for (let i = cursorPos - 1; i >= 0; i--) {
          if (val[i] === trigger) {
            tPos = i;
            break;
          }
          if (val[i] === ' ' || val[i] === '\n') break;
        }
        if (tPos !== -1) {
          const before = val.slice(0, tPos);
          const after = val.slice(cursorPos);
          const newVal = (before + after).trimStart();
          setInput(newVal);
          requestAnimationFrame(() => {
            if (inputRef.current) {
              const newPos = Math.min(tPos, newVal.length);
              inputRef.current.setSelectionRange(newPos, newPos);
              inputRef.current.focus();
            }
          });
        }
      }

      setTriggerPopup(null);
      setTriggerFilter('');
    },
    [handleGroupSelect, inputRef, setInput, isProUser, triggerPopup],
  );

  // Handle temp/private toggle from / trigger popup
  const handleTriggerTempSelect = useCallback(() => {
    if (!isTemporaryChatLocked) {
      setIsTemporaryChatEnabled((prev: boolean) => !prev);
    }

    // Strip the trigger text (/) from input
    const trigger = triggerPopup;
    const textarea = inputRef.current;
    if (textarea && trigger) {
      const val = textarea.value;
      const cursorPos = textarea.selectionStart ?? val.length;
      let tPos = -1;
      for (let i = cursorPos - 1; i >= 0; i--) {
        if (val[i] === trigger) {
          tPos = i;
          break;
        }
        if (val[i] === ' ' || val[i] === '\n') break;
      }
      if (tPos !== -1) {
        const before = val.slice(0, tPos);
        const after = val.slice(cursorPos);
        const newVal = (before + after).trimStart();
        setInput(newVal);
        requestAnimationFrame(() => {
          if (inputRef.current) {
            const newPos = Math.min(tPos, newVal.length);
            inputRef.current.setSelectionRange(newPos, newPos);
            inputRef.current.focus();
          }
        });
      }
    }

    setTriggerPopup(null);
    setTriggerFilter('');
  }, [isTemporaryChatLocked, setIsTemporaryChatEnabled, triggerPopup, inputRef, setInput]);

  const handleTriggerMultiAgentSelect = useCallback(() => {
    if (!setIsMultiAgentModeEnabled) return;

    if (!isProUser) {
      setTriggerPopup(null);
      setTriggerFilter('');
      setShowUpgradeDialog(true);
      return;
    }

    const isTurningOff = selectedGroup === 'multi-agent' || isMultiAgentModeEnabled;
    setSelectedGroup(isTurningOff ? 'web' : 'multi-agent');
    setIsMultiAgentModeEnabled(!isTurningOff);

    const trigger = triggerPopup;
    const textarea = inputRef.current;
    if (textarea && trigger) {
      const val = textarea.value;
      const cursorPos = textarea.selectionStart ?? val.length;
      let tPos = -1;
      for (let i = cursorPos - 1; i >= 0; i--) {
        if (val[i] === trigger) {
          tPos = i;
          break;
        }
        if (val[i] === ' ' || val[i] === '\n') break;
      }
      if (tPos !== -1) {
        const before = val.slice(0, tPos);
        const after = val.slice(cursorPos);
        const newVal = (before + after).trimStart();
        setInput(newVal);
        requestAnimationFrame(() => {
          if (inputRef.current) {
            const newPos = Math.min(tPos, newVal.length);
            inputRef.current.setSelectionRange(newPos, newPos);
            inputRef.current.focus();
          }
        });
      }
    }

    setTriggerPopup(null);
    setTriggerFilter('');
  }, [setIsMultiAgentModeEnabled, isProUser, triggerPopup, inputRef, setInput, setShowUpgradeDialog, setSelectedGroup]);

  const handleConnectorToggle = useCallback(
    (provider: ConnectorProvider) => {
      if (!setSelectedConnectors) return;

      setSelectedConnectors((prev) => {
        if (prev.includes(provider)) {
          return prev.filter((p) => p !== provider);
        } else {
          return [...prev, provider];
        }
      });
    },
    [setSelectedConnectors],
  );

  // Plus menu group select with pro/auth/connector guards
  const handlePlusMenuGroupSelect = useCallback(
    async (group: SearchGroup) => {
      // Check if this is a Pro-only group and user is not Pro
      if ('requirePro' in group && group.requirePro && !isProUser) {
        haptics.trigger('warning');
        setPlusMenuOpen(false);
        setShowUpgradeDialog(true);
        return;
      }

      // Check if connectors group is selected but no connectors are connected
      if (group.id === 'connectors' && user && onOpenSettings && isProUser) {
        try {
          const result = await listUserConnectorsAction();
          if (result.success && result.connections.length === 0) {
            onOpenSettings('connectors');
            setPlusMenuOpen(false);
            return;
          }
        } catch (error) {
          console.error('Error checking connectors:', error);
        }
      }

      haptics.trigger('selection');
      handleGroupSelect(group);
      setPlusMenuOpen(false);
    },
    [isProUser, user, onOpenSettings, handleGroupSelect, haptics],
  );

  // Deep research (extreme) toggle from plus menu
  const handlePlusMenuExtreme = useCallback(() => {
    if (isExtreme) {
      haptics.trigger('selection');
      // Switch back to web mode
      const webGroup = dynamicSearchGroups.find((g) => g.id === 'web');
      if (webGroup) handleGroupSelect(webGroup);
    } else {
      if (!user) {
        haptics.trigger('warning');
        window.location.href = '/sign-in';
        setPlusMenuOpen(false);
        return;
      }
      if (!isProUser && extremeSearchCountExceeded) {
        haptics.trigger('warning');
        setPlusMenuOpen(false);
        setShowUpgradeDialog(true);
        return;
      }
      haptics.trigger('selection');
      const extremeGroup = dynamicSearchGroups.find((g) => g.id === 'extreme');
      if (extremeGroup) handleGroupSelect(extremeGroup);
    }
    setPlusMenuOpen(false);
  }, [isExtreme, dynamicSearchGroups, handleGroupSelect, user, isProUser, extremeSearchCountExceeded, haptics]);

  const uploadFile = useCallback(async (file: File): Promise<Attachment> => {
    try {
      console.log('Uploading file:', file.name, file.type, file.size);

      // Step 1: Get presigned URL from our API
      const presignResponse = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type,
          size: file.size,
        }),
      });

      if (!presignResponse.ok) {
        const errorText = await presignResponse.text();
        console.error('Failed to get presigned URL:', presignResponse.status, errorText);
        throw new Error(`Failed to get upload URL: ${presignResponse.status} ${errorText}`);
      }

      const { presignedUrl, url } = await presignResponse.json();

      // Step 2: Upload directly to R2 using presigned URL
      const uploadResponse = await fetch(presignedUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
        },
      });

      if (!uploadResponse.ok) {
        console.error('Direct upload failed:', uploadResponse.status);
        throw new Error(`Failed to upload file: ${uploadResponse.status}`);
      }

      console.log('Upload successful:', url);
      return {
        name: file.name,
        contentType: file.type,
        url,
        size: file.size,
      };
    } catch (error) {
      console.error('Error uploading file:', error);
      sileo.error({
        title: `Failed to upload ${file.name}`,
        description: error instanceof Error ? error.message : 'Unknown error',
        icon: <X className="h-4 w-4" />,
      });
      throw error;
    }
  }, []);

  const handleFileChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(event.target.files || []);
      if (files.length === 0) {
        console.log('No files selected in file input');
        return;
      }

      console.log(
        'Files selected:',
        files.map((f) => `${f.name} (${f.type})`),
      );

      const imageFiles: File[] = [];
      const pdfFiles: File[] = [];
      const documentFiles: File[] = []; // CSV, DOCX, XLSX for file_query_search
      const unsupportedFiles: File[] = [];
      const oversizedFiles: File[] = [];
      const blockedPdfFiles: File[] = [];

      // Supported document types for file_query_search tool
      const documentMimeTypes = [
        'text/csv',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
        'application/vnd.ms-excel', // .xls
      ];

      files.forEach((file) => {
        if (file.size > getMaxSizeForFile(file)) {
          oversizedFiles.push(file);
          return;
        }

        if (file.type.startsWith('image/')) {
          imageFiles.push(file);
        } else if (file.type === 'application/pdf') {
          if (!isProUser) {
            blockedPdfFiles.push(file);
          } else {
            pdfFiles.push(file);
          }
        } else if (documentMimeTypes.includes(file.type)) {
          documentFiles.push(file);
        } else {
          unsupportedFiles.push(file);
        }
      });

      if (unsupportedFiles.length > 0) {
        console.log(
          'Unsupported files:',
          unsupportedFiles.map((f) => `${f.name} (${f.type})`),
        );
        sileo.error({
          title: `Some files are not supported`,
          description: unsupportedFiles.map((f) => f.name).join(', '),
          icon: <FileText className="h-4 w-4" />,
        });
      }

      if (blockedPdfFiles.length > 0) {
        console.log(
          'Blocked PDF files for non-Pro user:',
          blockedPdfFiles.map((f) => f.name),
        );
        sileo.error({
          title: 'PDF uploads require Pro subscription',
          description: 'Upgrade to access PDF analysis',
          icon: <Lock className="h-4 w-4" />,
        });
      }

      if (imageFiles.length === 0 && pdfFiles.length === 0 && documentFiles.length === 0) {
        console.log('No supported files found');
        event.target.value = '';
        return;
      }

      // PDFs are always processed via file_query_search tool (works with any model)
      // No need to switch models - PDF content is extracted and searched via the tool
      let validFiles: File[] = [...imageFiles, ...documentFiles, ...pdfFiles];

      console.log(
        'Valid files for upload:',
        validFiles.map((f) => f.name),
      );

      const totalAttachments = attachments.length + validFiles.length;
      if (totalAttachments > MAX_FILES) {
        sileo.error({ title: `You can only attach up to ${MAX_FILES} files.` });
        event.target.value = '';
        return;
      }

      if (validFiles.length === 0) {
        console.error('No valid files to upload');
        event.target.value = '';
        return;
      }

      setUploadQueue(validFiles.map((file) => file.name));

      try {
        console.log('Starting upload of', validFiles.length, 'files');

        const uploadedAttachments: Attachment[] = [];
        for (const file of validFiles) {
          try {
            console.log(`Uploading file: ${file.name} (${file.type})`);
            const attachment = await uploadFile(file);
            uploadedAttachments.push(attachment);
            console.log(`Successfully uploaded: ${file.name}`);
          } catch (err) {
            console.error(`Failed to upload ${file.name}:`, err);
          }
        }

        console.log('Upload completed for', uploadedAttachments.length, 'files');

        if (uploadedAttachments.length > 0) {
          setAttachments((currentAttachments) => [...currentAttachments, ...uploadedAttachments]);

          sileo.success({
            title: `${uploadedAttachments.length} file${uploadedAttachments.length > 1 ? 's' : ''} uploaded successfully`,
            description: 'Your files are ready to use',
            icon: <Upload className="h-4 w-4" />,
          });
        } else {
          sileo.error({
            title: 'No files were successfully uploaded',
            description: 'Please check your files and try again',
            icon: <X className="h-4 w-4" />,
          });
        }
      } catch (error) {
        console.error('Error uploading files!', error);
        sileo.error({
          title: 'Failed to upload one or more files',
          description: 'Please try again',
          icon: <X className="h-4 w-4" />,
        });
      } finally {
        setUploadQueue([]);
        event.target.value = '';
      }
    },
    [attachments.length, setAttachments, selectedModel, setSelectedModel, isProUser, uploadFile],
  );

  const removeAttachment = useCallback(
    async (index: number) => {
      // Get the attachment to delete
      const attachmentToDelete = attachments[index];

      // Delete from R2 storage if it's an uploaded file (has mplx/ in the path)
      if (attachmentToDelete?.url && attachmentToDelete.url.includes('/scira/')) {
        try {
          await fetch('/api/upload', {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ url: attachmentToDelete.url }),
          });
        } catch (error) {
          console.error('Failed to delete file from storage:', error);
          // Continue with local removal even if API call fails
        }
      }

      // Remove from state
      setAttachments((prev) => prev.filter((_, i) => i !== index));
    },
    [attachments, setAttachments],
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (attachments.length >= MAX_FILES) return;

      if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
        const hasFile = Array.from(e.dataTransfer.items).some((item) => item.kind === 'file');
        if (hasFile) {
          setIsDragging(true);
        }
      }
    },
    [attachments.length],
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const getFirstVisionModel = useCallback(() => {
    return models.find((model) => model.vision)?.value || selectedModel;
  }, [selectedModel]);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const allFiles = Array.from(e.dataTransfer.files);
      console.log(
        'Raw files dropped:',
        allFiles.map((f) => `${f.name} (${f.type})`),
      );

      if (allFiles.length === 0) {
        sileo.error({ title: 'No files detected in drop' });
        return;
      }

      sileo.info({ title: `Detected ${allFiles.length} dropped files` });

      const imageFiles: File[] = [];
      const pdfFiles: File[] = [];
      const documentFiles: File[] = []; // CSV, DOCX, XLSX for file_query_search
      const unsupportedFiles: File[] = [];
      const oversizedFiles: File[] = [];
      const blockedPdfFiles: File[] = [];

      // Supported document types for file_query_search tool
      const documentMimeTypes = [
        'text/csv',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
        'application/vnd.ms-excel', // .xls
      ];

      allFiles.forEach((file) => {
        console.log(`Processing file: ${file.name} (${file.type})`);

        if (file.size > getMaxSizeForFile(file)) {
          oversizedFiles.push(file);
          return;
        }

        if (file.type.startsWith('image/')) {
          imageFiles.push(file);
        } else if (file.type === 'application/pdf') {
          if (!isProUser) {
            blockedPdfFiles.push(file);
          } else {
            pdfFiles.push(file);
          }
        } else if (documentMimeTypes.includes(file.type)) {
          documentFiles.push(file);
        } else {
          unsupportedFiles.push(file);
        }
      });

      console.log(
        `Images: ${imageFiles.length}, PDFs: ${pdfFiles.length}, Documents: ${documentFiles.length}, Unsupported: ${unsupportedFiles.length}, Oversized: ${oversizedFiles.length}`,
      );

      if (unsupportedFiles.length > 0) {
        console.log(
          'Unsupported files:',
          unsupportedFiles.map((f) => `${f.name} (${f.type})`),
        );
        sileo.error({ title: `Some files not supported: ${unsupportedFiles.map((f) => f.name).join(', ')}` });
      }

      if (oversizedFiles.length > 0) {
        console.log(
          'Oversized files:',
          oversizedFiles.map((f) => `${f.name} (${f.size} bytes)`),
        );
        sileo.error({ title: `Some files exceed the 5MB limit: ${oversizedFiles.map((f) => f.name).join(', ')}` });
      }

      if (blockedPdfFiles.length > 0) {
        console.log(
          'Blocked PDF files for non-Pro user:',
          blockedPdfFiles.map((f) => f.name),
        );
        sileo.error({
          title: 'PDF uploads require Pro subscription',
          description: 'Upgrade to access PDF analysis',
          icon: <Lock className="h-4 w-4" />,
        });
      }

      if (imageFiles.length === 0 && pdfFiles.length === 0 && documentFiles.length === 0) {
        sileo.error({
          title: 'Unsupported file type',
          description: 'Only image, PDF, and document files (CSV, DOCX, XLSX) are supported',
          icon: <FileText className="h-4 w-4" />,
        });
        return;
      }

      // PDFs are always processed via file_query_search tool (works with any model)
      // No need to switch models - PDF content is extracted and searched via the tool
      let validFiles: File[] = [...imageFiles, ...documentFiles, ...pdfFiles];

      console.log(
        'Files to upload:',
        validFiles.map((f) => `${f.name} (${f.type})`),
      );

      const totalAttachments = attachments.length + validFiles.length;
      if (totalAttachments > MAX_FILES) {
        sileo.error({ title: `You can only attach up to ${MAX_FILES} files.` });
        return;
      }

      if (validFiles.length === 0) {
        console.error('No valid files to upload after filtering');
        sileo.error({ title: 'No valid files to upload' });
        return;
      }

      // Only switch to vision model if there are images (not for document-only uploads)
      const currentModelData = models.find((m) => m.value === selectedModel);
      if (!currentModelData?.vision && imageFiles.length > 0) {
        const visionModel = getFirstVisionModel();
        console.log('Switching to vision model:', visionModel);
        setSelectedModel(visionModel);
      }

      setUploadQueue(validFiles.map((file) => file.name));
      sileo.info({ title: `Starting upload of ${validFiles.length} files...` });

      setTimeout(async () => {
        try {
          console.log('Beginning upload of', validFiles.length, 'files');

          const uploadedAttachments: Attachment[] = [];
          for (const file of validFiles) {
            try {
              console.log(`Uploading file: ${file.name} (${file.type})`);
              const attachment = await uploadFile(file);
              uploadedAttachments.push(attachment);
              console.log(`Successfully uploaded: ${file.name}`);
            } catch (err) {
              console.error(`Failed to upload ${file.name}:`, err);
            }
          }

          console.log('Upload completed for', uploadedAttachments.length, 'files');

          if (uploadedAttachments.length > 0) {
            setAttachments((currentAttachments) => [...currentAttachments, ...uploadedAttachments]);

            sileo.success({
              title: `${uploadedAttachments.length} file${uploadedAttachments.length > 1 ? 's' : ''} uploaded successfully`,
            });
          } else {
            sileo.error({ title: 'No files were successfully uploaded' });
          }
        } catch (error) {
          console.error('Error during file upload:', error);
          sileo.error({ title: 'Upload failed. Please check console for details.' });
        } finally {
          setUploadQueue([]);
        }
      }, 100);
    },
    [attachments.length, setAttachments, uploadFile, selectedModel, setSelectedModel, getFirstVisionModel, isProUser],
  );

  const handlePaste = useCallback(
    async (e: React.ClipboardEvent) => {
      const items = Array.from(e.clipboardData.items);
      const imageItems = items.filter((item) => item.type.startsWith('image/'));

      if (imageItems.length === 0) return;

      e.preventDefault();

      const totalAttachments = attachments.length + imageItems.length;
      if (totalAttachments > MAX_FILES) {
        sileo.error({ title: `You can only attach up to ${MAX_FILES} files.` });
        return;
      }

      const files = imageItems.map((item) => item.getAsFile()).filter(Boolean) as File[];
      const oversizedFiles = files.filter((file) => file.size > getMaxSizeForFile(file));

      if (oversizedFiles.length > 0) {
        console.log(
          'Oversized files:',
          oversizedFiles.map((f) => `${f.name} (${f.size} bytes)`),
        );
        sileo.error({
          title: 'Some files exceed the size limit',
          description: oversizedFiles.map((f) => f.name || 'unnamed').join(', '),
          icon: <AlertCircle className="h-4 w-4" />,
        });

        const validFiles = files.filter((file) => file.size <= getMaxSizeForFile(file));
        if (validFiles.length === 0) return;
      }

      const currentModel = models.find((m) => m.value === selectedModel);
      if (!currentModel?.vision) {
        const visionModel = getFirstVisionModel();
        setSelectedModel(visionModel);
      }

      const filesToUpload =
        oversizedFiles.length > 0 ? files.filter((file) => file.size <= getMaxSizeForFile(file)) : files;

      setUploadQueue(filesToUpload.map((file, i) => file.name || `Pasted Image ${i + 1}`));

      try {
        const uploadMap = await all(
          Object.fromEntries(filesToUpload.map((file, index) => [`file:${index}`, async () => uploadFile(file)])),
          getBetterAllOptions(),
        );
        const uploadedAttachments = filesToUpload.map((_, index) => uploadMap[`file:${index}`]);

        setAttachments((currentAttachments) => [...currentAttachments, ...uploadedAttachments]);

        sileo.success({ title: 'Image pasted successfully' });
      } catch (error) {
        console.error('Error uploading pasted files!', error);
        sileo.error({ title: 'Failed to upload pasted image. Please try again.' });
      } finally {
        setUploadQueue([]);
      }
    },
    [attachments.length, setAttachments, uploadFile, selectedModel, setSelectedModel, getFirstVisionModel],
  );

  useEffect(() => {
    if (status !== 'ready' && inputRef.current) {
      const focusTimeout = setTimeout(() => {
        if (isMounted.current && inputRef.current) {
          inputRef.current.focus({
            preventScroll: true,
          });
        }
      }, 300);

      return () => clearTimeout(focusTimeout);
    }
  }, [status, inputRef]);

  const updateChatUrl = useCallback(
    (chatIdToAdd: string) => {
      if (!user) {
        return;
      }
      const currentPath = window.location.pathname;
      if (currentPath === '/' || currentPath === '/new') {
        window.history.pushState({}, '', `/search/${chatIdToAdd}`);
      }
    },
    [user],
  );

  const executeSubmit = useCallback(() => {
    if (status !== 'ready') {
      haptics.trigger('warning');
      sileo.error({
        title: 'Please wait for the current response to complete',
        description: 'Wait for the current message to finish',
        icon: <AlertCircle className="h-4 w-4" />,
      });
      return;
    }

    if (isRecording) {
      haptics.trigger('warning');
      sileo.error({
        title: 'Please stop recording before submitting',
        description: 'Stop the voice recording first',
        icon: <AlertCircle className="h-4 w-4" />,
      });
      return;
    }

    const shouldBypassLimitsForThisModel = shouldBypassRateLimits(selectedModel, user);

    if (isMultiAgentModeEnabled && !isProUser) {
      haptics.trigger('warning');
      sileo.error({
        title: 'Multi-agent research requires Pro',
        description: 'Upgrade to Pro to use xAI multi-agent research',
        icon: <Lock className="h-4 w-4" />,
      });
      return;
    }

    if (isLimitBlocked && !shouldBypassLimitsForThisModel) {
      haptics.trigger('warning');
      sileo.error({
        title: 'Daily search limit reached',
        description: 'Upgrade to Pro for unlimited searches',
        icon: <Lock className="h-4 w-4" />,
      });
      return;
    }

    if (input.length > MAX_INPUT_CHARS) {
      haptics.trigger('error');
      sileo.error({
        title: `Input exceeds ${MAX_INPUT_CHARS} characters`,
        description: 'Please shorten your message',
        icon: <AlertCircle className="h-4 w-4" />,
      });
      return;
    }

    if (selectedGroup === 'mcp') {
      const mcpCache = formQueryClient.getQueryData<{
        servers: Array<{ isEnabled: boolean; authType: string; isOAuthConnected: boolean }>;
      }>(['mcpServers', user?.id]);
      const hasEnabledApp = mcpCache?.servers?.some((s) => {
        const ready = s.authType !== 'oauth' || s.isOAuthConnected;
        return s.isEnabled && ready;
      });
      if (!hasEnabledApp) {
        haptics.trigger('warning');
        sileo.error({
          title: 'No apps enabled',
          description: 'Enable at least one app to use this mode',
          icon: <AlertCircle className="h-4 w-4" />,
        });
        return;
      }
    }

    if (input.trim() || attachments.length > 0) {
      haptics.trigger('medium');
      track('model_selected', {
        model: selectedModel,
      });

      onBeforeSubmit?.();
      setHasSubmitted(true);
      lastSubmittedQueryRef.current = input.trim();

      // Keep URL in sync as soon as submit starts for authenticated users.
      if (!isTemporaryChatEnabled) {
        updateChatUrl(chatId);
      }

      // Send the message
      sendMessage({
        role: 'user',
        parts: [
          ...attachments.map((attachment) => ({
            type: 'file' as const,
            url: attachment.url,
            name: attachment.name,
            mediaType: attachment.contentType || attachment.mediaType || '',
          })),
          {
            type: 'text',
            text: input,
          },
        ],
      });

      setInput('');
      // Immediately reset textarea height to avoid jank from debounced resize
      if (inputRef.current) {
        inputRef.current.style.height = 'auto';
        inputRef.current.style.overflowY = 'hidden';
      }
      setAttachments([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      resetSuggestedQuestions();

      // Clear autocomplete suggestions on submit
      setSuggestions([]);
      setShowSuggestions(false);
      setSuggestionIndex(-1);
      suggestAbortRef.current?.abort();

      // Handle iOS keyboard behavior differently
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      if (isIOS) {
        inputRef.current?.blur();
      } else {
        inputRef.current?.focus();
      }
    } else {
      haptics.trigger('error');
      sileo.error({ title: 'Please enter a search query or attach an image.' });
    }
  }, [
    haptics,
    status,
    isRecording,
    selectedModel,
    user,
    isLimitBlocked,
    input,
    attachments,
    sendMessage,
    updateChatUrl,
    chatId,
    isTemporaryChatEnabled,
    setInput,
    setAttachments,
    fileInputRef,
    resetSuggestedQuestions,
    inputRef,
    setHasSubmitted,
    lastSubmittedQueryRef,
  ]);

  const submitForm = useCallback(() => executeSubmit(), [executeSubmit]);

  const triggerFileInput = useCallback(() => {
    if (attachments.length >= MAX_FILES) {
      sileo.error({ title: `You can only attach up to ${MAX_FILES} images.` });
      return;
    }

    if (status === 'ready') {
      postSubmitFileInputRef.current?.click();
    } else {
      fileInputRef.current?.click();
    }
  }, [attachments.length, status, fileInputRef]);

  // ⌘U shortcut to upload files
  useEffect(() => {
    const handleFileShortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'u') {
        event.preventDefault();
        triggerFileInput();
      }
    };
    document.addEventListener('keydown', handleFileShortcut);
    return () => document.removeEventListener('keydown', handleFileShortcut);
  }, [triggerFileInput]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // When autocomplete suggestions are showing, intercept navigation keys
      if (showSuggestions && suggestions.length > 0) {
        if (event.key === 'ArrowDown') {
          event.preventDefault();
          setSuggestionIndex((prev) => (prev + 1) % suggestions.length);
          return;
        }
        if (event.key === 'ArrowUp') {
          event.preventDefault();
          setSuggestionIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length);
          return;
        }
        if (event.key === 'Enter' && !isCompositionActive.current && suggestionIndex >= 0) {
          event.preventDefault();
          setInput(suggestions[suggestionIndex]);
          setSuggestions([]);
          setShowSuggestions(false);
          setSuggestionIndex(-1);
          return;
        }
        if (event.key === 'Tab' && suggestionIndex >= 0) {
          event.preventDefault();
          setInput(suggestions[suggestionIndex]);
          setSuggestions([]);
          setShowSuggestions(false);
          setSuggestionIndex(-1);
          return;
        }
        if (event.key === 'Escape') {
          event.preventDefault();
          setShowSuggestions(false);
          setSuggestionIndex(-1);
          return;
        }
      }

      // When trigger popup is open, intercept navigation keys
      if (triggerPopup && triggerTotalItems > 0) {
        if (event.key === 'ArrowDown') {
          event.preventDefault();
          setTriggerHighlightIndex((prev) => (prev + 1) % triggerTotalItems);
          return;
        }
        if (event.key === 'ArrowUp') {
          event.preventDefault();
          setTriggerHighlightIndex((prev) => (prev - 1 + triggerTotalItems) % triggerTotalItems);
          return;
        }
        if (event.key === 'Enter' && !isCompositionActive.current) {
          event.preventDefault();
          if (triggerHighlightIndex < filteredTriggerGroups.length) {
            handleTriggerSelect(filteredTriggerGroups[triggerHighlightIndex]);
          } else if (showMultiAgentInTrigger && triggerHighlightIndex === filteredTriggerGroups.length) {
            handleTriggerMultiAgentSelect();
          } else if (
            showTempInTrigger &&
            triggerHighlightIndex === filteredTriggerGroups.length + (showMultiAgentInTrigger ? 1 : 0)
          ) {
            handleTriggerTempSelect();
          }
          return;
        }
        if (event.key === 'Tab') {
          event.preventDefault();
          if (triggerHighlightIndex < filteredTriggerGroups.length) {
            handleTriggerSelect(filteredTriggerGroups[triggerHighlightIndex]);
          } else if (showMultiAgentInTrigger && triggerHighlightIndex === filteredTriggerGroups.length) {
            handleTriggerMultiAgentSelect();
          } else if (
            showTempInTrigger &&
            triggerHighlightIndex === filteredTriggerGroups.length + (showMultiAgentInTrigger ? 1 : 0)
          ) {
            handleTriggerTempSelect();
          }
          return;
        }
        if (event.key === 'Escape') {
          event.preventDefault();
          setTriggerPopup(null);
          setTriggerFilter('');
          return;
        }
      }

      if (event.key === 'Enter' && !isCompositionActive.current) {
        if (isMobile) {
          // On mobile, allow Enter to create new lines only
          // Don't submit the form - users should use the send button
          // Just let the default behavior happen (newline insertion)
          return;
        } else {
          // Desktop behavior: Enter submits, Shift+Enter creates newline
          if (event.shiftKey) {
            event.stopPropagation();
            return;
          }
          event.preventDefault();
          event.stopPropagation();
          // Route Enter through submitForm so keyboard + button follow
          // the same debounced submit path.
          submitForm();
        }
      }
    },
    [
      submitForm,
      isMobile,
      triggerPopup,
      filteredTriggerGroups,
      triggerHighlightIndex,
      triggerTotalItems,
      showTempInTrigger,
      showMultiAgentInTrigger,
      handleTriggerSelect,
      handleTriggerTempSelect,
      handleTriggerMultiAgentSelect,
      showSuggestions,
      suggestions,
      suggestionIndex,
      setInput,
    ],
  );

  const resizeTextarea = useCallback(() => {
    if (!inputRef.current) return;

    const target = inputRef.current;
    const maxHeight = 300;

    // Save scroll positions so the "height = auto" collapse doesn't cause a
    // visible page jump while the browser recalculates layout.
    const prevWindowScroll = window.scrollY;
    const prevTextareaScroll = target.scrollTop;

    target.style.height = 'auto';

    const scrollHeight = target.scrollHeight;

    if (scrollHeight > maxHeight) {
      target.style.height = `${maxHeight}px`;
      target.style.overflowY = 'auto';
    } else {
      target.style.height = `${scrollHeight}px`;
      target.style.overflowY = 'hidden';
    }

    // Restore positions that may have shifted during the collapse.
    window.scrollTo({ top: prevWindowScroll });
    target.scrollTop = prevTextareaScroll;

    // Keep the cursor visible when typing at the end of a long prompt.
    if (target.selectionStart === target.value.length) {
      target.scrollTop = target.scrollHeight;
    }
  }, [inputRef]);

  // Resize textarea when input value changes using rAF for immediate visual response
  const resizeRafRef = useRef<number>(0);
  useEffect(() => {
    cancelAnimationFrame(resizeRafRef.current);
    resizeRafRef.current = requestAnimationFrame(resizeTextarea);
    return () => cancelAnimationFrame(resizeRafRef.current);
  }, [input, resizeTextarea]);

  // Handle cursor positioning: move to end if cursor is at start when textarea has value
  // This handles both initial mount (from localStorage) and external value changes (example selection)
  const handleTextareaFocus = useCallback(
    (e: React.FocusEvent<HTMLTextAreaElement>) => {
      const textarea = e.target;
      if (textarea.value.length > 0 && textarea.selectionStart === 0 && textarea.selectionEnd === 0) {
        // Cursor is at start, move it to end
        const length = textarea.value.length;
        textarea.setSelectionRange(length, length);
      }
      // Re-show suggestions on focus if we have them
      if (suggestions.length > 0 && !hasInteracted) {
        setShowSuggestions(true);
      }
    },
    [suggestions.length, hasInteracted],
  );

  const handleTextareaBlur = useCallback(() => {
    // Delay hiding to allow click-through on suggestion items (onMouseDown fires before blur)
    setTimeout(() => {
      setShowSuggestions(false);
    }, 150);
  }, []);

  return (
    <div className={cn('flex flex-col w-full max-w-2xl mx-auto')}>
      <TooltipProvider>
        <div
          data-no-haptics
          className={cn(
            'relative w-full flex flex-col gap-1 rounded-xl transition-all duration-300 font-sans!',
            hasInteracted ? 'z-50' : 'z-10',
            isDragging && 'ring-1 ring-border',
            attachments.length > 0 || uploadQueue.length > 0
              ? 'bg-primary/5 border border-ring/20 backdrop-blur-md! p-1 shadow-none!'
              : 'bg-transparent',
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <AnimatePresence>
            {isDragging && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 backdrop-blur-md bg-background/90 rounded-lg border border-dashed border-border/60 flex items-center justify-center z-50 m-2 shadow-xl shadow-black/10 dark:shadow-black/25"
              >
                <div className="flex items-center gap-4 px-6 py-8">
                  <div className="p-3 rounded-full bg-muted shadow-none!">
                    <Upload className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <div className="space-y-1 text-center">
                    <p className="text-sm font-medium text-foreground">Drop images or PDFs here</p>
                    <p className="text-xs text-muted-foreground">Max {MAX_FILES} files (5MB per file)</p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <input
            type="file"
            className="hidden"
            ref={fileInputRef}
            multiple
            onChange={handleFileChange}
            accept={getAcceptedFileTypes(
              selectedModel,
              user?.isProUser ||
                (subscriptionData?.hasSubscription && subscriptionData?.subscription?.status === 'active'),
            )}
            tabIndex={-1}
          />
          <input
            type="file"
            className="hidden"
            ref={postSubmitFileInputRef}
            multiple
            onChange={handleFileChange}
            accept={getAcceptedFileTypes(
              selectedModel,
              user?.isProUser ||
                (subscriptionData?.hasSubscription && subscriptionData?.subscription?.status === 'active'),
            )}
            tabIndex={-1}
          />

          {(attachments.length > 0 || uploadQueue.length > 0) && (
            <div className="flex flex-row gap-2 overflow-x-auto py-2 max-h-28 z-10 px-1 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
              {attachments.map((attachment, index) => (
                <AttachmentPreview
                  key={attachment.url}
                  attachment={attachment}
                  onRemove={() => removeAttachment(index)}
                  isUploading={false}
                />
              ))}
              {uploadQueue.map((filename) => (
                <AttachmentPreview
                  key={filename}
                  attachment={
                    {
                      url: '',
                      name: filename,
                      contentType: '',
                      size: 0,
                    } as Attachment
                  }
                  onRemove={() => {}}
                  isUploading={true}
                />
              ))}
            </div>
          )}

          {/* Form container */}
          <div className="relative" data-form-container>
            {triggerPopup && triggerTotalItems > 0 && (
              <div
                className="absolute left-0 w-[280px] rounded-xl border border-border/60 bg-popover/95 backdrop-blur-xl shadow-none overflow-hidden z-100"
                style={{
                  ...(typeof window !== 'undefined' &&
                    (() => {
                      const el = document.querySelector('[data-form-container]');
                      if (!el) return { bottom: '100%', marginBottom: 8 };
                      const rect = el.getBoundingClientRect();
                      return rect.top > window.innerHeight / 2
                        ? { bottom: '100%', marginBottom: 8 }
                        : { top: '100%', marginTop: 8 };
                    })()),
                }}
              >
                <div className="px-3 pt-2.5 pb-1">
                  <p className="text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-widest">
                    {triggerPopup === '/' ? 'Modes' : 'Sources'}
                  </p>
                </div>
                <div ref={triggerPopupScrollRef} className="px-1 pb-1 max-h-[260px] overflow-y-auto scrollbar-thin">
                  {filteredTriggerGroups.map((group, index) => {
                    const isHighlighted = index === triggerHighlightIndex;
                    const isCurrentGroup =
                      group.id === 'multi-agent'
                        ? isMultiAgentModeEnabled || selectedGroup === 'multi-agent'
                        : selectedGroup === group.id;
                    const isProOnly = 'requirePro' in group && group.requirePro && !isProUser;

                    return (
                      <button
                        key={group.id}
                        data-at-index={index}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          handleTriggerSelect(group);
                        }}
                        onMouseEnter={() => setTriggerHighlightIndex(index)}
                        className={cn(
                          'flex items-center gap-2.5 w-full px-2 py-1.5 rounded-lg text-left transition-colors duration-100',
                          isHighlighted ? 'bg-accent/80' : 'bg-transparent',
                        )}
                      >
                        <div
                          className={cn(
                            'flex items-center justify-center size-7 rounded-md shrink-0',
                            isCurrentGroup ? 'bg-primary/10 text-primary' : 'bg-muted/80 text-muted-foreground',
                          )}
                        >
                          <FlexibleIcon icon={group.icon} size={16} color="currentColor" strokeWidth={1.8} />
                        </div>
                        <span className="flex-1 text-[13px] font-medium text-foreground truncate">{group.name}</span>
                        {isCurrentGroup && (
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="text-[10px] font-medium text-primary/70">Active</span>
                            <CheckIcon className="size-3 text-primary" />
                          </div>
                        )}
                        {isProOnly && !isCurrentGroup && (
                          <span className="shrink-0 text-[9px] font-semibold uppercase tracking-wide text-primary/70 bg-primary/8 px-1.5 py-0.5 rounded">
                            Pro
                          </span>
                        )}
                      </button>
                    );
                  })}
                  {(showTempInTrigger || showMultiAgentInTrigger) && (
                    <>
                      {showMultiAgentInTrigger && (
                        <button
                          data-at-index={filteredTriggerGroups.length}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            handleTriggerMultiAgentSelect();
                          }}
                          onMouseEnter={() => setTriggerHighlightIndex(filteredTriggerGroups.length)}
                          className={cn(
                            'flex items-center gap-2.5 w-full px-2 py-1.5 rounded-lg text-left transition-colors duration-100',
                            triggerHighlightIndex === filteredTriggerGroups.length ? 'bg-accent/80' : 'bg-transparent',
                          )}
                        >
                          <div
                            className={cn(
                              'flex items-center justify-center size-7 rounded-md shrink-0',
                              isMultiAgentModeEnabled
                                ? 'bg-primary/10 text-primary'
                                : 'bg-muted/80 text-muted-foreground',
                            )}
                          >
                            <AgentNetworkIcon width={16} height={16} />
                          </div>
                          <span className="flex-1 text-[13px] font-medium text-foreground truncate">
                            Multi-agent mode
                          </span>
                          {isMultiAgentModeEnabled ? (
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className="text-[10px] font-medium text-primary/70">Active</span>
                              <CheckIcon className="size-3 text-primary" />
                            </div>
                          ) : !isProUser ? (
                            <span className="shrink-0 text-[9px] font-semibold uppercase tracking-wide text-primary/70 bg-primary/8 px-1.5 py-0.5 rounded">
                              Pro
                            </span>
                          ) : null}
                        </button>
                      )}
                      {showTempInTrigger && (
                        <>
                          {(showMultiAgentInTrigger || filteredTriggerGroups.length > 0) && (
                            <div className="my-1 mx-2 border-t border-border/30" />
                          )}
                          <button
                            data-at-index={filteredTriggerGroups.length + (showMultiAgentInTrigger ? 1 : 0)}
                            onMouseDown={(e) => {
                              e.preventDefault();
                              handleTriggerTempSelect();
                            }}
                            onMouseEnter={() =>
                              setTriggerHighlightIndex(filteredTriggerGroups.length + (showMultiAgentInTrigger ? 1 : 0))
                            }
                            className={cn(
                              'flex items-center gap-2.5 w-full px-2 py-1.5 rounded-lg text-left transition-colors duration-100',
                              triggerHighlightIndex === filteredTriggerGroups.length + (showMultiAgentInTrigger ? 1 : 0)
                                ? 'bg-accent/80'
                                : 'bg-transparent',
                            )}
                            disabled={isTemporaryChatLocked}
                          >
                            <div
                              className={cn(
                                'flex items-center justify-center size-7 rounded-md shrink-0',
                                isTemporaryChat ? 'bg-primary/10 text-primary' : 'bg-muted/80 text-muted-foreground',
                              )}
                            >
                              <Ghost size={16} strokeWidth={1.8} />
                            </div>
                            <span className="flex-1 text-[13px] font-medium text-foreground truncate">
                              {isTemporaryChat ? 'Temporary' : 'Private'}
                            </span>
                            {isTemporaryChat && (
                              <div className="flex items-center gap-1.5 shrink-0">
                                <span className="text-[10px] font-medium text-primary/70">Active</span>
                                <CheckIcon className="size-3 text-primary" />
                              </div>
                            )}
                          </button>
                        </>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Shadow-like background blur effect */}
            <div className="absolute -inset-1 rounded-2xl bg-primary/3 dark:bg-primary/3 blur-sm! pointer-events-none z-9999 shadow" />
            <div
              className={cn(
                'relative rounded-xl bg-muted! border border-ring/10 focus-within:border-ring/5 transition-colors duration-200',
                (isEnhancing || isTypewriting) && 'bg-muted!',
                showSuggestions &&
                  suggestions.length > 0 &&
                  !hasInteracted &&
                  !triggerPopup &&
                  attachments.length === 0 &&
                  uploadQueue.length === 0 &&
                  'rounded-b-none border-b-transparent',
              )}
            >
              {isRecording ? (
                <Textarea
                  ref={inputRef}
                  placeholder=""
                  value="◉ Recording..."
                  disabled={true}
                  className={cn(
                    'w-full rounded-xl rounded-b-none md:text-base!',
                    'text-base leading-relaxed',
                    'bg-muted!',
                    'border-0!',
                    'text-muted-foreground!',
                    'focus:ring-0! focus-visible:ring-0!',
                    'min-h-0!',
                    'px-4! py-3.5!',
                    'touch-manipulation',
                    'whatsize!',
                    'text-center',
                    'cursor-not-allowed',
                    'shadow-none!',
                  )}
                  style={{
                    WebkitUserSelect: 'text',
                    WebkitTouchCallout: 'none',
                    minHeight: undefined,
                    resize: 'none',
                  }}
                  rows={1}
                />
              ) : (
                <Textarea
                  ref={inputRef}
                  placeholder={
                    isEnhancing
                      ? '✨ Enhancing your prompt...'
                      : isTypewriting
                        ? '✨ Writing enhanced prompt...'
                        : hasInteracted
                          ? 'Ask a follow-up...'
                          : '' // rotating overlay handles the empty home state
                  }
                  value={input}
                  onChange={handleInput}
                  onFocus={handleTextareaFocus}
                  onBlur={handleTextareaBlur}
                  disabled={isEnhancing || isTypewriting}
                  onInput={resizeTextarea}
                  className={cn(
                    'w-full rounded-xl rounded-b-none text-[16px]!',
                    'leading-normal',
                    'border-0!',
                    'text-foreground!',
                    'focus:ring-0! focus-visible:ring-0!',
                    'min-h-0!',
                    'px-4! py-3.5!',
                    'touch-manipulation',
                    'whatsize!',
                    'shadow-none!',
                    'transition-colors duration-200',
                    // transparent when overlay is active so TextRotate shows through
                    !input && !hasInteracted && !isEnhancing && !isTypewriting && !isRecording
                      ? 'bg-transparent!'
                      : 'bg-muted!',
                    (isEnhancing || isTypewriting) && 'text-muted-foreground cursor-wait',
                  )}
                  style={{
                    WebkitUserSelect: 'text',
                    WebkitTouchCallout: 'none',
                    minHeight: undefined,
                    resize: 'none',
                  }}
                  rows={1}
                  autoFocus={!isEnhancing && !isTypewriting}
                  onCompositionStart={() => (isCompositionActive.current = true)}
                  onCompositionEnd={() => (isCompositionActive.current = false)}
                  onKeyDown={isEnhancing || isTypewriting ? undefined : handleKeyDown}
                  onPaste={isEnhancing || isTypewriting ? undefined : handlePaste}
                />
              )}

              {/* Rotating placeholder overlay — after textarea in DOM so it stacks on top */}
              {!isRecording && !input && !isEnhancing && !isTypewriting && !hasInteracted && (
                <div className="absolute top-0 left-0 right-0 pointer-events-none z-10 px-4 py-[14px]">
                  <TextRotate
                    texts={['Ask anything...', 'Type @ for sources or / for modes']}
                    rotationInterval={3000}
                    splitBy="words"
                    staggerDuration={0.04}
                    staggerFrom="first"
                    transition={{ type: 'spring', damping: 30, stiffness: 400 }}
                    mainClassName="text-[16px] leading-normal text-muted-foreground/90 font-sans"
                  />
                </div>
              )}

              <div
                className={cn(
                  'flex justify-between items-center rounded-t-none rounded-b-xl',
                  'bg-muted!',
                  'border-0!',
                  'px-2.5 py-2 gap-2 shadow-none',
                  'transition-all duration-200',
                  (isEnhancing || isTypewriting) && 'pointer-events-none',
                  isRecording && 'bg-muted! text-muted-foreground!',
                )}
              >
                {/* Left: Plus menu button + connector selector */}
                <div className="flex items-center gap-1.5">
                  {isMobile ? (
                    <Drawer open={plusMenuOpen} onOpenChange={handlePlusMenuOpenChange}>
                      <DrawerTrigger asChild>
                        <button
                          className={cn(
                            'flex items-center justify-center size-8 rounded-full',
                            'border border-foreground/25 text-foreground/70 bg-foreground/12',
                            'hover:bg-foreground/18 hover:text-foreground hover:border-foreground/35 transition-colors',
                            plusMenuOpen && 'bg-foreground/18 text-foreground border-foreground/35',
                          )}
                          aria-label="More options"
                        >
                          <Plus className="size-[18px]" strokeWidth={2} />
                        </button>
                      </DrawerTrigger>
                      <DrawerContent className="max-h-[70vh]">
                        <DrawerHeader className="text-left pb-1">
                          <DrawerTitle className="text-sm">Options</DrawerTitle>
                        </DrawerHeader>
                        <div className="px-1 pb-4 max-h-[calc(70vh-80px)] overflow-y-auto">
                          <button
                            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left hover:bg-accent transition-colors"
                            onClick={() => {
                              haptics.trigger('selection');
                              setPlusMenuOpen(false);
                              triggerFileInput();
                            }}
                          >
                            <HugeiconsIcon
                              icon={DocumentAttachmentIcon}
                              size={16}
                              color="currentColor"
                              strokeWidth={1.5}
                            />
                            <span className="flex-1 text-[13px]">Upload files or images</span>
                          </button>

                          {user && setIsMultiAgentModeEnabled && (
                            <button
                              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left hover:bg-accent transition-colors"
                              onClick={() => {
                                haptics.trigger('selection');
                                if (!isProUser) {
                                  setShowUpgradeDialog(true);
                                  return;
                                }
                                const isTurningOff = selectedGroup === 'multi-agent' || isMultiAgentModeEnabled;
                                setSelectedGroup(isTurningOff ? 'web' : 'multi-agent');
                                setIsMultiAgentModeEnabled(!isTurningOff);
                              }}
                            >
                              <AgentNetworkIcon width={16} height={16} />
                              <span className="flex-1 text-[13px]">Multi-agent mode</span>
                              {isMultiAgentModeEnabled ? (
                                <span className="text-[9px] px-1 py-0.5 rounded bg-primary/10 text-primary font-medium">
                                  Active
                                </span>
                              ) : !isProUser ? (
                                <span className="text-[9px] px-1 py-0.5 rounded bg-primary/10 text-primary font-medium">
                                  Pro
                                </span>
                              ) : null}
                            </button>
                          )}
                          {user && mcpEnabled && (
                            <button
                              className={cn(
                                'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left hover:bg-accent transition-colors',
                                selectedGroup === 'mcp' && 'bg-accent',
                              )}
                              onClick={async () => {
                                const g = dynamicSearchGroups.find((g) => g.id === 'mcp');
                                if (g) await handlePlusMenuGroupSelect(g);
                              }}
                            >
                              <AppsIcon width={16} height={16} />
                              <span className="flex-1 text-[13px]">Apps</span>
                              {selectedGroup === 'mcp' && (
                                <span className="text-[9px] px-1 py-0.5 rounded bg-primary/10 text-primary font-medium">
                                  Active
                                </span>
                              )}
                              {!isProUser && (
                                <span className="text-[9px] px-1 py-0.5 rounded bg-primary/10 text-primary font-medium">
                                  Pro
                                </span>
                              )}
                            </button>
                          )}
                          <button
                            className={cn(
                              'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left hover:bg-accent transition-colors',
                              isExtreme && 'bg-accent',
                            )}
                            onClick={handlePlusMenuExtreme}
                          >
                            <HugeiconsIcon icon={AtomicPowerIcon} size={16} color="currentColor" strokeWidth={1.5} />
                            <span className="flex-1 text-[13px]">Extreme agent</span>
                            {isExtreme && (
                              <span className="text-[9px] px-1 py-0.5 rounded bg-primary/10 text-primary font-medium">
                                Active
                              </span>
                            )}
                          </button>
                          {/* {(input.length > 0 || isEnhancing || isTypewriting) && (
                            <button className={cn('w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left hover:bg-accent transition-colors', isEnhancementActive && 'bg-accent')} onClick={() => { if (!isEnhancing && !isTypewriting) handleEnhance(); setPlusMenuOpen(false); }} disabled={isEnhancing || isTypewriting || uploadQueue.length > 0 || status !== 'ready' || isLimitBlocked}>
                              {isEnhancementActive ? <GripIcon ref={gripIconRef} size={16} className="text-primary" /> : <Wand2 className="size-4 text-muted-foreground" />}
                              <span className="flex-1 text-[13px]">{isEnhancing ? 'Enhancing…' : isTypewriting ? 'Writing…' : 'Enhance prompt'}</span>
                            </button>
                          )} */}
                          {user && !hasInteracted && (
                            <button
                              className={cn(
                                'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left hover:bg-accent transition-colors',
                                isTemporaryChat && 'bg-accent',
                              )}
                              onClick={() => {
                                if (!isTemporaryChatLocked) {
                                  setIsTemporaryChatEnabled((prev: boolean) => !prev);
                                }
                                setPlusMenuOpen(false);
                              }}
                              disabled={isTemporaryChatLocked}
                            >
                              <Ghost
                                size={16}
                                className={cn('shrink-0', isTemporaryChat ? 'text-primary' : 'text-muted-foreground')}
                                strokeWidth={1.5}
                              />
                              <span className="flex-1 text-[13px]">{isTemporaryChat ? 'Temporary' : 'Private'}</span>
                              {isTemporaryChat && (
                                <span className="text-[9px] px-1 py-0.5 rounded bg-primary/10 text-primary font-medium">
                                  Active
                                </span>
                              )}
                              <span className="text-[9px] text-muted-foreground ml-auto hidden sm:block">⌘⇧J</span>
                            </button>
                          )}
                          <div className="my-1 mx-2 border-t border-border/40" />
                          <div className="px-3 pt-1.5 pb-0.5">
                            <span className="text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-widest">
                              Search Modes
                            </span>
                          </div>
                          {plusMenuGroups.map((group, i) => {
                            const sel = selectedGroup === group.id && !isExtreme;
                            return (
                              <button
                                key={group.id}
                                className={cn(
                                  'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left hover:bg-accent transition-colors',
                                  sel && 'bg-accent',
                                )}
                                onClick={() => handlePlusMenuGroupSelect(group)}
                              >
                                <FlexibleIcon icon={group.icon} size={16} color="currentColor" strokeWidth={1.5} />
                                <span className="flex-1 text-[13px]">{group.name}</span>
                                {'requirePro' in group && group.requirePro && !isProUser && (
                                  <span className="text-[9px] px-1 py-0.5 rounded bg-primary/10 text-primary font-medium">
                                    Pro
                                  </span>
                                )}
                                {sel && <Check className="size-3.5 text-primary" />}
                              </button>
                            );
                          })}
                        </div>
                      </DrawerContent>
                    </Drawer>
                  ) : (
                    <Popover open={plusMenuOpen} onOpenChange={handlePlusMenuOpenChange}>
                      <Tooltip delayDuration={300}>
                        <TooltipTrigger asChild>
                          <PopoverTrigger asChild>
                            <button
                              className={cn(
                                'flex items-center justify-center size-8 rounded-full',
                                'border border-foreground/25 text-foreground/70 bg-foreground/12',
                                'hover:bg-foreground/18 hover:text-foreground hover:border-foreground/35 transition-colors',
                                plusMenuOpen && 'bg-foreground/18 text-foreground border-foreground/35',
                              )}
                              aria-label="More options"
                            >
                              <Plus className="size-[18px]" strokeWidth={2} />
                            </button>
                          </PopoverTrigger>
                        </TooltipTrigger>
                        {!plusMenuOpen && (
                          <TooltipContent
                            side="bottom"
                            sideOffset={6}
                            className="border-0 backdrop-blur-xs py-2 px-3 shadow-none!"
                          >
                            <span className="font-medium text-[11px]">Modes, uploads & more</span>
                          </TooltipContent>
                        )}
                      </Tooltip>
                      <PopoverContent
                        className="w-64 p-1 font-sans rounded-lg bg-popover border shadow-lg"
                        align="start"
                        side="bottom"
                        sideOffset={4}
                      >
                        <Tooltip delayDuration={200}>
                          <TooltipTrigger asChild>
                            <button
                              className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-left hover:bg-accent transition-colors"
                              onClick={() => {
                                haptics.trigger('selection');
                                setPlusMenuOpen(false);
                                triggerFileInput();
                              }}
                            >
                              <HugeiconsIcon
                                icon={DocumentAttachmentIcon}
                                size={16}
                                color="currentColor"
                                strokeWidth={1.5}
                              />
                              <span className="flex-1 text-[13px]">Upload files or images</span>
                              <Kbd className="text-[9px] h-4 min-w-4 px-1">⌘U</Kbd>
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="right" sideOffset={8} className="max-w-48 py-1.5 px-2.5">
                            <span className="text-[10px] leading-snug">
                              {hasVisionSupport(selectedModel)
                                ? hasPdfSupport(selectedModel)
                                  ? 'Images, PDFs, CSV, Excel, Word'
                                  : 'Images, CSV, Excel, Word'
                                : 'CSV, Excel, Word documents'}
                            </span>
                          </TooltipContent>
                        </Tooltip>

                        {user && setIsMultiAgentModeEnabled && (
                          <Tooltip delayDuration={200}>
                            <TooltipTrigger asChild>
                              <button
                                className={cn(
                                  'w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-left hover:bg-accent transition-colors',
                                  isMultiAgentModeEnabled && 'bg-accent',
                                )}
                                onClick={() => {
                                  haptics.trigger('selection');
                                  if (!isProUser) {
                                    setShowUpgradeDialog(true);
                                    return;
                                  }
                                  const isTurningOff = selectedGroup === 'multi-agent' || isMultiAgentModeEnabled;
                                  setSelectedGroup(isTurningOff ? 'web' : 'multi-agent');
                                  setIsMultiAgentModeEnabled(!isTurningOff);
                                }}
                              >
                                <AgentNetworkIcon width={16} height={16} />
                                <span className="flex-1 text-[13px]">Multi-agent mode</span>
                                {isMultiAgentModeEnabled ? (
                                  <span className="text-[9px] px-1 py-0.5 rounded bg-primary/10 text-primary font-medium">
                                    Active
                                  </span>
                                ) : !isProUser ? (
                                  <span className="text-[9px] px-1 py-0.5 rounded bg-primary/10 text-primary font-medium">
                                    Pro
                                  </span>
                                ) : null}
                              </button>
                            </TooltipTrigger>
                            <TooltipContent side="right" sideOffset={8} className="max-w-48 py-1.5 px-2.5">
                              <span className="text-[10px] leading-snug">
                                Use xAI multi-agent mode with web and X tool calls plus sources
                              </span>
                            </TooltipContent>
                          </Tooltip>
                        )}
                        {user && mcpEnabled && (
                          <Tooltip delayDuration={200}>
                            <TooltipTrigger asChild>
                              <button
                                className={cn(
                                  'w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-left hover:bg-accent transition-colors',
                                  selectedGroup === 'mcp' && 'bg-accent',
                                )}
                                onClick={async () => {
                                  const g = dynamicSearchGroups.find((g) => g.id === 'mcp');
                                  if (g) await handlePlusMenuGroupSelect(g);
                                }}
                              >
                                <AppsIcon width={16} height={16} />
                                <span className="flex-1 text-[13px]">Apps</span>
                                {selectedGroup === 'mcp' && (
                                  <span className="text-[9px] px-1 py-0.5 rounded bg-primary/10 text-primary font-medium">
                                    Active
                                  </span>
                                )}
                                {!isProUser && selectedGroup !== 'mcp' && (
                                  <span className="text-[9px] px-1 py-0.5 rounded bg-primary/10 text-primary font-medium">
                                    Pro
                                  </span>
                                )}
                              </button>
                            </TooltipTrigger>
                            <TooltipContent side="right" sideOffset={8} className="max-w-48 py-1.5 px-2.5">
                              <span className="text-[10px] leading-snug">Use tools from your connected apps</span>
                            </TooltipContent>
                          </Tooltip>
                        )}
                        <Tooltip delayDuration={200}>
                          <TooltipTrigger asChild>
                            <button
                              className={cn(
                                'w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-left hover:bg-accent transition-colors',
                                isExtreme && 'bg-accent',
                              )}
                              onClick={handlePlusMenuExtreme}
                            >
                              <HugeiconsIcon icon={AtomicPowerIcon} size={16} color="currentColor" strokeWidth={1.5} />
                              <span className="flex-1 text-[13px]">Extreme agent</span>
                              {isExtreme && (
                                <span className="text-[9px] px-1 py-0.5 rounded bg-primary/10 text-primary font-medium">
                                  Active
                                </span>
                              )}
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="right" sideOffset={8} className="max-w-48 py-1.5 px-2.5">
                            <span className="text-[10px] leading-snug">
                              Searches multiple sources for in-depth analysis
                            </span>
                          </TooltipContent>
                        </Tooltip>
                        {/* {(input.length > 0 || isEnhancing || isTypewriting) && (
                          <button className={cn('w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-left hover:bg-accent transition-colors', isEnhancementActive && 'bg-accent')} onClick={() => { if (!isEnhancing && !isTypewriting) handleEnhance(); setPlusMenuOpen(false); }} disabled={isEnhancing || isTypewriting || uploadQueue.length > 0 || status !== 'ready' || isLimitBlocked}>
                            {isEnhancementActive ? <GripIcon ref={gripIconRef} size={16} className="text-primary" /> : <Wand2 className="size-4 text-muted-foreground" />}
                            <span className="flex-1 text-[13px]">{isEnhancing ? 'Enhancing…' : isTypewriting ? 'Writing…' : 'Enhance prompt'}</span>
                          </button>
                        )} */}
                        {user && !hasInteracted && (
                          <Tooltip delayDuration={200}>
                            <TooltipTrigger asChild>
                              <button
                                className={cn(
                                  'w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-left hover:bg-accent transition-colors',
                                  isTemporaryChat && 'bg-accent',
                                )}
                                onClick={() => {
                                  if (!isTemporaryChatLocked) {
                                    setIsTemporaryChatEnabled((prev: boolean) => !prev);
                                  }
                                  setPlusMenuOpen(false);
                                }}
                                disabled={isTemporaryChatLocked}
                              >
                                <Ghost
                                  size={16}
                                  className={cn('shrink-0', isTemporaryChat ? 'text-primary' : 'text-muted-foreground')}
                                  strokeWidth={1.5}
                                />
                                <span className="flex-1 text-[13px]">{isTemporaryChat ? 'Temporary' : 'Private'}</span>
                                {isTemporaryChat && (
                                  <span className="text-[9px] px-1 py-0.5 rounded bg-primary/10 text-primary font-medium">
                                    Active
                                  </span>
                                )}
                                <Kbd className="text-[9px] h-4 min-w-4 px-1">⌘⇧J</Kbd>
                              </button>
                            </TooltipTrigger>
                            <TooltipContent side="right" sideOffset={8} className="max-w-48 py-1.5 px-2.5">
                              <span className="text-[10px] leading-snug">
                                {isTemporaryChat
                                  ? "This session won't be saved to history"
                                  : 'Toggle to prevent this session from being saved'}
                              </span>
                            </TooltipContent>
                          </Tooltip>
                        )}
                        <div className="my-0.5 mx-2 border-t border-border/40" />
                        <div className="px-2.5 pt-1.5 pb-0.5">
                          <span className="text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-widest">
                            Search Modes
                          </span>
                        </div>
                        <div className="relative">
                          <div
                            ref={plusMenuScrollRef}
                            onScroll={handlePlusMenuScroll}
                            className="max-h-32 overflow-y-auto"
                          >
                            {plusMenuGroups.map((group) => {
                              const sel = selectedGroup === group.id && !isExtreme;
                              return (
                                <Tooltip key={group.id} delayDuration={200}>
                                  <TooltipTrigger asChild>
                                    <button
                                      className={cn(
                                        'w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-left hover:bg-accent transition-colors',
                                        sel && 'bg-accent',
                                      )}
                                      onClick={() => handlePlusMenuGroupSelect(group)}
                                    >
                                      <FlexibleIcon
                                        icon={group.icon}
                                        size={16}
                                        color="currentColor"
                                        strokeWidth={1.5}
                                      />
                                      <span className="flex-1 text-[13px]">{group.name}</span>
                                      {'requirePro' in group && group.requirePro && !isProUser && (
                                        <span className="text-[9px] px-1 py-0.5 rounded bg-primary/10 text-primary font-medium">
                                          Pro
                                        </span>
                                      )}
                                      {sel && <Check className="size-3.5 text-primary" />}
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent side="right" sideOffset={8} className="max-w-48 py-1.5 px-2.5">
                                    <span className="text-[10px] leading-snug">{group.description}</span>
                                  </TooltipContent>
                                </Tooltip>
                              );
                            })}
                          </div>
                          {plusMenuCanScroll && (
                            <div className="pointer-events-none absolute bottom-0 inset-x-0 flex justify-center pb-0.5 pt-4 bg-linear-to-t from-popover via-popover/80 to-transparent rounded-b-lg">
                              <ChevronDown className="size-3.5 text-muted-foreground animate-bounce" />
                            </div>
                          )}
                        </div>
                      </PopoverContent>
                    </Popover>
                  )}

                  {/* Active mode badge */}
                  {(() => {
                    const activeGroup = dynamicSearchGroups.find((g) => g.id === selectedGroup);
                    if (
                      !activeGroup ||
                      selectedGroup === 'web' ||
                      selectedGroup === 'connectors' ||
                      selectedGroup === 'mcp' ||
                      selectedGroup === 'multi-agent'
                    ) {
                      if (!isMultiAgentModeEnabled) return null;
                      return (
                        <Tooltip delayDuration={300}>
                          <TooltipTrigger asChild>
                            <div
                              className="group relative flex items-center gap-1.5 px-2.5 h-8 rounded-full bg-primary/8! text-primary/80 border border-primary/15 text-[12px] font-medium hover:bg-primary/12 hover:text-primary transition-colors cursor-pointer"
                              onClick={() => {
                                haptics.trigger('light');
                                setPlusMenuOpen(true);
                              }}
                            >
                              <div className="relative size-3.5">
                                <AgentNetworkIcon
                                  width={14}
                                  height={14}
                                  className="absolute inset-0 group-hover:opacity-0 transition-opacity"
                                />
                                <button
                                  className="absolute -inset-0.5 flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100 group-hover:bg-foreground/10 transition-all"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    haptics.trigger('selection');
                                    setSelectedGroup('web');
                                    setIsMultiAgentModeEnabled?.(false);
                                  }}
                                  aria-label="Clear multi-agent mode"
                                >
                                  <X className="size-3.5" strokeWidth={2} />
                                </button>
                              </div>
                              <span>Multi-agent Mode</span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent
                            side="bottom"
                            sideOffset={6}
                            className="border-0 backdrop-blur-xs py-2 px-3 shadow-none!"
                          >
                            <div className="flex flex-col gap-0.5">
                              <span className="font-medium text-[11px]">Click to switch mode</span>
                              <span className="text-[10px] text-background/50">Hover ✕ to clear</span>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      );
                    }
                    return (
                      <Tooltip delayDuration={300}>
                        <TooltipTrigger asChild>
                          <div
                            className="group relative flex items-center gap-1.5 px-2.5 h-8 rounded-full bg-primary/8! text-primary/80 border border-primary/15 text-[12px] font-medium hover:bg-primary/12 hover:text-primary transition-colors cursor-pointer"
                            onClick={() => {
                              haptics.trigger('light');
                              setPlusMenuOpen(true);
                            }}
                          >
                            <div className="relative size-3.5">
                              <FlexibleIcon
                                icon={activeGroup.icon}
                                size={14}
                                color="currentColor"
                                strokeWidth={1.5}
                                className="absolute inset-0 group-hover:opacity-0 transition-opacity"
                              />
                              <button
                                className="absolute -inset-0.5 flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100 group-hover:bg-foreground/10 transition-all"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  haptics.trigger('selection');
                                  const webGroup = dynamicSearchGroups.find((g) => g.id === 'web');
                                  if (webGroup) handleGroupSelect(webGroup);
                                }}
                                aria-label="Clear mode"
                              >
                                <X className="size-3.5" strokeWidth={2} />
                              </button>
                            </div>
                            <span>{activeGroup.name === 'Extreme' ? 'Extreme Agent' : activeGroup.name}</span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent
                          side="bottom"
                          sideOffset={6}
                          className="border-0 backdrop-blur-xs py-2 px-3 shadow-none!"
                        >
                          <div className="flex flex-col gap-0.5">
                            <span className="font-medium text-[11px]">Click to switch mode</span>
                            <span className="text-[10px] text-background/50">Hover ✕ to clear</span>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    );
                  })()}

                  {/* Inline connector selector when connectors mode is active */}
                  {selectedGroup === 'connectors' && setSelectedConnectors && (
                    <ConnectorSelector
                      selectedConnectors={selectedConnectors}
                      onConnectorToggle={handleConnectorToggle}
                      user={user}
                      isProUser={isProUser}
                    />
                  )}

                  {/* Inline MCP server selector when MCP mode is active */}
                  {selectedGroup === 'mcp' && <McpServerSelector user={user} isProUser={isProUser} />}
                </div>

                {/* Right: Enhance, Model selector, voice/send */}
                <div className="flex items-center shrink-0 gap-1.5">
                  {/* Enhance prompt button */}
                  <Tooltip delayDuration={300}>
                    <TooltipTrigger asChild>
                      <Button
                        size="icon"
                        variant="ghost"
                        className={cn(
                          'rounded-full size-8! text-muted-foreground hover:text-foreground transition-colors',
                          isEnhancementActive && 'text-primary hover:text-primary',
                        )}
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          if (!isEnhancing && !isTypewriting) handleEnhance();
                        }}
                        disabled={
                          input.length === 0 ||
                          isEnhancing ||
                          isTypewriting ||
                          uploadQueue.length > 0 ||
                          status !== 'ready' ||
                          isLimitBlocked
                        }
                      >
                        {isEnhancementActive ? (
                          <GripIcon ref={gripIconRef} size={16} className="text-primary" />
                        ) : (
                          <MagicEditIcon size={16} className="text-current" />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" sideOffset={6}>
                      <span className="font-medium text-[11px]">
                        {isEnhancing ? 'Enhancing…' : isTypewriting ? 'Writing…' : 'Enhance prompt'}
                      </span>
                    </TooltipContent>
                  </Tooltip>

                  <ModelSwitcher
                    selectedModel={selectedModel}
                    setSelectedModel={setSelectedModel}
                    attachments={attachments}
                    messages={messages}
                    status={status}
                    onModelSelect={(model) => {
                      setSelectedModel(model.value);
                    }}
                    subscriptionData={subscriptionData}
                    user={user}
                    selectedGroup={selectedGroup}
                    autoRoutedModel={autoRoutedModel}
                    inputRef={inputRef}
                  />

                  {/* Action button: Stop / Voice / Send */}
                  {isProcessing ? (
                    <Tooltip delayDuration={300}>
                      <TooltipTrigger asChild>
                        <Button
                          variant="destructive"
                          size="icon"
                          className="rounded-full size-8! transition-colors"
                          onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            if (!isEnhancing && !isTypewriting) stop();
                          }}
                          disabled={isEnhancing || isTypewriting}
                        >
                          <StopIcon size={14} />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent
                        side="bottom"
                        sideOffset={6}
                        className="border-0 backdrop-blur-xs py-2 px-3 shadow-none!"
                      >
                        <span className="font-medium text-[11px]">Stop Generation</span>
                      </TooltipContent>
                    </Tooltip>
                  ) : input.length === 0 && attachments.length === 0 && !isEnhancing && !isTypewriting ? (
                    <Tooltip delayDuration={300}>
                      <TooltipTrigger asChild>
                        <Button
                          size="icon"
                          variant={isRecording ? 'destructive' : 'default'}
                          className="rounded-full size-8! transition-colors"
                          onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            if (!isEnhancing && !isTypewriting) handleRecord();
                          }}
                          disabled={isEnhancing || isTypewriting}
                        >
                          <AudioLinesIcon ref={audioLinesRef} size={16} />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent
                        side="bottom"
                        sideOffset={6}
                        className="border-0 backdrop-blur-xs py-2 px-3 shadow-none!"
                      >
                        <span className="font-medium text-[11px]">
                          {isRecording ? 'Stop Recording' : 'Voice Input'}
                        </span>
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    <Tooltip delayDuration={300}>
                      <TooltipTrigger asChild>
                        <Button
                          size="icon"
                          className="rounded-full size-8! transition-colors"
                          onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            if (!isEnhancing && !isTypewriting) submitForm();
                          }}
                          disabled={
                            (input.length === 0 && attachments.length === 0 && !isEnhancing && !isTypewriting) ||
                            uploadQueue.length > 0 ||
                            status !== 'ready' ||
                            isLimitBlocked ||
                            isEnhancing ||
                            isTypewriting
                          }
                        >
                          <ArrowUpIcon size={16} />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent
                        side="bottom"
                        sideOffset={6}
                        className="border-0 backdrop-blur-xs py-2 px-3 shadow-none!"
                      >
                        <span className="font-medium text-[11px]">Send Message</span>
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>
              </div>

              {/* Autocomplete suggestions — absolute, overlays downward, no layout shift */}
              {showSuggestions &&
                suggestions.length > 0 &&
                !hasInteracted &&
                !triggerPopup &&
                attachments.length === 0 &&
                uploadQueue.length === 0 && (
                  <div
                    ref={suggestionsRef}
                    className="absolute -left-px -right-px top-full z-50 bg-muted border border-ring/5 border-t-0 rounded-b-xl overflow-hidden"
                  >
                    {/* <div className="border-t border-border/40" /> */}
                    {suggestions.map((suggestion, index) => {
                      const isHighlighted = index === suggestionIndex;
                      const query = input.trim().toLowerCase();
                      const lower = suggestion.toLowerCase();
                      const matchEnd = lower.startsWith(query) ? query.length : 0;

                      return (
                        <button
                          key={suggestion}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            setInput(suggestion);
                            setSuggestions([]);
                            setShowSuggestions(false);
                            setSuggestionIndex(-1);
                          }}
                          onMouseEnter={() => setSuggestionIndex(index)}
                          className={cn(
                            'flex items-center gap-2.5 w-full px-4 py-1.5 text-left transition-colors duration-75',
                            isHighlighted ? 'bg-accent/60' : 'bg-transparent hover:bg-accent/30',
                          )}
                        >
                          <MagnifyingGlassIcon className="size-3.5 shrink-0 text-muted-foreground/60" weight="bold" />
                          <span className="text-[13px] text-foreground/80 truncate">
                            {matchEnd > 0 ? (
                              <>
                                {suggestion.slice(0, matchEnd)}
                                <span className="font-semibold text-foreground">{suggestion.slice(matchEnd)}</span>
                              </>
                            ) : (
                              suggestion
                            )}
                          </span>
                        </button>
                      );
                    })}
                    <div className="h-0" />
                  </div>
                )}
            </div>
          </div>
        </div>

        {/* Temporary Chat Hint - only on initial state, pro users get fixed-height wrapper to prevent jank */}
        {!hasInteracted && isProUser ? (
          <div className="relative h-8">
            <AnimatePresence>
              {isTemporaryChatEnabled && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } }}
                  exit={{ opacity: 0, transition: { duration: 0.15 } }}
                  className="absolute inset-x-0 top-0 mt-2 text-center"
                >
                  <p className="text-xs text-muted-foreground flex items-center justify-center gap-1.5">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="opacity-70"
                    >
                      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                    <span>This session won&apos;t appear in your history.</span>
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ) : !hasInteracted && isTemporaryChatEnabled ? (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } }}
            className="mt-2 text-center"
          >
            <p className="text-xs text-muted-foreground flex items-center justify-center gap-1.5">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="opacity-70"
              >
                <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <span>This session won&apos;t appear in your history.</span>
            </p>
          </motion.div>
        ) : null}

        {/* Pro Upgrade Dialog */}
        <Dialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog}>
          <DialogContent className="p-0 overflow-hidden gap-0 bg-background sm:max-w-[450px]" showCloseButton={false}>
            <DialogHeader className="p-2">
              <div className="relative w-full p-6 rounded-md text-white overflow-hidden">
                <div className="absolute inset-0 bg-[url('/placeholder.png')] bg-cover bg-center rounded-sm">
                  <div className="absolute inset-0 bg-linear-to-t from-black/60 via-black/30 to-black/10"></div>
                </div>
                <div className="relative z-10 flex flex-col gap-4">
                  <DialogTitle className="flex items-center gap-3 text-white">
                    <div className="flex items-center gap-1 flex-wrap">
                      <span className="text-xl sm:text-2xl font-bold">Unlock</span>
                      <ProBadge className="text-white! bg-white/20! ring-white/30! font-extralight! mb-0.5!" />
                    </div>
                  </DialogTitle>
                  <DialogDescription className="text-white/90">
                    {discountConfig?.enabled && discountConfig?.isStudentDiscount && (
                      <div className="flex items-center gap-2 mb-2">
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/20 backdrop-blur-sm border border-white/20 text-white text-sm font-medium">
                          🎓 Student Discount
                        </div>
                      </div>
                    )}
                    <div className="flex items-center gap-2 mb-2">
                      {pricing.inr ? (
                        // Show INR pricing when available
                        pricing.inr.hasDiscount ? (
                          <>
                            <span className="text-lg text-white/60 line-through">₹{pricing.inr.originalPrice}</span>
                            <span className="text-2xl font-bold">₹{pricing.inr.finalPrice}</span>
                          </>
                        ) : (
                          <span className="text-2xl font-bold">₹{pricing.inr.finalPrice}</span>
                        )
                      ) : // Show USD pricing for non-Indian users
                      pricing.usd.hasDiscount ? (
                        <>
                          <span className="text-lg text-white/60 line-through">${pricing.usd.originalPrice}</span>
                          <span className="text-2xl font-bold">${pricing.usd.finalPrice.toFixed(2)}</span>
                        </>
                      ) : (
                        <span className="text-2xl font-bold">${pricing.usd.finalPrice}</span>
                      )}
                      <span className="text-sm text-white/80">/month</span>
                    </div>
                    <p className="text-sm text-white/80 text-left">
                      Get enhanced capabilities including prompt enhancement and unlimited features
                    </p>
                  </DialogDescription>
                  <Button
                    onClick={() => {
                      window.location.href = '/pricing';
                    }}
                    className="backdrop-blur-md bg-white/90 border border-white/20 text-black hover:bg-white w-full font-medium mt-3"
                  >
                    Upgrade to Pro
                  </Button>
                </div>
              </div>
            </DialogHeader>

            <div className="px-6 py-6 flex flex-col gap-4">
              <div className="flex items-center gap-4">
                <CheckIcon className="size-4 text-primary shrink-0" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground">Prompt Enhancement</p>
                  <p className="text-xs text-muted-foreground">AI-powered prompt optimization</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <CheckIcon className="size-4 text-primary shrink-0" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground">Unlimited Searches</p>
                  <p className="text-xs text-muted-foreground">No daily limits on your research</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <CheckIcon className="size-4 text-primary shrink-0" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground">Advanced AI Models</p>
                  <p className="text-xs text-muted-foreground">
                    Access to all AI models including Grok 4, Claude and GPT-5
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <CheckIcon className="size-4 text-primary shrink-0" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground">Scira Lookout</p>
                  <p className="text-xs text-muted-foreground">Automated search monitoring on your schedule</p>
                </div>
              </div>

              <div className="flex gap-2 w-full items-center mt-4">
                <div className="flex-1 border-b border-foreground/10" />
                <p className="text-xs text-foreground/50">Cancel anytime • Secure payment</p>
                <div className="flex-1 border-b border-foreground/10" />
              </div>

              <Button
                variant="ghost"
                onClick={() => setShowUpgradeDialog(false)}
                className="w-full text-muted-foreground hover:text-foreground mt-2"
                size="sm"
              >
                Not now
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Sign In Dialog (Voice) */}
        <Dialog open={showSignInDialog} onOpenChange={setShowSignInDialog}>
          <DialogContent className="sm:max-w-[400px] p-0 gap-0 overflow-hidden" showCloseButton={false}>
            <div className="relative px-6 pt-8 pb-6 text-center">
              <div className="absolute inset-0 bg-[url('/placeholder.png')] bg-cover bg-center">
                <div className="absolute inset-0 bg-linear-to-t from-background via-background/80 to-background/40" />
              </div>
              <div className="relative z-10 space-y-1.5">
                <div className="w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center mx-auto mb-3">
                  <LockIcon className="w-5 h-5 text-muted-foreground" />
                </div>
                <p className="text-lg font-semibold tracking-tight">Sign in required</p>
                <p className="font-pixel text-[10px] text-muted-foreground/50 uppercase tracking-wider">
                  for Voice Input
                </p>
              </div>
            </div>

            <div className="px-6 pb-6 space-y-4">
              <div className="rounded-xl border border-border/60 overflow-hidden grid grid-cols-2">
                {[
                  { title: 'Voice input', desc: 'Record & transcribe' },
                  { title: 'Better models', desc: 'GPT-5, Claude 4.6' },
                  { title: 'Search history', desc: 'Keep conversations' },
                  { title: 'Free to start', desc: 'No payment required' },
                ].map((f, i) => (
                  <div
                    key={f.title}
                    className={cn(
                      'flex items-start gap-2 p-2.5',
                      i % 2 === 0 && 'border-r border-border/40',
                      i < 2 && 'border-b border-border/40',
                    )}
                  >
                    <CheckIcon className="size-3 text-primary shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <p className="text-[11px] font-medium leading-tight">{f.title}</p>
                      <p className="font-pixel text-[8px] text-muted-foreground/50 uppercase tracking-wider mt-0.5">
                        {f.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <Button
                onClick={() => {
                  window.location.href = '/sign-in';
                }}
                className="w-full rounded-lg h-9"
              >
                Sign in
              </Button>

              <button
                onClick={() => setShowSignInDialog(false)}
                className="w-full text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors py-1"
              >
                Maybe later
              </button>
            </div>
          </DialogContent>
        </Dialog>
      </TooltipProvider>
    </div>
  );
};

export default FormComponent;
