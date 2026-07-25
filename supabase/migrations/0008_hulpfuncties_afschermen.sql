-- 0008_hulpfuncties_afschermen.sql
--
-- De vier hulpfuncties waarop de RLS-policies steunen waren aanroepbaar door
-- PUBLIC en door anon, via /rest/v1/rpc/<naam>. De Security Advisor meldde dat
-- terecht.
--
-- Ze lekken niets — voor een uitgelogde bezoeker geven ze null of false terug —
-- maar anon heeft ze nergens voor nodig: elke policy die anon raakt is een
-- leespolicy met "using (true)" op de referentietabellen (tax_parameters,
-- bestelperiodes, deduction_rules, car_catalog). Geen daarvan roept een
-- hulpfunctie aan.
--
-- authenticated moet ze wél kunnen uitvoeren: de policies op vehicles,
-- evaluations, companies, profiles en uitnodigingen roepen ze aan, en een
-- policy-expressie vereist EXECUTE bij de aanroepende rol.

revoke execute on function public.huidig_bedrijf_id()  from public, anon;
revoke execute on function public.is_beheerder()       from public, anon;
revoke execute on function public.is_platform_admin()  from public, anon;
revoke execute on function public.mag_schrijven()      from public, anon;

grant execute on function public.huidig_bedrijf_id()  to authenticated, service_role;
grant execute on function public.is_beheerder()       to authenticated, service_role;
grant execute on function public.is_platform_admin()  to authenticated, service_role;
grant execute on function public.mag_schrijven()      to authenticated, service_role;
