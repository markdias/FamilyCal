import { Contact, Family, FamilyMember } from '@/lib/supabase';
import { getFamilyContacts, getFamilyMembers, getUserFamilies } from '@/services/familyService';
import React, { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';

interface FamilyMemberWithContact extends FamilyMember {
  contact: Contact;
}

interface FamilyContextType {
  // Current family
  currentFamily: Family | null;
  setCurrentFamily: (family: Family | null) => void;

  // All user's families
  families: Family[];

  // Family members with contacts
  familyMembers: FamilyMemberWithContact[];

  // All contacts (including non-members)
  contacts: Contact[];

  // Loading states
  isLoading: boolean;
  isLoadingMembers: boolean;

  // Refresh functions
  refreshFamilies: () => Promise<void>;
  refreshMembers: () => Promise<void>;
  refreshContacts: () => Promise<void>;

  // Helper to check if user has a family
  hasFamily: boolean;

  // Get a contact by ID
  getContactById: (id: string) => Contact | undefined;

  // Get user's role in current family
  userRole: 'owner' | 'admin' | 'member' | null;
}

const FamilyContext = createContext<FamilyContextType | undefined>(undefined);

export function FamilyProvider({ children }: { children: ReactNode }) {
  const { user, userContact, isLoading: isAuthLoading } = useAuth();

  const [currentFamily, setCurrentFamily] = useState<Family | null>(null);
  const [families, setFamilies] = useState<Family[]>([]);
  const [familyMembers, setFamilyMembers] = useState<FamilyMemberWithContact[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);

  // Fetch user's families
  const refreshFamilies = useCallback(async () => {
    if (!user) {
      setFamilies([]);
      setCurrentFamily(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await getUserFamilies();

      if (error) {
        console.error('Error fetching families:', error);
        setFamilies([]);
        setCurrentFamily(null);
      } else if (data) {
        setFamilies(data);

        // Auto-select first family if none selected
        if (!currentFamily && data.length > 0) {
          setCurrentFamily(data[0]);
        } else if (currentFamily) {
          // Verify current family still exists
          const stillExists = data.find(f => f.id === currentFamily.id);
          if (!stillExists) {
            setCurrentFamily(data[0] || null);
          }
        }
      }
    } catch (err) {
      console.error('Error in refreshFamilies:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user, currentFamily]);

  // Fetch family members
  const refreshMembers = useCallback(async () => {
    if (!currentFamily) {
      setFamilyMembers([]);
      return;
    }

    setIsLoadingMembers(true);
    try {
      const { data, error } = await getFamilyMembers(currentFamily.id);

      if (error) {
        console.error('Error fetching family members:', error);
        setFamilyMembers([]);
      } else if (data) {
        setFamilyMembers(data as FamilyMemberWithContact[]);
      }
    } catch (err) {
      console.error('Error in refreshMembers:', err);
    } finally {
      setIsLoadingMembers(false);
    }
  }, [currentFamily]);

  // Fetch all contacts
  const refreshContacts = useCallback(async () => {
    if (!currentFamily) {
      setContacts([]);
      return;
    }

    try {
      const { data, error } = await getFamilyContacts(currentFamily.id);

      if (error) {
        console.error('Error fetching contacts:', error);
        setContacts([]);
      } else if (data) {
        setContacts(data);
      }
    } catch (err) {
      console.error('Error in refreshContacts:', err);
    }
  }, [currentFamily]);

  // Effect: Fetch families when user changes
  useEffect(() => {
    if (!isAuthLoading) {
      refreshFamilies();
    }
  }, [user, isAuthLoading]);

  // Effect: Fetch members when family changes
  useEffect(() => {
    if (currentFamily) {
      refreshMembers();
      refreshContacts();
    }
  }, [currentFamily]);

  // Get contact by ID
  const getContactById = useCallback((id: string): Contact | undefined => {
    return contacts.find(c => c.id === id);
  }, [contacts]);

  // Get user's role in current family
  const userRole = React.useMemo(() => {
    if (!currentFamily || (!userContact && !user)) return null;

    const userId = userContact?.user_id || user?.id;
    if (!userId) return null;

    const membership = familyMembers.find(
      m => m.contact.user_id === userId
    );

    console.log('[FamilyContext] userRole calculation:', {
      userId,
      membershipFound: !!membership,
      role: membership?.role || null,
      familyMembersCount: familyMembers.length
    });

    return membership?.role || null;
  }, [user, userContact, familyMembers, currentFamily]);

  const hasFamily = families.length > 0;

  return (
    <FamilyContext.Provider
      value={{
        currentFamily,
        setCurrentFamily,
        families,
        familyMembers,
        contacts,
        isLoading,
        isLoadingMembers,
        refreshFamilies,
        refreshMembers,
        refreshContacts,
        hasFamily,
        getContactById,
        userRole,
      }}>
      {children}
    </FamilyContext.Provider>
  );
}

export function useFamily() {
  const context = useContext(FamilyContext);
  if (context === undefined) {
    throw new Error('useFamily must be used within a FamilyProvider');
  }
  return context;
}
