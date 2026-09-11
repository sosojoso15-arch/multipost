-- ============================================================
--  Multi-Post  ·  primer comentario automatico
--
--  Truco viejo de redes: el enlace y los hashtags van en el primer
--  comentario, no en el texto. Asi el post no pierde alcance.
--
--  Se publica apenas sale el post, con el mismo token de la pagina.
-- ============================================================

alter table public.posts
  add column if not exists first_comment text;

comment on column public.posts.first_comment is
  'Comentario que se deja en el propio post apenas se publica. Null = ninguno.';

-- Resultado del comentario, por destino. Es aparte del resultado del post:
-- que falle el comentario NO significa que el post haya fallado.
alter table public.post_targets
  add column if not exists comment_id text;

alter table public.post_targets
  add column if not exists comment_error text;

comment on column public.post_targets.comment_id is
  'Id del comentario en Meta, si se logro dejar.';
comment on column public.post_targets.comment_error is
  'Por que no se pudo comentar. El post igual salio bien.';
