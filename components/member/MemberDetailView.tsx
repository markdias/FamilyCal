import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AllEventsView } from './AllEventsView';
import { FilofaxTab, FilofaxView } from './FilofaxTabs';
import { ForMemberView } from './ForMemberView';
import { ScheduleView } from './ScheduleView';

interface MemberDetailViewProps {
  memberName: string;
}

const TAB_WIDTH = 48;

const TAB_COLORS = {
  schedule: '#007AFF',
  'for-member': '#34C759',
  'all-events': '#FF9500',
};

export function MemberDetailView({ memberName }: MemberDetailViewProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [activeIndex, setActiveIndex] = useState(0);

  const tabs: FilofaxTab[] = useMemo(() => [
    { id: 'schedule', label: 'Schedule', color: TAB_COLORS.schedule },
    { id: 'all-events', label: 'All Events', color: TAB_COLORS['all-events'] },
    { id: 'for-member', label: `For ${memberName}`, color: TAB_COLORS['for-member'] },
  ], [memberName]);

  const isWeb = Platform.OS === 'web';
  const content = [
    <ScheduleView key="schedule" memberName={memberName} />,
    <AllEventsView key="all-events" memberName={memberName} />,
    <ForMemberView key="for-member" memberName={memberName} />,
  ];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header with rounded top corners */}
      <View style={[styles.roundedHeader, { backgroundColor: '#E8E8ED', marginBottom: isWeb ? 0 : 8 }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="chevron-back" size={24} color="#1D1D1F" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>{memberName}</Text>

        <View style={styles.headerSpacer} />
      </View>

      {isWeb ? (
        /* Filofax content for Web */
        <FilofaxView
          tabs={tabs}
          activeIndex={activeIndex}
          onTabPress={setActiveIndex}>
          {content}
        </FilofaxView>
      ) : (
        /* Segmented Control for Mobile */
        <View style={styles.mobileContainer}>
          <View style={styles.segmentedControlWrapper}>
            <SegmentedControl
              options={tabs.map(t => t.label)}
              selectedOption={tabs[activeIndex].label}
              onOptionPress={(label) => {
                const index = tabs.findIndex(t => t.label === label);
                if (index !== -1) setActiveIndex(index);
              }}
            />
          </View>
          <View style={styles.mobileContent}>
            {content[activeIndex]}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E8E8ED',
  },
  roundedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#E8E8ED', // Grey background to match container
    marginHorizontal: Platform.OS === 'web' ? TAB_WIDTH : 0, // No margins on mobile
    borderTopLeftRadius: 8, // Rounded top corners
    borderTopRightRadius: 8,
    borderBottomWidth: 0, // No bottom border
    borderBottomColor: 'transparent', // No border color
    shadowOpacity: 0, // No shadow
    shadowRadius: 0, // No shadow
    shadowOffset: { width: 0, height: 0 }, // No shadow offset
    elevation: 0, // No elevation
  },
  backButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F5F5F7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1D1D1F',
  },
  headerSpacer: {
    width: 32,
  },
  mobileContainer: {
    flex: 1,
  },
  segmentedControlWrapper: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  mobileContent: {
    flex: 1,
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: 'hidden',
    // Shadow for the content card
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
});
