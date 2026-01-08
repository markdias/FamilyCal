import { supabase, Contact } from '@/lib/supabase';
import { getNextAvailableColor } from '@/utils/colorUtils';

// Get a contact by ID
export async function getContact(contactId: string): Promise<{ data: Contact | null; error: any }> {
  const { data, error } = await supabase
    .from('contacts')
    .select('*')
    .eq('id', contactId)
    .single();

  return { data, error };
}

// Get user's contact record for a specific family
export async function getUserContactForFamily(
  userId: string, 
  familyId: string
): Promise<{ data: Contact | null; error: any }> {
  // Don't use .single() - user might not have a contact in this family yet
  const { data, error } = await supabase
    .from('contacts')
    .select('*')
    .eq('user_id', userId)
    .eq('family_id', familyId)
    .limit(1);

  if (error) {
    return { data: null, error };
  }

  return { data: data && data.length > 0 ? data[0] : null, error: null };
}

// Create a new contact (virtual family member or external contact)
export async function createContact(
  familyId: string,
  data: {
    firstName: string;
    lastName?: string;
    email?: string;
    phone?: string;
    contactType?: Contact['contact_type'];
    relationship?: string;
    dateOfBirth?: string;
    notes?: string;
    isVirtual?: boolean;
  }
): Promise<{ data: Contact | null; error: any }> {
  // Get existing colors to assign a unique one
  const { data: existingContacts } = await supabase
    .from('contacts')
    .select('color')
    .eq('family_id', familyId);

  const usedColors = existingContacts?.map((c) => c.color) || [];
  const color = getNextAvailableColor(usedColors);

  const { data: contact, error } = await supabase
    .from('contacts')
    .insert({
      family_id: familyId,
      first_name: data.firstName,
      last_name: data.lastName || null,
      email: data.email || null,
      phone: data.phone || null,
      contact_type: data.contactType || 'family_member',
      relationship: data.relationship || null,
      date_of_birth: data.dateOfBirth || null,
      notes: data.notes || null,
      is_virtual: data.isVirtual ?? true,
      color,
    })
    .select()
    .single();

  return { data: contact, error };
}

// Add a virtual contact as a family member
export async function addVirtualFamilyMember(
  familyId: string,
  data: {
    firstName: string;
    lastName?: string;
    relationship?: string;
    dateOfBirth?: string;
  }
): Promise<{ data: Contact | null; error: any }> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return { data: null, error: new Error('Not authenticated') };
  }

  // Create the contact
  const { data: contact, error: contactError } = await createContact(familyId, {
    ...data,
    contactType: 'family_member',
    isVirtual: true,
  });

  if (contactError || !contact) {
    return { data: null, error: contactError };
  }

  // Add to family_members
  const { error: memberError } = await supabase
    .from('family_members')
    .insert({
      family_id: familyId,
      contact_id: contact.id,
      role: null, // Virtual members don't have roles
      added_by: user.id,
    });

  if (memberError) {
    // Cleanup: delete the contact
    await supabase.from('contacts').delete().eq('id', contact.id);
    return { data: null, error: memberError };
  }

  return { data: contact, error: null };
}

// Update a contact
export async function updateContact(
  contactId: string,
  updates: Partial<Omit<Contact, 'id' | 'family_id' | 'user_id' | 'created_at' | 'updated_at'>>
): Promise<{ data: Contact | null; error: any }> {
  const updateData: any = {};
  
  if (updates.first_name !== undefined) updateData.first_name = updates.first_name;
  if (updates.last_name !== undefined) updateData.last_name = updates.last_name;
  if (updates.email !== undefined) updateData.email = updates.email;
  if (updates.phone !== undefined) updateData.phone = updates.phone;
  if (updates.contact_type !== undefined) updateData.contact_type = updates.contact_type;
  if (updates.relationship !== undefined) updateData.relationship = updates.relationship;
  if (updates.date_of_birth !== undefined) updateData.date_of_birth = updates.date_of_birth;
  if (updates.avatar_url !== undefined) updateData.avatar_url = updates.avatar_url;
  if (updates.notes !== undefined) updateData.notes = updates.notes;
  if (updates.color !== undefined) updateData.color = updates.color;

  const { data, error } = await supabase
    .from('contacts')
    .update(updateData)
    .eq('id', contactId)
    .select()
    .single();

  return { data, error };
}

// Update contact color
export async function updateContactColor(
  contactId: string, 
  color: string
): Promise<{ error: any }> {
  const { error } = await supabase
    .from('contacts')
    .update({ color })
    .eq('id', contactId);

  return { error };
}

// Delete a contact
export async function deleteContact(contactId: string): Promise<{ error: any }> {
  // First remove from family_members if exists
  await supabase
    .from('family_members')
    .delete()
    .eq('contact_id', contactId);

  // Then delete the contact
  const { error } = await supabase
    .from('contacts')
    .delete()
    .eq('id', contactId);

  return { error };
}

// Get contacts that can be drivers (family members + external drivers)
export async function getDriverOptions(familyId: string): Promise<{
  data: Contact[] | null;
  error: any;
}> {
  const { data, error } = await supabase
    .from('contacts')
    .select('*')
    .eq('family_id', familyId)
    .or('contact_type.eq.family_member,contact_type.eq.external_driver')
    .order('first_name');

  return { data, error };
}
