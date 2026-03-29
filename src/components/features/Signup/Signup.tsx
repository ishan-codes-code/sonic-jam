import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Eye, EyeOff, Lock, Mail, Music2, User } from 'lucide-react-native';
import React from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GlassCard } from '../../ui/GlassCard';
import { GradientText } from '../../ui/GradientText';
import { theme } from '../../../theme';
import { useSignupLogic } from './Signup.logic';
import { styles } from './Signup.styles';

export const Signup = () => {
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
    focusedField,
    setFocusedField,
    clearFieldError,
    isLoading,
    handleSignup,
    displayError,
  } = useSignupLogic();

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
            <Text style={[theme.typography.displayMedium, styles.title]}>Create Account</Text>
            <Text style={[theme.typography.body, styles.subtitle]}>
              Join the sonic revolution today
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

            {/* Name */}
            <View style={styles.inputWrapper}>
              <Text style={[theme.typography.label, styles.inputLabel]}>FULL NAME</Text>
              <View
                style={[styles.inputContainer, focusedField === 'name' && styles.inputContainerFocused]}
              >
                <User
                  color={focusedField === 'name' ? theme.colors.secondaryAccent : theme.colors.textMuted}
                  size={20}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Ishan Ray"
                  placeholderTextColor={theme.colors.textMuted}
                  value={name}
                  onChangeText={(t) => { setName(t); clearFieldError(); }}
                  onFocus={() => setFocusedField('name')}
                  onBlur={() => setFocusedField(null)}
                  editable={!isLoading}
                />
              </View>
            </View>

            {/* Email */}
            <View style={styles.inputWrapper}>
              <Text style={[theme.typography.label, styles.inputLabel]}>EMAIL ADDRESS</Text>
              <View
                style={[styles.inputContainer, focusedField === 'email' && styles.inputContainerFocused]}
              >
                <Mail
                  color={focusedField === 'email' ? theme.colors.secondaryAccent : theme.colors.textMuted}
                  size={20}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="name@email.com"
                  placeholderTextColor={theme.colors.textMuted}
                  value={email}
                  onChangeText={(t) => { setEmail(t); clearFieldError(); }}
                  onFocus={() => setFocusedField('email')}
                  onBlur={() => setFocusedField(null)}
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
                style={[styles.inputContainer, focusedField === 'password' && styles.inputContainerFocused]}
              >
                <Lock
                  color={focusedField === 'password' ? theme.colors.secondaryAccent : theme.colors.textMuted}
                  size={20}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="••••••••"
                  placeholderTextColor={theme.colors.textMuted}
                  value={password}
                  onChangeText={(t) => { setPassword(t); clearFieldError(); }}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
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

            {/* Signup Button */}
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handleSignup}
              style={styles.signupBtnContainer}
              disabled={isLoading}
            >
              <LinearGradient
                colors={[theme.colors.primaryAccent, theme.colors.secondaryAccent]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.signupBtn, isLoading && styles.signupBtnDisabled]}
              >
                {isLoading ? (
                  <ActivityIndicator color="black" size="small" />
                ) : (
                  <Text style={styles.signupBtnText}>SIGN UP</Text>
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
              Already have an account?{' '}
            </Text>
            <TouchableOpacity onPress={() => router.push('/login')}>
              <Text
                style={[
                  theme.typography.body,
                  { color: theme.colors.secondaryAccent, fontWeight: 'bold' },
                ]}
              >
                Login
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};
