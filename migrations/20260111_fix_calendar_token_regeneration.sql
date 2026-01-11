-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Function to regenerate calendar token for a user
CREATE OR REPLACE FUNCTION regenerate_calendar_token(p_user_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_new_token UUID;
BEGIN
    -- Ensure the row exists in user_preferences
    INSERT INTO user_preferences (user_id)
    VALUES (p_user_id)
    ON CONFLICT (user_id) DO NOTHING;

    -- Generate a new UUID
    v_new_token := uuid_generate_v4();

    -- Update the token
    UPDATE user_preferences
    SET calendar_token = v_new_token,
        updated_at = NOW()
    WHERE user_id = p_user_id;

    RETURN v_new_token;
END;
$$;

-- Grant execution to authenticated users
GRANT EXECUTE ON FUNCTION regenerate_calendar_token(UUID) TO authenticated;
