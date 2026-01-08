import React from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';

export function OnboardingView() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, signOut } = useAuth();

  const handleCreateFamily = () => {
    router.push('/create-family');
  };

  const handleJoinFamily = () => {
    router.push('/join-family');
  };

  const handleSignOut = async () => {
    await signOut();
    router.replace('/login');
  };

  // Get first name from user metadata
  const firstName = user?.user_metadata?.first_name || 'there';

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 },
        ]}
        showsVerticalScrollIndicator={false}>
        
        <View style={styles.content}>
          {/* Welcome Section */}
          <View style={styles.welcomeSection}>
            <View style={styles.iconContainer}>
              <Ionicons name="people" size={48} color="#1D1D1F" />
            </View>
            <Text style={styles.welcomeTitle}>Welcome, {firstName}!</Text>
            <Text style={styles.welcomeSubtitle}>
              Let's get your family calendar set up. You can create a new family or join an existing one.
            </Text>
          </View>

          {/* Options */}
          <View style={styles.optionsContainer}>
            {/* Create Family Option */}
            <TouchableOpacity 
              style={styles.optionCard}
              onPress={handleCreateFamily}
              activeOpacity={0.7}>
              <View style={styles.optionIconContainer}>
                <Ionicons name="add-circle" size={32} color="#34C759" />
              </View>
              <View style={styles.optionContent}>
                <Text style={styles.optionTitle}>Create a Family</Text>
                <Text style={styles.optionDescription}>
                  Start a new family calendar and invite your family members to join
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color="#8E8E93" />
            </TouchableOpacity>

            {/* Join Family Option */}
            <TouchableOpacity 
              style={styles.optionCard}
              onPress={handleJoinFamily}
              activeOpacity={0.7}>
              <View style={styles.optionIconContainer}>
                <Ionicons name="link" size={32} color="#007AFF" />
              </View>
              <View style={styles.optionContent}>
                <Text style={styles.optionTitle}>Join a Family</Text>
                <Text style={styles.optionDescription}>
                  Enter an invitation code to join an existing family calendar
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color="#8E8E93" />
            </TouchableOpacity>
          </View>

          {/* Info Box */}
          <View style={styles.infoBox}>
            <Ionicons name="information-circle-outline" size={20} color="#8E8E93" />
            <Text style={styles.infoText}>
              Don't worry, you can always create additional families or join more later from the settings.
            </Text>
          </View>

          {/* Sign Out Link */}
          <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
            <Text style={styles.signOutText}>Sign out and use a different account</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F7',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
  },
  content: {
    flex: 1,
  },
  welcomeSection: {
    alignItems: 'center',
    marginBottom: 40,
    paddingTop: 40,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1D1D1F',
    marginBottom: 12,
    textAlign: 'center',
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 16,
  },
  optionsContainer: {
    gap: 16,
    marginBottom: 32,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  optionIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F5F5F7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  optionContent: {
    flex: 1,
    marginRight: 8,
  },
  optionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1D1D1F',
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 14,
    color: '#8E8E93',
    lineHeight: 20,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#E5E5E7',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#8E8E93',
    marginLeft: 12,
    lineHeight: 20,
  },
  signOutButton: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  signOutText: {
    fontSize: 15,
    color: '#007AFF',
  },
});
