-- Fix RLS policies for family_invitations to avoid direct access to auth.users table
-- which can cause "permission denied for table users" errors.

-- 1. Drop old policies
DROP POLICY IF EXISTS "Users can view family invitations" ON family_invitations;
DROP POLICY IF EXISTS "Users can update invitations" ON family_invitations;

-- 2. Re-create policies using auth.jwt() instead of querying auth.users
CREATE POLICY "Users can view family invitations" ON family_invitations
    FOR SELECT USING (
        family_id IN (
            SELECT fm.family_id 
            FROM family_members fm
            JOIN contacts c ON c.id = fm.contact_id
            WHERE c.user_id = auth.uid()
        )
        OR email = (auth.jwt() ->> 'email')
    );

CREATE POLICY "Users can update invitations" ON family_invitations
    FOR UPDATE USING (
        family_id IN (
            SELECT fm.family_id 
            FROM family_members fm
            JOIN contacts c ON c.id = fm.contact_id
            WHERE c.user_id = auth.uid()
        )
        OR (email = (auth.jwt() ->> 'email') AND status = 'pending')
    );

-- Also ensure INSERT policy is robust
DROP POLICY IF EXISTS "Users can create invitations" ON family_invitations;
CREATE POLICY "Users can create invitations" ON family_invitations
    FOR INSERT WITH CHECK (
        family_id IN (
            SELECT fm.family_id 
            FROM family_members fm
            JOIN contacts c ON c.id = fm.contact_id
            WHERE c.user_id = auth.uid() AND fm.role IN ('owner', 'admin')
        )
    );

-- And DELETE policy
DROP POLICY IF EXISTS "Users can delete their invitations" ON family_invitations;
CREATE POLICY "Users can delete their invitations" ON family_invitations
    FOR DELETE USING (
        family_id IN (
            SELECT fm.family_id 
            FROM family_members fm
            JOIN contacts c ON c.id = fm.contact_id
            WHERE c.user_id = auth.uid() AND fm.role IN ('owner', 'admin')
        )
    );
