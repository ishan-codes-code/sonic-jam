import { FlashMessage } from "@/src/components/ui/FlashMessage";
import { useFlashMessage, useWithFlash } from "@/src/hooks/useFlashMessage";
import React, { useState } from "react";
import {
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

export default function Demos() {
    const { show, hide, setProgress } = useFlashMessage();
    const { withFlash } = useWithFlash();

    // Local state demo
    const [isLoading, setIsLoading] = useState(false);

    const simulateUpload = async () => {
        show({ message: "Uploading file…", type: "uploading", progress: 0 });
        for (let i = 0; i <= 100; i += 10) {
            await delay(180);
            setProgress(i);
        }
        show({ message: "Upload complete!", type: "success", autoDismissMs: 2500 });
    };

    const simulateDownload = async () => {
        show({ message: "Downloading…", type: "downloading", progress: 0 });
        for (let i = 0; i <= 100; i += 5) {
            await delay(120);
            setProgress(i);
        }
        show({ message: "Download complete!", type: "success", autoDismissMs: 2500 });
    };

    const simulateLocalLoading = async () => {
        setIsLoading(true);
        await delay(3000);
        setIsLoading(false);
    };

    return (
        <SafeAreaView style={s.root}>
            <ScrollView contentContainerStyle={s.scroll}>
                <Text style={s.heading}>Flash Messages</Text>
                <Text style={s.sub}>Pill style · all variants</Text>

                {/* Persistent */}
                <Section title="Persistent (loading state)">
                    <Btn label="Loading" onPress={() => show({ message: "Loading content…", type: "loading" })} />
                    <Btn label="Hide" onPress={hide} color="#52525B" />
                    <Btn label="Upload %" onPress={simulateUpload} color="#5AC8FA" />
                    <Btn label="Download %" onPress={simulateDownload} color="#34C759" />
                </Section>

                {/* Auto-dismiss */}
                <Section title="Auto-dismiss">
                    <Btn label="Success" onPress={() => show({ message: "Changes saved successfully!", type: "success", autoDismissMs: 3000 })} color="#34C759" />
                    <Btn label="Error" onPress={() => show({ message: "Something went wrong.", type: "error", autoDismissMs: 4000, dismissible: true })} color="#FF3B30" />
                    <Btn label="Warning" onPress={() => show({ message: "Storage almost full.", type: "warning", autoDismissMs: 4000, dismissible: true })} color="#FF9500" />
                    <Btn label="Info" onPress={() => show({ message: "New update available.", type: "info", autoDismissMs: 3500, dismissible: true })} color="#5AC8FA" />
                </Section>

                {/* withFlash */}
                <Section title="withFlash() wrapper">
                    <Btn
                        label="Success flow"
                        onPress={() =>
                            withFlash(() => delay(2500), {
                                loading: "Syncing data…",
                                success: "All synced!",
                                error: "Sync failed.",
                            })
                        }
                        color="#34C759"
                    />
                    <Btn
                        label="Error flow"
                        onPress={() =>
                            withFlash(() => delayReject(2000), {
                                loading: "Submitting…",
                                success: "Done!",
                                error: "Submission failed.",
                            }).catch(() => { })
                        }
                        color="#FF3B30"
                    />
                </Section>

                {/* Position */}
                <Section title="Position">
                    <Btn label="Top" onPress={() => show({ message: "Appears at top!", type: "info", position: "top", autoDismissMs: 3000 })} />
                    <Btn label="Bottom" onPress={() => show({ message: "Appears at bottom!", type: "info", position: "bottom", autoDismissMs: 3000 })} />
                </Section>

                {/* Local state pattern */}
                <Section title="Local state (visible={isLoading})">
                    <Text style={s.hint}>
                        The pill persists exactly as long as <Text style={{ color: "#5AC8FA" }}>isLoading === true</Text>
                    </Text>
                    <Btn label={isLoading ? "Loading…" : "Start (3 sec)"} onPress={isLoading ? undefined : simulateLocalLoading} />
                    {/* ← Key pattern: visible tied directly to state */}
                    <FlashMessage visible={isLoading} message="Fetching your data…" type="loading" />
                </Section>

                <View style={{ height: 100 }} />
            </ScrollView>
        </SafeAreaView>
    );
}



// ─── Helpers ──────────────────────────────────────────────────────────────────

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const delayReject = (ms: number) => new Promise<void>((_, rej) => setTimeout(rej, ms));

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <View style={s.section}>
            <Text style={s.sectionTitle}>{title}</Text>
            <View style={s.btnGroup}>{children}</View>
        </View>
    );
}

function Btn({ label, onPress, color = "#FFFFFF" }: { label: string; onPress?: () => void; color?: string }) {
    return (
        <TouchableOpacity
            onPress={onPress}
            activeOpacity={0.7}
            style={[s.btn, { borderColor: `${color}30`, backgroundColor: `${color}10` }]}
        >
            <Text style={[s.btnTxt, { color }]}>{label}</Text>
        </TouchableOpacity>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
    root: { flex: 1, backgroundColor: "#111" },
    scroll: { padding: 20 },
    heading: { fontSize: 24, fontWeight: "700", color: "#FFF", marginBottom: 4 },
    sub: { fontSize: 13, color: "#666", marginBottom: 24 },
    section: { backgroundColor: "#1C1C1E", borderRadius: 14, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: "#2C2C2E" },
    sectionTitle: { fontSize: 12, fontWeight: "600", color: "#666", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 10 },
    hint: { fontSize: 12, color: "#555", marginBottom: 10, lineHeight: 18 },
    btnGroup: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    btn: { paddingVertical: 9, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1 },
    btnTxt: { fontSize: 13, fontWeight: "600" },
});
