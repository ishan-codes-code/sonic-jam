import React, { useEffect, useRef, useState } from 'react';
import { StatusBar, Text, View, Animated, Easing, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useVersionStore } from '../store/versionStore';
import * as Updates from 'expo-updates';

export const OTAUpdateScreen = () => {
    const {
        isOtaForce,
        otaUpdateStep,
        setOtaUpdateStep,
        otaUpdateError,
        setOtaUpdateError,
        otaDownloadProgress,
        setOtaDownloadProgress,
        resetOtaUpdate
    } = useVersionStore();

    const [retryCount, setRetryCount] = useState(0);

    // Animators
    const slideAnim = useRef(new Animated.Value(-1)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const progressBarWidth = useRef(new Animated.Value(0)).current;

    // Trigger initial fade-in
    useEffect(() => {
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 400,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
        }).start();

        Animated.loop(
            Animated.timing(slideAnim, {
                toValue: 4,
                duration: 1600,
                easing: Easing.inOut(Easing.cubic),
                useNativeDriver: true,
            })
        ).start();
    }, []);

    // Animate the progress bar width based on download progress (0 - 100)
    useEffect(() => {
        Animated.timing(progressBarWidth, {
            toValue: otaDownloadProgress / 100,
            duration: 400,
            easing: Easing.out(Easing.quad),
            useNativeDriver: false,
        }).start();
    }, [otaDownloadProgress]);

    // Updater Effect
    useEffect(() => {
        let isMounted = true;

        const runUpdate = async () => {
            try {
                if (__DEV__) {
                    // DEV MODE SIMULATION
                    console.log('[OTAUpdateScreen] DEV mode detected. Running simulated update flow.');

                    setOtaUpdateStep('checking');
                    setOtaDownloadProgress(10);
                    await new Promise((r) => setTimeout(r, 1200));

                    if (!isMounted) return;
                    setOtaUpdateStep('downloading');

                    // Animate simulated download progress
                    for (let p = 25; p <= 85; p += 20) {
                        setOtaDownloadProgress(p);
                        await new Promise((r) => setTimeout(r, 500));
                        if (!isMounted) return;
                    }

                    setOtaUpdateStep('installing');
                    setOtaDownloadProgress(90);
                    await new Promise((r) => setTimeout(r, 1200));

                    if (!isMounted) return;
                    setOtaUpdateStep('restarting');
                    setOtaDownloadProgress(100);
                    await new Promise((r) => setTimeout(r, 800));

                    if (!isMounted) return;
                    console.log('[OTAUpdateScreen] Simulated update complete. Reloading bundle.');
                    try {
                        await Updates.reloadAsync();
                    } catch (e) {
                        console.warn('[OTAUpdateScreen] Simulated reloadAsync failed (normal in dev):', e);
                        resetOtaUpdate();
                    }
                    return;
                }

                // PRODUCTION MODE
                setOtaUpdateStep('checking');
                setOtaDownloadProgress(10);

                const update = await Updates.checkForUpdateAsync();

                if (!isMounted) return;

                if (!update.isAvailable) {
                    setOtaDownloadProgress(100);
                    setOtaUpdateStep('restarting');
                    await new Promise((r) => setTimeout(r, 800));
                    resetOtaUpdate();
                    return;
                }

                setOtaUpdateStep('downloading');
                setOtaDownloadProgress(30);

                // Start actual fetching
                // expo-updates does not give granular fetch progress, so we can animate it smoothly to 80% while fetching
                let currentProgress = 30;
                const fakeProgressInterval = setInterval(() => {
                    if (isMounted && currentProgress < 80) {
                        currentProgress += 5;
                        setOtaDownloadProgress(currentProgress);
                    }
                }, 400);

                await Updates.fetchUpdateAsync();
                clearInterval(fakeProgressInterval);

                if (!isMounted) return;
                setOtaUpdateStep('installing');
                setOtaDownloadProgress(90);
                await new Promise((r) => setTimeout(r, 1000));

                if (!isMounted) return;
                setOtaUpdateStep('restarting');
                setOtaDownloadProgress(100);
                await new Promise((r) => setTimeout(r, 500));

                await Updates.reloadAsync();
            } catch (err: any) {
                console.error('[OTAUpdateScreen] Error running foreground OTA update:', err);
                if (isMounted) {
                    setOtaUpdateError(err.message || 'An error occurred while downloading the update.');
                }
            }
        };

        runUpdate();

        return () => {
            isMounted = false;
        };
    }, [retryCount]);

    const handleRetry = () => {
        setOtaUpdateStep('checking');
        setOtaDownloadProgress(0);
        setOtaUpdateError(null);
        setRetryCount((prev) => prev + 1);
    };

    const handleCancel = () => {
        resetOtaUpdate();
    };

    // Helper text and descriptions based on step
    let stepTitle = 'Updating Sonic';
    let stepDescription = "Don't close the app. This'll just take a moment.";

    if (otaUpdateStep === 'checking') {
        stepTitle = 'Checking for updates…';
        stepDescription = 'Fetching the latest version details.';
    } else if (otaUpdateStep === 'downloading') {
        stepTitle = 'Downloading update…';
        stepDescription = `Downloading the latest features (${otaDownloadProgress}%).`;
    } else if (otaUpdateStep === 'installing') {
        stepTitle = 'Installing update…';
        stepDescription = 'Applying adjustments and configuring files.';
    } else if (otaUpdateStep === 'restarting') {
        stepTitle = 'Restarting app…';
        stepDescription = 'Launching the updated experience.';
    } else if (otaUpdateStep === 'error') {
        stepTitle = 'Update failed';
        stepDescription = otaUpdateError || 'An unexpected error occurred. Please check your connection.';
    }

    const translateX = slideAnim.interpolate({
        inputRange: [0, 4],
        outputRange: ['-100%', '400%'],
    });

    const isError = otaUpdateStep === 'error';
    const isOptional = !isOtaForce; // If it's not a forced update, it's optional

    return (
        <View className="flex-1 bg-[#0a0a0a]">
            <StatusBar barStyle="light-content" backgroundColor="#0a0a0a" />

            <SafeAreaView className="flex-1 items-center justify-center px-6">
                <Animated.View className="w-full items-center" style={{ opacity: fadeAnim }}>

                    {/* Logo / Header */}
                    <Text className="mb-12 text-[32px] font-display text-white">
                        Sonic
                    </Text>

                    {isError ? (
                        /* ERROR VIEW */
                        <View className="w-full items-center">
                            {/* Warn Icon */}
                            <View className="mb-6 h-[54px] w-[54px] items-center justify-center rounded-2xl border border-rose-500/20 bg-rose-500/10">
                                <Text className="text-xl font-bold text-rose-500">!</Text>
                            </View>

                            <Text className="mb-2 text-lg font-heading text-stone-100">
                                {stepTitle}
                            </Text>
                            <Text className="mb-10 text-[13px] leading-5 text-neutral-600 text-center max-w-[260px]">
                                {stepDescription}
                            </Text>

                            {/* Buttons */}
                            <View className="w-full max-w-[240px] gap-3">
                                <TouchableOpacity
                                    onPress={handleRetry}
                                    activeOpacity={0.8}
                                    className="w-full rounded-2xl bg-amber-300 py-[15px]"
                                >
                                    <Text className="text-center text-sm font-sans-bold text-[#0a0a0a]">
                                        Try again
                                    </Text>
                                </TouchableOpacity>

                                {isOptional && (
                                    <TouchableOpacity
                                        onPress={handleCancel}
                                        activeOpacity={0.8}
                                        className="w-full rounded-2xl border border-white/[0.06] py-[13px]"
                                    >
                                        <Text className="text-center text-sm font-sans text-neutral-500">
                                            Skip for now
                                        </Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        </View>
                    ) : (
                        /* PROGRESS VIEW */
                        <View className="w-full items-center">
                            {/* Sliding bar track */}
                            <View className="mb-8 h-[3px] w-[200px] overflow-hidden rounded-full bg-white/[0.06] relative">
                                {otaUpdateStep === 'checking' ? (
                                    <Animated.View
                                        className="h-full w-1/2 rounded-full bg-amber-300"
                                        style={{ transform: [{ translateX }] }}
                                    />
                                ) : (
                                    <Animated.View
                                        className="h-full rounded-full bg-amber-300"
                                        style={{
                                            width: progressBarWidth.interpolate({
                                                inputRange: [0, 1],
                                                outputRange: ['0%', '100%'],
                                            })
                                        }}
                                    />
                                )}
                            </View>

                            <Text className="mb-2 text-lg font-heading text-stone-100">
                                {stepTitle}
                            </Text>
                            <Text className="text-[13px] leading-5 text-neutral-600 text-center">
                                {stepDescription}
                            </Text>

                            {/* Optional: Add cancel/skip button during loading if it's optional */}
                            {isOptional && otaUpdateStep !== 'restarting' && (
                                <TouchableOpacity
                                    onPress={handleCancel}
                                    activeOpacity={0.8}
                                    className="mt-12 rounded-full border border-white/[0.04] bg-white/[0.02] px-5 py-2"
                                >
                                    <Text className="text-[11px] font-sans text-neutral-500 uppercase tracking-wider">
                                        Cancel
                                    </Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    )}

                </Animated.View>
            </SafeAreaView>
        </View>
    );
};