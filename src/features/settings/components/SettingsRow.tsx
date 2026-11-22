import React from 'react';
import { View } from 'react-native';
import { ChevronRight, type LucideIcon } from 'lucide-react-native';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import AnimatedPressable from '@/components/AnimatedPressable';
import { cn } from '@/lib/utils';

export interface SettingsRowProps {
  icon: LucideIcon;
  label: string;
  description?: string;
  onPress: () => void;
  /** Amber tile for the primary destination, neutral otherwise. */
  tone?: 'default' | 'amber';
  accessibilityLabel?: string;
}

export function SettingsRow({
  icon,
  label,
  description,
  onPress,
  tone = 'default',
  accessibilityLabel,
}: SettingsRowProps) {
  const isAmber = tone === 'amber';

  return (
    <AnimatedPressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      className="mb-2.5 w-full flex-row items-center gap-3.5 rounded-2xl border border-muted bg-card px-[18px] py-4"
      feedback="timing"
      pressedOpacity={0.75}
      scaleTo={0.98}
    >
      <View
        className={cn(
          'h-9 w-9 items-center justify-center rounded-[10px] border',
          isAmber
            ? 'border-amber-300/15 bg-amber-300/[0.07]'
            : 'border-muted bg-card',
        )}
      >
        <Icon
          as={icon}
          className={isAmber ? 'text-amber-300' : 'text-foreground'}
          size={16}
          strokeWidth={1.8}
        />
      </View>
      <View className="flex-1">
        <Text
          className={cn(
            'text-[14px]',
            isAmber
              ? 'font-heading-medium text-amber-300'
              : 'font-semibold text-foreground',
          )}
        >
          {label}
        </Text>
        {description ? (
          <Text
            className="mt-0.5 text-[12px] text-muted-foreground"
            numberOfLines={1}
            ellipsizeMode="middle"
          >
            {description}
          </Text>
        ) : null}
      </View>
      <Icon
        as={ChevronRight}
        className="text-muted-foreground"
        size={16}
        strokeWidth={1.8}
      />
    </AnimatedPressable>
  );
}
