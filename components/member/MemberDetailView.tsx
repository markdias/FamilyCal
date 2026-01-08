import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header with rounded top corners */}
      <View style={[styles.roundedHeader, { backgroundColor: '#E8E8ED' }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="chevron-back" size={24} color="#1D1D1F" />
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>{memberName}</Text>
        
        <View style={styles.headerSpacer} />
      </View>

      {/* Filofax content - page has no top rounded corners */}
      <FilofaxView
        tabs={tabs}
        activeIndex={activeIndex}
        onTabPress={setActiveIndex}>
        <ScheduleView memberName={memberName} />
        <AllEventsView memberName={memberName} />
        <ForMemberView memberName={memberName} />
      </FilofaxView>
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
    marginHorizontal: TAB_WIDTH, // Same margins as page
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
});
