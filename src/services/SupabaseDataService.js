/**
 * SupabaseDataService - CRUD Operations
 * Handles data operations for families, events, attendees, checklists
 */

import SupabaseClient from './SupabaseClient';

class SupabaseDataService {
  static instance = null;

  /**
   * Get singleton instance
   */
  static getInstance() {
    if (!SupabaseDataService.instance) {
      SupabaseDataService.instance = new SupabaseDataService();
    }
    return SupabaseDataService.instance;
  }

  constructor() {
    if (SupabaseDataService.instance) {
      return SupabaseDataService.instance;
    }

    this.supabase = null;
  }

  /**
   * Initialize the data service
   */
  initialize() {
    this.supabase = SupabaseClient.getClient();
  }

  // ========================================
  // Family Operations
  // ========================================

  /**
   * Create a new family
   */
  async createFamily(name) {
    const { data, error } = await this.supabase
      .from('families')
      .insert([{ name }])
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, family: data };
  }

  /**
   * Get family by ID
   */
  async getFamily(familyId) {
    const { data, error } = await this.supabase
      .from('families')
      .select('*')
      .eq('id', familyId)
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, family: data };
  }

  /**
   * Update family
   */
  async updateFamily(familyId, updates) {
    const { data, error } = await this.supabase
      .from('families')
      .update(updates)
      .eq('id', familyId)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, family: data };
  }

  // ========================================
  // Family Member Operations
  // ========================================

  /**
   * Create a family member
   */
  async createFamilyMember(memberData) {
    const { data, error } = await this.supabase
      .from('family_members')
      .insert([memberData])
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, member: data };
  }

  /**
   * Get all family members for a family
   */
  async getFamilyMembers(familyId) {
    const { data, error } = await this.supabase
      .from('family_members')
      .select('*')
      .eq('family_id', familyId)
      .order('sort_order', { ascending: true });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, members: data };
  }

  /**
   * Update a family member
   */
  async updateFamilyMember(memberId, updates) {
    const { data, error } = await this.supabase
      .from('family_members')
      .update(updates)
      .eq('id', memberId)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, member: data };
  }

  /**
   * Delete a family member (soft delete with deletion_reason)
   */
  async deleteFamilyMember(memberId, reason = 'removed') {
    const { error } = await this.supabase
      .from('family_members')
      .update({ deletion_reason: reason })
      .eq('id', memberId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  }

  // ========================================
  // Family Calendar Operations
  // ========================================

  /**
   * Create a family calendar
   */
  async createFamilyCalendar(calendarData) {
    const { data, error } = await this.supabase
      .from('family_calendars')
      .insert([calendarData])
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, calendar: data };
  }

  /**
   * Get all calendars for a family
   */
  async getFamilyCalendars(familyId) {
    const { data, error } = await this.supabase
      .from('family_calendars')
      .select('*')
      .eq('family_id', familyId)
      .order('created_at', { ascending: true });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, calendars: data };
  }

  /**
   * Get default calendar for a family
   */
  async getDefaultCalendar(familyId) {
    const { data, error } = await this.supabase
      .from('family_calendars')
      .select('*')
      .eq('family_id', familyId)
      .eq('is_default', true)
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, calendar: data };
  }

  // ========================================
  // Calendar Event Operations
  // ========================================

  /**
   * Create a calendar event
   */
  async createEvent(eventData) {
    const { data, error } = await this.supabase
      .from('calendar_events')
      .insert([eventData])
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, event: data };
  }

  /**
   * Get events for a date range
   */
  async getEvents(familyId, startDate, endDate) {
    const { data, error } = await this.supabase
      .from('calendar_events')
      .select(`
        *,
        event_attendees (
          id,
          member_id,
          status
        )
      `)
      .eq('family_id', familyId)
      .eq('is_deleted', false)
      .gte('start_date', startDate)
      .lte('start_date', endDate)
      .order('start_date', { ascending: true });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, events: data };
  }

  /**
   * Get a single event by ID
   */
  async getEvent(eventId) {
    const { data, error } = await this.supabase
      .from('calendar_events')
      .select(`
        *,
        event_attendees (
          id,
          member_id,
          status
        )
      `)
      .eq('id', eventId)
      .eq('is_deleted', false)
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, event: data };
  }

  /**
   * Update an event
   */
  async updateEvent(eventId, updates) {
    const { data, error } = await this.supabase
      .from('calendar_events')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', eventId)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, event: data };
  }

  /**
   * Delete an event (soft delete)
   */
  async deleteEvent(eventId) {
    const { error } = await this.supabase
      .from('calendar_events')
      .update({ is_deleted: true, updated_at: new Date().toISOString() })
      .eq('id', eventId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  }

  // ========================================
  // Event Attendee Operations
  // ========================================

  /**
   * Add attendees to an event
   */
  async addEventAttendees(eventId, memberIds, calendarId) {
    const attendees = memberIds.map(memberId => ({
      event_id: eventId,
      member_id: memberId,
      calendar_id: calendarId,
      status: 'accepted',
    }));

    const { data, error } = await this.supabase
      .from('event_attendees')
      .insert(attendees)
      .select();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, attendees: data };
  }

  /**
   * Update attendee status
   */
  async updateAttendeeStatus(attendeeId, status) {
    const { data, error } = await this.supabase
      .from('event_attendees')
      .update({ status })
      .eq('id', attendeeId)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, attendee: data };
  }

  /**
   * Remove attendees from an event
   */
  async removeEventAttendees(eventId) {
    const { error } = await this.supabase
      .from('event_attendees')
      .delete()
      .eq('event_id', eventId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  }

  // ========================================
  // Invitation Operations
  // ========================================

  /**
   * Create a shareable invitation
   */
  async createShareableInvitation(memberId) {
    const { data, error } = await this.supabase
      .rpc('create_shareable_invitation', { p_member_id: memberId });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, invitation: data };
  }

  /**
   * Accept a family invitation
   */
  async acceptFamilyInvitation(token) {
    const { data, error } = await this.supabase
      .rpc('accept_family_invitation', { p_token: token });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, result: data };
  }
}

// Export singleton instance
export default SupabaseDataService.getInstance();
