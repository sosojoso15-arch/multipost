# Multi-Post

Publica el mismo contenido en todas tus páginas de Facebook y cuentas de Instagram
al mismo tiempo.

**Modelo BYOA** (*Bring Your Own App*): cada cliente crea su propia app de Meta y nos
da su App ID. Por eso **no necesitamos App Review ni verificación de negocio de Meta**
para vender esto — el permiso lo pide la app del cliente, no la nuestra.

Detalle completo en [docs/arquitectura.md](docs/arquitectura.md).

## Stack

- Next.js 16 (App Router) + React 19 + Tailwind 4
- Supabase (Auth + Postgres con Row Level Security)
- Tokens de página cifrados con AES-256-GCM antes de tocar la base
- Vercel Cron cada 5 min para las publicaciones programadas

---

## Puesta en marcha

### 1. Supabase

1. Crea un proyecto en [supabase.com](https://supabase.com).
2. Abre **SQL Editor** y pega completo el archivo
   [supabase/migrations/0001_init.sql](supabase/migrations/0001_init.sql). Ejecuta.
3. Ve a **Project Settings → API** y copia las tres llaves.

En **Authentication → Providers → Email**, si quieres probar rápido sin abrir el correo,
apaga *Confirm email*. En producción déjalo prendido.

### 2. Variables

```bash
cp .env.example .env.local
```

Llena:

| Variable | Dónde sale |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | igual |
| `SUPABASE_SERVICE_ROLE_KEY` | igual — **nunca** la expongas al navegador |
| `TOKEN_ENCRYPTION_KEY` | `openssl rand -base64 32` |
| `CRON_SECRET` | cualquier texto largo al azar |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` en local |

> ⚠️ Si cambias `TOKEN_ENCRYPTION_KEY` después de que haya cuentas conectadas, los
> tokens guardados dejan de poder descifrarse y todos los clientes tienen que
> reconectar. Trátala como una llave permanente.

### 3. Correr

```bash
npm install
npm run dev
```

http://localhost:3000

---

## Cómo se usa (lo que ve el cliente)

1. Crea cuenta con su correo.
2. **Mis cuentas** → el asistente lo lleva paso por paso:
   - crear su app en developers.facebook.com
   - pegar su App ID y su App Secret
   - pegar **una sola URL** en su app — con botón de copiar y link directo a la
     pantalla exacta de *su* app
   - conectar con Facebook y marcar sus páginas
3. **Publicar** → escribe, marca destinos, publica o programa.

Cada destino queda registrado aparte: si una página falla, las demás siguen y se
muestra el error exacto de esa página.

## Por qué el App Secret es obligatorio

Usamos el flujo **OAuth de servidor**, no el SDK de JavaScript. Meta devuelve un
`?code=` que solo se puede cambiar por un token usando el secreto.

A cambio, el cliente autoriza **una sola casilla** en vez de cuatro:

| | SDK de JavaScript | OAuth de servidor (lo que usamos) |
|---|---|---|
| Casillas a autorizar en Meta | 4, en 2 pantallas | **1** |
| Token del usuario | 2 h sin secreto | 60 días |
| Tokens de página | caducan | **no caducan** |
| Programar publicaciones | solo con secreto | siempre |

La casilla es *URI de redireccionamiento de OAuth válidos*, y va con este valor:

```
https://TU-DOMINIO/api/meta/callback
```

El secreto se guarda cifrado y nunca se vuelve a mostrar.

## Instagram — lo que hay que saber

- **Exige** imagen o video. No existe publicación de solo texto; la app lo bloquea antes
  de intentar.
- La cuenta debe ser **Business o Creator** y estar ligada a una página de Facebook.
- Publica en dos pasos (crear contenedor → publicar). Los videos se esperan hasta 2 min
  mientras Meta los procesa.
- Los archivos van por **URL pública**, no por archivo local.

## Desplegar

```bash
npm i -g vercel
vercel
```

Después, en el panel de Vercel:

1. Carga todas las variables de `.env.local`, con `NEXT_PUBLIC_APP_URL` apuntando a tu
   dominio real (`https://...`).
2. **Cron.** El plan gratis de Vercel solo admite **un cron al día**, así que
   [vercel.json](vercel.json) quedó en `0 6 * * *` como red de seguridad.
   Para que las publicaciones programadas salgan a la hora, hace falta algo que
   llame a `/api/cron/publish` cada 5 minutos:

   | Opción | Costo | Puntualidad |
   |---|---|---|
   | cron-job.org u otro cron externo | gratis | buena |
   | GitHub Actions (`schedule`) | gratis solo si el repo es público | se retrasa a veces |
   | Vercel Pro | 20 USD/mes | exacta |

   La llamada lleva la cabecera `Authorization: Bearer <CRON_SECRET>`.
3. En Supabase → Authentication → URL Configuration, agrega tu dominio en
   *Site URL* y en *Redirect URLs*.

## Pendiente

- [ ] Cobros con Stripe (los planes y límites ya están en la base)
- [ ] Subir imágenes desde el PC (hoy solo URL) — con Vercel Blob o Supabase Storage
- [ ] Historial de publicaciones y reintentar las fallidas
- [ ] Carrusel de varias imágenes
- [ ] Página de política de privacidad y borrado de datos

## `legacy-navegador/`

La primera versión: un solo archivo HTML, sin servidor ni cuentas. Sirve como demo
gratis o como plan B. Ver su propio README.
