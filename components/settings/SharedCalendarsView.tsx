import { useAuth } from '@/contexts/AuthContext';
import { useThemeColor } from '@/hooks/use-theme-color';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
    Alert,
    Platform,
    ScrollView,
    Share,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function SharedCalendarsView() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { user } = useAuth();
    const [calendarToken, setCalendarToken] = useState<string | null>(null);
    const [loadingToken, setLoadingToken] = useState(false);

    const backgroundColor = useThemeColor({}, 'background');
    const cardColor = useThemeColor({ light: '#FFFFFF', dark: '#1E1E1E' }, 'background');
    const textColor = useThemeColor({}, 'text');
    const subTextColor = useThemeColor({ light: '#8E8E93', dark: '#9EA0A6' }, 'text');
    const accentColor = useThemeColor({ light: '#007AFF', dark: '#0A84FF' }, 'tint');
    const surfaceColor = useThemeColor({ light: '#F5F5F7', dark: '#2C2C2E' }, 'background');
    const separatorColor = useThemeColor({ light: '#F5F5F7', dark: '#2C2C2E' }, 'background');

    const fetchCalendarToken = useCallback(async () => {
        if (!user) return;
        setLoadingToken(true);
        try {
            const { data, error } = await supabase
                .from('user_preferences')
                .select('calendar_token')
                .eq('user_id', user.id)
                .single();

            if (error) throw error;
            setCalendarToken(data?.calendar_token || null);
        } catch (e) {
            console.error('Error fetching calendar token:', e);
        } finally {
            setLoadingToken(false);
        }
    }, [user]);

    useEffect(() => {
        fetchCalendarToken();
    }, [fetchCalendarToken]);

    const handleRegenerateToken = async () => {
        if (!user) return;

        Alert.alert(
            'Regenerate Link',
            'This will invalidate your current shared calendar link. You will need to update it in your calendar app. Continue?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Regenerate',
                    style: 'destructive',
                    onPress: async () => {
                        setLoadingToken(true);
                        try {
                            const { data, error } = await supabase
                                .rpc('regenerate_calendar_token', { p_user_id: user.id });

                            if (error) throw error;
                            setCalendarToken(data);
                            Alert.alert('Success', 'A new link has been generated.');
                        } catch (e) {
                            console.error('Error regenerating token:', e);
                            Alert.alert('Error', 'Failed to regenerate link.');
                        } finally {
                            setLoadingToken(false);
                        }
                    }
                }
            ]
        );
    };

    const calendarUrl = calendarToken
        ? `https://${process.env.EXPO_PUBLIC_SUPABASE_URL?.split('//')[1].split('.')[0]}.supabase.co/functions/v1/calendar-feed?user_id=${user?.id}&token=${calendarToken}`
        : '';

    const webcalUrl = calendarUrl.replace('https://', 'webcal://');

    const handleCopyLink = async () => {
        if (!calendarUrl) return;
        await Clipboard.setStringAsync(calendarUrl);
        Alert.alert('Copied', 'Calendar link copied to clipboard.');
    };

    const handleShareLink = async () => {
        if (!calendarUrl) return;
        try {
            await Share.share({
                message: `Subscribe to my FamilyCal: ${webcalUrl}`,
                url: webcalUrl,
            });
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top, backgroundColor }]}>
            {/* Header */}
            <View style={[styles.header, { backgroundColor: cardColor }]}>
                <Text style={[styles.headerTitle, { color: textColor }]}>Shared Calendars</Text>
                <TouchableOpacity
                    style={[styles.closeButton, { backgroundColor: surfaceColor }]}
                    onPress={() => router.back()}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Ionicons name="close" size={24} color={textColor} />
                </TouchableOpacity>
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={[
                    styles.scrollContent,
                    { paddingBottom: insets.bottom + 20 },
                ]}
                showsVerticalScrollIndicator={false}>

                <View style={styles.infoCard}>
                    <Ionicons name="information-circle-outline" size={24} color={accentColor} />
                    <Text style={[styles.infoText, { color: textColor }]}>
                        Subscribe to your FamilyCal events in external calendar apps like Apple Calendar, Google Calendar, or Outlook.
                    </Text>
                </View>

                <Text style={[styles.sectionHeader, { color: subTextColor }]}>Sync Status</Text>
                <View style={[styles.card, { backgroundColor: cardColor }]}>
                    <TouchableOpacity
                        style={styles.syncRow}
                        onPress={calendarToken ? handleShareLink : handleRegenerateToken}
                        activeOpacity={0.7}
                    >
                        <View style={styles.syncContent}>
                            <Text style={[styles.syncLabel, { color: textColor }]}>FamilyCal Subscription</Text>
                            <Text style={[styles.syncSubtitle, { color: subTextColor }]}>
                                {calendarToken ? 'Link active' : 'Link not generated'}
                            </Text>
                        </View>
                        <Ionicons
                            name={calendarToken ? "share-outline" : "add-circle-outline"}
                            size={24}
                            color={calendarToken ? accentColor : subTextColor}
                        />
                    </TouchableOpacity>

                    {calendarToken && (
                        <>
                            <View style={[styles.separator, { backgroundColor: separatorColor, marginVertical: 12 }]} />
                            <View style={styles.urlDisplay}>
                                <Text style={[styles.urlText, { color: subTextColor }]} numberOfLines={2} ellipsizeMode="middle">
                                    {calendarUrl}
                                </Text>
                            </View>
                            <View style={styles.actionButtonsRow}>
                                <TouchableOpacity
                                    style={[styles.actionButton, { backgroundColor: surfaceColor }]}
                                    onPress={handleCopyLink}
                                >
                                    <Ionicons name="copy-outline" size={18} color={accentColor} />
                                    <Text style={[styles.actionButtonText, { color: accentColor }]}>Copy Link</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.actionButton, { backgroundColor: surfaceColor }]}
                                    onPress={handleShareLink}
                                >
                                    <Ionicons name="share-outline" size={18} color={accentColor} />
                                    <Text style={[styles.actionButtonText, { color: accentColor }]}>Share</Text>
                                </TouchableOpacity>
                            </View>
                            <View style={[styles.separator, { backgroundColor: separatorColor, marginVertical: 16 }]} />
                            <TouchableOpacity style={styles.regenerateButton} onPress={handleRegenerateToken}>
                                <Text style={styles.regenerateButtonText}>Regenerate Secret Link</Text>
                            </TouchableOpacity>
                        </>
                    )}

                    {!calendarToken && !loadingToken && (
                        <TouchableOpacity style={styles.generateButton} onPress={handleRegenerateToken}>
                            <Text style={styles.generateButtonText}>Generate Sync Link</Text>
                        </TouchableOpacity>
                    )}
                </View>

                <Text style={[styles.instructionsHeader, { color: subTextColor }]}>How to subscribe</Text>
                <View style={[styles.card, { backgroundColor: cardColor }]}>
                    <Text style={[styles.instructionStep, { color: textColor }]}>1. Copy your secret link above.</Text>
                    <Text style={[styles.instructionStep, { color: textColor }]}>2. Open your calendar app (e.g. Apple Calendar).</Text>
                    <Text style={[styles.instructionStep, { color: textColor }]}>3. Choose "Add Calendar Subscription" or "Add via URL".</Text>
                    <Text style={[styles.instructionStep, { color: textColor }]}>4. Paste the link and save.</Text>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomLeftRadius: 16,
        borderBottomRightRadius: 16,
        position: 'relative',
    },
    headerTitle: {
        fontSize: 17,
        fontWeight: '600',
    },
    closeButton: {
        position: 'absolute',
        right: 16,
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 16,
    },
    infoCard: {
        flexDirection: 'row',
        padding: 16,
        borderRadius: 12,
        backgroundColor: 'rgba(0, 122, 255, 0.1)',
        marginBottom: 24,
        gap: 12,
        alignItems: 'center',
    },
    infoText: {
        flex: 1,
        fontSize: 14,
        lineHeight: 20,
    },
    sectionHeader: {
        fontSize: 13,
        fontWeight: '400',
        textTransform: 'uppercase',
        marginBottom: 8,
        paddingHorizontal: 4,
    },
    instructionsHeader: {
        fontSize: 13,
        fontWeight: '400',
        textTransform: 'uppercase',
        marginTop: 16,
        marginBottom: 8,
        paddingHorizontal: 4,
    },
    card: {
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
    },
    syncRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    syncContent: {
        flex: 1,
    },
    syncLabel: {
        fontSize: 17,
        fontWeight: '600',
        marginBottom: 2,
    },
    syncSubtitle: {
        fontSize: 14,
    },
    urlDisplay: {
        padding: 12,
        backgroundColor: 'rgba(0, 0, 0, 0.05)',
        borderRadius: 8,
        marginBottom: 16,
    },
    urlText: {
        fontSize: 12,
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
        lineHeight: 18,
    },
    actionButtonsRow: {
        flexDirection: 'row',
        gap: 12,
    },
    actionButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 10,
        gap: 8,
    },
    actionButtonText: {
        fontSize: 15,
        fontWeight: '600',
    },
    separator: {
        height: 1,
    },
    regenerateButton: {
        alignItems: 'center',
        paddingVertical: 4,
    },
    regenerateButtonText: {
        color: '#FF3B30',
        fontSize: 15,
        fontWeight: '500',
    },
    generateButton: {
        alignItems: 'center',
        paddingVertical: 12,
        backgroundColor: '#007AFF',
        borderRadius: 10,
    },
    generateButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    instructionStep: {
        fontSize: 15,
        lineHeight: 24,
        marginBottom: 8,
    },
});
