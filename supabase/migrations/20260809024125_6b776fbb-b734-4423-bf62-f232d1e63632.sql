REVOKE EXECUTE ON FUNCTION public.dio_unlock(text, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.dio_ad_start(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.dio_ad_award(text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.dio_admin_adjust(uuid,integer,text,text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.dio_admin_users(text,text,integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.dio_admin_transactions(uuid,text,timestamptz,timestamptz,integer,uuid,text,integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.dio_admin_stats() FROM anon;
REVOKE EXECUTE ON FUNCTION public.dio_admin_review_completion(uuid, boolean) FROM anon;
REVOKE EXECUTE ON FUNCTION public.dio_admin_pending_completions() FROM anon;