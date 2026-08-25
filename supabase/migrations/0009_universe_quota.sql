-- Mythweaver — evren (universe) kota koruması. 0008'den sonra gelir.
-- Public'e açılırken: kullanıcı başına evren sayısı + lore uzunluğu sınırı
-- (DB şişmesini / kötüye kullanımı engeller). 0004_quota.sql deseni; server-side
-- dayatılır, client atlatamaz. İstemci sayacı src/lib/universe.ts'te aynı sayılar.

-- Ayarlanabilir sınırlar.
--   * MAX_UNIVERSES  : bir kullanıcının sahip olabileceği evren sayısı
--   * MAX_LORE_CHARS : lore'un görünür karakter sayısı (HTML tag'leri sayılmaz)
--   * MAX_LORE_BYTES : ham description boyutu — markup bombasına karşı tavan
--   * MAX_NAME_CHARS : evren adı (client maxLength=80 ile hizalı)
create or replace function public.enforce_universe_quota()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  max_universes  constant int := 10;
  max_lore_chars constant int := 10000;
  max_lore_bytes constant int := 65536; -- 64 KB
  max_name_chars constant int := 80;
  lore_chars int;
  cur_count int;
begin
  -- İsim sınırı (insert ve update'te).
  if char_length(btrim(coalesce(new.name, ''))) > max_name_chars then
    raise exception 'Evren adı çok uzun (en fazla % karakter).', max_name_chars
      using errcode = 'check_violation';
  end if;

  -- Görünür karakter sınırı: tag'ler sıyrılıp sayılır (client sayacıyla aynı kural).
  lore_chars := char_length(regexp_replace(coalesce(new.description, ''), '<[^>]*>', '', 'g'));
  if lore_chars > max_lore_chars then
    raise exception 'Lore çok uzun (en fazla % karakter).', max_lore_chars
      using errcode = 'check_violation';
  end if;

  -- Ham boyut tavanı: markup ile şişirmeye karşı.
  if pg_column_size(new.description) > max_lore_bytes then
    raise exception 'Lore verisi çok büyük (sınır: % KB).', (max_lore_bytes / 1024)
      using errcode = 'check_violation';
  end if;

  -- Sayı sınırı yalnız yeni satır eklerken (owner kilidi update'te owner_id'yi korur).
  if tg_op = 'INSERT' then
    select count(*) into cur_count from public.universes where owner_id = new.owner_id;
    if cur_count >= max_universes then
      raise exception 'Evren sınırına ulaşıldı (en fazla %).', max_universes
        using errcode = 'check_violation';
    end if;
  end if;

  return new;
end;
$$;

-- NOT: 0007'deki universes_lock_owner da before update; ikisi ad sırasıyla çalışır
-- (lock_owner < quota) ve çakışmaz — lock_owner yalnız owner_id'ye dokunuyor.
drop trigger if exists universes_quota on public.universes;
create trigger universes_quota
  before insert or update on public.universes
  for each row execute function public.enforce_universe_quota();
