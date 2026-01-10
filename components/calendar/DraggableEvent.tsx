import React, { useRef, useState, useMemo } from 'react';
import { StyleSheet, Text, View, PanResponder, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { FamilyEvent } from '@/utils/mockEvents';
import { getContrastingTextColor, normalizeColorForDisplay } from '@/utils/colorUtils';

interface DraggableEventProps {
  event: FamilyEvent;
  initialTop: number;
  height: number;
  selectedDate: Date;
  onDragEnd: (eventId: string, newTop: number, newHeight: number | undefined, eventDate: Date) => void;
  onResizeEnd: (eventId: string, newTop: number, newHeight: number, eventDate: Date) => void;
  onPress: (eventId: string, originalEventId?: string, occurrenceIso?: string) => void;
}

function formatTime(date: Date): string {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

function formatTimeRange(startTime: Date, endTime: Date): string {
  return `${formatTime(startTime)} - ${formatTime(endTime)}`;
}

export function DraggableEvent({
  event,
  initialTop,
  height,
  selectedDate,
  onDragEnd,
  onResizeEnd,
  onPress,
}: DraggableEventProps) {
  const pan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState<'top' | 'bottom' | null>(null);
  const [currentTop, setCurrentTop] = useState(initialTop);
  const [currentHeight, setCurrentHeight] = useState(height);
  const dragStartY = useRef(0);
  const initialHeightRef = useRef(height);
  const initialTopRef = useRef(initialTop);

  // Calculate current times based on position (60px = 1 hour = 60 minutes)
  const currentTimes = useMemo(() => {
    const top = currentTop;
    const eventHeight = currentHeight;
    
    // Convert pixels to minutes (60px = 60 minutes, so 1px = 1 minute)
    const startMinutes = Math.round(top);
    const endMinutes = Math.round(top + eventHeight);
    
    const startHours = Math.floor(startMinutes / 60);
    const startMins = startMinutes % 60;
    const endHours = Math.floor(endMinutes / 60);
    const endMins = endMinutes % 60;
    
    const newStartTime = new Date(selectedDate);
    newStartTime.setHours(startHours, startMins, 0, 0);
    
    const newEndTime = new Date(selectedDate);
    newEndTime.setHours(endHours, endMins, 0, 0);
    
    return { startTime: newStartTime, endTime: newEndTime };
  }, [currentTop, currentHeight, selectedDate]);

  const displayColor = useMemo(() => event.color || '#2563EB', [event.color]);
  const textOnColor = useMemo(() => getContrastingTextColor(displayColor), [displayColor]);
  
  // Use gradient if multiple colors provided, otherwise use solid color
  const hasGradient = event.gradientColors && event.gradientColors.length > 1;
  const gradientColorsNormalized = event.gradientColors || [];

  // Check if touch is in resize area
  const isInResizeArea = (evt: any, isTop: boolean) => {
    const { locationY } = evt.nativeEvent;
    const resizeAreaHeight = 24;
    if (isTop) {
      return locationY <= resizeAreaHeight;
    } else {
      return locationY >= currentHeight - resizeAreaHeight;
    }
  };

  // Main drag pan responder (for moving the event)
  const dragPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: (evt) => {
        if (isResizing) return false;
        // Don't start drag if touching resize areas
        return !isInResizeArea(evt, true) && !isInResizeArea(evt, false);
      },
      onMoveShouldSetPanResponder: () => !isResizing,
      onPanResponderGrant: (evt) => {
        if (isResizing) return;
        if (isInResizeArea(evt, true) || isInResizeArea(evt, false)) return;
        dragStartY.current = evt.nativeEvent.pageY;
        setIsDragging(true);
        initialTopRef.current = currentTop;
        pan.setOffset({ x: 0, y: pan.y._value });
        pan.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: (evt, gestureState) => {
        if (isResizing) return;
        const newY = initialTopRef.current + gestureState.dy;
        const constrainedY = Math.max(0, Math.min(newY, 24 * 60 - currentHeight));
        pan.setValue({ x: 0, y: constrainedY - initialTopRef.current });
        setCurrentTop(constrainedY);
      },
      onPanResponderRelease: (evt, gestureState) => {
        if (isResizing) return;
        setIsDragging(false);
        pan.flattenOffset();
        
        if (Math.abs(gestureState.dy) < 10 && Math.abs(gestureState.dx) < 10) {
          onPress(event.id, event.originalEventId, event.startTime.toISOString());
          return;
        }
        
        const finalY = initialTopRef.current + gestureState.dy;
        const constrainedY = Math.max(0, Math.min(finalY, 24 * 60 - currentHeight));
        
        // Snap to nearest 15-minute interval (15 pixels = 15 minutes)
        const snappedY = Math.round(constrainedY / 15) * 15;
        
        Animated.spring(pan, {
          toValue: { x: 0, y: snappedY - initialTopRef.current },
          useNativeDriver: false,
        }).start(() => {
          setCurrentTop(snappedY);
          onDragEnd(event.id, snappedY, undefined, selectedDate);
        });
      },
      onPanResponderTerminationRequest: () => false,
    })
  ).current;

  // Top resize pan responder
  const topResizePanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        setIsResizing('top');
        initialTopRef.current = currentTop;
        initialHeightRef.current = currentHeight;
      },
      onPanResponderMove: (evt, gestureState) => {
        const newTop = initialTopRef.current + gestureState.dy;
        const newHeight = initialHeightRef.current - gestureState.dy;
        const minHeight = 40;
        
        if (newTop >= 0 && newHeight >= minHeight && newTop + newHeight <= 24 * 60) {
          setCurrentTop(newTop);
          setCurrentHeight(newHeight);
        }
      },
      onPanResponderRelease: (evt, gestureState) => {
        const newTop = initialTopRef.current + gestureState.dy;
        const newHeight = initialHeightRef.current - gestureState.dy;
        const minHeight = 40;
        
        let snappedTop = newTop;
        let snappedHeight = newHeight;
        
        if (newTop >= 0 && newHeight >= minHeight) {
          // Snap top to 15-minute interval (15 pixels = 15 minutes)
          snappedTop = Math.round(newTop / 15) * 15;
          snappedHeight = initialHeightRef.current - (snappedTop - initialTopRef.current);
          
          if (snappedHeight < minHeight) {
            snappedHeight = minHeight;
            snappedTop = initialTopRef.current + initialHeightRef.current - minHeight;
          }
        } else {
          snappedTop = currentTop;
          snappedHeight = currentHeight;
        }
        
        setCurrentTop(snappedTop);
        setCurrentHeight(snappedHeight);
        setIsResizing(null);
        onResizeEnd(event.id, snappedTop, snappedHeight, selectedDate);
      },
    })
  ).current;

  // Bottom resize pan responder
  const bottomResizePanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        setIsResizing('bottom');
        initialHeightRef.current = currentHeight;
      },
      onPanResponderMove: (evt, gestureState) => {
        const newHeight = initialHeightRef.current + gestureState.dy;
        const minHeight = 40;
        const maxBottom = currentTop + newHeight;
        
        if (newHeight >= minHeight && maxBottom <= 24 * 60) {
          setCurrentHeight(newHeight);
        }
      },
      onPanResponderRelease: (evt, gestureState) => {
        const newHeight = initialHeightRef.current + gestureState.dy;
        const minHeight = 40;
        const maxBottom = currentTop + newHeight;
        
        let snappedHeight = newHeight;
        
        if (newHeight >= minHeight && maxBottom <= 24 * 60) {
          // Snap bottom to 15-minute interval (15 pixels = 15 minutes)
          const bottomPixels = currentTop + newHeight;
          const snappedBottomPixels = Math.round(bottomPixels / 15) * 15;
          snappedHeight = snappedBottomPixels - currentTop;
          
          if (snappedHeight < minHeight) {
            snappedHeight = minHeight;
          }
        } else {
          snappedHeight = currentHeight;
        }
        
        setCurrentHeight(snappedHeight);
        setIsResizing(null);
        onResizeEnd(event.id, currentTop, snappedHeight, selectedDate);
      },
    })
  ).current;

  const animatedStyle = {
    transform: [{ translateY: pan.y }],
  };

  const displayTime = isDragging || isResizing 
    ? formatTimeRange(currentTimes.startTime, currentTimes.endTime)
    : formatTimeRange(event.startTime, event.endTime);

  const eventBlockStyle = {
    backgroundColor: hasGradient ? 'transparent' : displayColor,
    top: isDragging ? currentTop : initialTop,
    height: Math.max(isResizing ? currentHeight : height, 40),
    opacity: (isDragging || isResizing) ? 0.9 : 1,
    zIndex: (isDragging || isResizing) ? 100 : 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: (isDragging || isResizing) ? 4 : 1 },
    shadowOpacity: (isDragging || isResizing) ? 0.3 : 0.1,
    shadowRadius: (isDragging || isResizing) ? 8 : 2,
    elevation: (isDragging || isResizing) ? 8 : 2,
  };

  const content = (
    <>
      {/* Top resize handle */}
      <View style={styles.resizeHandleTop} {...topResizePanResponder.panHandlers}>
        <View style={styles.resizeHandleBar} />
      </View>

      <View style={styles.eventContent}>
        <View style={styles.eventHeader}>
          {event.isRecurring && (
          <Ionicons name="refresh" size={12} color={textOnColor} />
          )}
        <Text style={[styles.eventTitle, { color: textOnColor }]} numberOfLines={1}>
            {event.title}
          </Text>
        </View>
      <Text style={[styles.eventTime, { color: textOnColor }]} numberOfLines={1}>
          {displayTime}
        </Text>
      <Text style={[styles.eventPerson, { color: textOnColor }]} numberOfLines={1}>
          {event.person}
        </Text>
      </View>

      {/* Bottom resize handle */}
      <View style={styles.resizeHandleBottom} {...bottomResizePanResponder.panHandlers}>
        <View style={styles.resizeHandleBar} />
      </View>
    </>
  );

  return (
    <Animated.View
      style={[
        styles.eventBlock,
        eventBlockStyle,
        isDragging && animatedStyle,
      ]}
      {...dragPanResponder.panHandlers}>
      {hasGradient && gradientColorsNormalized.length > 1 ? (
        <LinearGradient
          colors={gradientColorsNormalized}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.gradient}>
          {content}
        </LinearGradient>
      ) : (
        content
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  eventBlock: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderRadius: 8,
    marginHorizontal: 4,
    marginVertical: 2,
    overflow: 'hidden',
  },
  gradient: {
    flex: 1,
    borderRadius: 8,
    padding: 8,
  },
  eventContent: {
    flex: 1,
    justifyContent: 'center',
  },
  eventHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  eventTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 4,
    flex: 1,
  },
  eventTime: {
    fontSize: 12,
    fontWeight: '400',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  eventPerson: {
    fontSize: 11,
    fontWeight: '400',
    color: '#FFFFFF',
    opacity: 0.9,
  },
  resizeHandleTop: {
    position: 'absolute',
    top: -4,
    left: 0,
    right: 0,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    paddingVertical: 4,
  },
  resizeHandleBottom: {
    position: 'absolute',
    bottom: -4,
    left: 0,
    right: 0,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    paddingVertical: 4,
  },
  resizeHandleBar: {
    width: 50,
    height: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 3,
  },
});
