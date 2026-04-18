import { theme } from '@/src/theme';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import { BackHandler } from 'react-native';


type BottomSheetContextType = {
    open: (content: React.ReactNode, snapPoints?: string[]) => void;
    close: () => void;
};

const BottomSheetContext = createContext<BottomSheetContextType | null>(null);

export const BottomSheetProvider = ({ children }: { children: React.ReactNode }) => {
    const sheetRef = useRef<BottomSheet>(null);

    const [isOpen, setIsOpen] = useState(false);

    const [content, setContent] = useState<React.ReactNode>(null);
    const [snapPoints, setSnapPoints] = useState<string[]>(['50%']);

    const open = useCallback((node: React.ReactNode, points?: string[]) => {
        setContent(node);
        if (points) setSnapPoints(points);
        // snapToIndex(0) ensures the drawer opens to the first snap point (e.g., 50%) 
        // instead of expand() which forces it directly to the max snap point (100%).
        sheetRef.current?.snapToIndex(0);
    }, []);

    const close = useCallback(() => {
        sheetRef.current?.close();
    }, []);

    const value = useMemo(() => ({ open, close }), [open, close]);


    useEffect(() => {
        const onBackPress = () => {
            if (isOpen) {
                sheetRef.current?.close();
                return true; // 🚨 stop navigation
            }
            return false; // allow normal back
        };

        const subscription = BackHandler.addEventListener(
            'hardwareBackPress',
            onBackPress
        );

        return () => subscription.remove();
    }, [isOpen]);


    return (
        <BottomSheetContext.Provider value={value}>
            {children}

            {/* GLOBAL SHEET */}
            <BottomSheet
                ref={sheetRef}
                index={-1}
                snapPoints={snapPoints}
                enablePanDownToClose
                keyboardBehavior="interactive"
                backgroundStyle={{ backgroundColor: theme.colors.backgroundCard }}
                handleIndicatorStyle={{ backgroundColor: theme.colors.textSecondary }}
                onChange={(index) => {
                    setIsOpen(index >= 0);
                }}
            >
                <BottomSheetView style={{ flex: 1 }}>
                    {content}
                </BottomSheetView>
            </BottomSheet>
        </BottomSheetContext.Provider>
    );
};

export const useBottomSheet = () => {
    const context = useContext(BottomSheetContext);
    if (!context) {
        throw new Error('useBottomSheet must be used within BottomSheetProvider');
    }
    return context;
};