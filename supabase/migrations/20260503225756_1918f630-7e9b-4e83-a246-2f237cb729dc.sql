GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_tenant_admin_of(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.current_tenant_id() TO anon, authenticated;