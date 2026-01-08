import React, { useMemo, useState } from 'react';
import { Modal, StyleSheet, View, TouchableOpacity, Text } from 'react-native';
import WheelColorPicker from 'react-native-wheel-color-picker';

type Props = {
  visible: boolean;
  initialColor: string;
  onClose: () => void;
  onSelect: (hex: string) => void;
  title?: string;
};

export function ColorPickerModal({ visible, initialColor, onClose, onSelect, title = 'Pick a colour' }: Props) {
  const [color, setColor] = useState(initialColor || '#007AFF');

  const normalizedInitial = useMemo(() => {
    return initialColor && initialColor.startsWith('#') ? initialColor : `#${(initialColor || '007AFF').replace('#', '')}`;
  }, [initialColor]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <Text style={styles.title}>{title}</Text>
          <WheelColorPicker
            color={color}
            initialColor={normalizedInitial}
            onColorChange={(c) => setColor(c)}
            onColorChangeComplete={(c) => setColor(c)}
            thumbSize={28}
            sliderSize={28}
            row={false}
            swatches={false}
            shadeWheelThumb={true}
            style={styles.picker}
          />
          <View style={styles.actions}>
            <TouchableOpacity style={styles.actionButtonGhost} onPress={onClose}>
              <Text style={styles.actionGhostText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => {
                onSelect(color);
                onClose();
              }}>
              <Text style={styles.actionText}>Use Colour</Text>
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
    marginBottom: 12,
    textAlign: 'center',
  },
  picker: {
    height: 260,
    width: '100%',
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
