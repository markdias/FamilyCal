import { Contact, Family, FamilyInvitation, FamilyMember, supabase } from '@/lib/supabase';

export interface FamilyWithMembers extends Family {
  members: (FamilyMember & { contact: Contact })[];
}

// Get all families the current user belongs to
export async function getUserFamilies(): Promise<{ data: Family[] | null; error: any }> {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { data: null, error: new Error('Not authenticated') };
  }

  // First get the user's contact records
  const { data: contacts, error: contactError } = await supabase
    .from('contacts')
    .select('id, family_id')
    .eq('user_id', user.id);

  if (contactError) {
    return { data: null, error: contactError };
  }

  if (!contacts || contacts.length === 0) {
    return { data: [], error: null };
  }

  // Get families through family_members
  const familyIds = contacts.map(c => c.family_id);
  const { data: families, error: familyError } = await supabase
    .from('families')
    .select('*')
    .in('id', familyIds);

  if (familyError) {
    return { data: null, error: familyError };
  }

  return { data: families, error: null };
}

// Get a single family by ID
export async function getFamily(familyId: string): Promise<{ data: Family | null; error: any }> {
  const { data, error } = await supabase
    .from('families')
    .select('*')
    .eq('id', familyId)
    .single();

  return { data, error };
}

// Get all members of a family with their contact information
export async function getFamilyMembers(familyId: string): Promise<{
  data: (FamilyMember & { contact: Contact })[] | null;
  error: any
}> {
  const { data, error } = await supabase
    .from('family_members')
    .select(`
      *,
      contact:contacts(*)
    `)
    .eq('family_id', familyId);

  return { data: data as any, error };
}

// Get all contacts for a family (including non-members like external drivers)
export async function getFamilyContacts(familyId: string): Promise<{
  data: Contact[] | null;
  error: any
}> {
  const { data, error } = await supabase
    .from('contacts')
    .select('*')
    .eq('family_id', familyId)
    .order('first_name');

  return { data, error };
}

// Update family name
export async function updateFamily(
  familyId: string,
  updates: Partial<Pick<Family, 'name' | 'family_name'>>
): Promise<{ data: Family | null; error: any }> {
  const { data, error } = await supabase
    .from('families')
    .update(updates)
    .eq('id', familyId)
    .select()
    .single();

  return { data, error };
}

// Get pending invitations for a family
export async function getFamilyInvitations(familyId: string): Promise<{
  data: FamilyInvitation[] | null;
  error: any;
}> {
  const { data, error } = await supabase
    .from('family_invitations')
    .select('*')
    .eq('family_id', familyId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  return { data, error };
}

// Create a new invitation
export async function createInvitation(
  familyId: string,
  email: string,
  firstName?: string,
  lastName?: string,
  role: 'admin' | 'member' = 'member',
  message?: string
): Promise<{ data: FamilyInvitation | null; error: any }> {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { data: null, error: new Error('Not authenticated') };
  }

  const { data, error } = await supabase
    .from('family_invitations')
    .insert({
      family_id: familyId,
      invited_by: user.id,
      email,
      first_name: firstName,
      last_name: lastName,
      role,
      invitation_message: message,
    })
    .select()
    .single();

  return { data, error };
}

// Cancel an invitation
export async function cancelInvitation(invitationId: string): Promise<{ error: any }> {
  const { error } = await supabase
    .from('family_invitations')
    .update({ status: 'cancelled' })
    .eq('id', invitationId);

  return { error };
}

// Remove a member from a family
export async function removeFamilyMember(
  familyId: string,
  contactId: string
): Promise<{ error: any }> {
  const { error } = await supabase
    .from('family_members')
    .delete()
    .eq('family_id', familyId)
    .eq('contact_id', contactId);

  return { error };
}

// Update member role
export async function updateMemberRole(
  familyId: string,
  contactId: string,
  role: 'admin' | 'member'
): Promise<{ error: any }> {
  const { error } = await supabase
    .from('family_members')
    .update({ role })
    .eq('family_id', familyId)
    .eq('contact_id', contactId);

  return { error };
}

// Get an invitation by token
export async function getInvitationByToken(token: string): Promise<{ data: (FamilyInvitation & { family: Family }) | null; error: any }> {
  const { data, error } = await supabase
    .from('family_invitations')
    .select('*, family:families(*)')
    .eq('invitation_token', token)
    .eq('status', 'pending')
    .gt('expires_at', new Date().toISOString())
    .single();

  return { data: data as any, error };
}

// Accept an invitation
export async function acceptInvitation(
  invitationId: string,
  userId: string,
  email: string,
  firstName?: string,
  lastName?: string
): Promise<{ error: any }> {
  try {
    // 1. Get invitation details
    const { data: invitation, error: inviteError } = await supabase
      .from('family_invitations')
      .select('*')
      .eq('id', invitationId)
      .single();

    if (inviteError || !invitation) {
      throw inviteError || new Error('Invitation not found');
    }

    // 2. Check for existing contact to update or create new one
    let contactId = invitation.contact_id;

    if (contactId) {
      // Update existing virtual contact
      const { error: updateError } = await supabase
        .from('contacts')
        .update({
          user_id: userId,
          is_virtual: false,
          email: email,
          invitation_accepted_at: new Date().toISOString(),
        })
        .eq('id', contactId);

      if (updateError) throw updateError;
    } else {
      // Create new contact
      const { data: newContact, error: contactError } = await supabase
        .from('contacts')
        .insert({
          family_id: invitation.family_id,
          user_id: userId,
          first_name: firstName || invitation.first_name || 'Member',
          last_name: lastName || invitation.last_name || '',
          email: email,
          contact_type: 'family_member',
          is_virtual: false,
          invitation_accepted_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (contactError) throw contactError;
      contactId = newContact.id;
    }

    // 3. Add to family_members
    const { error: memberError } = await supabase
      .from('family_members')
      .insert({
        family_id: invitation.family_id,
        contact_id: contactId,
        role: invitation.role || 'member',
        added_by: invitation.invited_by,
      });

    if (memberError) throw memberError;

    // 4. Update invitation status
    const { error: finalError } = await supabase
      .from('family_invitations')
      .update({
        status: 'accepted',
        accepted_at: new Date().toISOString(),
        accepted_by: userId,
      })
      .eq('id', invitationId);

    return { error: finalError };
  } catch (err) {
    console.error('Error in acceptInvitation:', err);
    return { error: err };
  }
}
