# Publicar en todas mis paginas de Facebook

Pagina web de un solo archivo. Entras con Facebook, ves todas tus paginas y publicas
el mismo post en todas al mismo tiempo.

## 1. Correr la pagina

```bash
node serve.js
```

Abre http://localhost:3000

## 2. Crear la app de Facebook (obligatorio)

Facebook no deja publicar sin una app propia.

1. Entra a https://developers.facebook.com/apps → **Crear app**
2. Tipo: **Empresa / Business**
3. Agrega el producto **Inicio de sesion con Facebook** → **Web**
4. En *Configuracion → Basica*:
   - **Dominios de la app**: `localhost`
   - **URL del sitio**: `http://localhost:3000`
5. En *Inicio de sesion con Facebook → Configuracion*:
   - **Inicio de sesion con el SDK de JavaScript**: SI
   - **Dominios permitidos para el SDK de JavaScript**: `http://localhost:3000`
6. Copia el **App ID** (arriba en el panel) y pegalo en la pagina.

## 3. Permisos

La app pide:

| Permiso | Para que |
|---|---|
| `pages_show_list` | ver la lista de tus paginas |
| `pages_read_engagement` | leer datos de la pagina |
| `pages_manage_posts` | crear las publicaciones |
| `business_management` | paginas dentro de Business Manager |

**Importante:**

- Mientras la app este en modo **Desarrollo**, funciona solo con las cuentas que sean
  Administrador / Desarrollador / Probador de la app. Para ti solo, con eso basta.
- Si la quieres usar con otras personas, hay que enviar la app a **Revision de la app**
  (App Review) pidiendo `pages_manage_posts` y `pages_show_list`.

## 4. Usar

1. Pega el App ID → **Guardar y conectar SDK**
2. **Entrar con Facebook** → acepta y marca todas tus paginas en la pantalla de permisos
3. Salen tus paginas con casilla marcada. Desmarca las que no quieras.
4. Escribe el mensaje. Opcional: URL de imagen o enlace.
5. **Publicar en las seleccionadas** → abajo salen los resultados uno por uno.

## Notas

- Con **URL de imagen** publica una foto (`/{page-id}/photos`); si no, publica texto o
  enlace (`/{page-id}/feed`).
- La imagen debe ser una URL publica en internet (no un archivo de tu PC).
- Si una pagina falla, las demas siguen. El error de cada una sale en el log.
- El App ID se guarda en `localStorage` del navegador. Los tokens de pagina viven solo
  en memoria mientras la pestaña este abierta; no se guardan en ningun lado.

## Subir a internet (opcional)

Es HTML puro, sirve cualquier hosting estatico:

```bash
npx vercel
```

Despues agrega ese dominio `https://...` en *Dominios de la app* y en
*Dominios permitidos para el SDK de JavaScript* en el panel de Facebook.
