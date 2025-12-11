-- Add onboarding tour tracking to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS onboarding_tour_completed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS onboarding_tour_completed_at TIMESTAMP WITH TIME ZONE;

-- Create index for efficient querying
CREATE INDEX IF NOT EXISTS idx_profiles_onboarding_tour 
ON public.profiles (onboarding_tour_completed);

-- Create function to reset tour for specific users (admin function)
CREATE OR REPLACE FUNCTION public.reset_onboarding_tour(user_ids UUID[])
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
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

-- Create function to get tour statistics (admin function)
CREATE OR REPLACE FUNCTION public.get_onboarding_tour_stats()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
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