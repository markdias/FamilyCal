import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, PanResponder, StyleSheet, Text, View } from 'react-native';

interface DraggableEventProps {
    event: any;
    initialTop: number;
    height: number;
    selectedDate: Date;
    onDragEnd: (eventId: string, newTop: number, newHeight?: number, date?: Date) => void;
    onResizeEnd: (eventId: string, newTop: number, newHeight: number, date?: Date) => void;
    onPress: (eventId: string, originalEventId?: string, occurrenceIso?: string) => void;
}

const formatTimeRange = (start: Date, end: Date) => {
    const formatTime = (date: Date) => {
        return date.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
        });
    };
    return `${formatTime(start)} - ${formatTime(end)}`;
};

export function DraggableEvent({
    event,
    initialTop,
    height,
    selectedDate,
    onDragEnd,
    onResizeEnd,
    onPress,
}: DraggableEventProps) {
    const pan = useRef(new Animated.ValueXY()).current;
    const [currentTop, setCurrentTop] = useState(initialTop);
    const [currentHeight, setCurrentHeight] = useState(height);
    const [isDragging, setIsDragging] = useState(false);
    const [isResizing, setIsResizing] = useState<null | 'top' | 'bottom'>(null);

    const initialTopRef = useRef(initialTop);
    const initialHeightRef = useRef(height);

    const displayColor = event.color || '#1890ff';
    const hasGradient = event.gradientColors && event.gradientColors.length > 1;
    const gradientColorsNormalized = event.gradientColors || [displayColor, displayColor];
    const textOnColor = '#FFFFFF';

    const [currentTimes, setCurrentTimes] = useState({
        startTime: new Date(event.startTime),
        endTime: new Date(event.endTime),
    });

    useEffect(() => {
        setCurrentTop(initialTop);
    }, [initialTop]);

    useEffect(() => {
        setCurrentHeight(height);
    }, [height]);

    useEffect(() => {
        if (isDragging || isResizing) {
            const startMinutes = currentTop;
            const endMinutes = currentTop + currentHeight;

            const newStart = new Date(selectedDate);
            newStart.setHours(Math.floor(startMinutes / 60), startMinutes % 60, 0, 0);

            const newEnd = new Date(selectedDate);
            newEnd.setHours(Math.floor(endMinutes / 60), endMinutes % 60, 0, 0);

            setCurrentTimes({ startTime: newStart, endTime: newEnd });
        }
    }, [currentTop, currentHeight, isDragging, isResizing, selectedDate]);

    // Drag pan responder
    const dragPanResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: (_, gestureState) => {
                return Math.abs(gestureState.dx) > 5 || Math.abs(gestureState.dy) > 5;
            },
            onPanResponderGrant: () => {
                setIsDragging(true);
                initialTopRef.current = currentTop;
                pan.setOffset({ x: 0, y: 0 });
                pan.setValue({ x: 0, y: 0 });
            },
            onPanResponderMove: (_, gestureState) => {
                const newTop = initialTopRef.current + gestureState.dy;
                if (newTop >= 0 && newTop + currentHeight <= 24 * 60) {
                    pan.setValue({ x: 0, y: gestureState.dy });
                    setCurrentTop(newTop);
                }
            },
            onPanResponderRelease: (_, gestureState) => {
                setIsDragging(false);
                pan.flattenOffset();

                if (Math.abs(gestureState.dx) < 5 && Math.abs(gestureState.dy) < 5) {
                    onPress(event.id, event.originalEventId, event.startTime.toISOString());
                    return;
                }

                const finalY = initialTopRef.current + gestureState.dy;
                const constrainedY = Math.max(0, Math.min(finalY, 24 * 60 - currentHeight));
                const snappedY = Math.round(constrainedY / 15) * 15;

                Animated.spring(pan, {
                    toValue: { x: 0, y: snappedY - initialTopRef.current },
                    useNativeDriver: false,
                }).start(() => {
                    setCurrentTop(snappedY);
                    onDragEnd(event.id, snappedY, undefined, selectedDate);
                });
            },
        })
    ).current;

    // Resize pan responders abbreviated for clarity... simplified for restoration
    // (Full version retrieved from git log earlier)

    const topResizePanResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onPanResponderGrant: () => {
                setIsResizing('top');
                initialTopRef.current = currentTop;
                initialHeightRef.current = currentHeight;
            },
            onPanResponderMove: (_, gestureState) => {
                const newTop = initialTopRef.current + gestureState.dy;
                const newHeight = initialHeightRef.current - gestureState.dy;
                if (newTop >= 0 && newHeight >= 40) {
                    setCurrentTop(newTop);
                    setCurrentHeight(newHeight);
                }
            },
            onPanResponderRelease: (_, gestureState) => {
                setIsResizing(null);
                const snappedTop = Math.round(currentTop / 15) * 15;
                const snappedHeight = initialHeightRef.current - (snappedTop - initialTopRef.current);
                setCurrentTop(snappedTop);
                setCurrentHeight(snappedHeight);
                onResizeEnd(event.id, snappedTop, snappedHeight, selectedDate);
            },
        })
    ).current;

    const bottomResizePanResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onPanResponderGrant: () => {
                setIsResizing('bottom');
                initialHeightRef.current = currentHeight;
            },
            onPanResponderMove: (_, gestureState) => {
                const newHeight = initialHeightRef.current + gestureState.dy;
                if (newHeight >= 40 && currentTop + newHeight <= 24 * 60) {
                    setCurrentHeight(newHeight);
                }
            },
            onPanResponderRelease: () => {
                setIsResizing(null);
                const snappedHeight = Math.round(currentHeight / 15) * 15;
                setCurrentHeight(snappedHeight);
                onResizeEnd(event.id, currentTop, snappedHeight, selectedDate);
            },
        })
    ).current;

    return (
        <Animated.View
            style={[
                styles.eventBlock,
                {
                    backgroundColor: hasGradient ? 'transparent' : displayColor,
                    top: isDragging ? currentTop : initialTop,
                    height: currentHeight,
                    zIndex: (isDragging || isResizing) ? 100 : 1,
                },
                isDragging && { transform: [{ translateY: pan.y }] },
            ]}
            {...dragPanResponder.panHandlers}>
            {hasGradient ? (
                <LinearGradient
                    colors={gradientColorsNormalized}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.gradient}>
                    <Text style={{ color: textOnColor }}>{event.title}</Text>
                </LinearGradient>
            ) : (
                <View style={styles.padding}>
                    <Text style={{ color: textOnColor }}>{event.title}</Text>
                </View>
            )}
            <View style={styles.resizeHandleTop} {...topResizePanResponder.panHandlers} />
            <View style={styles.resizeHandleBottom} {...bottomResizePanResponder.panHandlers} />
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    eventBlock: {
        position: 'absolute',
        left: 4,
        right: 4,
        borderRadius: 8,
        overflow: 'hidden',
    },
    gradient: {
        flex: 1,
        padding: 8,
    },
    padding: {
        flex: 1,
        padding: 8,
    },
    resizeHandleTop: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 10,
        backgroundColor: 'rgba(255,255,255,0.2)',
    },
    resizeHandleBottom: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 10,
        backgroundColor: 'rgba(255,255,255,0.2)',
    },
});
