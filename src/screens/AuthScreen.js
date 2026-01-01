/**
 * AuthScreen - Authentication screen for sign up, sign in, guest mode
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { lightTheme } from '../styles/theme';

const AuthScreen = ({ navigation }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleAuth = async () => {
    // TODO: Implement actual authentication
    Alert.alert('Authentication', 'Authentication will be implemented with SupabaseAuthService');
    navigation.navigate('FamilySetup');
  };

  const handleGoogleSignIn = async () => {
    // TODO: Implement Google OAuth
    Alert.alert('Google Sign In', 'Google OAuth will be implemented');
  };

  const handleGuestMode = () => {
    Alert.alert(
      'Guest Mode',
      'Guest mode lets you use the app locally without creating an account. Your data will not sync across devices.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          onPress: () => navigation.navigate('FamilySetup'),
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Title */}
          <Text style={styles.title}>{isLogin ? 'Welcome Back' : 'Create Account'}</Text>
          <Text style={styles.subtitle}>
            {isLogin ? 'Sign in to access your family calendar' : 'Sign up to get started'}
          </Text>

          {/* Email Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your email"
              placeholderTextColor={lightTheme.colors.gray400}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />
          </View>

          {/* Password Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your password"
              placeholderTextColor={lightTheme.colors.gray400}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="password"
            />
          </View>

          {/* Forgot Password (only for login) */}
          {isLogin && (
            <TouchableOpacity style={styles.forgotPassword}>
              <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
            </TouchableOpacity>
          )}

          {/* Main Button */}
          <TouchableOpacity style={styles.button} onPress={handleAuth}>
            <Text style={styles.buttonText}>
              {isLogin ? 'Sign In' : 'Create Account'}
            </Text>
          </TouchableOpacity>

          {/* Google Sign In */}
          <TouchableOpacity style={styles.googleButton} onPress={handleGoogleSignIn}>
            <Text style={styles.googleButtonText}>Continue with Google</Text>
          </TouchableOpacity>

          {/* Toggle Login/Signup */}
          <TouchableOpacity
            style={styles.toggleButton}
            onPress={() => setIsLogin(!isLogin)}
          >
            <Text style={styles.toggleText}>
              {isLogin ? "Don't have an account? Sign Up" : 'Already have an account? Sign In'}
            </Text>
          </TouchableOpacity>

          {/* Guest Mode */}
          <TouchableOpacity style={styles.guestButton} onPress={handleGuestMode}>
            <Text style={styles.guestButtonText}>Continue as Guest</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: lightTheme.colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  title: {
    fontSize: lightTheme.typography.fontSize.title2,
    fontWeight: lightTheme.typography.fontWeight.bold,
    color: lightTheme.colors.text,
    marginBottom: 8,
    lineHeight: lightTheme.typography.lineHeight.title2,
  },
  subtitle: {
    fontSize: lightTheme.typography.fontSize.subheadline,
    color: lightTheme.colors.textSecondary,
    marginBottom: 32,
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: lightTheme.typography.fontSize.subheadline,
    fontWeight: lightTheme.typography.fontWeight.medium,
    color: lightTheme.colors.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: lightTheme.colors.card,
    borderWidth: 1,
    borderColor: lightTheme.colors.gray300,
    borderRadius: lightTheme.borderRadius.m,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: lightTheme.typography.fontSize.body,
    color: lightTheme.colors.text,
    minHeight: lightTheme.touchTarget.minimum,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 24,
  },
  forgotPasswordText: {
    fontSize: lightTheme.typography.fontSize.subheadline,
    color: lightTheme.colors.primary,
  },
  button: {
    backgroundColor: lightTheme.colors.primary,
    borderRadius: lightTheme.borderRadius.l,
    paddingVertical: 16,
    paddingHorizontal: 24,
    minHeight: lightTheme.touchTarget.minimum,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  buttonText: {
    fontSize: lightTheme.typography.fontSize.body,
    fontWeight: lightTheme.typography.fontWeight.semibold,
    color: '#FFFFFF',
  },
  googleButton: {
    backgroundColor: lightTheme.colors.card,
    borderWidth: 1,
    borderColor: lightTheme.colors.gray300,
    borderRadius: lightTheme.borderRadius.l,
    paddingVertical: 16,
    paddingHorizontal: 24,
    minHeight: lightTheme.touchTarget.minimum,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  googleButtonText: {
    fontSize: lightTheme.typography.fontSize.body,
    fontWeight: lightTheme.typography.fontWeight.medium,
    color: lightTheme.colors.text,
  },
  toggleButton: {
    alignItems: 'center',
    marginBottom: 16,
  },
  toggleText: {
    fontSize: lightTheme.typography.fontSize.subheadline,
    color: lightTheme.colors.primary,
  },
  guestButton: {
    alignItems: 'center',
    marginTop: 16,
  },
  guestButtonText: {
    fontSize: lightTheme.typography.fontSize.footnote,
    color: lightTheme.colors.textSecondary,
  },
});

export default AuthScreen;
