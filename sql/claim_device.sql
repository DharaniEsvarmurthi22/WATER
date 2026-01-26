-- SQL: create RPC to allow a logged-in user to claim an existing device
-- Usage: select * from public.claim_device('esp32-1234','secret-value');
create or replace function public.claim_device(p_device_identifier text, p_secret text)
returns table(id uuid, device_identifier text) as $$
declare
  v_id uuid;
  v_dev text;
begin
  update public.devices
  set user_id = auth.uid()
  where device_identifier = p_device_identifier
    and secret = p_secret
    and (user_id is null or user_id = auth.uid())
  returning id, device_identifier into v_id, v_dev;

  if v_id is null then
    raise exception 'Invalid device identifier or secret, or device already claimed';
  end if;

  id := v_id;
  device_identifier := v_dev;
  return next;
end;
$$ language plpgsql security definer;
