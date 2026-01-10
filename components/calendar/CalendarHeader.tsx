import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, Modal, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColor } from '@/hooks/use-theme-color';

const DEFAULT_BACKGROUND = { light: '#F5F5F7', dark: '#1E1E1E' };

interface CalendarHeaderProps {
  month: string;
  year: number;
  onTodayPress: () => void;
  onMonthPress?: () => void;
  onDailyPress?: () => void;
  onListPress?: () => void;
  currentView?: 'month' | 'daily' | 'list';
  backgroundOverride?: string;
}

interface ViewSelectorProps {
  currentView: 'month' | 'daily' | 'list';
  onViewChange: (view: 'month' | 'daily' | 'list') => void;
  buttonColor: string;
  activeButtonColor: string;
  buttonText: string;
  surfaceColor: string;
  cardColor: string;
  textColor: string;
}

function ViewSelector({ currentView, onViewChange, buttonColor, activeButtonColor, buttonText, surfaceColor, cardColor, textColor }: ViewSelectorProps) {
  const [showDropdown, setShowDropdown] = useState(false);

  const views = [
    { key: 'month', label: 'Month' },
    { key: 'daily', label: 'Daily' },
    { key: 'list', label: 'List' },
  ] as const;

  const cycleView = () => {
    const currentIndex = views.findIndex(v => v.key === currentView);
    const nextIndex = (currentIndex + 1) % views.length;
    onViewChange(views[nextIndex].key);
  };

  const handleLongPress = () => {
    setShowDropdown(true);
  };

  const selectView = (view: 'month' | 'daily' | 'list') => {
    onViewChange(view);
    setShowDropdown(false);
  };

  const currentViewLabel = views.find(v => v.key === currentView)?.label || 'Month';

  return (
    <>
      <TouchableOpacity
        style={[styles.viewButton, { backgroundColor: activeButtonColor, borderColor: activeButtonColor }]}
        onPress={cycleView}
        onLongPress={handleLongPress}
        delayLongPress={500}
      >
        <View style={styles.viewButtonContent}>
          <Text style={[styles.viewButtonText, { color: '#ffffff' }]}>{currentViewLabel}</Text>
          <Ionicons name="chevron-down" size={14} color="#ffffff" style={styles.dropdownIcon} />
        </View>
      </TouchableOpacity>

      <Modal
        visible={showDropdown}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDropdown(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowDropdown(false)}
        >
          <View style={[styles.dropdownContainer, { backgroundColor: cardColor, shadowColor: textColor }]}>
            <FlatList
              data={views}
              keyExtractor={(item) => item.key}
              renderItem={({ item, index }) => (
                <TouchableOpacity
                  style={[
                    styles.dropdownItem,
                    index === views.length - 1 && { borderBottomWidth: 0 }, // Remove border from last item
                    item.key === currentView && { backgroundColor: '#e6f7ff' }
                  ]}
                  onPress={() => selectView(item.key)}
                >
                  <Text style={styles.dropdownItemText}>
                    {item.label}
                  </Text>
                  {item.key === currentView && (
                    <Text style={styles.checkmark}>✓</Text>
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

export function CalendarHeader({ month, year, onTodayPress, onMonthPress, onDailyPress, onListPress, currentView = 'month', backgroundOverride }: CalendarHeaderProps) {
  const insets = useSafeAreaInsets();

  // All theme colors must be called at the top level, unconditionally
  const defaultBackgroundColor = useThemeColor(DEFAULT_BACKGROUND, 'background');
  const textColor = useThemeColor({}, 'text');
  const buttonColor = useThemeColor({ light: '#8E8E93', dark: '#2C2C2E' }, 'background');
  const activeButtonColor = useThemeColor({ light: '#8E8E93', dark: '#636366' }, 'text');
  const buttonText = useThemeColor({ light: '#FFFFFF', dark: '#FFFFFF' }, 'text');
  const surfaceColor = useThemeColor({ light: '#F5F5F7', dark: '#2C2C2E' }, 'background');
  const cardColor = useThemeColor({ light: '#FFFFFF', dark: '#1E1E1E' }, 'background');

  const backgroundColor = backgroundOverride ? backgroundOverride : defaultBackgroundColor;
  
  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 12), backgroundColor }]}>
      <Text style={[styles.monthTitle, { color: textColor }]}>
        {month} {year}
      </Text>
      <View style={styles.buttonContainer}>
        <ViewSelector
          currentView={currentView || 'month'}
          onViewChange={(view) => {
            if (view === 'month' && onMonthPress) onMonthPress();
            if (view === 'daily' && onDailyPress) onDailyPress();
            if (view === 'list' && onListPress) onListPress();
          }}
          buttonColor={buttonColor}
          activeButtonColor={activeButtonColor}
          buttonText={buttonText}
          surfaceColor={surfaceColor}
          cardColor={cardColor}
          textColor={textColor}
        />
        <TouchableOpacity style={[styles.todayButton, { backgroundColor: buttonColor }]} onPress={onTodayPress}>
          <Text style={[styles.todayButtonText, { color: buttonText }]}>Today</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F5F5F7',
  },
  monthTitle: {
    fontSize: 34,
    fontWeight: '700',
    color: '#1D1D1F',
    letterSpacing: -0.5,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  viewButton: {
    backgroundColor: '#ffffff',
    borderRadius: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#d9d9d9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  viewButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000000d9',
  },
  dropdownIcon: {
    marginTop: 1, // Slight adjustment for optical alignment
  },
  todayButton: {
    backgroundColor: '#1890ff',
    borderRadius: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#1890ff',
    shadowColor: '#1890ff',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  todayButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#ffffff',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 100,
  },
  dropdownContainer: {
    width: 120,
    borderRadius: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  dropdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  dropdownItemText: {
    fontSize: 14,
    fontWeight: '400',
    color: '#000000d9',
  },
  checkmark: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1890ff',
  },
});
