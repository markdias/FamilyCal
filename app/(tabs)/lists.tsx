import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export default function ListsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Lists</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F5F7',
  },
  text: {
    fontSize: 20,
    color: '#1D1D1F',
  },
});
