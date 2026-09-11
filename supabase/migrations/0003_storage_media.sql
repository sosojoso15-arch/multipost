-- ============================================================
--  Multi-Post  ·  almacen temporal de imagenes y videos
--
--  El cliente sube el archivo desde su PC. Nosotros lo guardamos
--  solo mientras Meta lo descarga: apenas la publicacion sale bien,
--  el archivo se borra. Asi el espacio no se acumula.
--
--  El bucket es publico A PROPOSITO: Meta tiene que poder bajar la
--  imagen desde sus servidores. Las rutas llevan un uuid al azar,
--  asi que nadie puede adivinarlas.
-- ============================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'media',
  'media',
  true,
  52428800,  -- 50 MB
  array[
    'image/jpeg','image/png','image/webp','image/gif',
    'video/mp4','video/quicktime'
  ]
)
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- ------------------------------------------------------------
--  Cada quien manda solo en su carpeta.
--  La ruta es  <user_id>/<uuid>.<ext>, entonces la primera carpeta
--  del nombre tiene que ser el id del usuario.
-- ------------------------------------------------------------

drop policy if exists "media: subir lo propio"  on storage.objects;
drop policy if exists "media: ver lo propio"    on storage.objects;
drop policy if exists "media: borrar lo propio" on storage.objects;
drop policy if exists "media: lectura publica"  on storage.objects;

create policy "media: subir lo propio" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "media: ver lo propio" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "media: borrar lo propio" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Meta descarga la imagen sin estar autenticado. Por eso lectura abierta.
create policy "media: lectura publica" on storage.objects
  for select to anon
  using (bucket_id = 'media');
