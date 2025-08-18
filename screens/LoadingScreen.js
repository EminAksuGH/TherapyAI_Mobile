import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const LoadingScreen = () => {
  return (
    <View style={styles.container}>
      <Ionicons name="heart" size={80} color="#4A90E2" />
      <Text style={styles.title}>TherapyAI</Text>
      <Text style={styles.subtitle}>Yükleniyor...</Text>
      <ActivityIndicator size="large" color="#4A90E2" style={styles.spinner} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginTop: 20,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#7F8C8D',
    marginBottom: 30,
  },
  spinner: {
    marginTop: 20,
  },
});

export default LoadingScreen; 