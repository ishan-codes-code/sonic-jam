import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import React, {
    createContext,
    useCallback,
    useContext,
    useMemo,
    useRef,
    useState,
} from 'react';

type BottomSheetContextType = {
    open: (content: React.ReactNode, snapPoints?: string[]) => void;
    close: () => void;
};

const BottomSheetContext = createContext<BottomSheetContextType | null>(null);

export const BottomSheetProvider = ({ children }: { children: React.ReactNode }) => {
    const sheetRef = useRef<BottomSheet>(null);

    const [content, setContent] = useState<React.ReactNode>(null);
    const [snapPoints, setSnapPoints] = useState<string[]>(['50%']);

    const open = useCallback((node: React.ReactNode, points?: string[]) => {
        setContent(node);
        if (points) setSnapPoints(points);
        sheetRef.current?.expand();
    }, []);

    const close = useCallback(() => {
        sheetRef.current?.close();
    }, []);

    const value = useMemo(() => ({ open, close }), [open, close]);

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
            >
                <BottomSheetView style={{ flex: 1, padding: 16 }}>
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