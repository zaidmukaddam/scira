'use client';

import React from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { CircleArrowUpDownIcon, Tick01Icon } from '@hugeicons/core-free-icons';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { timezoneOptions } from '../constants';

interface TimezoneSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

export function TimezoneSelector({ value, onChange }: TimezoneSelectorProps) {
  const [open, setOpen] = React.useState(false);

  const selectedTimezone = timezoneOptions.find((option) => option.value === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="h-9 w-full justify-between text-left font-normal"
        >
          {selectedTimezone
            ? selectedTimezone.label.length > 30
              ? `${selectedTimezone.label.substring(0, 30)}...`
              : selectedTimezone.label
            : 'Select timezone'}
          <HugeiconsIcon
            icon={CircleArrowUpDownIcon}
            size={16}
            color="currentColor"
            strokeWidth={1.5}
            className="shrink-0 opacity-50"
          />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[calc(100vw-2rem)] sm:w-[380px] p-0"
        align="start"
        side="bottom"
        sideOffset={4}
        avoidCollisions={true}
        collisionPadding={8}
      >
        <Command>
          <CommandInput placeholder="Search timezone..." className="h-9" />
          <CommandEmpty>No timezone found.</CommandEmpty>
          <CommandList
            className="max-h-[200px] !overflow-y-scroll"
            style={{ overflowY: 'scroll', pointerEvents: 'auto' }}
            tabIndex={0}
            onWheel={(e) => {
              e.stopPropagation();
              const target = e.currentTarget;
              target.scrollTop += e.deltaY;
            }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                e.preventDefault();
                const target = e.currentTarget;
                target.scrollTop += e.key === 'ArrowDown' ? 40 : -40;
              }
            }}
          >
            <CommandGroup>
              {timezoneOptions.map((option) => (
                <CommandItem
                  key={option.value}
                  value={`${option.value} ${option.label}`}
                  onSelect={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  className="text-sm"
                >
                  <HugeiconsIcon
                    icon={Tick01Icon}
                    size={16}
                    color="currentColor"
                    strokeWidth={1.5}
                    className={cn('mr-2', value === option.value ? 'opacity-100' : 'opacity-0')}
                  />
                  {option.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
