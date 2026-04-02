import { theme } from '@/src/theme';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useRef, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import {
    Animated,
    Dimensions,
    KeyboardAvoidingView,
    Modal,
    Platform,
    StatusBar,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    View
} from 'react-native';
import AnimatedPressable from '../../ui/AnimatedPressable';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── Music Note SVG Icon (inline as a styled View) ───────────────────────────
const PlaylistIcon: React.FC = () => (
    <View style={iconStyles.wrapper}>
        <LinearGradient
            colors={[theme.colors.primaryAccent, theme.colors.secondaryAccent]}
            style={iconStyles.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
        >
            {/* Simple music note shape using Views */}
            <View style={iconStyles.noteBody} />
            <View style={iconStyles.noteStem} />
            <View style={iconStyles.noteFlag} />
        </LinearGradient>
    </View>
);

const iconStyles = StyleSheet.create({
    wrapper: {
        marginBottom: theme.spacing.lg,
        shadowColor: theme.colors.primaryAccent,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.45,
        shadowRadius: 12,
        elevation: 8,
    },
    gradient: {
        width: 56,
        height: 56,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    noteBody: {
        width: 10,
        height: 8,
        borderRadius: 5,
        backgroundColor: 'rgba(255,255,255,0.95)',
        position: 'absolute',
        bottom: 14,
        left: 15,
    },
    noteStem: {
        width: 2.5,
        height: 18,
        borderRadius: 2,
        backgroundColor: 'rgba(255,255,255,0.95)',
        position: 'absolute',
        bottom: 18,
        left: 23,
    },
    noteFlag: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: 'rgba(255,255,255,0.95)',
        position: 'absolute',
        top: 13,
        left: 23,
    },
});

// ─── Animated Underline ───────────────────────────────────────────────────────
const AnimatedUnderline: React.FC<{ focused: boolean }> = ({ focused }) => {
    const anim = useRef(new Animated.Value(0)).current;

    React.useEffect(() => {
        Animated.timing(anim, {
            toValue: focused ? 1 : 0,
            duration: 200,
            useNativeDriver: false,
        }).start();
    }, [focused]);

    const color = anim.interpolate({
        inputRange: [0, 1],
        outputRange: [theme.colors.outlineVariant, theme.colors.primaryAccent],
    });

    const widthInterp = anim.interpolate({
        inputRange: [0, 1],
        outputRange: ['60%', '100%'],
    });

    return (
        <View style={styles.underlineTrack}>
            <Animated.View
                style={[
                    styles.underline,
                    {
                        backgroundColor: color,
                        width: widthInterp,
                    },
                ]}
            />
        </View>
    );
};

// ─── Character Counter ────────────────────────────────────────────────────────
const CharCounter: React.FC<{ current: number; max: number }> = ({ current, max }) => {
    const nearLimit = current > max * 0.8;
    return (
        <Text style={[styles.charCount, nearLimit && styles.charCountWarning]}>
            {current}/{max}
        </Text>
    );
};

// ─── Divider ─────────────────────────────────────────────────────────────────
const Divider: React.FC = () => <View style={styles.divider} />;

// ─── Main Modal Component ─────────────────────────────────────────────────────
interface AddPlaylistModalProps {
    visible: boolean;
    defaultName?: string;
    onCancel: () => void;
    onCreate: (data: { name: string; description?: string; isPublic?: boolean }) => void;
    isCreating?: boolean;
}

const AddPlaylistModal: React.FC<AddPlaylistModalProps> = ({
    visible,
    defaultName = 'My playlist #5',
    onCancel,
    onCreate,
    isCreating = false,
}) => {
    const [nameFocused, setNameFocused] = useState(false);
    const [descFocused, setDescFocused] = useState(false);

    const { control, handleSubmit, formState: { errors } } = useForm<{
        name: string;
        description: string;
        isPublic: boolean;
    }>({
        defaultValues: {
            name: defaultName,
            description: '',
            isPublic: false,
        },
    });

    const isPublicValue = useWatch({ control, name: 'isPublic', defaultValue: false });

    // Animation values
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0.92)).current;
    const translateY = useRef(new Animated.Value(30)).current;

    const [modalVisible, setModalVisible] = useState(false);

    // Open animation
    React.useEffect(() => {
        if (visible) {
            setModalVisible(true);
            // Form will reset via defaultValues
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 280,
                    useNativeDriver: true,
                }),
                Animated.spring(scaleAnim, {
                    toValue: 1,
                    damping: 20,
                    stiffness: 250,
                    useNativeDriver: true,
                }),
                Animated.spring(translateY, {
                    toValue: 0,
                    damping: 22,
                    stiffness: 280,
                    useNativeDriver: true,
                }),
            ]).start();
        } else {
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 0,
                    duration: 190,
                    useNativeDriver: true,
                }),
                Animated.timing(scaleAnim, {
                    toValue: 0.94,
                    duration: 190,
                    useNativeDriver: true,
                }),
                Animated.timing(translateY, {
                    toValue: 18,
                    duration: 190,
                    useNativeDriver: true,
                }),
            ]).start(() => setModalVisible(false));
        }
    }, [visible]);

    const handleCancel = useCallback(() => {
        onCancel();
    }, [onCancel]);

    const handleScrimPress = useCallback(() => {
        handleCancel();
    }, [handleCancel]);

    return (
        <Modal
            visible={modalVisible}
            transparent
            statusBarTranslucent
            animationType="none"
            onRequestClose={handleCancel}
        >
            <StatusBar backgroundColor="transparent" translucent barStyle="light-content" />

            {/* Scrim — semi-opaque overlay, not a gradient */}
            <View style={styles.scrim}>
                {/* <AnimatedPressable
                    pressableStyle={StyleSheet.absoluteFillObject}
                    onPress={handleScrimPress}
                    feedback="none"
                    accessibilityLabel="Dismiss modal"
                /> */}

                <KeyboardAvoidingView
                    style={styles.keyboardView}
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    pointerEvents="box-none"
                >
                    <Animated.View
                        style={[
                            styles.card,
                            {
                                opacity: fadeAnim,
                                transform: [{ scale: scaleAnim }, { translateY }],
                            },
                        ]}
                        onStartShouldSetResponder={() => true}
                    >
                        {/* Subtle top gradient bar */}
                        <LinearGradient
                            colors={[theme.colors.primaryAccent + '30', 'transparent']}
                            style={styles.cardTopGlow}
                            start={{ x: 0.5, y: 0 }}
                            end={{ x: 0.5, y: 1 }}
                            pointerEvents="none"
                        />

                        {/* Icon + Title */}
                        <PlaylistIcon />
                        <Text style={styles.title}>New Playlist</Text>
                        <Text style={styles.subtitle}>Give your collection a name</Text>

                        <Divider />

                        {/* Name Input */}
                        <View style={styles.fieldGroup}>
                            <Text style={styles.fieldLabel}>NAME</Text>
                            <Controller
                                control={control}
                                name="name"
                                rules={{
                                    required: 'Name is required',
                                    maxLength: { value: 100, message: 'Max 100 characters' },
                                }}
                                render={({ field: { onChange, onBlur, value } }) => (
                                    <View style={[styles.inputWrapper, nameFocused && styles.inputWrapperFocused]}>
                                        <TextInput
                                            style={styles.input}
                                            value={value}
                                            onChangeText={onChange}
                                            onFocus={() => setNameFocused(true)}
                                            onBlur={() => {
                                                setNameFocused(false);
                                                onBlur();
                                            }}
                                            autoFocus
                                            selectTextOnFocus
                                            maxLength={100}
                                            selectionColor={theme.colors.primaryAccent}
                                            cursorColor={theme.colors.primaryAccent}
                                            placeholderTextColor={theme.colors.textSecondary}
                                            returnKeyType="next"
                                            accessibilityLabel="Playlist name input"
                                            accessibilityHint="Type a name for your new playlist"
                                        />
                                        <CharCounter current={value.length} max={100} />
                                    </View>
                                )}
                            />
                            <AnimatedUnderline focused={nameFocused} />
                            {errors.name && <Text style={styles.errorText}>{errors.name.message}</Text>}
                        </View>

                        {/* Description Input */}
                        <View style={styles.fieldGroup}>
                            <Text style={styles.fieldLabel}>DESCRIPTION <Text style={styles.optionalTag}>optional</Text></Text>
                            <Controller
                                control={control}
                                name="description"
                                rules={{
                                    maxLength: { value: 200, message: 'Max 200 characters' },
                                }}
                                render={({ field: { onChange, onBlur, value } }) => (
                                    <View style={[styles.descriptionWrapper, descFocused && styles.inputWrapperFocused]}>
                                        <TextInput
                                            style={styles.descriptionInput}
                                            value={value}
                                            onChangeText={onChange}
                                            placeholder="What's this playlist about?"
                                            placeholderTextColor={theme.colors.textMuted}
                                            maxLength={200}
                                            multiline
                                            numberOfLines={2}
                                            onFocus={() => setDescFocused(true)}
                                            onBlur={() => {
                                                setDescFocused(false);
                                                onBlur();
                                            }}
                                            selectionColor={theme.colors.primaryAccent}
                                            cursorColor={theme.colors.primaryAccent}
                                            accessibilityLabel="Playlist description input"
                                            accessibilityHint="Type a description for your playlist"
                                        />
                                        <CharCounter current={value.length} max={200} />
                                    </View>
                                )}
                            />
                            {errors.description && <Text style={styles.errorText}>{errors.description.message}</Text>}
                        </View>

                        <Divider />

                        {/* Public toggle */}
                        <View style={styles.publicToggle}>
                            <View style={styles.publicToggleLeft}>
                                <Text style={styles.publicText}>Make public</Text>
                                <Text style={styles.publicSubtext}>
                                    {isPublicValue ? 'Anyone can find this playlist' : 'Only you can see this'}
                                </Text>
                            </View>
                            <Controller
                                control={control}
                                name="isPublic"
                                render={({ field: { onChange, value } }) => (
                                    <Switch
                                        value={value}
                                        onValueChange={onChange}
                                        trackColor={{ false: theme.colors.outlineVariant, true: theme.colors.primaryAccent }}
                                        thumbColor={value ? theme.colors.onPrimary : theme.colors.textSecondary}
                                        accessibilityLabel="Toggle playlist visibility"
                                        accessibilityRole="switch"
                                    />
                                )}
                            />
                        </View>

                        <Divider />

                        {/* Buttons */}
                        <View style={styles.buttons}>
                            <AnimatedPressable
                                pressableStyle={styles.cancelBtn}
                                onPress={handleCancel}
                                feedback="timing"
                                pressedOpacity={0.65}
                                scaleTo={0.97}
                                accessibilityLabel="Cancel"
                                accessibilityRole="button"
                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                disabled={isCreating}
                            >
                                <Text style={styles.cancelBtnText}>Cancel</Text>
                            </AnimatedPressable>

                            <LinearGradient
                                colors={[theme.colors.primaryAccent, theme.colors.secondaryAccent]}
                                style={styles.createBtnGradient}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                            >
                                <AnimatedPressable
                                    pressableStyle={styles.createBtn}
                                    feedback="timing"
                                    pressedOpacity={0.8}
                                    scaleTo={0.97}
                                    accessibilityLabel="Create playlist"
                                    accessibilityRole="button"
                                    onPress={handleSubmit(onCreate)}
                                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                    disabled={isCreating}
                                >
                                    <Text style={styles.createBtnText}>
                                        {isCreating ? 'Creating...' : 'Create'}
                                    </Text>
                                </AnimatedPressable>
                            </LinearGradient>
                        </View>
                    </Animated.View>
                </KeyboardAvoidingView>
            </View>
        </Modal>
    );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const CARD_WIDTH = SCREEN_WIDTH * 0.88;

const styles = StyleSheet.create({
    scrim: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.72)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    keyboardView: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        pointerEvents: 'box-none',
    } as any,
    card: {
        width: CARD_WIDTH,
        borderRadius: 20,
        paddingTop: 32,
        paddingBottom: 24,
        paddingHorizontal: 24,
        alignItems: 'center',
        backgroundColor: theme.colors.backgroundInteractive,
        // Card elevation / shadow
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 16 },
        shadowOpacity: 0.55,
        shadowRadius: 32,
        elevation: 24,
        overflow: 'hidden',
        // Subtle glass border
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.07)',
    },
    cardTopGlow: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 80,
        borderRadius: 20,
    },
    title: {
        ...theme.typography.headline,
        color: theme.colors.textPrimary,
        fontSize: 22,
        fontWeight: '800',
        letterSpacing: -0.3,
        marginBottom: 4,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 13,
        color: theme.colors.textSecondary,
        textAlign: 'center',
        letterSpacing: 0.1,
        marginBottom: 20,
    },
    divider: {
        width: '100%',
        height: 1,
        backgroundColor: 'rgba(255,255,255,0.07)',
        marginVertical: 16,
    },
    fieldGroup: {
        width: '100%',
        marginBottom: 12,
    },
    fieldLabel: {
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 1.2,
        color: theme.colors.textSecondary,
        marginBottom: 6,
    },
    optionalTag: {
        fontSize: 10,
        fontWeight: '400',
        letterSpacing: 0.4,
        color: theme.colors.textMuted,
        textTransform: 'lowercase',
    },
    inputWrapper: {
        width: '100%',
        flexDirection: 'row',
        alignItems: 'center',
        paddingBottom: 4,
    },
    inputWrapperFocused: {
        // Visual focus hint managed by underline
    },
    input: {
        flex: 1,
        fontSize: 22,
        fontWeight: '700',
        color: theme.colors.textPrimary,
        paddingVertical: 4,
        paddingHorizontal: 0,
        letterSpacing: -0.2,
    },
    underlineTrack: {
        width: '100%',
        height: 2,
        backgroundColor: theme.colors.outlineVariant + '40',
        borderRadius: 1,
        alignItems: 'center',
        overflow: 'hidden',
    },
    underline: {
        height: 2,
        alignSelf: 'center',
        borderRadius: 1,
    },
    descriptionWrapper: {
        width: '100%',
        backgroundColor: theme.colors.backgroundBase,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
        paddingHorizontal: 14,
        paddingTop: 10,
        paddingBottom: 8,
    },
    descriptionInput: {
        fontSize: 14,
        fontWeight: '400',
        color: theme.colors.textPrimary,
        width: '100%',
        minHeight: 52,
        textAlignVertical: 'top',
        lineHeight: 20,
    },
    charCount: {
        fontSize: 10,
        color: theme.colors.textMuted,
        alignSelf: 'flex-end',
        marginTop: 2,
    },
    charCountWarning: {
        color: theme.colors.primaryAccent,
    },
    errorText: {
        fontSize: 12,
        color: theme.colors.error,
        marginTop: 4,
        alignSelf: 'flex-start',
    },
    publicToggle: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        paddingVertical: 2,
    },
    publicToggleLeft: {
        flex: 1,
        marginRight: 16,
    },
    publicText: {
        fontSize: 15,
        fontWeight: '600',
        color: theme.colors.textPrimary,
        marginBottom: 2,
    },
    publicSubtext: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        lineHeight: 16,
    },
    buttons: {
        flexDirection: 'row',
        width: '100%',
        gap: 10,
        marginTop: 4,
        justifyContent: "space-between"
    },
    cancelBtn: {
        flex: 1,
        paddingVertical: 14,
        paddingHorizontal: 14,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.14)',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.colors.backgroundBase,
    },
    cancelBtnText: {
        fontSize: 15,
        fontWeight: '600',
        color: theme.colors.textPrimary,
        letterSpacing: 0.2,
    },
    createBtnGradient: {
        flex: 1,
        borderRadius: 14,
        shadowColor: theme.colors.primaryAccent,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
        elevation: 6,
    },
    createBtn: {
        paddingVertical: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    createBtnText: {
        fontSize: 15,
        fontWeight: '700',
        color: theme.colors.backgroundBase,
        letterSpacing: 0.4,
    },
});

export default AddPlaylistModal;