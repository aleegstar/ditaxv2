-- Fix search path for the new functions
CREATE OR REPLACE FUNCTION public.reset_onboarding_tour(user_ids UUID[])
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    updated_count INTEGER;
BEGIN
    UPDATE public.profiles 
    SET 
        onboarding_tour_completed = FALSE,
        onboarding_tour_completed_at = NULL
    WHERE id = ANY(user_ids);
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RETURN updated_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_onboarding_tour_stats()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'total_users', COUNT(*),
        'tour_completed', COUNT(*) FILTER (WHERE onboarding_tour_completed = TRUE),
        'tour_pending', COUNT(*) FILTER (WHERE onboarding_tour_completed = FALSE OR onboarding_tour_completed IS NULL),
        'completion_rate', ROUND(
            (COUNT(*) FILTER (WHERE onboarding_tour_completed = TRUE)::DECIMAL / 
             NULLIF(COUNT(*), 0) * 100), 2
        )
    ) INTO result
    FROM public.profiles;
    
    RETURN result;
END;
$$;