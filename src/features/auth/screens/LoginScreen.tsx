import { useRouter } from 'expo-router';
import { Eye, EyeOff, Lock, Mail } from 'lucide-react-native';
import React from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { AuthFooter } from '../components/AuthFooter';
import { AuthHeader } from '../components/AuthHeader';
import { useLogin } from '../hooks/useLogin';
import { Icon } from '@/components/ui/icon';

export const LoginScreen = () => {
  const router = useRouter();
  const {
    email, setEmail,
    password, setPassword,
    showPassword, setShowPassword,
    setFieldError,
    isLoading,
    handleLogin,
    displayError,
  } = useLogin();

  return (
    <KeyboardAvoidingView
  behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
  className="flex-1 bg-[#0a0a0a]"
>
  <SafeAreaView className="flex-1">
    <ScrollView
      contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets={true}
    >
          <AuthHeader
            title="Welcome back"
            subtitle="Sign in to continue your sonic journey."
            image="login"
          />

          {/* Error */}
          {displayError ? (
            <View className="mb-4 rounded-md border border-red-500/20 bg-red-500/[0.08] px-4 py-3">
              <Text className="text-[13px] text-red-400">{displayError}</Text>
            </View>
          ) : null}

          {/* Email */}
          <View className="mb-3.5">
            <Text className="mb-1.5 text-[10px] font-heading uppercase tracking-[2px] text-muted-foreground">
              Email Address
            </Text>
            <View className="h-[50px] flex-row items-center gap-2.5 rounded-md border border-border bg-card px-3.5">
              <Icon as={Mail} size={16} className='text-muted-foreground' strokeWidth={1.8} />
              <Input
                className="h-full flex-1 border-0 bg-transparent text-[14px] font-display text-foreground shadow-none"
                placeholder="name@email.com"
                placeholderTextColor="#252525"
                value={email}
                onChangeText={(t) => { setEmail(t); setFieldError(null); }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLoading}
              />
            </View>
          </View>

          {/* Password */}
          <View className="mb-2">
            <Text className="mb-1.5 text-[10px] font-heading uppercase tracking-[2px] text-muted-foreground">
              Password
            </Text>
            <View className="h-[50px] flex-row items-center gap-2.5 rounded-md border border-border bg-card px-3.5">
              <Icon as={Lock} size={16} className='text-muted-foreground' strokeWidth={1.8} />

              <Input
                className="h-full flex-1 border-0 bg-transparent text-[14px] font-display text-foreground shadow-none"
                placeholder="••••••••"
                value={password}
                onChangeText={(t) => { setPassword(t); setFieldError(null); }}
                secureTextEntry={!showPassword}
                editable={!isLoading}
              />
              <Pressable
                onPress={() => setShowPassword(!showPassword)}
                hitSlop={8}
              >
                {showPassword
                  ? <Icon as={EyeOff} size={16} className='text-muted-foreground' strokeWidth={1.8} />
                  : <Icon as={Eye} size={16} className='text-muted-foreground' strokeWidth={1.8} />}
              </Pressable>
            </View>
          </View>


          {/* CTA */}
          <Pressable
            onPress={handleLogin}
            disabled={isLoading}
            className="mt-5 h-[52px] w-full items-center justify-center rounded-md bg-amber-300"
            style={({ pressed }) => ({ opacity: pressed || isLoading ? 0.8 : 1 })}
          >
            {isLoading
              ? <ActivityIndicator color="#0a0a0a" size="small" />
              : <Text className="text-[15px] font-display  text-secondary">Login</Text>
            }
          </Pressable>

          <AuthFooter
            prompt="Don't have an account?"
            actionLabel="Create Account"
            onPress={() => router.push('/signup')}
          />
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
};