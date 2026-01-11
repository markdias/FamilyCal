import { useAuth } from '@/contexts/AuthContext';
import { useFamily } from '@/contexts/FamilyContext';
import { supabase } from '@/lib/supabase';
import { acceptInvitation, getInvitationByToken } from '@/services/familyService';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function AcceptInviteScreen() {
    const { token } = useLocalSearchParams<{ token: string }>();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { user } = useAuth();
    const { refreshUserContact } = useAuth();
    const { refreshFamilies } = useFamily();

    const [isLoading, setIsLoading] = useState(true);
    const [invitation, setInvitation] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const [isAccepting, setIsAccepting] = useState(false);

    // Form state for new users
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');

    useEffect(() => {
        if (token) {
            loadInvitation();
        } else {
            setError('Invalid invitation link.');
            setIsLoading(false);
        }
    }, [token]);

    const loadInvitation = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const { data, error: inviteError } = await getInvitationByToken(token!);
            if (inviteError || !data) {
                throw new Error(inviteError?.message || 'Invitation not found or expired.');
            }
            setInvitation(data);
            setFirstName(data.first_name || '');
            setLastName(data.last_name || '');
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAccept = async () => {
        // Basic validation
        if (!firstName.trim()) {
            Alert.alert('Error', 'Please enter your first name');
            return;
        }

        // Only require password if we need to create/update it
        if (!user || (user && password)) {
            if (!password || password.length < 6) {
                Alert.alert('Error', 'Password must be at least 6 characters');
                return;
            }
            if (password !== confirmPassword) {
                Alert.alert('Error', 'Passwords do not match');
                return;
            }
        }

        setIsAccepting(true);
        try {
            let currentUserId = user?.id;
            let currentUserEmail = user?.email || invitation.email;

            if (password) {
                if (user) {
                    // If already logged in (via invite redirect), just update the password
                    const { error: updateError } = await supabase.auth.updateUser({
                        password,
                        data: {
                            first_name: firstName.trim(),
                            last_name: lastName.trim()
                        }
                    });
                    if (updateError) throw updateError;
                } else {
                    // For new users not yet logged in
                    const { error: signUpError } = await useAuth().signUp(
                        invitation.email,
                        password,
                        firstName.trim(),
                        lastName.trim()
                    );
                    if (signUpError) throw signUpError;

                    // After signUp, we should have a user session
                    const { data: { user: newUser } } = await supabase.auth.getUser();
                    if (newUser) {
                        currentUserId = newUser.id;
                        currentUserEmail = newUser.email!;
                    } else {
                        // User might need email confirmation if they didn't use the invite link correctly
                        setIsAccepting(false);
                        Alert.alert('Check Email', 'Successfully created account. Please check your email to confirm before joining.');
                        return;
                    }
                }
            }

            const { error: acceptError } = await acceptInvitation(
                invitation.id,
                currentUserId!,
                currentUserEmail,
                firstName.trim(),
                lastName.trim()
            );

            if (acceptError) throw acceptError;

            await refreshUserContact();
            await refreshFamilies();

            Alert.alert(
                'Success',
                `Welcome! You have joined the ${invitation.family?.name || 'family'}.`,
                [{ text: 'Great!', onPress: () => router.replace('/(tabs)') }]
            );
        } catch (err: any) {
            Alert.alert('Error', err.message || 'Failed to join family.');
        } finally {
            setIsAccepting(false);
        }
    };

    if (isLoading) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color="#007AFF" />
                <Text style={styles.loadingText}>Validating invitation...</Text>
            </View>
        );
    }

    if (error) {
        return (
            <View style={[styles.container, { paddingTop: insets.top }]}>
                <View style={styles.errorContent}>
                    <Ionicons name="alert-circle-outline" size={64} color="#FF3B30" />
                    <Text style={styles.errorTitle}>Oops!</Text>
                    <Text style={styles.errorText}>{error}</Text>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => router.replace('/login')}>
                        <Text style={styles.backButtonText}>Back to Login</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1 }}
        >
            <ScrollView
                style={[styles.container, { paddingTop: insets.top }]}
                contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
                keyboardShouldPersistTaps="handled"
            >
                <View style={styles.content}>
                    <View style={styles.iconContainer}>
                        <Ionicons name="people-outline" size={64} color="#007AFF" />
                    </View>

                    <Text style={styles.title}>You're Invited!</Text>
                    <Text style={styles.subtitle}>
                        <Text style={styles.bold}>{invitation.first_name}</Text> has invited you to join the
                        <Text style={styles.bold}> {invitation.family?.name || 'family'} </Text>
                        calendar.
                    </Text>

                    <View style={styles.formSection}>
                        <Text style={styles.sectionTitle}>Complete Your Account</Text>

                        <View style={styles.inputWrapper}>
                            <Text style={styles.inputLabel}>Email</Text>
                            <View style={[styles.inputContainer, styles.disabledInput]}>
                                <TextInput
                                    style={styles.input}
                                    value={invitation.email}
                                    editable={false}
                                />
                            </View>
                        </View>

                        <View style={styles.nameRow}>
                            <View style={[styles.inputWrapper, { flex: 1 }]}>
                                <Text style={styles.inputLabel}>First Name</Text>
                                <View style={styles.inputContainer}>
                                    <TextInput
                                        style={styles.input}
                                        value={firstName}
                                        onChangeText={setFirstName}
                                        placeholder="First Name"
                                    />
                                </View>
                            </View>
                            <View style={[styles.inputWrapper, { flex: 1 }]}>
                                <Text style={styles.inputLabel}>Last Name</Text>
                                <View style={styles.inputContainer}>
                                    <TextInput
                                        style={styles.input}
                                        value={lastName}
                                        onChangeText={setLastName}
                                        placeholder="Last Name"
                                    />
                                </View>
                            </View>
                        </View>

                        {(!user || !user.user_metadata?.has_password) && (
                            <>
                                <View style={styles.inputWrapper}>
                                    <Text style={styles.inputLabel}>{user ? 'Update Password' : 'Create Password'}</Text>
                                    <View style={styles.inputContainer}>
                                        <TextInput
                                            style={styles.input}
                                            value={password}
                                            onChangeText={setPassword}
                                            secureTextEntry={!showPassword}
                                            placeholder="Min 6 characters"
                                        />
                                        <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                                            <Ionicons
                                                name={showPassword ? "eye-off" : "eye"}
                                                size={20}
                                                color="#8E8E93"
                                            />
                                        </TouchableOpacity>
                                    </View>
                                </View>

                                <View style={styles.inputWrapper}>
                                    <Text style={styles.inputLabel}>Confirm Password</Text>
                                    <View style={styles.inputContainer}>
                                        <TextInput
                                            style={styles.input}
                                            value={confirmPassword}
                                            onChangeText={setConfirmPassword}
                                            secureTextEntry={!showPassword}
                                            placeholder="Confirm password"
                                        />
                                    </View>
                                </View>
                            </>
                        )}

                        <TouchableOpacity
                            style={[styles.acceptButton, isAccepting && styles.buttonDisabled]}
                            onPress={handleAccept}
                            disabled={isAccepting}>
                            {isAccepting ? (
                                <ActivityIndicator color="#FFF" />
                            ) : (
                                <Text style={styles.acceptButtonText}>
                                    {user ? 'Join Family' : 'Create Account & Join'}
                                </Text>
                            )}
                        </TouchableOpacity>

                        {!user && (
                            <TouchableOpacity
                                style={styles.loginLink}
                                onPress={() => router.push({ pathname: '/login', params: { invitationToken: token } })}>
                                <Text style={styles.loginLinkText}>Already have an account? Log In</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F5F7',
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F5F5F7',
    },
    loadingText: {
        marginTop: 12,
        fontSize: 16,
        color: '#8E8E93',
    },
    content: {
        paddingHorizontal: 24,
        paddingTop: 20,
    },
    iconContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#E5F1FF',
        justifyContent: 'center',
        alignItems: 'center',
        alignSelf: 'center',
        marginBottom: 24,
    },
    title: {
        fontSize: 28,
        fontWeight: '700',
        color: '#1D1D1F',
        marginBottom: 8,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 16,
        color: '#48484A',
        lineHeight: 22,
        textAlign: 'center',
        marginBottom: 32,
    },
    bold: {
        fontWeight: '700',
        color: '#1D1D1F',
    },
    formSection: {
        backgroundColor: '#FFF',
        borderRadius: 20,
        padding: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1D1D1F',
        marginBottom: 20,
    },
    inputWrapper: {
        marginBottom: 16,
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: '500',
        color: '#8E8E93',
        marginBottom: 8,
        marginLeft: 4,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F5F5F7',
        borderRadius: 12,
        paddingHorizontal: 16,
        height: 54,
    },
    disabledInput: {
        opacity: 0.6,
    },
    input: {
        flex: 1,
        fontSize: 16,
        color: '#1D1D1F',
    },
    nameRow: {
        flexDirection: 'row',
        gap: 12,
    },
    acceptButton: {
        backgroundColor: '#007AFF',
        borderRadius: 14,
        height: 56,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 12,
        shadowColor: '#007AFF',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    buttonDisabled: {
        opacity: 0.7,
    },
    acceptButtonText: {
        fontSize: 18,
        fontWeight: '700',
        color: '#FFF',
    },
    loginLink: {
        marginTop: 20,
        alignItems: 'center',
    },
    loginLinkText: {
        fontSize: 15,
        color: '#007AFF',
        fontWeight: '600',
    },
    errorContent: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 32,
    },
    errorTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: '#1D1D1F',
        marginTop: 20,
        marginBottom: 8,
    },
    errorText: {
        fontSize: 16,
        color: '#8E8E93',
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 32,
    },
    backButton: {
        backgroundColor: '#1D1D1F',
        borderRadius: 12,
        paddingHorizontal: 24,
        paddingVertical: 14,
    },
    backButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFF',
    },
});
