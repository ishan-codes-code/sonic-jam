import { useRouter } from 'expo-router';
import { Eye, EyeOff, Lock, Mail, User } from 'lucide-react-native';
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
import { useSignup } from '../hooks/useSignup';
import { Icon } from '@/components/ui/icon';

export const SignupScreen = () => {
  const router = useRouter();
  const {
    name, setName,
    email, setEmail,
    password, setPassword,
    showPassword, setShowPassword,
    clearFieldError,
    isLoading,
    handleSignup,
    displayError,
  } = useSignup();

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-[#0a0a0a]"
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : -200}
    >
      <SafeAreaView className="flex-1">
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <AuthHeader
            title="Join Sonic"
            subtitle="Create your account and start listening."
            image="signup"
          />

          {/* Error */}
          {displayError ? (
            <View className="mb-4 rounded-md border border-red-500/20 bg-red-500/[0.08] px-4 py-3">
              <Text className="text-[13px] text-red-400">{displayError}</Text>
            </View>
          ) : null}

          {/* Name */}
          <View className="mb-3.5">
            <Text className="mb-1.5 text-[10px] font-heading uppercase tracking-[2px] text-muted-foreground">
              Full Name
            </Text>
            <View className="h-[50px] flex-row items-center gap-2.5 rounded-md border border-border bg-card px-3.5">
              <Icon as={User} size={16} className='text-muted-foreground' strokeWidth={1.8} />

              <Input
                className="h-full flex-1 border-0 bg-transparent text-[14px] font-display text-foreground shadow-none"
                placeholder="John Doe"
                placeholderTextColor="#252525"
                value={name}
                onChangeText={(t) => { setName(t); clearFieldError(); }}
                autoCapitalize="words"
                editable={!isLoading}
              />
            </View>
          </View>

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
                onChangeText={(t) => { setEmail(t); clearFieldError(); }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLoading}
              />
            </View>
          </View>

          {/* Password */}
          <View className="mb-5">
            <Text className="mb-1.5 text-[10px] font-heading uppercase tracking-[2px] text-muted-foreground">
              Password
            </Text>
            <View className="h-[50px] flex-row items-center gap-2.5 rounded-md border border-border bg-card px-3.5">
              <Icon as={Lock} size={16} className='text-muted-foreground' strokeWidth={1.8} />

              <Input
                className="h-full flex-1 border-0 bg-transparent text-[14px] font-display text-foreground shadow-none"
                placeholder="••••••••"
                placeholderTextColor="#252525"
                value={password}
                onChangeText={(t) => { setPassword(t); clearFieldError(); }}
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
            onPress={handleSignup}
            disabled={isLoading}
            className="h-[52px] w-full items-center justify-center rounded-md bg-amber-300"
            style={({ pressed }) => ({ opacity: pressed || isLoading ? 0.8 : 1 })}
          >
            {isLoading
              ? <ActivityIndicator color="#0a0a0a" size="small" />
              : <Text className="text-[15px] font-display  text-secondary]">Create Account</Text>
            }
          </Pressable>

          <AuthFooter
            prompt="Already have an account?"
            actionLabel="Login"
            onPress={() => router.push('/login')}
          />
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
};