-- Update handle_new_user() to support Google OAuth metadata
-- Google provides: given_name, family_name, avatar_url/picture, full_name
-- Email/password provides: first_name, last_name
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_email TEXT;
  email_domain TEXT;
  v_first_name TEXT;
  v_last_name TEXT;
  v_avatar_url TEXT;
BEGIN
  user_email := NEW.email;
  email_domain := split_part(user_email, '@', 2);

  -- Extract first name: try first_name, then given_name, then full_name split
  v_first_name := COALESCE(
    NULLIF(NEW.raw_user_meta_data->>'first_name', ''),
    NULLIF(NEW.raw_user_meta_data->>'given_name', ''),
    split_part(COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''), ' ', 1)
  );

  -- Extract last name: try last_name, then family_name, then full_name remainder
  v_last_name := COALESCE(
    NULLIF(NEW.raw_user_meta_data->>'last_name', ''),
    NULLIF(NEW.raw_user_meta_data->>'family_name', ''),
    CASE
      WHEN position(' ' in COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', '')) > 0
      THEN substring(COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', '') from position(' ' in COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', '')) + 1)
      ELSE ''
    END
  );

  -- Extract avatar URL (Google provides 'avatar_url' or 'picture')
  v_avatar_url := COALESCE(
    NULLIF(NEW.raw_user_meta_data->>'avatar_url', ''),
    NULLIF(NEW.raw_user_meta_data->>'picture', '')
  );

  INSERT INTO public.profiles (
    id,
    email,
    first_name,
    last_name,
    avatar_url,
    is_verified
  ) VALUES (
    NEW.id,
    user_email,
    COALESCE(v_first_name, ''),
    COALESCE(v_last_name, ''),
    v_avatar_url,
    email_domain = 'univ.ac.il'
  )
  ON CONFLICT (id) DO UPDATE SET
    first_name = CASE WHEN profiles.first_name = '' THEN EXCLUDED.first_name ELSE profiles.first_name END,
    last_name = CASE WHEN profiles.last_name = '' THEN EXCLUDED.last_name ELSE profiles.last_name END,
    avatar_url = COALESCE(EXCLUDED.avatar_url, profiles.avatar_url);

  RETURN NEW;
END;
$$;
