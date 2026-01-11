import { useAuth } from '@/contexts/AuthContext';
import { useFamily } from '@/contexts/FamilyContext';
import { acceptInvitation, getInvitationByToken } from '@/services/familyService';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    StyleSheet,
    Text,
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
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAccept = async () => {
        if (!user) {
            // If not logged in, redirect to signup with token
            router.push({
                pathname: '/signup',
                params: { invitationToken: token }
            });
            return;
        }

        setIsAccepting(true);
        try {
            const { error: acceptError } = await acceptInvitation(
                invitation.id,
                user.id,
                user.email!,
                user.user_metadata?.first_name,
                user.user_metadata?.last_name
            );

            if (acceptError) throw acceptError;

            await refreshUserContact();
            await refreshFamilies();

            Alert.alert(
                'Success',
                `You have joined the ${invitation.family?.name || 'family'}.`,
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
        <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.content}>
                <View style={styles.iconContainer}>
                    <Ionicons name="people-outline" size={80} color="#007AFF" />
                </View>

                <Text style={styles.title}>You're Invited!</Text>
                <Text style={styles.subtitle}>
                    {invitation.first_name} has invited you to join the
                    <Text style={styles.bold}> {invitation.family?.name || 'family'} </Text>
                    calendar.
                </Text>

                <View style={styles.spacer} />

                <TouchableOpacity
                    style={[styles.acceptButton, isAccepting && styles.buttonDisabled]}
                    onPress={handleAccept}
                    disabled={isAccepting}>
                    {isAccepting ? (
                        <ActivityIndicator color="#FFF" />
                    ) : (
                        <Text style={styles.acceptButtonText}>
                            {user ? 'Accept Invitation' : 'Sign Up to Join'}
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
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 32,
    },
    iconContainer: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: '#E5F1FF',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 32,
    },
    title: {
        fontSize: 32,
        fontWeight: '700',
        color: '#1D1D1F',
        marginBottom: 12,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 18,
        color: '#48484A',
        lineHeight: 26,
        textAlign: 'center',
        marginBottom: 40,
    },
    bold: {
        fontWeight: '700',
        color: '#1D1D1F',
    },
    spacer: {
        flex: 1,
    },
    acceptButton: {
        width: '100%',
        backgroundColor: '#007AFF',
        borderRadius: 14,
        paddingVertical: 18,
        alignItems: 'center',
        justifyContent: 'center',
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
        padding: 10,
    },
    loginLinkText: {
        fontSize: 16,
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
