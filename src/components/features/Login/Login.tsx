import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Eye, EyeOff, Lock, Mail, Music2 } from 'lucide-react-native';
import React from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GlassCard } from '../../ui/GlassCard';
import { GradientText } from '../../ui/GradientText';
import { theme } from '../../../theme';
import { useLoginLogic } from './Login.logic';
import { styles } from './Login.styles';

export const Login = () => {
  const router = useRouter();
  const {
    email,
    setEmail,
    password,
    setPassword,
    showPassword,
    setShowPassword,
    isEmailFocused,
    setIsEmailFocused,
    isPasswordFocused,
    setIsPasswordFocused,
    setFieldError,
    isLoading,
    handleLogin,
    displayError,
  } = useLoginLogic();

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Logo */}
          <View style={styles.logoContainer}>
            <Music2 color={theme.colors.secondaryAccent} size={32} />
            <GradientText
              text="SONICJAM"
              style={[theme.typography.headline, { letterSpacing: 3, marginLeft: 8 }]}
            />
          </View>

          {/* Header */}
          <View style={styles.header}>
            <Text style={[theme.typography.displayMedium, styles.title]}>Welcome Back</Text>
            <Text style={[theme.typography.body, styles.subtitle]}>
              Sign in to continue your sonic journey
            </Text>
          </View>

          {/* Form Card */}
          <GlassCard style={styles.formCard}>
            {/* Error Banner */}
            {displayError ? (
              <View style={styles.errorBanner}>
                <Text style={styles.errorText}>{displayError}</Text>
              </View>
            ) : null}

            {/* Email */}
            <View style={styles.inputWrapper}>
              <Text style={[theme.typography.label, styles.inputLabel]}>EMAIL ADDRESS</Text>
              <View style={[styles.inputContainer, isEmailFocused && styles.inputContainerFocused]}>
                <Mail
                  color={isEmailFocused ? theme.colors.secondaryAccent : theme.colors.textMuted}
                  size={20}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="name@email.com"
                  placeholderTextColor={theme.colors.textMuted}
                  value={email}
                  onChangeText={(t) => { setEmail(t); setFieldError(null); }}
                  onFocus={() => setIsEmailFocused(true)}
                  onBlur={() => setIsEmailFocused(false)}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!isLoading}
                />
              </View>
            </View>

            {/* Password */}
            <View style={styles.inputWrapper}>
              <Text style={[theme.typography.label, styles.inputLabel]}>PASSWORD</Text>
              <View
                style={[styles.inputContainer, isPasswordFocused && styles.inputContainerFocused]}
              >
                <Lock
                  color={isPasswordFocused ? theme.colors.secondaryAccent : theme.colors.textMuted}
                  size={20}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="••••••••"
                  placeholderTextColor={theme.colors.textMuted}
                  value={password}
                  onChangeText={(t) => { setPassword(t); setFieldError(null); }}
                  onFocus={() => setIsPasswordFocused(true)}
                  onBlur={() => setIsPasswordFocused(false)}
                  secureTextEntry={!showPassword}
                  editable={!isLoading}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  {showPassword ? (
                    <EyeOff color={theme.colors.textMuted} size={20} />
                  ) : (
                    <Eye color={theme.colors.textMuted} size={20} />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Forgot Password */}
            <TouchableOpacity style={styles.forgotBtn}>
              <Text style={[theme.typography.label, styles.forgotText]}>FORGOT PASSWORD?</Text>
            </TouchableOpacity>

            {/* Login Button */}
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handleLogin}
              style={styles.loginBtnContainer}
              disabled={isLoading}
            >
              <LinearGradient
                colors={[theme.colors.primaryAccent, theme.colors.secondaryAccent]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.loginBtn, isLoading && styles.loginBtnDisabled]}
              >
                {isLoading ? (
                  <ActivityIndicator color="black" size="small" />
                ) : (
                  <Text style={styles.loginBtnText}>LOGIN</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.dividerContainer}>
              <View style={styles.dividerLine} />
              <Text style={[theme.typography.label, styles.dividerText]}>OR CONTINUE WITH</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Social Buttons */}
            <View style={styles.socialContainer}>
              <TouchableOpacity style={styles.socialBtn}>
                <Ionicons name="logo-google" color={theme.colors.textPrimary} size={28} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.socialBtn}>
                <Ionicons name="logo-apple" color={theme.colors.textPrimary} size={28} />
              </TouchableOpacity>
            </View>
          </GlassCard>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={[theme.typography.body, { color: theme.colors.textSecondary }]}>
              Don&apos;t have an account?{' '}
            </Text>
            <TouchableOpacity onPress={() => router.push('/signup')}>
              <Text
                style={[
                  theme.typography.body,
                  { color: theme.colors.secondaryAccent, fontWeight: 'bold' },
                ]}
              >
                Create Account
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};
