import { Colors } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useFamily } from '@/contexts/FamilyContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Routine, RoutineCompletion, RoutineItem } from '@/lib/supabase';
import { routineService } from '@/services/routineService';
import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    RefreshControl,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    useWindowDimensions,
    View
} from 'react-native';

const COLUMN_SPACING = 15;

export default function RoutinesScreen() {
    const colorScheme = useColorScheme();
    const theme = Colors[colorScheme ?? 'light'];
    const { userContact } = useAuth();
    const { currentFamily, familyMembers } = useFamily();

    const { width: screenWidth } = useWindowDimensions();

    const visibleFamilyMembers = useMemo(() => {
        return familyMembers.filter(m => m.contact.routines_enabled !== false);
    }, [familyMembers]);

    const COLUMN_WIDTH = useMemo(() => {
        const numMembers = visibleFamilyMembers?.length || 1;
        const visibleCols = Math.min(numMembers, 4);
        const totalSpacing = COLUMN_SPACING * (visibleCols + 1);
        return (screenWidth - totalSpacing) / visibleCols;
    }, [visibleFamilyMembers?.length, screenWidth]);

    // Data State
    const [memberRoutines, setMemberRoutines] = useState<Record<string, Routine[]>>({});
    const [completions, setCompletions] = useState<RoutineCompletion[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Management State
    const [isAddModalVisible, setIsAddModalVisible] = useState(false);
    const [addRoutineTargetMemberId, setAddRoutineTargetMemberId] = useState<string | null>(null);
    const [newRoutineTitle, setNewRoutineTitle] = useState('');
    const [newRoutineDesc, setNewRoutineDesc] = useState('');
    const [newItemTitles, setNewItemTitles] = useState<{ [key: string]: string }>({});

    // Settings/Edit Modal State
    const [isSettingsModalVisible, setIsSettingsModalVisible] = useState(false);
    const [isEditItemModalVisible, setIsEditItemModalVisible] = useState(false);
    const [isEditRoutineModalVisible, setIsEditRoutineModalVisible] = useState(false);
    const [editingItem, setEditingItem] = useState<RoutineItem | null>(null);
    const [editingRoutine, setEditingRoutine] = useState<Routine | null>(null);
    const [editMode, setEditMode] = useState(false);
    const [currentTime, setCurrentTime] = useState(new Date());

    const DEFAULT_ROUTINES_TO_CREATE = [
        { title: 'Morning', icon: 'sunny-outline' },
        { title: 'Afternoon', icon: 'partly-sunny-outline' },
        { title: 'Evening', icon: 'moon-outline' },
        { title: 'Bedtime', icon: 'bed-outline' }
    ];
    const [editTitle, setEditTitle] = useState('');
    const [editDesc, setEditDesc] = useState('');
    const [editCoverUrl, setEditCoverUrl] = useState('');
    const [selectedCopyMemberIds, setSelectedCopyMemberIds] = useState<string[]>([]);
    const [selectedRoutineTitle, setSelectedRoutineTitle] = useState('');
    const [sourceMemberId, setSourceMemberId] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [newRoutineDayType, setNewRoutineDayType] = useState<'everyday' | 'weekday' | 'weekend'>('everyday');
    const [editRoutineDayType, setEditRoutineDayType] = useState<'everyday' | 'weekday' | 'weekend'>('everyday');
    const [editRoutineTitle, setEditRoutineTitle] = useState('');
    const [newRoutineStartTime, setNewRoutineStartTime] = useState<string | null>(null);
    const [newRoutineEndTime, setNewRoutineEndTime] = useState<string | null>(null);
    const [editRoutineStartTime, setEditRoutineStartTime] = useState<string | null>(null);
    const [editRoutineEndTime, setEditRoutineEndTime] = useState<string | null>(null);

    const todayDate = useMemo(() => {
        const options: Intl.DateTimeFormatOptions = { weekday: 'long', month: 'short', day: 'numeric' };
        return new Date().toLocaleDateString('en-US', options);
    }, []);

    const allRoutineTitles = useMemo(() => {
        const titles = new Set<string>();
        // Add some defaults if empty
        titles.add('Morning');
        titles.add('Afternoon');
        titles.add('Evening');
        titles.add('Bedtime');
        Object.values(memberRoutines).flat().forEach(r => {
            if (r.title) titles.add(r.title);
        });
        return Array.from(titles);
    }, [memberRoutines]);



    const isRoutineVisible = useCallback((routine: Routine) => {
        if (editMode) return true;

        const today = new Date();
        const dayOfWeek = today.getDay(); // 0 is Sunday, 6 is Saturday
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

        // Day type filtering
        if (routine.day_type === 'weekday' && isWeekend) return false;
        if (routine.day_type === 'weekend' && !isWeekend) return false;

        // Time filtering
        if (routine.start_time && routine.end_time) {
            const [startH, startM] = routine.start_time.split(':').map(Number);
            const [endH, endM] = routine.end_time.split(':').map(Number);

            const nowH = currentTime.getHours();
            const nowM = currentTime.getMinutes();
            const nowTotal = nowH * 60 + nowM;

            const startTotal = startH * 60 + startM;
            const endTotal = endH * 60 + endM;

            if (startTotal <= endTotal) {
                // Same day
                return nowTotal >= startTotal && nowTotal <= endTotal;
            } else {
                // Over midnight
                return nowTotal >= startTotal || nowTotal <= endTotal;
            }
        }

        return true;
    }, [editMode, currentTime]);

    const fetchData = useCallback(async () => {
        if (!currentFamily?.id || visibleFamilyMembers.length === 0) return;

        try {
            // 1. Ensure Default Shared Routines Exist
            const sharedRoutines = await routineService.getRoutines(currentFamily.id, null);
            const missingDefaults = DEFAULT_ROUTINES_TO_CREATE.filter(
                def => !sharedRoutines.some(r => r.title === def.title)
            );

            if (missingDefaults.length > 0) {
                await Promise.all(missingDefaults.map((def, idx) =>
                    routineService.createRoutine({
                        family_id: currentFamily.id!,
                        title: def.title,
                        icon: def.icon,
                        sort_order: sharedRoutines.length + idx,
                        contact_id: null
                    })
                ));
            }

            const routinesMap: Record<string, Routine[]> = {};
            const allItemIds: string[] = [];
            // Fetch for each member
            await Promise.all(visibleFamilyMembers.map(async (member) => {
                const routines = await routineService.getRoutines(currentFamily.id, member.contact.id);

                // De-duplicate: If there's a private routine with the same title as a shared one, 
                // hide the shared one for this member.
                const privateTitles = new Set(routines.filter(r => r.contact_id === member.contact.id).map(r => r.title));

                // Filter by day type
                const today = new Date();
                const dayOfWeek = today.getDay(); // 0 is Sunday, 6 is Saturday
                const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

                const filteredRoutines = routines.filter((r: Routine) => {
                    // Hide shared if private exists
                    if (r.contact_id === null && privateTitles.has(r.title)) return false;

                    return true;
                });

                routinesMap[member.contact.id] = filteredRoutines;
                filteredRoutines.forEach((r: Routine) => {
                    r.items?.forEach((i: RoutineItem) => allItemIds.push(i.id));
                });
            }));

            setMemberRoutines(routinesMap);

            if (allItemIds.length > 0) {
                const today = new Date().toISOString().split('T')[0];
                const completionsData = await routineService.getCompletions(allItemIds, today);
                setCompletions(completionsData);
            } else {
                setCompletions([]);
            }
        } catch (error) {
            console.error('Error fetching routines data:', error);
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, [currentFamily?.id, visibleFamilyMembers]);

    useEffect(() => {
        const timer = setInterval(() => {
            const now = new Date();
            const prevDate = currentTime.toISOString().split('T')[0];
            const nowDate = now.toISOString().split('T')[0];

            if (nowDate !== prevDate) {
                // Date changed! Midnight reset.
                fetchData();
            }

            setCurrentTime(now);
        }, 60000); // Update every minute
        return () => clearInterval(timer);
    }, [currentTime, fetchData]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const onRefresh = () => {
        setIsRefreshing(true);
        fetchData();
    };

    const toggleItem = async (itemId: string, contactId: string) => {
        const today = new Date().toISOString().split('T')[0];
        const isCompleted = !!completions.find((c) => c.item_id === itemId && c.contact_id === contactId);

        try {
            // Optimistic update
            if (isCompleted) {
                setCompletions((prev) => prev.filter((c) => !(c.item_id === itemId && c.contact_id === contactId)));
            } else {
                setCompletions((prev) => [
                    ...prev,
                    {
                        id: 'temp-' + Math.random(),
                        item_id: itemId,
                        contact_id: contactId,
                        completed_at: new Date().toISOString(),
                        completion_date: today,
                        created_at: new Date().toISOString(),
                    },
                ]);
            }

            await routineService.toggleCompletion(itemId, contactId, today, !isCompleted);
        } catch (error) {
            console.error('Error toggling completion:', error);
            fetchData();
        }
    };

    const handleAddRoutine = async () => {
        if (!currentFamily?.id || !newRoutineTitle.trim()) return;

        try {
            await routineService.createRoutine({
                family_id: currentFamily.id,
                contact_id: addRoutineTargetMemberId,
                title: newRoutineTitle.trim(),
                description: newRoutineDesc.trim() || null,
                icon: 'list',
                day_type: newRoutineDayType,
                start_time: newRoutineStartTime,
                end_time: newRoutineEndTime,
                sort_order: (addRoutineTargetMemberId ? memberRoutines[addRoutineTargetMemberId]?.length : 0) || 0,
            });
            setNewRoutineTitle('');
            setNewRoutineDesc('');
            setNewRoutineDayType('everyday');
            setNewRoutineStartTime(null);
            setNewRoutineEndTime(null);
            setIsAddModalVisible(false);
            fetchData();
        } catch (error: any) {
            console.error('Error creating routine:', error);
            Alert.alert('Error', `Failed to create routine: ${error.message}`);
        }
    };

    const openRoutineSettings = (routine: Routine) => {
        setEditingRoutine(routine);
        setEditRoutineTitle(routine.title);
        setEditRoutineDayType(routine.day_type || 'everyday');
        setEditRoutineStartTime(routine.start_time || null);
        setEditRoutineEndTime(routine.end_time || null);
        setIsEditRoutineModalVisible(true);
    };

    const handleUpdateRoutine = async () => {
        if (!editingRoutine || !editRoutineTitle.trim()) return;
        try {
            await routineService.updateRoutine(editingRoutine.id, {
                title: editRoutineTitle.trim(),
                day_type: editRoutineDayType,
                start_time: editRoutineStartTime,
                end_time: editRoutineEndTime,
            });
            setIsEditRoutineModalVisible(false);
            fetchData();
        } catch (error: any) {
            console.error('Error updating routine:', error);
            Alert.alert('Error', `Failed to update routine: ${error.message}`);
        }
    };

    const handleAddItem = async (routineId: string, memberId: string) => {
        const inputKey = `${memberId}-${routineId}`;
        const title = newItemTitles[inputKey];
        if (!title || !title.trim()) return;

        try {
            const currentRoutines = memberRoutines[memberId] || [];
            const originalRoutine = currentRoutines.find(r => r.id === routineId);

            if (!originalRoutine) return;

            let targetRoutineId = routineId;

            // FORKING LOGIC: If this is a shared routine (contact_id is null), 
            // create or find a private copy for this member first.
            if (!originalRoutine.contact_id && currentFamily?.id) {
                // Check if we already have a private forked copy for this member
                const existingPrivate = currentRoutines.find(r => r.contact_id === memberId && r.title === originalRoutine.title);

                if (existingPrivate) {
                    targetRoutineId = existingPrivate.id;
                } else {
                    const newRoutine = await routineService.createRoutine({
                        family_id: currentFamily.id,
                        contact_id: memberId,
                        title: originalRoutine.title,
                        icon: originalRoutine.icon,
                        day_type: originalRoutine.day_type,
                        sort_order: originalRoutine.sort_order || 0,
                    });

                    // Copy existing items to the new private routine
                    if (originalRoutine.items && originalRoutine.items.length > 0) {
                        await Promise.all(originalRoutine.items.map(item =>
                            routineService.addRoutineItem({
                                routine_id: newRoutine.id,
                                title: item.title,
                                description: item.description,
                                cover_url: item.cover_url,
                                sort_order: item.sort_order
                            })
                        ));
                    }
                    targetRoutineId = newRoutine.id;
                }
            }

            await routineService.addRoutineItem({
                routine_id: targetRoutineId,
                title: title.trim(),
                sort_order: (originalRoutine.items?.length || 0) + 1,
            });
            setNewItemTitles((prev) => ({ ...prev, [inputKey]: '' }));
            fetchData();
        } catch (error: any) {
            console.error('Error adding item:', error);
            Alert.alert('Error', `Failed to add item: ${error.message}`);
        }
    };

    const handleDeleteRoutine = (id: string, title: string) => {
        const message = `Are you sure you want to delete "${title}"?`;

        if (Platform.OS === 'web') {
            if (window.confirm(message)) {
                (async () => {
                    try {
                        await routineService.deleteRoutine(id);
                        fetchData();
                    } catch (error) {
                        console.error('Error deleting routine:', error);
                        alert(`Failed to delete routine: ${(error as Error).message || 'Unknown error'}`);
                    }
                })();
            }
            return;
        }

        Alert.alert('Delete Routine', message, [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                    try {
                        await routineService.deleteRoutine(id);
                        fetchData();
                    } catch (error) {
                        console.error('Error deleting routine:', error);
                        Alert.alert('Error', `Failed to delete routine: ${(error as Error).message || 'Unknown error'}`);
                    }
                },
            },
        ]);
    };

    const handleDeleteItem = (itemId: string, itemTitle: string) => {
        const message = `Are you sure you want to delete "${itemTitle}"?`;

        if (Platform.OS === 'web') {
            if (window.confirm(message)) {
                (async () => {
                    try {
                        await routineService.deleteRoutineItem(itemId);
                        fetchData();
                    } catch (error) {
                        console.error('Error deleting item:', error);
                        alert(`Failed to delete task: ${(error as Error).message || 'Unknown error'}`);
                    }
                })();
            }
            return;
        }

        Alert.alert('Delete Task', message, [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                    try {
                        await routineService.deleteRoutineItem(itemId);
                        fetchData();
                    } catch (error) {
                        console.error('Error deleting item:', error);
                        Alert.alert('Error', `Failed to delete task: ${(error as Error).message || 'Unknown error'}`);
                    }
                },
            },
        ]);
    };

    const moveItem = async (routineId: string, itemId: string, direction: 'up' | 'down', memberId: string) => {
        const routines = memberRoutines[memberId] || [];
        const routine = routines.find(r => r.id === routineId);
        if (!routine || !routine.items) return;

        const items = [...routine.items].sort((a, b) => a.sort_order - b.sort_order);
        const index = items.findIndex(i => i.id === itemId);
        if (index === -1) return;

        const newIndex = direction === 'up' ? index - 1 : index + 1;
        if (newIndex < 0 || newIndex >= items.length) return;

        const item1 = items[index];
        const item2 = items[newIndex];
        const tempOrder = item1.sort_order;

        try {
            await Promise.all([
                routineService.updateRoutineItem(item1.id, { sort_order: item2.sort_order }),
                routineService.updateRoutineItem(item2.id, { sort_order: tempOrder })
            ]);
            fetchData();
        } catch (error) {
            console.error('Error reordering items:', error);
        }
    };

    const moveRoutine = async (routineId: string, direction: 'up' | 'down', memberId: string) => {
        const routines = memberRoutines[memberId] || [];
        const sortedRoutines = [...routines].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
        const index = sortedRoutines.findIndex(r => r.id === routineId);
        if (index === -1) return;

        const newIndex = direction === 'up' ? index - 1 : index + 1;
        if (newIndex < 0 || newIndex >= sortedRoutines.length) return;

        const r1 = sortedRoutines[index];
        const r2 = sortedRoutines[newIndex];
        const tempOrder = r1.sort_order || 0;

        try {
            await Promise.all([
                routineService.updateRoutine(r1.id, { sort_order: r2.sort_order || 0 }),
                routineService.updateRoutine(r2.id, { sort_order: tempOrder })
            ]);
            fetchData();
        } catch (error) {
            console.error('Error reordering routines:', error);
        }
    };

    const getCompletionStats = (memberId: string) => {
        const routines = memberRoutines[memberId] || [];
        const items = routines.flatMap(r => r.items || []);
        const total = items.length;
        const completed = items.filter(i => completions.find(c => c.item_id === i.id && c.contact_id === memberId)).length;
        return { total, completed };
    };

    const openSettings = (item: RoutineItem, memberId: string) => {
        setEditingItem(item);
        setEditCoverUrl(item.cover_url || '');
        setSelectedCopyMemberIds([]);
        setSourceMemberId(memberId);
        // Find current routine title
        const currentRoutine = Object.values(memberRoutines).flat().find(r => r.id === item.routine_id);
        setSelectedRoutineTitle(currentRoutine?.title || '');
        setIsSettingsModalVisible(true);
    };

    const openEdit = (item: RoutineItem, memberId: string) => {
        setEditingItem(item);
        setEditTitle(item.title);
        setEditDesc(item.description || '');
        setSelectedCopyMemberIds([]);
        setSourceMemberId(memberId);
        const currentRoutine = Object.values(memberRoutines).flat().find(r => r.id === item.routine_id);
        setSelectedRoutineTitle(currentRoutine?.title || '');
        setIsEditItemModalVisible(true);
    };

    const saveSettings = async () => {
        if (!editingItem || !sourceMemberId || isSaving) return;
        setIsSaving(true);
        try {
            const updates: Partial<RoutineItem> = {
                cover_url: editCoverUrl.trim() || null,
            };

            // 1. ALWAYS handle the original item's routine assignment (MOVE)
            if (currentFamily?.id) {
                const targetRoutines = await routineService.getRoutines(currentFamily.id, sourceMemberId);
                // Prefer private routine with this title
                let targetRoutine = targetRoutines.find(r => r.title === selectedRoutineTitle && r.contact_id === sourceMemberId);

                const currentRoutine = Object.values(memberRoutines).flat().find(r => r.id === editingItem.routine_id);

                if (!targetRoutine) {
                    targetRoutine = await routineService.createRoutine({
                        family_id: currentFamily.id,
                        contact_id: sourceMemberId,
                        title: selectedRoutineTitle,
                        icon: currentRoutine?.icon || 'sunny-outline',
                        day_type: currentRoutine?.day_type || 'everyday',
                        sort_order: targetRoutines.length,
                    });
                }

                if (targetRoutine.id !== editingItem.routine_id) {
                    updates.routine_id = targetRoutine.id;
                }

                // 2. Handle COPIES for other members
                if (selectedCopyMemberIds.length > 0) {
                    await Promise.all(selectedCopyMemberIds.map(async (memberId) => {
                        // Skip source member (already handled by 'updates' on original)
                        if (memberId === sourceMemberId) return;

                        const memberRoutinesList = await routineService.getRoutines(currentFamily.id, memberId);
                        // Prefer private routine for target member
                        let memberTargetRoutine = memberRoutinesList.find(r => r.title === selectedRoutineTitle && r.contact_id === memberId);

                        if (!memberTargetRoutine) {
                            memberTargetRoutine = await routineService.createRoutine({
                                family_id: currentFamily.id,
                                contact_id: memberId,
                                title: selectedRoutineTitle,
                                icon: currentRoutine?.icon || 'sunny-outline',
                                day_type: currentRoutine?.day_type || 'everyday',
                                sort_order: memberRoutinesList.length,
                            });
                        }

                        await routineService.addRoutineItem({
                            routine_id: memberTargetRoutine.id,
                            title: editingItem.title,
                            description: editingItem.description,
                            cover_url: editCoverUrl.trim() || null,
                            sort_order: (memberTargetRoutine.items?.length || 0) + 1,
                        });
                    }));
                }
            }

            await routineService.updateRoutineItem(editingItem.id, updates);
            setIsSettingsModalVisible(false);
            fetchData();
        } catch (error) {
            console.error('Error saving settings:', error);
            Alert.alert('Error', 'Failed to save settings.');
        } finally {
            setIsSaving(false);
        }
    };

    const saveEdit = async () => {
        if (!editingItem || !editTitle.trim() || !sourceMemberId || isSaving) return;
        setIsSaving(true);
        try {
            const updates: any = {
                title: editTitle.trim(),
                description: editDesc.trim() || null,
            };

            // Check if routine title changed
            const currentRoutines = Object.values(memberRoutines).flat();
            const currentRoutine = currentRoutines.find(r => r.id === editingItem.routine_id);

            if (currentRoutine && currentRoutine.title !== selectedRoutineTitle && currentFamily?.id) {
                const targetRoutines = await routineService.getRoutines(currentFamily.id, sourceMemberId);
                // Prefer private routine
                let targetRoutine = targetRoutines.find(r => r.title === selectedRoutineTitle && r.contact_id === sourceMemberId);

                if (!targetRoutine) {
                    targetRoutine = await routineService.createRoutine({
                        family_id: currentFamily.id,
                        contact_id: sourceMemberId,
                        title: selectedRoutineTitle,
                        icon: currentRoutine.icon || 'sunny-outline',
                        day_type: currentRoutine.day_type || 'everyday',
                        sort_order: targetRoutines.length,
                    });
                }
                updates.routine_id = targetRoutine.id;
            }

            await routineService.updateRoutineItem(editingItem.id, updates);
            setIsEditItemModalVisible(false);
            fetchData();
        } catch (error) {
            console.error('Error saving edits:', error);
            Alert.alert('Error', 'Failed to save edits.');
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading && !isRefreshing) {
        return (
            <View style={[styles.centerContainer, { backgroundColor: theme.background }]}>
                <ActivityIndicator size="large" color={theme.tint} />
            </View>
        );
    }

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
            >
                <View style={styles.header}>
                    <View>
                        <Text style={[styles.dateText, { color: theme.secondaryText }]}>{todayDate}</Text>
                        <Text style={[styles.title, { color: theme.text }]}>Daily Routines</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <TouchableOpacity
                            onPress={() => setEditMode(!editMode)}
                            style={[styles.editToggle, { backgroundColor: editMode ? theme.tint : theme.cardBackground }]}
                        >
                            <Text style={{ color: editMode ? '#fff' : theme.text, fontWeight: '600' }}>
                                {editMode ? 'Done' : 'Edit'}
                            </Text>
                        </TouchableOpacity>
                        {editMode && (
                            <TouchableOpacity style={styles.addButton} onPress={() => setIsAddModalVisible(true)}>
                                <Ionicons name="add-circle" size={36} color={theme.tint} />
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                <ScrollView
                    horizontal
                    pagingEnabled={false}
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={[styles.columnContainer, { paddingHorizontal: COLUMN_SPACING / 2 }]}
                    decelerationRate="fast"
                    snapToInterval={COLUMN_WIDTH + COLUMN_SPACING}
                >
                    {visibleFamilyMembers.map((member) => {
                        const { total, completed } = getCompletionStats(member.contact.id);
                        const routines = memberRoutines[member.contact.id] || [];

                        return (
                            <View key={member.contact.id} style={[styles.memberColumn, { width: COLUMN_WIDTH, marginHorizontal: COLUMN_SPACING / 2 }]}>
                                <View style={styles.columnHeader}>
                                    <View style={styles.memberInfo}>
                                        {member.contact.avatar_url ? (
                                            <Image source={{ uri: member.contact.avatar_url }} style={styles.memberAvatar} />
                                        ) : (
                                            <View style={[styles.memberAvatarPlaceholder, { backgroundColor: theme.tint + '20' }]}>
                                                <Text style={{ color: theme.tint, fontWeight: 'bold' }}>{member.contact.first_name[0]}</Text>
                                            </View>
                                        )}
                                        <View>
                                            <Text style={[styles.memberName, { color: theme.text }]}>{member.contact.first_name}</Text>
                                            <Text style={[styles.statsText, { color: theme.secondaryText }]}>
                                                {completed} / {total} items done
                                            </Text>
                                        </View>
                                    </View>
                                </View>

                                <ScrollView
                                    style={styles.routineList}
                                    showsVerticalScrollIndicator={false}
                                    refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={theme.tint} />}
                                >
                                    {routines
                                        .filter(isRoutineVisible)
                                        .map((routine, rIdx, filteredRoutines) => (
                                            <View key={routine.id} style={styles.routineSection}>
                                                <View style={styles.sectionHeader}>
                                                    <View>
                                                        <Text style={[styles.sectionTitle, { color: theme.text }]}>{routine.title}</Text>
                                                        {routine.start_time && routine.end_time && (
                                                            <Text style={{ color: theme.secondaryText, fontSize: 10 }}>
                                                                {routine.start_time} - {routine.end_time}
                                                            </Text>
                                                        )}
                                                    </View>
                                                    {editMode && (
                                                        <View style={styles.sectionActions}>
                                                            <TouchableOpacity onPress={() => openRoutineSettings(routine)}>
                                                                <Ionicons name="settings-outline" size={16} color={theme.secondaryText} />
                                                            </TouchableOpacity>
                                                            <TouchableOpacity onPress={() => moveRoutine(routine.id, 'up', member.contact.id)} disabled={rIdx === 0}>
                                                                <Ionicons name="chevron-up" size={16} color={rIdx === 0 ? theme.secondaryText + '30' : theme.secondaryText} />
                                                            </TouchableOpacity>
                                                            <TouchableOpacity onPress={() => moveRoutine(routine.id, 'down', member.contact.id)} disabled={rIdx === filteredRoutines.length - 1}>
                                                                <Ionicons name="chevron-down" size={16} color={rIdx === filteredRoutines.length - 1 ? theme.secondaryText + '30' : theme.secondaryText} />
                                                            </TouchableOpacity>
                                                            <TouchableOpacity onPress={() => handleDeleteRoutine(routine.id, routine.title)} style={{ marginLeft: 5 }}>
                                                                <Ionicons name="trash-outline" size={16} color={theme.secondaryText + '60'} />
                                                            </TouchableOpacity>
                                                        </View>
                                                    )}
                                                </View>

                                                <View style={styles.grid}>
                                                    {routine.items?.map((item) => {
                                                        const isDone = !!completions.find(c => c.item_id === item.id && c.contact_id === member.contact.id);
                                                        return (
                                                            <View key={item.id} style={styles.cardContainer}>
                                                                <View style={[styles.squareCard, { backgroundColor: theme.cardBackground }]}>
                                                                    <TouchableOpacity
                                                                        activeOpacity={0.7}
                                                                        onPress={() => toggleItem(item.id, member.contact.id)}
                                                                        style={[styles.cardMainArea, { opacity: isDone ? 0.6 : 1 }]}
                                                                    >
                                                                        {!isDone && (
                                                                            item.cover_url ? (
                                                                                <Image source={{ uri: item.cover_url }} style={styles.cardCover} resizeMode="cover" />
                                                                            ) : (
                                                                                <View style={[styles.cardCoverPlaceholder, { backgroundColor: theme.tint + '10' }]}>
                                                                                    <Ionicons name="image-outline" size={24} color={theme.tint + '40'} />
                                                                                </View>
                                                                            )
                                                                        )}
                                                                        <View style={styles.cardTextContainer}>
                                                                            <Text style={[styles.cardTitle, { color: theme.text }, isDone && styles.itemCompleted]} numberOfLines={2}>
                                                                                {item.title}
                                                                            </Text>
                                                                        </View>
                                                                    </TouchableOpacity>

                                                                    {editMode && (
                                                                        <View style={styles.cardActionBar}>
                                                                            <Pressable
                                                                                onPress={() => openSettings(item, member.contact.id)}
                                                                                style={({ pressed }: { pressed: boolean }) => [styles.actionIcon, pressed && { opacity: 0.5 }]}
                                                                                hitSlop={10}
                                                                            >
                                                                                <Ionicons name="settings-outline" size={14} color={theme.secondaryText} />
                                                                            </Pressable>
                                                                            <Pressable
                                                                                onPress={() => openEdit(item, member.contact.id)}
                                                                                style={({ pressed }: { pressed: boolean }) => [styles.actionIcon, pressed && { opacity: 0.5 }]}
                                                                                hitSlop={10}
                                                                            >
                                                                                <Ionicons name="create-outline" size={14} color={theme.secondaryText} />
                                                                            </Pressable>
                                                                            <Pressable
                                                                                onPress={() => {
                                                                                    console.log('Delete icon pressed');
                                                                                    handleDeleteItem(item.id, item.title);
                                                                                }}
                                                                                style={({ pressed }: { pressed: boolean }) => [styles.actionIcon, pressed && { opacity: 0.5 }]}
                                                                                hitSlop={20}
                                                                            >
                                                                                <Ionicons name="trash-outline" size={14} color={theme.secondaryText} />
                                                                            </Pressable>
                                                                        </View>
                                                                    )}

                                                                    {isDone && (
                                                                        <View style={styles.checkOverlay} pointerEvents="none">
                                                                            <Ionicons name="checkmark-circle" size={20} color="#34C759" />
                                                                        </View>
                                                                    )}
                                                                </View>
                                                            </View>
                                                        );
                                                    })}
                                                    {editMode && (
                                                        <View style={styles.cardContainer}>
                                                            <View style={[styles.squareCard, styles.addCard, { backgroundColor: theme.cardBackground + '50' }]}>
                                                                {(() => {
                                                                    const inputKey = `${member.contact.id}-${routine.id}`;
                                                                    return (
                                                                        <TextInput
                                                                            style={[styles.addInput, { color: theme.text }]}
                                                                            placeholder="Add..."
                                                                            placeholderTextColor={theme.secondaryText + '80'}
                                                                            value={newItemTitles[inputKey] || ''}
                                                                            onChangeText={(text) => setNewItemTitles((prev) => ({ ...prev, [inputKey]: text }))}
                                                                            onSubmitEditing={() => handleAddItem(routine.id, member.contact.id)}
                                                                        />
                                                                    );
                                                                })()}
                                                            </View>
                                                        </View>
                                                    )}
                                                </View>
                                            </View>
                                        ))}
                                </ScrollView>
                            </View>
                        );
                    })}
                </ScrollView>
            </KeyboardAvoidingView>

            {/* Modals */}
            <Modal visible={isAddModalVisible} animationType="fade" transparent>
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
                        <Text style={[styles.modalTitle, { color: theme.text }]}>New Routine</Text>

                        <Text style={[styles.label, { color: theme.secondaryText }]}>Target Member</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 15 }}>
                            {visibleFamilyMembers.map(m => (
                                <TouchableOpacity
                                    key={m.contact.id}
                                    onPress={() => setAddRoutineTargetMemberId(m.contact.id)}
                                    style={[styles.memberSelectBtn, addRoutineTargetMemberId === m.contact.id && { borderColor: theme.tint, backgroundColor: theme.tint + '10' }]}
                                >
                                    <Text style={{ color: theme.text }}>{m.contact.first_name}</Text>
                                </TouchableOpacity>
                            ))}
                            <TouchableOpacity
                                onPress={() => setAddRoutineTargetMemberId(null)}
                                style={[styles.memberSelectBtn, addRoutineTargetMemberId === null && { borderColor: theme.tint, backgroundColor: theme.tint + '10' }]}
                            >
                                <Text style={{ color: theme.text }}>Whole Family</Text>
                            </TouchableOpacity>
                        </ScrollView>

                        <TextInput
                            style={[styles.input, { color: theme.text, backgroundColor: theme.cardBackground }]}
                            placeholder="Routine Title"
                            value={newRoutineTitle}
                            onChangeText={setNewRoutineTitle}
                        />
                        <TextInput
                            style={[styles.input, { color: theme.text, backgroundColor: theme.cardBackground }]}
                            placeholder="Description"
                            value={newRoutineDesc}
                            onChangeText={setNewRoutineDesc}
                        />

                        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 15 }}>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.label, { color: theme.secondaryText }]}>Start Time (HH:MM)</Text>
                                <TextInput
                                    style={[styles.input, { color: theme.text, backgroundColor: theme.cardBackground }]}
                                    placeholder="08:00"
                                    value={newRoutineStartTime || ''}
                                    onChangeText={setNewRoutineStartTime}
                                />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.label, { color: theme.secondaryText }]}>End Time (HH:MM)</Text>
                                <TextInput
                                    style={[styles.input, { color: theme.text, backgroundColor: theme.cardBackground }]}
                                    placeholder="20:00"
                                    value={newRoutineEndTime || ''}
                                    onChangeText={setNewRoutineEndTime}
                                />
                            </View>
                        </View>

                        <Text style={[styles.label, { color: theme.secondaryText }]}>Category</Text>
                        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 15 }}>
                            {(['everyday', 'weekday', 'weekend'] as const).map(type => (
                                <TouchableOpacity
                                    key={type}
                                    onPress={() => setNewRoutineDayType(type)}
                                    style={[styles.memberSelectBtn, newRoutineDayType === type && { borderColor: theme.tint, backgroundColor: theme.tint + '10' }]}
                                >
                                    <Text style={{ color: theme.text, fontSize: 12 }}>{type.charAt(0).toUpperCase() + type.slice(1)}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                        <View style={styles.modalButtons}>
                            <TouchableOpacity onPress={() => setIsAddModalVisible(false)} style={styles.modalBtn}>
                                <Text style={{ color: theme.secondaryText }}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={handleAddRoutine} style={[styles.modalBtn, { backgroundColor: theme.tint, borderRadius: 10 }]}>
                                <Text style={{ color: '#fff', fontWeight: 'bold' }}>Create</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Edit Routine Modal */}
            <Modal visible={isEditRoutineModalVisible} animationType="fade" transparent>
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
                        <Text style={[styles.modalTitle, { color: theme.text }]}>Edit Routine</Text>

                        <Text style={[styles.label, { color: theme.secondaryText }]}>Title</Text>
                        <TextInput
                            style={[styles.input, { color: theme.text, backgroundColor: theme.cardBackground }]}
                            placeholder="Routine Title"
                            value={editRoutineTitle}
                            onChangeText={setEditRoutineTitle}
                        />

                        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 15 }}>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.label, { color: theme.secondaryText }]}>Start Time</Text>
                                <TextInput
                                    style={[styles.input, { color: theme.text, backgroundColor: theme.cardBackground }]}
                                    placeholder="08:00"
                                    value={editRoutineStartTime || ''}
                                    onChangeText={setEditRoutineStartTime}
                                />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.label, { color: theme.secondaryText }]}>End Time</Text>
                                <TextInput
                                    style={[styles.input, { color: theme.text, backgroundColor: theme.cardBackground }]}
                                    placeholder="20:00"
                                    value={editRoutineEndTime || ''}
                                    onChangeText={setEditRoutineEndTime}
                                />
                            </View>
                        </View>

                        <Text style={[styles.label, { color: theme.secondaryText }]}>When to show</Text>
                        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 15 }}>
                            {(['everyday', 'weekday', 'weekend'] as const).map(type => (
                                <TouchableOpacity
                                    key={type}
                                    onPress={() => setEditRoutineDayType(type)}
                                    style={[styles.memberSelectBtn, editRoutineDayType === type && { borderColor: theme.tint, backgroundColor: theme.tint + '10' }]}
                                >
                                    <Text style={{ color: theme.text, fontSize: 12 }}>{type.charAt(0).toUpperCase() + type.slice(1)}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <View style={styles.modalButtons}>
                            <TouchableOpacity onPress={() => setIsEditRoutineModalVisible(false)} style={styles.modalBtn}>
                                <Text style={{ color: theme.secondaryText }}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={handleUpdateRoutine} style={[styles.modalBtn, { backgroundColor: theme.tint, borderRadius: 10 }]}>
                                <Text style={{ color: '#fff', fontWeight: 'bold' }}>Save</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Settings Modal */}
            <Modal visible={isSettingsModalVisible} animationType="fade" transparent>
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
                        <Text style={[styles.modalTitle, { color: theme.text }]}>Settings</Text>
                        <Text style={[styles.label, { color: theme.secondaryText }]}>Cover Image URL</Text>
                        <TextInput
                            style={[styles.input, { color: theme.text, backgroundColor: theme.cardBackground }]}
                            placeholder="https://..."
                            value={editCoverUrl}
                            onChangeText={setEditCoverUrl}
                        />
                        <Text style={[styles.label, { color: theme.secondaryText }]}>Assign to Routine</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 15 }}>
                            {allRoutineTitles.map(title => (
                                <TouchableOpacity
                                    key={title}
                                    onPress={() => setSelectedRoutineTitle(title)}
                                    style={[
                                        styles.memberSelectBtn,
                                        selectedRoutineTitle === title && { borderColor: theme.tint, backgroundColor: theme.tint + '10' }
                                    ]}
                                >
                                    <Text style={{ color: theme.text }}>{title}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        <Text style={[styles.label, { color: theme.secondaryText }]}>Copy To</Text>
                        <View style={styles.memberPickerGrid}>
                            {visibleFamilyMembers
                                .filter(m => m.contact.id !== sourceMemberId)
                                .map((member) => (
                                    <TouchableOpacity
                                        key={member.contact.id}
                                        style={[
                                            styles.memberPickerItem,
                                            selectedCopyMemberIds.includes(member.contact.id) && { borderColor: theme.tint, backgroundColor: theme.tint + '10' }
                                        ]}
                                        onPress={() => {
                                            setSelectedCopyMemberIds(prev =>
                                                prev.includes(member.contact.id)
                                                    ? prev.filter(id => id !== member.contact.id)
                                                    : [...prev, member.contact.id]
                                            );
                                        }}
                                    >
                                        <Text style={{ color: theme.text, fontSize: 12 }}>{member.contact.first_name}</Text>
                                    </TouchableOpacity>
                                ))}
                        </View>
                        {visibleFamilyMembers.filter(m => m.contact.id !== sourceMemberId).length === 0 && (
                            <Text style={{ color: theme.secondaryText, fontSize: 12, fontStyle: 'italic', marginBottom: 15 }}>No other members to copy to.</Text>
                        )}
                        <View style={styles.modalButtons}>
                            <TouchableOpacity onPress={() => setIsSettingsModalVisible(false)} style={styles.modalBtn}>
                                <Text style={{ color: theme.secondaryText }}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={saveSettings} style={[styles.modalBtn, { backgroundColor: theme.tint, borderRadius: 10 }]}>
                                <Text style={{ color: '#fff', fontWeight: 'bold' }}>Save</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Edit Modal */}
            <Modal visible={isEditItemModalVisible} animationType="fade" transparent>
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
                        <Text style={[styles.modalTitle, { color: theme.text }]}>Edit Task</Text>
                        <TextInput
                            style={[styles.input, { color: theme.text, backgroundColor: theme.cardBackground }]}
                            placeholder="Title"
                            value={editTitle}
                            onChangeText={setEditTitle}
                        />
                        <TextInput
                            style={[styles.input, { color: theme.text, backgroundColor: theme.cardBackground }]}
                            placeholder="Description"
                            value={editDesc}
                            onChangeText={setEditDesc}
                        />

                        <Text style={[styles.label, { color: theme.secondaryText }]}>Assign to Routine</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 15 }}>
                            {allRoutineTitles.map(title => (
                                <TouchableOpacity
                                    key={title}
                                    onPress={() => setSelectedRoutineTitle(title)}
                                    style={[
                                        styles.memberSelectBtn,
                                        selectedRoutineTitle === title && { borderColor: theme.tint, backgroundColor: theme.tint + '10' }
                                    ]}
                                >
                                    <Text style={{ color: theme.text }}>{title}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        <Text style={[styles.label, { color: theme.secondaryText }]}>Reorder</Text>
                        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
                            <TouchableOpacity
                                style={[styles.reorderBtn, { backgroundColor: theme.cardBackground }]}
                                onPress={() => editingItem && selectedCopyMemberIds[0] && moveItem(editingItem.routine_id, editingItem.id, 'up', selectedCopyMemberIds[0])}
                            >
                                <Ionicons name="arrow-up" size={20} color={theme.tint} />
                                <Text style={{ color: theme.text }}>Up</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.reorderBtn, { backgroundColor: theme.cardBackground }]}
                                onPress={() => editingItem && selectedCopyMemberIds[0] && moveItem(editingItem.routine_id, editingItem.id, 'down', selectedCopyMemberIds[0])}
                            >
                                <Ionicons name="arrow-down" size={20} color={theme.tint} />
                                <Text style={{ color: theme.text }}>Down</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.modalButtons}>
                            <TouchableOpacity onPress={() => setIsEditItemModalVisible(false)} style={styles.modalBtn}>
                                <Text style={{ color: theme.secondaryText }}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={saveEdit} style={[styles.modalBtn, { backgroundColor: theme.tint, borderRadius: 10 }]}>
                                <Text style={{ color: '#fff', fontWeight: 'bold' }}>Done</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView >
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: {
        paddingHorizontal: 20,
        paddingVertical: 15,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    dateText: { fontSize: 14, fontWeight: '600', marginBottom: 2 },
    title: { fontSize: 26, fontWeight: 'bold' },
    editToggle: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
    addButton: { padding: 5 },
    columnContainer: {
        paddingHorizontal: 10,
        paddingBottom: 20,
    },
    memberColumn: {
        marginHorizontal: 10,
        flex: 1,
    },
    columnHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 15,
        paddingHorizontal: 5,
    },
    memberInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    memberAvatar: { width: 44, height: 44, borderRadius: 22 },
    memberAvatarPlaceholder: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
    memberName: { fontSize: 18, fontWeight: 'bold' },
    statsText: { fontSize: 13 },
    routineList: { flex: 1 },
    routineSection: { marginBottom: 25 },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
        paddingHorizontal: 5,
    },
    sectionTitle: { fontSize: 14, fontWeight: '700' },
    sectionActions: { flexDirection: 'row', gap: 6, alignItems: 'center' },
    grid: { flexDirection: 'column', marginHorizontal: 0 },
    cardContainer: { width: '100%', paddingVertical: 4 },
    squareCard: {
        borderRadius: 16,
        overflow: 'hidden',
        ...Platform.select({
            ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
            android: { elevation: 2 }
        })
    },
    cardCover: { width: '100%', aspectRatio: 1 },
    cardCoverPlaceholder: { width: '100%', aspectRatio: 1, justifyContent: 'center', alignItems: 'center' },
    cardBody: { padding: 6, justifyContent: 'center', alignItems: 'center' },
    cardMainArea: { flex: 1 },
    cardTextContainer: { padding: 4, flex: 1, justifyContent: 'center', alignItems: 'center' },
    cardActionBar: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        borderTopWidth: 0.5,
        borderTopColor: '#00000010',
        paddingVertical: 4,
        backgroundColor: 'rgba(255,255,255,0.05)',
        zIndex: 100
    },
    actionIcon: { padding: 4 },
    cardTitle: { fontSize: 16, fontWeight: '800', lineHeight: 18, textAlign: 'center' },
    itemCompleted: { textDecorationLine: 'line-through' },
    checkOverlay: { position: 'absolute', top: 6, right: 6, backgroundColor: '#fff', borderRadius: 10 },
    addCard: { borderStyle: 'dashed', borderWidth: 1, borderColor: '#00000020', justifyContent: 'center', alignItems: 'center' },
    addInput: { fontSize: 12, fontWeight: '500', width: '80%', textAlign: 'center' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 25 },
    modalContent: { borderRadius: 20, padding: 20 },
    modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 15 },
    label: { fontSize: 12, fontWeight: '700', marginBottom: 8, marginTop: 10 },
    input: { borderRadius: 10, padding: 12, marginBottom: 12 },
    modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 10 },
    modalBtn: { paddingHorizontal: 15, paddingVertical: 10 },
    memberSelectBtn: { padding: 8, borderRadius: 8, borderWidth: 1, borderColor: '#00000010', marginRight: 8 },
    memberPickerGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 15 },
    memberPickerItem: { padding: 8, borderRadius: 8, borderWidth: 1, borderColor: '#00000010' },
    reorderBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 10, borderRadius: 8, gap: 5 },
});
