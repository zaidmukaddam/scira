import React from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { searchGroups, type SearchGroup } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface SearchGroupsProps {
  selectedGroup: string
  onGroupSelect: (group: SearchGroup) => void
}

export function SearchGroups({ selectedGroup, onGroupSelect }: SearchGroupsProps) {
  return (
    <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
      {searchGroups.map((group) => {
        const Icon = group.icon
        const isSelected = selectedGroup === group.id
        
        return (
          <Card
            key={group.id}
            className={cn(
              "cursor-pointer transition-all duration-200 hover:scale-[1.02]",
              "border border-neutral-200 dark:border-neutral-800",
              isSelected && "ring-2 ring-primary ring-offset-2 dark:ring-offset-neutral-950"
            )}
            onClick={() => onGroupSelect(group)}
          >
            <CardHeader>
              <div className="flex items-start gap-4">
                <div className={cn(
                  "p-2 rounded-lg",
                  isSelected ? "bg-primary text-primary-foreground" : "bg-neutral-100 dark:bg-neutral-800"
                )}>
                  <Icon className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-lg">{group.name}</CardTitle>
                  <CardDescription className="mt-1">
                    {group.description}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>
        )
      })}
    </div>
  )
}