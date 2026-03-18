'use client';

import { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ExternalLink, Loader2, Server } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ElicitationData {
  elicitationId: string;
  serverName: string;
  message: string;
  mode: 'form' | 'url';
  requestedSchema?: unknown;
  url?: string;
}

interface SchemaProperty {
  type?: string;
  title?: string;
  description?: string;
  default?: unknown;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  enum?: string[];
  oneOf?: Array<{ const: string; title: string }>;
  items?: { type?: string; enum?: string[]; anyOf?: Array<{ const: string; title: string }> };
  minItems?: number;
  maxItems?: number;
  format?: string;
}

interface RequestedSchema {
  type?: string;
  properties?: Record<string, SchemaProperty>;
  required?: string[];
}

function parseSchema(raw: unknown): RequestedSchema {
  if (!raw || typeof raw !== 'object') return {};
  return raw as RequestedSchema;
}

function FormField({
  name,
  prop,
  required,
  value,
  onChange,
}: {
  name: string;
  prop: SchemaProperty;
  required: boolean;
  value: unknown;
  onChange: (val: unknown) => void;
}) {
  const label = prop.title || name;
  const isEnum = Array.isArray(prop.enum) && prop.enum.length > 0;
  const isOneOf = Array.isArray(prop.oneOf) && prop.oneOf.length > 0;
  const isMultiEnum = prop.type === 'array' && (prop.items?.enum || prop.items?.anyOf);

  if (prop.type === 'boolean') {
    return (
      <div className="flex items-center justify-between gap-3">
        <div>
          <Label className="text-sm font-medium">{label}{required && <span className="text-destructive ml-0.5">*</span>}</Label>
          {prop.description && <p className="text-[11px] text-muted-foreground mt-0.5">{prop.description}</p>}
        </div>
        <Switch checked={Boolean(value ?? prop.default ?? false)} onCheckedChange={onChange} />
      </div>
    );
  }

  if (isEnum) {
    return (
      <div className="space-y-1.5">
        <Label className="text-sm font-medium">{label}{required && <span className="text-destructive ml-0.5">*</span>}</Label>
        {prop.description && <p className="text-[11px] text-muted-foreground">{prop.description}</p>}
        <Select value={String(value ?? prop.default ?? '')} onValueChange={onChange}>
          <SelectTrigger className="h-8 text-sm"><SelectValue placeholder={`Select ${label}`} /></SelectTrigger>
          <SelectContent>
            {prop.enum!.map((opt) => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
    );
  }

  if (isOneOf) {
    return (
      <div className="space-y-1.5">
        <Label className="text-sm font-medium">{label}{required && <span className="text-destructive ml-0.5">*</span>}</Label>
        {prop.description && <p className="text-[11px] text-muted-foreground">{prop.description}</p>}
        <Select value={String(value ?? prop.default ?? '')} onValueChange={onChange}>
          <SelectTrigger className="h-8 text-sm"><SelectValue placeholder={`Select ${label}`} /></SelectTrigger>
          <SelectContent>
            {prop.oneOf!.map((opt) => <SelectItem key={opt.const} value={opt.const}>{opt.title}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
    );
  }

  if (isMultiEnum) {
    const options = prop.items?.enum ?? prop.items?.anyOf?.map((o) => o.const) ?? [];
    const titles = prop.items?.anyOf ? Object.fromEntries(prop.items.anyOf.map((o) => [o.const, o.title])) : {};
    const selected = Array.isArray(value) ? (value as string[]) : [];
    const toggle = (opt: string) => {
      const next = selected.includes(opt)
        ? selected.filter((v) => v !== opt)
        : [...selected, opt];
      onChange(next);
    };
    return (
      <div className="space-y-1.5">
        <Label className="text-sm font-medium">{label}{required && <span className="text-destructive ml-0.5">*</span>}</Label>
        {prop.description && <p className="text-[11px] text-muted-foreground">{prop.description}</p>}
        <div className="flex flex-wrap gap-1.5 mt-1">
          {options.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => toggle(opt)}
              className={cn(
                'px-2.5 py-1 rounded-lg text-[11px] border transition-colors',
                selected.includes(opt)
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-muted/40 text-muted-foreground border-border hover:border-primary/60',
              )}
            >
              {titles[opt] ?? opt}
            </button>
          ))}
        </div>
      </div>
    );
  }

  const inputType = prop.type === 'number' || prop.type === 'integer' ? 'number'
    : prop.format === 'email' ? 'email'
    : prop.format === 'uri' ? 'url'
    : prop.format === 'date' ? 'date'
    : prop.format === 'date-time' ? 'datetime-local'
    : 'text';

  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">{label}{required && <span className="text-destructive ml-0.5">*</span>}</Label>
      {prop.description && <p className="text-[11px] text-muted-foreground">{prop.description}</p>}
      <Input
        type={inputType}
        className="h-8 text-sm"
        placeholder={label}
        value={String(value ?? prop.default ?? '')}
        min={prop.minimum}
        max={prop.maximum}
        minLength={prop.minLength}
        maxLength={prop.maxLength}
        onChange={(e) => onChange(inputType === 'number' ? Number(e.target.value) : e.target.value)}
      />
    </div>
  );
}

function getDefaultValue(prop: SchemaProperty): unknown {
  if (prop.default !== undefined) return prop.default;
  if (prop.type === 'boolean') return false;
  if (prop.type === 'number' || prop.type === 'integer') return undefined;
  if (prop.type === 'array') return [];
  if (prop.type === 'object') return {};
  return undefined;
}

function buildElicitationContent(
  values: Record<string, unknown>,
  properties: Record<string, SchemaProperty>,
) {
  const content: Record<string, unknown> = {};

  for (const [name, prop] of Object.entries(properties)) {
    const raw = values[name];
    if (raw === undefined || raw === null || raw === '') continue;

    if (prop.type === 'boolean') {
      content[name] = Boolean(raw);
      continue;
    }

    if (prop.type === 'number' || prop.type === 'integer') {
      const numeric = typeof raw === 'number' ? raw : Number(raw);
      if (!Number.isFinite(numeric)) continue;
      content[name] = prop.type === 'integer' ? Math.trunc(numeric) : numeric;
      continue;
    }

    if (prop.type === 'array') {
      if (Array.isArray(raw)) {
        content[name] = raw;
        continue;
      }
      if (typeof raw === 'string') {
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) content[name] = parsed;
        } catch {
          // Ignore invalid array payloads instead of sending bad shapes
        }
      }
      continue;
    }

    if (prop.type === 'object') {
      if (typeof raw === 'object' && !Array.isArray(raw)) {
        content[name] = raw;
        continue;
      }
      if (typeof raw === 'string') {
        try {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
            content[name] = parsed;
          }
        } catch {
          // Ignore invalid object payloads instead of sending bad shapes
        }
      }
      continue;
    }

    content[name] = String(raw);
  }

  return content;
}

interface McpElicitationModalProps {
  elicitation: ElicitationData | null;
  onClose: () => void;
}

export function McpElicitationModal({ elicitation, onClose }: McpElicitationModalProps) {
  const schema = parseSchema(elicitation?.requestedSchema);
  const properties = schema.properties ?? {};
  const requiredFields = schema.required ?? [];

  const [values, setValues] = useState<Record<string, unknown>>(() =>
    Object.fromEntries(Object.entries(properties).map(([k, p]) => [k, getDefaultValue(p)])),
  );
  const [submitting, setSubmitting] = useState<'accept' | 'decline' | 'cancel' | null>(null);
  const [urlConsented, setUrlConsented] = useState(false);

  const respond = useCallback(async (action: 'accept' | 'decline' | 'cancel') => {
    if (!elicitation) return;
    setSubmitting(action);
    try {
      const content = action === 'accept' && elicitation.mode === 'form'
        ? buildElicitationContent(values, properties)
        : undefined;

      await fetch('/api/mcp/elicitation/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          elicitationId: elicitation.elicitationId,
          action,
          content,
        }),
      });
    } finally {
      setSubmitting(null);
      onClose();
    }
  }, [elicitation, values, properties, onClose]);

  const handleOpen = useCallback(() => {
    if (elicitation?.url) window.open(elicitation.url, '_blank', 'noopener,noreferrer');
    respond('accept');
  }, [elicitation, respond]);

  if (!elicitation) return null;

  const urlHostname = (() => {
    try { return new URL(elicitation.url ?? '').hostname; } catch { return elicitation.url; }
  })();

  const hasFields = Object.keys(properties).length > 0;

  return (
    <Dialog open={Boolean(elicitation)} onOpenChange={(open) => { if (!open) respond('cancel'); }}>
      <DialogContent className="max-w-lg overflow-hidden p-0 border-border/60">
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-border/60 bg-muted/20">
          <div className="flex items-center gap-2 mb-1">
            <div className="flex size-8 items-center justify-center rounded-lg bg-background border border-border/60 shrink-0">
              <Server className="size-4 text-muted-foreground" />
            </div>
            <span className="inline-flex items-center rounded-md border border-border/60 bg-background px-2 py-0.5 text-xs font-medium text-muted-foreground">
              {elicitation.serverName}
            </span>
          </div>
          <DialogTitle className="text-lg text-balance">
            {elicitation.mode === 'url' ? 'Action required' : 'Information needed'}
          </DialogTitle>
          <DialogDescription className="mt-1 text-sm text-pretty text-foreground/80">
            {elicitation.message}
          </DialogDescription>
        </DialogHeader>

        {elicitation.mode === 'form' && hasFields && (
          <div className="px-5 py-4 space-y-4">
            {Object.entries(properties).map(([name, prop]) => (
              <FormField
                key={name}
                name={name}
                prop={prop}
                required={requiredFields.includes(name)}
                value={values[name]}
                onChange={(val) => setValues((prev) => ({ ...prev, [name]: val }))}
              />
            ))}
          </div>
        )}

        {elicitation.mode === 'url' && elicitation.url && (
          <div className="px-5 py-4">
            <div className="rounded-lg border border-border/60 bg-muted/30 p-3 space-y-2">
              <div className="flex items-center gap-2">
                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="text-xs font-medium text-foreground">{urlHostname}</span>
              </div>
              <p className="text-[11px] text-muted-foreground break-all">{elicitation.url}</p>
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={urlConsented}
                  onChange={(e) => setUrlConsented(e.target.checked)}
                  className="mt-0.5 accent-primary"
                />
                <span className="text-[11px] text-muted-foreground text-pretty">
                  I trust this site and want to open it
                </span>
              </label>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 flex-wrap border-t border-border/60 px-5 py-4 bg-muted/10">
          <Button
            size="sm"
            variant="ghost"
            className="text-muted-foreground"
            disabled={Boolean(submitting)}
            onClick={() => respond('cancel')}
          >
            {submitting === 'cancel' ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
            Cancel
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={Boolean(submitting)}
            onClick={() => respond('decline')}
          >
            {submitting === 'decline' ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
            Decline
          </Button>
          {elicitation.mode === 'url' ? (
            <Button
              size="sm"
              disabled={!urlConsented || Boolean(submitting)}
              onClick={handleOpen}
            >
              {submitting === 'accept' ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <ExternalLink className="h-3 w-3 mr-1" />}
              Open
            </Button>
          ) : (
            <Button
              size="sm"
              disabled={Boolean(submitting)}
              onClick={() => respond('accept')}
            >
              {submitting === 'accept' ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
              {hasFields ? 'Submit' : 'Accept'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
