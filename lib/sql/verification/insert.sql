INSERT INTO public.verifications(code, user_id)
    VALUES ($1, $2)
ON CONFLICT (user_id) DO UPDATE
    SET code = $1
    WHERE verifications.user_id = $2 RETURNING id