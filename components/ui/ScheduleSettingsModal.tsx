import React, { useState, useEffect } from 'react';
import { Modal, StyleSheet, View, TouchableOpacity, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type Props = {
  visible: boolean;
  dayStart: string; // HH:MM:SS format
  dayEnd: string; // HH:MM:SS format
  onClose: () => void;
  onSave: (dayStart: string, dayEnd: string) => void;
};

export function ScheduleSettingsModal({ visible, dayStart, dayEnd, onClose, onSave }: Props) {
  const [startHour, setStartHour] = useState('07');
  const [startMinute, setStartMinute] = useState('00');
  const [endHour, setEndHour] = useState('19');
  const [endMinute, setEndMinute] = useState('30');

  // Parse initial values when modal opens
  useEffect(() => {
    if (visible) {
      const [startH, startM] = dayStart.split(':');
      const [endH, endM] = dayEnd.split(':');
      setStartHour(startH);
      setStartMinute(startM);
      setEndHour(endH);
      setEndMinute(endM);
    }
  }, [visible, dayStart, dayEnd]);

  const adjustTime = (current: string, delta: number, max: number): string => {
    const num = parseInt(current) + delta;
    return Math.max(0, Math.min(max, num)).toString().padStart(2, '0');
  };

  const formatTime = (hour: string, minute: string): string => {
    return `${hour}:${minute}:00`;
  };

  const handleSave = () => {
    const newStart = formatTime(startHour, startMinute);
    const newEnd = formatTime(endHour, endMinute);
    onSave(newStart, newEnd);
    onClose();
  };

  const TimePicker = ({
    label,
    hour,
    minute,
    onHourChange,
    onMinuteChange
  }: {
    label: string;
    hour: string;
    minute: string;
    onHourChange: (hour: string) => void;
    onMinuteChange: (minute: string) => void;
  }) => (
    <View style={styles.timePicker}>
      <Text style={styles.timeLabel}>{label}</Text>
      <View style={styles.timeControls}>
        {/* Hour */}
        <View style={styles.timeSection}>
          <TouchableOpacity
            style={styles.arrowButton}
            onPress={() => onHourChange(adjustTime(hour, 1, 23))}>
            <Ionicons name="chevron-up" size={16} color="#007AFF" />
          </TouchableOpacity>
          <Text style={styles.timeValue}>{hour}</Text>
          <TouchableOpacity
            style={styles.arrowButton}
            onPress={() => onHourChange(adjustTime(hour, -1, 23))}>
            <Ionicons name="chevron-down" size={16} color="#007AFF" />
          </TouchableOpacity>
        </View>
        <Text style={styles.colon}>:</Text>
        {/* Minute */}
        <View style={styles.timeSection}>
          <TouchableOpacity
            style={styles.arrowButton}
            onPress={() => onMinuteChange(adjustTime(minute, 15, 59))}>
            <Ionicons name="chevron-up" size={16} color="#007AFF" />
          </TouchableOpacity>
          <Text style={styles.timeValue}>{minute}</Text>
          <TouchableOpacity
            style={styles.arrowButton}
            onPress={() => onMinuteChange(adjustTime(minute, -15, 59))}>
            <Ionicons name="chevron-down" size={16} color="#007AFF" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <Text style={styles.title}>Adjust Schedule</Text>

          <TimePicker
            label="Day starts at"
            hour={startHour}
            minute={startMinute}
            onHourChange={setStartHour}
            onMinuteChange={setStartMinute}
          />

          <TimePicker
            label="Day ends at"
            hour={endHour}
            minute={endMinute}
            onHourChange={setEndHour}
            onMinuteChange={setEndMinute}
          />

          <View style={styles.actions}>
            <TouchableOpacity style={styles.actionButtonGhost} onPress={onClose}>
              <Text style={styles.actionGhostText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleSave}>
              <Text style={styles.actionText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    paddingBottom: 24,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1D1D1F',
    marginBottom: 20,
    textAlign: 'center',
  },
  timePicker: {
    marginBottom: 24,
  },
  timeLabel: {
    fontSize: 15,
    fontWeight: '400',
    color: '#1D1D1F',
    marginBottom: 12,
  },
  timeControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeSection: {
    alignItems: 'center',
    minWidth: 50,
  },
  arrowButton: {
    padding: 8,
  },
  timeValue: {
    fontSize: 24,
    fontWeight: '600',
    color: '#1D1D1F',
    marginVertical: 8,
    minWidth: 30,
    textAlign: 'center',
  },
  colon: {
    fontSize: 24,
    fontWeight: '600',
    color: '#1D1D1F',
    marginHorizontal: 8,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  actionText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
  actionButtonGhost: {
    flex: 1,
    backgroundColor: '#F5F5F7',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  actionGhostText: {
    color: '#1D1D1F',
    fontWeight: '600',
    fontSize: 16,
  },
});