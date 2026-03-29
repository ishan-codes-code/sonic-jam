import { Dimensions, StyleSheet } from 'react-native';
import { theme } from '../../../theme';

const { height } = Dimensions.get('window');

export const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.backgroundBase },
  scrollContent: {
    paddingVertical: 60,
    paddingHorizontal: 24,
    alignItems: 'center',
    minHeight: height,
  },
  logoContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 48 },
  header: { alignItems: 'center', marginBottom: 40 },
  title: { color: theme.colors.textPrimary, textAlign: 'center', marginBottom: 12 },
  subtitle: { color: theme.colors.textSecondary, textAlign: 'center', maxWidth: 240 },
  formCard: {
    width: '100%',
    padding: 24,
    borderRadius: theme.radius.xl,
    backgroundColor: theme.colors.backgroundCard,
  },
  errorBanner: {
    backgroundColor: 'rgba(255, 80, 80, 0.15)',
    borderRadius: theme.radius.md,
    padding: 12,
    marginBottom: 20,
  },
  errorText: { color: '#ff6b6b', fontSize: 13, textAlign: 'center' },
  inputWrapper: { marginBottom: 24 },
  inputLabel: { color: theme.colors.textSecondary, marginBottom: 10, fontSize: 12, letterSpacing: 1 },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.backgroundInteractive,
    borderRadius: theme.radius.md,
    paddingHorizontal: 16,
    height: 56,
  },
  inputContainerFocused: { backgroundColor: '#333333' },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, color: theme.colors.textPrimary, ...theme.typography.body, height: '100%' },
  signupBtnContainer: { width: '100%', marginVertical: 12, marginBottom: 32 },
  signupBtn: { height: 56, borderRadius: theme.radius.full, justifyContent: 'center', alignItems: 'center' },
  signupBtnDisabled: { opacity: 0.7 },
  signupBtnText: { color: 'black', fontSize: 16, fontWeight: '700', letterSpacing: 1 },
  dividerContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 32 },
  dividerLine: { flex: 1, height: 1, backgroundColor: theme.colors.outlineVariantAlpha },
  dividerText: { marginHorizontal: 16, color: theme.colors.textMuted, fontSize: 10, letterSpacing: 1 },
  socialContainer: { flexDirection: 'row', justifyContent: 'center', gap: 16 },
  socialBtn: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: theme.colors.backgroundInteractive,
    justifyContent: 'center',
    alignItems: 'center',
  },
  footer: { flexDirection: 'row', marginTop: 'auto', paddingTop: 32 },
});
