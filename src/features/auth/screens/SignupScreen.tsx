import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Eye, EyeOff, Lock, Mail, User } from 'lucide-react-native';
import React from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';
import { AuthFooter } from '../components/AuthFooter';
import { AuthHeader } from '../components/AuthHeader';
import { SocialAuthButtons } from '../components/SocialAuthButtons';
import { useSignup } from '../hooks/useSignup';

export const SignupScreen = () => {
  const router = useRouter();
  const {
    name,
    setName,
    email,
    setEmail,
    password,
    setPassword,
    showPassword,
    setShowPassword,
    clearFieldError,
    isLoading,
    handleSignup,
    displayError,
  } = useSignup();

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Background gradient */}
      <LinearGradient
        colors={['#0f0a1e', '#0a0a0f', '#0a0a0f']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        className="absolute inset-0"
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          contentContainerClassName="flex-grow px-5 pt-6 pb-10"
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <AuthHeader
            title="Create Account"
            subtitle="Join the sonic revolution today"
          />

          {/* Glass Form Card */}
          <View className="rounded-2xl overflow-hidden border border-white/10">
            <BlurView intensity={25} tint="dark" className="absolute inset-0" />
            <View className="p-5 gap-4">

              {/* Error Banner */}
              {displayError ? (
                <View className="bg-red-500/15 border border-red-500/30 rounded-xl px-4 py-3">
                  <Text className="text-red-400 text-sm">{displayError}</Text>
                </View>
              ) : null}

              {/* Full Name Field */}
              <View className="gap-1.5">
                <Text className="text-xs tracking-widest text-muted-foreground uppercase">
                  Full Name
                </Text>
                <View className="flex-row items-center bg-white/5 border border-white/10 rounded-xl px-3 h-12 gap-2">
                  <User size={18} color="#6b7280" />
                  <Input
                    className="flex-1 h-full border-0 bg-transparent shadow-none text-foreground"
                    placeholder="Ishan Ray"
                    placeholderTextColor="#6b7280"
                    value={name}
                    onChangeText={(t) => { setName(t); clearFieldError(); }}
                    autoCapitalize="words"
                    editable={!isLoading}
                  />
                </View>
              </View>

              {/* Email Field */}
              <View className="gap-1.5">
                <Text className="text-xs tracking-widest text-muted-foreground uppercase">
                  Email Address
                </Text>
                <View className="flex-row items-center bg-white/5 border border-white/10 rounded-xl px-3 h-12 gap-2">
                  <Mail size={18} color="#6b7280" />
                  <Input
                    className="flex-1 h-full border-0 bg-transparent shadow-none text-foreground"
                    placeholder="name@email.com"
                    placeholderTextColor="#6b7280"
                    value={email}
                    onChangeText={(t) => { setEmail(t); clearFieldError(); }}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!isLoading}
                  />
                </View>
              </View>

              {/* Password Field */}
              <View className="gap-1.5">
                <Text className="text-xs tracking-widest text-muted-foreground uppercase">
                  Password
                </Text>
                <View className="flex-row items-center bg-white/5 border border-white/10 rounded-xl px-3 h-12 gap-2">
                  <Lock size={18} color="#6b7280" />
                  <Input
                    className="flex-1 h-full border-0 bg-transparent shadow-none text-foreground"
                    placeholder="••••••••"
                    placeholderTextColor="#6b7280"
                    value={password}
                    onChangeText={(t) => { setPassword(t); clearFieldError(); }}
                    secureTextEntry={!showPassword}
                    editable={!isLoading}
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)} hitSlop={8}>
                    {showPassword ? (
                      <EyeOff size={18} color="#6b7280" />
                    ) : (
                      <Eye size={18} color="#6b7280" />
                    )}
                  </TouchableOpacity>
                </View>
              </View>

              {/* Signup Button */}
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={handleSignup}
                disabled={isLoading}
                className={cn('rounded-xl overflow-hidden mt-1', isLoading && 'opacity-60')}
              >
                <LinearGradient
                  colors={['#7c3aed', '#a78bfa']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  className="h-12 items-center justify-center"
                >
                  {isLoading ? (
                    <ActivityIndicator color="#000" size="small" />
                  ) : (
                    <Text className="text-black font-bold text-sm tracking-widest uppercase">
                      Sign Up
                    </Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              {/* Social Auth */}
              <SocialAuthButtons disabled={isLoading} />
            </View>
          </View>

          {/* Footer */}
          <AuthFooter
            prompt="Already have an account?"
            actionLabel="Login"
            onPress={() => router.push('/login')}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};
