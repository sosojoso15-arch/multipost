# Arquitectura — Multi-Post (BYOA)

**BYOA = Bring Your Own App.** Cada cliente crea su propia app de Facebook y nos da
su App ID. Nosotros nunca pedimos permisos con una app nuestra, entonces **no
necesitamos App Review ni verificación de negocio de Meta.**

## Piezas

| Pieza | Qué usa |
|---|---|
| Web + API | Next.js (App Router) en Vercel |
| Permiso de Meta | OAuth de servidor, sin SDK de JavaScript |
| Cuentas de usuario | Supabase Auth (correo + contraseña, y Google opcional) |
| Base de datos | Supabase Postgres, con Row Level Security |
| Cifrado de tokens | AES-256-GCM en el servidor, clave en variable de entorno |
| Posts programados | Vercel Cron cada 5 min |
| Cobros | Stripe (fase 2) |

## Flujo del usuario

```
1. Se registra con correo             -> Supabase Auth
2. Pega App ID + App Secret           -> meta_apps (secreto cifrado)
3. Pega UNA URL en su app de Meta     -> /api/meta/callback
     - con el App ID ya guardado le damos el link directo a SU pantalla:
       developers.facebook.com/apps/{app-id}/fb-login/settings/
4. "Conectar con Facebook" abre un popup:
     /api/meta/start     -> redirige al dialogo de OAuth (con state en cookie)
     /api/meta/callback  -> cambia ?code= por token, lo alarga a 60 dias,
                            trae /me/accounts y guarda todo cifrado
5. Escribe post -> elige cuentas -> Publicar o Programar
6. Un registro por destino en post_targets, con OK o el error exacto
```

## Por qué el token va en el servidor

Los tokens de página no caducan, pero el token de usuario sí (60 días).
Guardarlos cifrados en la base permite:

- publicar aunque el navegador esté cerrado (posts programados)
- usar la cuenta desde el celular y desde el PC
- reintentar cuando Facebook falla

Van cifrados con `TOKEN_ENCRYPTION_KEY`, y el RLS impide que un usuario lea filas
de otro aunque se filtre la llave pública de Supabase.

## Permisos que se piden a Meta

| Permiso | Para |
|---|---|
| `pages_show_list` | listar las páginas |
| `pages_read_engagement` | leer datos de la página |
| `pages_manage_posts` | publicar en Facebook |
| `instagram_basic` | ver la cuenta de Instagram ligada |
| `instagram_content_publish` | publicar en Instagram |
| `business_management` | páginas dentro de Business Manager |

En modo Desarrollo de SU app, el cliente (que es admin de su app) puede usar todos
estos permisos sin revisión. Ese es el truco completo.

## Por qué OAuth de servidor y no el SDK de JavaScript

El SDK obliga al cliente a autorizar cuatro cosas repartidas en dos pantallas de
Meta: Dominios de la app, URL del sitio, Dominios permitidos para el SDK, y activar
el interruptor del login con SDK. Es donde más gente se cae.

El flujo de redireccion valida **una sola** casilla: *URIs de redireccionamiento de
OAuth validos*. Ademas el `?code=` se cambia por un token de 60 dias en el mismo
paso, y desaparece el problema de que el SDK solo se puede inicializar una vez por
carga de pagina (antes, cambiar de App ID exigia recargar).

## Instagram — nota importante

Instagram publica en dos pasos, no en uno:

1. `POST /{ig-id}/media` con la URL de la imagen → devuelve un `creation_id`
2. `POST /{ig-id}/media_publish` con ese `creation_id`

Además Instagram **exige** una imagen o video (no existe post de solo texto) y la
cuenta debe ser **Business o Creator** ligada a una página de Facebook.

## Límites por plan

| Plan | Posts/mes | Cuentas |
|---|---|---|
| Free | 30 | 3 |
| Pro | 1000 | 25 |
| Agency | ilimitado | ilimitado |

(Definidos en `plan_limit()` en la migración 0001.)
