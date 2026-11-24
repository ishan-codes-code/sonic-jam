import { Check, Database, Info } from 'lucide-react-native';
import React from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { SecretInput } from './SecretInput';

interface SetupDatabaseStepProps {
  databaseUrl: string;
  setDatabaseUrl: (next: string) => void;
  error: string | null;
  migrationSteps: string[] | null;
  isBusy: boolean;
  isLocked: boolean;
  isConfigured: boolean;
  onSubmit: () => void;
  onInputFocus: () => void;
}

export function SetupDatabaseStep({
  databaseUrl,
  setDatabaseUrl,
  error,
  migrationSteps,
  isBusy,
  isLocked,
  isConfigured,
  onSubmit,
  onInputFocus,
}: SetupDatabaseStepProps) {
  return (
    <View>
      <Text className="mb-1.5 text-3xl font-display text-foreground">
        Database
      </Text>
      <Text className="mb-7 text-[13px] font-heading leading-relaxed text-muted-foreground">
        Sonic stores your library in a PostgreSQL database. Paste the
        connection string below — for example your Neon database URL.
      </Text>

      {error ? (
        <View className="mb-4 rounded-md border border-red-500/20 bg-red-500/[0.08] px-4 py-3">
          <Text className="text-[13px] text-red-400">{error}</Text>
          {migrationSteps?.map((step) => (
            <Text key={step} className="mt-1 text-[12px] text-red-400/80">
              • {step}
            </Text>
          ))}
        </View>
      ) : null}

      {isLocked ? (
        <View className="mb-4 flex-row gap-2.5 rounded-md border border-emerald-400/20 bg-emerald-400/[0.08] px-4 py-3">
          <Icon
            as={Check}
            size={15}
            className="mt-0.5 shrink-0 text-emerald-300"
            strokeWidth={2.5}
          />
          <Text className="flex-1 text-[12px] leading-relaxed text-emerald-200/90">
            Your database is already managed by the backend environment, so
            there is nothing to enter here. Continue to the next step.
          </Text>
        </View>
      ) : (
        <>
          {isConfigured ? (
            <View className="mb-4 flex-row gap-2.5 rounded-md border border-amber-300/20 bg-amber-300/[0.06] px-4 py-3">
              <Icon
                as={Info}
                size={15}
                className="mt-0.5 shrink-0 text-amber-300"
                strokeWidth={1.8}
              />
              <Text className="flex-1 text-[12px] leading-relaxed text-amber-200/90">
                A database is already configured. Enter a new connection
                string to replace it, or continue to keep it.
              </Text>
            </View>
          ) : null}
          <SecretInput
            label="DATABASE_URL"
            value={databaseUrl}
            onChangeText={setDatabaseUrl}
            placeholder="postgres://user:password@host:5432/db"
            editable={!isBusy}
            returnKeyType="go"
            onSubmitEditing={onSubmit}
            onFocus={onInputFocus}
            hint="The server checks this connection before saving it."
          />
        </>
      )}

      <Pressable
        onPress={onSubmit}
        disabled={isBusy}
        accessibilityRole="button"
        accessibilityLabel="Save and continue"
        accessibilityState={{ disabled: isBusy, busy: isBusy }}
        className="mt-5 h-[52px] w-full items-center justify-center rounded-md bg-amber-300"
        style={({ pressed }) => ({
          opacity: pressed || isBusy ? 0.8 : 1,
        })}
      >
        {isBusy ? (
          <View className="flex-row items-center gap-2.5">
            <ActivityIndicator color="#0a0a0a" size="small" />
            <Text className="text-[15px] font-display text-secondary">
              Saving…
            </Text>
          </View>
        ) : (
          <View className="flex-row items-center gap-2">
            <Icon as={Database} size={16} className="text-secondary" />
            <Text className="text-[15px] font-display text-secondary">
              Save & continue
            </Text>
          </View>
        )}
      </Pressable>
    </View>
  );
}
