import React, { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Switch,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAppSettings } from '@/contexts/AppSettingsContext';
import { useThemeColor } from '@/hooks/use-theme-color';

interface SettingItemProps {
  label: string;
  subtitle: string;
  value?: string;
  onPress?: () => void;
  showChevron?: boolean;
  showArrows?: boolean;
}

function SettingItem({ label, subtitle, value, onPress, showChevron = true, showArrows = false }: SettingItemProps) {
  const textColor = useThemeColor({}, 'text');
  const subTextColor = useThemeColor({ light: '#8E8E93', dark: '#9EA0A6' }, 'text');
  const iconColor = useThemeColor({ light: '#8E8E93', dark: '#8E8E93' }, 'icon');
  return (
    <TouchableOpacity style={styles.settingItem} onPress={onPress}>
      <View style={styles.settingContent}>
        <Text style={[styles.settingLabel, { color: textColor }]}>{label}</Text>
        <Text style={[styles.settingSubtitle, { color: subTextColor }]}>{subtitle}</Text>
      </View>
      <View style={styles.settingValue}>
        {value && <Text style={[styles.settingValueText, { color: textColor }]}>{value}</Text>}
        {showArrows && (
          <View style={styles.arrowsContainer}>
            <Ionicons name="chevron-up" size={16} color={iconColor} />
            <Ionicons name="chevron-down" size={16} color={iconColor} />
          </View>
        )}
        {showChevron && !showArrows && (
          <Ionicons name="chevron-forward" size={20} color={iconColor} />
        )}
      </View>
    </TouchableOpacity>
  );
}

interface RadioOptionProps {
  label: string;
  subtitle: string;
  selected: boolean;
  onPress: () => void;
}

function RadioOption({ label, subtitle, selected, onPress }: RadioOptionProps) {
  const textColor = useThemeColor({}, 'text');
  const subTextColor = useThemeColor({ light: '#8E8E93', dark: '#9EA0A6' }, 'text');
  const accentColor = useThemeColor({ light: '#007AFF', dark: '#0A84FF' }, 'tint');
  return (
    <TouchableOpacity style={styles.radioItem} onPress={onPress}>
      <View style={styles.radioContent}>
        <Text style={[styles.radioLabel, { color: textColor }]}>{label}</Text>
        <Text style={[styles.radioSubtitle, { color: subTextColor }]}>{subtitle}</Text>
      </View>
      <View
        style={[
          styles.radioButton,
          { borderColor: subTextColor },
          selected && { backgroundColor: accentColor, borderColor: accentColor },
        ]}>
        {selected && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
      </View>
    </TouchableOpacity>
  );
}

interface SegmentedControlProps {
  options: string[];
  selectedIndex: number;
  onSelect: (index: number) => void;
}

function SegmentedControl({ options, selectedIndex, onSelect }: SegmentedControlProps) {
  const surfaceColor = useThemeColor({ light: '#F5F5F7', dark: '#2C2C2E' }, 'background');
  const selectedSurface = useThemeColor({ light: '#FFFFFF', dark: '#1E1E1E' }, 'background');
  const textColor = useThemeColor({}, 'text');
  const mutedText = useThemeColor({ light: '#8E8E93', dark: '#9EA0A6' }, 'text');
  return (
    <View style={[styles.segmentedContainer, { backgroundColor: surfaceColor }]}>
      {options.map((option, index) => (
        <TouchableOpacity
          key={index}
          style={[
            styles.segment,
            index === selectedIndex && [styles.segmentSelected, { backgroundColor: selectedSurface }],
            index === 0 && styles.segmentFirst,
            index === options.length - 1 && styles.segmentLast,
          ]}
          onPress={() => onSelect(index)}>
          <Text
            style={[
              styles.segmentText,
              { color: mutedText },
              index === selectedIndex && [styles.segmentTextSelected, { color: textColor }],
            ]}>
            {option}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

export function AppSettingsView() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [nextEventColumns, setNextEventColumns] = useState(0); // 0 = 2, 1 = 3, 2 = 4
  const [expandedMonthView, setExpandedMonthView] = useState(false);
  const {
    settings,
    setEventsPerPerson,
    setDefaultScreen,
    setAutoRefreshMinutes,
    setDefaultMapsApp,
    setAppearance,
  } = useAppSettings();
  const [showDefaultScreenPicker, setShowDefaultScreenPicker] = useState(false);
  const [showRefreshPicker, setShowRefreshPicker] = useState(false);
  const [showMapsPicker, setShowMapsPicker] = useState(false);

  const backgroundColor = useThemeColor({}, 'background');
  const cardColor = useThemeColor({ light: '#FFFFFF', dark: '#1E1E1E' }, 'background');
  const textColor = useThemeColor({}, 'text');
  const subTextColor = useThemeColor({ light: '#8E8E93', dark: '#9EA0A6' }, 'text');
  const separatorColor = useThemeColor({ light: '#F5F5F7', dark: '#2C2C2E' }, 'background');
  const accentColor = useThemeColor({ light: '#007AFF', dark: '#0A84FF' }, 'tint');
  const surfaceColor = useThemeColor({ light: '#F5F5F7', dark: '#2C2C2E' }, 'background');

  const defaultScreenOrder: typeof settings.defaultScreen[] = ['family', 'calendar'];
  const defaultScreenLabels: Record<typeof settings.defaultScreen, string> = {
    family: 'Family view',
    calendar: 'Calendar view',
  };

  const refreshOptions: (number | null)[] = [5, 10, 20, 30, 60, null];
  const refreshLabels: Record<number, string> = {
    5: '5 minutes',
    10: '10 minutes',
    20: '20 minutes',
    30: '30 minutes',
    60: '60 minutes',
  };

  const mapsOptions: typeof settings.defaultMapsApp[] = ['apple', 'google', 'waze'];
  const mapsLabels: Record<typeof settings.defaultMapsApp, string> = {
    apple: 'Apple Maps',
    google: 'Google Maps',
    waze: 'Waze',
  };

  const handleSelectDefaultScreen = (value: typeof settings.defaultScreen) => {
    setDefaultScreen(value);
    setShowDefaultScreenPicker(false);
  };

  const handleSelectRefresh = (value: number | null) => {
    setAutoRefreshMinutes(value);
    setShowRefreshPicker(false);
  };

  const handleSelectMapsApp = (value: typeof settings.defaultMapsApp) => {
    setDefaultMapsApp(value);
    setShowMapsPicker(false);
  };

  const handleSelectAppearance = (value: 'light' | 'dark' | 'system') => {
    setAppearance(value);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: cardColor }]}>
        <Text style={[styles.headerTitle, { color: textColor }]}>App Settings</Text>
        <TouchableOpacity
          style={[styles.closeButton, { backgroundColor: surfaceColor }]}
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="close" size={24} color={textColor} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 20 },
        ]}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic">
        {/* General Section */}
        <Text style={[styles.sectionHeader, { color: subTextColor }]}>General</Text>
        <View style={[styles.card, { backgroundColor: cardColor }]}>
          <SettingItem
            label="Default screen"
            subtitle="Choose where the app opens"
            value={defaultScreenLabels[settings.defaultScreen]}
            onPress={() => setShowDefaultScreenPicker(true)}
          />
          <View style={[styles.separator, { backgroundColor: separatorColor }]} />
          <SettingItem
            label="Auto refresh interval"
            subtitle="Minutes between auto-refresh"
            value={settings.autoRefreshMinutes ? refreshLabels[settings.autoRefreshMinutes] : 'None'}
            onPress={() => setShowRefreshPicker(true)}
          />
          <View style={[styles.separator, { backgroundColor: separatorColor }]} />
          <SettingItem
            label="Default maps app"
            subtitle="App to use for location links"
            value={mapsLabels[settings.defaultMapsApp]}
            onPress={() => setShowMapsPicker(true)}
          />
        </View>

        {/* Display Section */}
        <Text style={[styles.sectionHeader, { color: subTextColor }]}>Display</Text>
        <View style={[styles.card, { backgroundColor: cardColor }]}>
          <RadioOption
            label="Light"
            subtitle="Always use the light appearance"
            selected={settings.appearance === 'light'}
            onPress={() => handleSelectAppearance('light')}
          />
          <View style={styles.separator} />
          <RadioOption
            label="Dark"
            subtitle="Always use the dark appearance"
            selected={settings.appearance === 'dark'}
            onPress={() => handleSelectAppearance('dark')}
          />
          <View style={styles.separator} />
          <RadioOption
            label="System Settings"
            subtitle="Follow the device settings"
            selected={settings.appearance === 'system'}
            onPress={() => handleSelectAppearance('system')}
          />
        </View>

        {/* Event Settings Section */}
        <Text style={[styles.sectionHeader, { color: subTextColor }]}>Event Settings</Text>
        <View style={[styles.card, { backgroundColor: cardColor }]}>
          <View style={styles.settingItem}>
            <View style={styles.settingContent}>
              <Text style={[styles.settingLabel, { color: textColor }]}>Events per person</Text>
              <Text style={[styles.settingSubtitle, { color: subTextColor }]}>
                How many upcoming events to show
              </Text>
            </View>
            <View style={styles.counter}>
              <TouchableOpacity
                style={[styles.counterButton, { backgroundColor: surfaceColor }]}
                onPress={() => setEventsPerPerson(settings.eventsPerPerson - 1)}>
                <Text style={[styles.counterButtonText, { color: textColor }]}>-</Text>
              </TouchableOpacity>
              <Text style={[styles.counterValue, { color: textColor }]}>
                {settings.eventsPerPerson}
              </Text>
              <TouchableOpacity
                style={[styles.counterButton, { backgroundColor: surfaceColor }]}
                onPress={() => setEventsPerPerson(settings.eventsPerPerson + 1)}>
                <Text style={[styles.counterButtonText, { color: textColor }]}>+</Text>
              </TouchableOpacity>
            </View>
          </View>
          <View style={[styles.separator, { backgroundColor: separatorColor }]} />
          <SettingItem
            label="Spotlight events"
            subtitle="Events to show in spotlight view"
            value="15"
            showArrows={true}
            onPress={() => {}}
          />
          <View style={[styles.separator, { backgroundColor: separatorColor }]} />
          <View style={styles.settingItem}>
            <View style={styles.settingContent}>
              <Text style={[styles.settingLabel, { color: textColor }]}>Next event columns</Text>
              <Text style={[styles.settingSubtitle, { color: subTextColor }]}>
                Number of panels per row
              </Text>
            </View>
            <SegmentedControl
              options={['2', '3', '4']}
              selectedIndex={nextEventColumns}
              onSelect={setNextEventColumns}
            />
          </View>
          <View style={[styles.separator, { backgroundColor: separatorColor }]} />
          <View style={styles.settingItem}>
            <View style={styles.settingContent}>
              <Text style={[styles.settingLabel, { color: textColor }]}>Next events layout</Text>
              <Text style={[styles.settingSubtitle, { color: subTextColor }]}>
                Current: Detailed
              </Text>
            </View>
            <View style={styles.layoutIcon}>
              <View style={styles.layoutBox}>
                <View style={styles.layoutLine} />
                <View style={styles.layoutLine} />
              </View>
              <View style={[styles.layoutBox, styles.layoutBoxSecond]}>
                <View style={styles.layoutLine} />
                <View style={styles.layoutLine} />
              </View>
            </View>
          </View>
          <View style={[styles.separator, { backgroundColor: separatorColor }]} />
          <SettingItem
            label="Compact view style"
            subtitle="Choose your compact event card layout"
            onPress={() => {}}
          />
          <View style={[styles.separator, { backgroundColor: separatorColor }]} />
          <View style={styles.settingItem}>
            <View style={styles.settingContent}>
              <Text style={[styles.settingLabel, { color: textColor }]}>Expanded Month View</Text>
              <Text style={[styles.settingSubtitle, { color: subTextColor }]}>
                Expand grid and hide event list
              </Text>
            </View>
            <Switch
              value={expandedMonthView}
              onValueChange={setExpandedMonthView}
              trackColor={{ false: separatorColor, true: '#34C759' }}
              thumbColor="#FFFFFF"
            />
          </View>
          <View style={[styles.separator, { backgroundColor: separatorColor }]} />
          <SettingItem
            label="Default alert"
            subtitle="Alert time for new events"
            value="1 hour before"
            showArrows={true}
            onPress={() => {}}
          />
          <View style={[styles.separator, { backgroundColor: separatorColor }]} />
          <SettingItem
            label="Show past events"
            subtitle="Days to look back"
            value="2 Months"
            showArrows={true}
            onPress={() => {}}
          />
          <View style={[styles.separator, { backgroundColor: separatorColor }]} />
          <SettingItem
            label="Look ahead"
            subtitle="Days to look forward"
            value="1 Year"
            showArrows={true}
            onPress={() => {}}
          />
        </View>
      </ScrollView>
      <Modal
        visible={showDefaultScreenPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDefaultScreenPicker(false)}>
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPressOut={() => setShowDefaultScreenPicker(false)}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Default screen</Text>
            {defaultScreenOrder.map((option) => (
              <TouchableOpacity
                key={option}
                style={styles.modalOption}
                onPress={() => handleSelectDefaultScreen(option)}>
                <Text style={styles.modalOptionLabel}>{defaultScreenLabels[option]}</Text>
                {settings.defaultScreen === option && (
                  <Ionicons name="checkmark" size={18} color="#007AFF" />
                )}
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={styles.modalCancel}
              onPress={() => setShowDefaultScreenPicker(false)}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
      <Modal
        visible={showRefreshPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowRefreshPicker(false)}>
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPressOut={() => setShowRefreshPicker(false)}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Auto refresh interval</Text>
            {refreshOptions.map((option) => (
              <TouchableOpacity
                key={option === null ? 'none' : option}
                style={styles.modalOption}
                onPress={() => handleSelectRefresh(option)}>
                <Text style={styles.modalOptionLabel}>
                  {option === null ? 'None' : refreshLabels[option]}
                </Text>
                {settings.autoRefreshMinutes === option && (
                  <Ionicons name="checkmark" size={18} color="#007AFF" />
                )}
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={styles.modalCancel}
              onPress={() => setShowRefreshPicker(false)}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
      <Modal
        visible={showMapsPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMapsPicker(false)}>
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPressOut={() => setShowMapsPicker(false)}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Default maps app</Text>
            {mapsOptions.map((option) => (
              <TouchableOpacity
                key={option}
                style={styles.modalOption}
                onPress={() => handleSelectMapsApp(option)}>
                <Text style={styles.modalOptionLabel}>{mapsLabels[option]}</Text>
                {settings.defaultMapsApp === option && (
                  <Ionicons name="checkmark" size={18} color="#007AFF" />
                )}
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={styles.modalCancel}
              onPress={() => setShowMapsPicker(false)}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F7',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    position: 'relative',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1D1D1F',
  },
  closeButton: {
    position: 'absolute',
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F5F5F7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '400',
    color: '#8E8E93',
    textTransform: 'uppercase',
    marginTop: 16,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  settingContent: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 17,
    fontWeight: '400',
    color: '#1D1D1F',
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 15,
    fontWeight: '400',
    color: '#8E8E93',
  },
  settingValue: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 12,
  },
  settingValueText: {
    fontSize: 17,
    fontWeight: '400',
    color: '#1D1D1F',
    marginRight: 8,
  },
  arrowsContainer: {
    flexDirection: 'column',
    alignItems: 'center',
  },
  separator: {
    height: 1,
    backgroundColor: '#F5F5F7',
    marginLeft: 0,
  },
  radioItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  radioContent: {
    flex: 1,
  },
  radioLabel: {
    fontSize: 17,
    fontWeight: '400',
    color: '#1D1D1F',
    marginBottom: 2,
  },
  radioSubtitle: {
    fontSize: 15,
    fontWeight: '400',
    color: '#8E8E93',
  },
  radioButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#8E8E93',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  radioButtonSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  segmentedContainer: {
    flexDirection: 'row',
    backgroundColor: '#F5F5F7',
    borderRadius: 8,
    padding: 2,
  },
  segment: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentFirst: {
    borderTopLeftRadius: 6,
    borderBottomLeftRadius: 6,
  },
  segmentLast: {
    borderTopRightRadius: 6,
    borderBottomRightRadius: 6,
  },
  segmentSelected: {
    backgroundColor: '#FFFFFF',
  },
  segmentText: {
    fontSize: 15,
    fontWeight: '400',
    color: '#8E8E93',
  },
  segmentTextSelected: {
    color: '#1D1D1F',
    fontWeight: '600',
  },
  layoutIcon: {
    flexDirection: 'column',
    alignItems: 'center',
    marginLeft: 12,
  },
  layoutBox: {
    width: 32,
    height: 20,
    borderRadius: 4,
    backgroundColor: '#E5E5E7',
    marginBottom: 4,
    position: 'relative',
    overflow: 'hidden',
  },
  layoutBoxSecond: {
    marginBottom: 0,
  },
  layoutLine: {
    height: 1,
    backgroundColor: '#8E8E93',
    marginHorizontal: 4,
    marginVertical: 3,
  },
  counter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  counterButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#F5F5F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterButtonText: {
    fontSize: 18,
    color: '#1D1D1F',
    fontWeight: '600',
  },
  counterValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1D1D1F',
    minWidth: 24,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  modalContent: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1D1D1F',
    marginBottom: 12,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  modalOptionLabel: {
    fontSize: 16,
    color: '#1D1D1F',
  },
  modalCancel: {
    marginTop: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
});
