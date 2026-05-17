CREATE POLICY "tenants_tenant_admin_update"
ON public.tenants
FOR UPDATE
TO authenticated
USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.tenant_id = tenants.id AND ur.role = 'tenant_admin'))
WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.tenant_id = tenants.id AND ur.role = 'tenant_admin'));