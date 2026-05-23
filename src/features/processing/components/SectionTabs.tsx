import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";
import * as TabsPrimitive from "@rn-primitives/tabs";
import { memo } from "react";
import { View } from "react-native";
import type { ProcessingSectionKey, ProcessingSectionOption } from "../types";

type SectionTabsProps = {
  options: ProcessingSectionOption[];
  selected: ProcessingSectionKey;
  onSelect: (key: ProcessingSectionKey) => void;
};

function SectionTabs({ options, selected, onSelect }: SectionTabsProps) {
  return (
    <TabsPrimitive.Root value={selected} onValueChange={(val) => onSelect(val as ProcessingSectionKey)}>
      <TabsPrimitive.List className="mb-5 mx-2 flex-row items-center gap-2 rounded-xl border border-white/5 bg-white/[0.04] p-1.5">
        {options.map((option) => {
          const isActive = option.key === selected;
          const isDisabled = option.count === 0;

          return (
            <TabsPrimitive.Trigger
              key={option.key}
              value={option.key}
              disabled={isDisabled}
              className={cn(
                "min-h-12 flex-1 flex-row items-center justify-center gap-2 rounded-[14px] px-3 py-2.5 transition-colors",
                isActive && "bg-card shadow-sm",
                isDisabled && "opacity-45"
              )}
            >
              <Text
                className={cn(
                  "text-xs font-heading-medium text-muted-foreground",
                  isActive && "text-foreground",
                  isDisabled && "text-muted-foreground/70"
                )}
              >
                {option.label}
              </Text>
              <View
                className={cn(
                  "h-6 min-w-6 items-center justify-center rounded-full bg-white/10 px-1.5",
                  isActive && "bg-primary",
                  isDisabled && "bg-white/[0.06]"
                )}
              >
                <Text
                  className={cn(
                    "text-[10px] font-heading-medium text-muted-foreground",
                    isActive && "text-primary-foreground",
                    isDisabled && "text-muted-foreground/70"
                  )}
                >
                  {option.count}
                </Text>
              </View>
            </TabsPrimitive.Trigger>
          );
        })}
      </TabsPrimitive.List>
    </TabsPrimitive.Root>
  );
}

export default memo(SectionTabs);
