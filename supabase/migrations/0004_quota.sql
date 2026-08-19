-- Mythweaver — abuse/kota koruması. 0003'ten sonra gelir.
-- Public'e açılırken: kullanıcı başına karakter sayısı ve karakter veri boyutu
-- sınırı (DB şişmesini / kötüye kullanımı engeller). Server-side dayatılır;
-- client atlatamaz.

-- Ayarlanabilir sınırlar.
--   * MAX_CHARS_PER_USER : bir kullanıcının sahip olabileceği karakter sayısı
--   * MAX_CHAR_BYTES     : tek bir karakterin jsonb boyutu (yaklaşık)
create or replace function public.enforce_character_quota()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  max_chars constant int := 50;
  max_bytes constant int := 262144; -- 256 KB
  cur_count int;
begin
  -- Boyut sınırı (insert ve update'te).
  if pg_column_size(new.data) > max_bytes then
    raise exception 'Karakter verisi çok büyük (sınır: % KB).', (max_bytes / 1024)
      using errcode = 'check_violation';
  end if;

  -- Sayı sınırı yalnız yeni satır eklerken (owner kilidi update'te user_id'yi korur).
  if tg_op = 'INSERT' then
    select count(*) into cur_count from public.characters where user_id = new.user_id;
    if cur_count >= max_chars then
      raise exception 'Karakter sınırına ulaşıldı (en fazla %).', max_chars
        using errcode = 'check_violation';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists characters_quota on public.characters;
create trigger characters_quota
  before insert or update on public.characters
  for each row execute function public.enforce_character_quota();
