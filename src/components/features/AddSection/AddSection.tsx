import { X } from 'lucide-react-native';
import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { theme } from '../../../theme';
import { useAddSectionLogic } from './AddSection.logic';
import { styles } from './AddSection.styles';

const HandleBar = () => <View style={styles.handleBar} />;

const SectionHeader = ({
  onClose,
}: {
  onClose: () => void;
}) => (
  <View style={styles.header}>
    <View style={styles.headerBtnPlaceholder} />
    <Text style={styles.headerTitle}>Add New Section</Text>
    <TouchableOpacity onPress={onClose} style={styles.headerBtn} activeOpacity={0.7}>
      <X size={22} color={theme.colors.textSecondary} />
    </TouchableOpacity>
  </View>
);

export const AddSection = () => {
  const {
    router,
    value,
    setValue,
    customTitle,
    setCustomTitle,
    inputError,
    setInputError,
    isSubmitting,
    handleConfirm,
    footerBottom,
  } = useAddSectionLogic();

  return (
    <View style={styles.root}>
      <View style={styles.container}>
        <HandleBar />

        <SectionHeader onClose={() => router.back()} />

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardContainer}
          keyboardVerticalOffset={0}
        >
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={styles.formContent}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.infoBox}>
              <Text style={styles.infoText}>
                Your section will be added to the Explore home screen as a horizontal strip.
              </Text>
            </View>

            <Text style={styles.label}>Source</Text>
            <View style={[styles.inputRow, inputError ? styles.inputRowError : null]}>
              <TextInput
                style={styles.input}
                placeholder="YouTube search keyword or playlist URL"
                placeholderTextColor={theme.colors.textMuted}
                value={value}
                onChangeText={(t) => {
                  setValue(t);
                  if (inputError) setInputError('');
                }}
                autoCorrect={false}
                autoCapitalize="none"
              />
              {value.length > 0 && (
                <TouchableOpacity onPress={() => setValue('')}>
                  <X size={16} color={theme.colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>
            {inputError ? <Text style={styles.errorText}>{inputError}</Text> : null}

            <Text style={[styles.label, { marginTop: 24 }]}>
              Custom Label <Text style={styles.optional}>(optional)</Text>
            </Text>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                placeholder="E.g. Daily Chill"
                placeholderTextColor={theme.colors.textMuted}
                value={customTitle}
                onChangeText={setCustomTitle}
                autoCorrect={true}
              />
            </View>

            <View style={{ height: 40 }} />
          </ScrollView>

          {/* Fixed Footer */}
          <View style={[styles.footer, { paddingBottom: footerBottom }]}>
            <TouchableOpacity
              style={[styles.primaryBtn, isSubmitting && { opacity: 0.7 }]}
              onPress={handleConfirm}
              activeOpacity={0.8}
              disabled={isSubmitting}
            >
              <Text style={styles.primaryBtnText}>
                {isSubmitting ? 'Creating...' : 'Create Section'}
              </Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </View>
  );
};
