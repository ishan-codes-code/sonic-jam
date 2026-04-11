import { theme } from "@/src/theme";
import { StyleSheet } from "react-native";

const H_PAD = 16;


export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.backgroundBase,
  },
  scrollContent: {
    paddingTop: 24,
  },
  greetingSection: {
    paddingHorizontal: H_PAD,
    marginBottom: 32,
  },
  greetingText: {
    ...theme.typography.displayMedium,
    color: theme.colors.textPrimary,
    fontSize: 32,
    fontWeight: '700',
  },
  subGreetingText: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    marginTop: 4,
    fontSize: 16,
  },

});