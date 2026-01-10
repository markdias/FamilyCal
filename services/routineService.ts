import { Routine, RoutineCompletion, RoutineItem, supabase } from '@/lib/supabase';

export const routineService = {
    /**
     * Fetch all routines for a family
     */
    async getRoutines(familyId: string, contactId?: string | null): Promise<Routine[]> {
        let query = supabase
            .from('routines')
            .select(`
                *,
                items:routine_items(*)
            `)
            .eq('family_id', familyId);

        if (contactId) {
            query = query.or(`contact_id.eq.${contactId},contact_id.is.null`);
        } else {
            query = query.is('contact_id', null);
        }

        const { data, error } = await query
            .order('sort_order', { ascending: true })
            .order('created_at', { ascending: true });

        if (error) throw error;

        // Sort items by sort_order
        return (data || []).map(routine => ({
            ...routine,
            items: (routine.items || []).sort((a: any, b: any) => a.sort_order - b.sort_order)
        }));
    },

    /**
     * Fetch routine completions for a specific date
     */
    async getCompletions(itemIds: string[], date: string): Promise<RoutineCompletion[]> {
        const { data, error } = await supabase
            .from('routine_completions')
            .select('*')
            .in('item_id', itemIds)
            .eq('completion_date', date);

        if (error) throw error;
        return data || [];
    },

    /**
     * Toggle completion status for a routine item
     */
    async toggleCompletion(
        itemId: string,
        contactId: string,
        date: string,
        isCompleted: boolean
    ): Promise<void> {
        if (isCompleted) {
            // Add completion record
            const { error } = await supabase
                .from('routine_completions')
                .upsert({
                    item_id: itemId,
                    contact_id: contactId,
                    completion_date: date,
                    completed_at: new Date().toISOString()
                }, {
                    onConflict: 'item_id,contact_id,completion_date'
                });

            if (error) throw error;
        } else {
            // Remove completion record
            const { error } = await supabase
                .from('routine_completions')
                .delete()
                .match({
                    item_id: itemId,
                    contact_id: contactId,
                    completion_date: date
                });

            if (error) throw error;
        }
    },

    /**
     * Create a new routine
     */
    async createRoutine(routine: Partial<Routine>): Promise<Routine> {
        const { data, error } = await supabase
            .from('routines')
            .insert(routine)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Add an item to a routine
     */
    async addRoutineItem(item: Partial<RoutineItem>): Promise<RoutineItem> {
        const { data, error } = await supabase
            .from('routine_items')
            .insert(item)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Delete a routine
     */
    async deleteRoutine(id: string): Promise<void> {
        const { error } = await supabase
            .from('routines')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    /**
     * Delete a routine item
     */
    async deleteRoutineItem(id: string): Promise<void> {
        const { error } = await supabase
            .from('routine_items')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    /**
     * Update a routine
     */
    async updateRoutine(id: string, updates: Partial<Routine>): Promise<Routine> {
        const { data, error } = await supabase
            .from('routines')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Update a routine item
     */
    async updateRoutineItem(id: string, updates: Partial<RoutineItem>): Promise<RoutineItem> {
        const { data, error } = await supabase
            .from('routine_items')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    }
};
