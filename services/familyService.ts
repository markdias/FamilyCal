import { supabase, Family, FamilyMember, Contact, FamilyInvitation } from '@/lib/supabase';

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
