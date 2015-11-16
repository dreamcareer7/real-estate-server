INSERT INTO public.verification_codes(code, user_id)
    VALUES ($1, $2)
ON CONFLICT (user_id) DO UPDATE
    SET code = $1
    WHERE verification_codes.user_id = $2 RETURNING id