/* Sin dependencias del servidor a proposito: lo usa tambien el navegador. */
/**
 * El ID numerico o el nombre de usuario, sacado de lo que sea que pegue el
 * cliente: la direccion entera del perfil, el "profile.php?id=...", o ya
 * limpio.
 *
 * OJO: esto NO reemplaza lo que el cliente escribio. Se guarda tal cual,
 * porque Meta acepta mas formas de las que uno cree —"profile.php?id=615..."
 * pegado entero funciona— y adivinar cual prefiere es como perder una
 * invitacion. Esto solo sirve para OFRECER la otra forma en el panel, y
 * para rechazar lo que no sirve de ninguna manera (un correo, un nombre).
 *
 * Devuelve null si no se puede sacar nada util.
 */
export function limpiarRefFacebook(bruto: string): string | null {
  let v = bruto.trim();
  if (!v) return null;

  // "https://www.facebook.com/profile.php?id=615..." -> 615...
  const porId = v.match(/[?&]id=(\d{5,})/);
  if (porId) return porId[1];

  // Solo numeros ya viene listo
  if (/^\d{5,}$/.test(v)) return v;

  // Quitar el dominio y lo que venga despues
  v = v
    .replace(/^https?:\/\//i, "")
    .replace(/^(www\.|m\.|web\.)?facebook\.com\//i, "")
    .replace(/^@/, "")
    .split(/[?#/]/)[0]
    .trim();

  // Un nombre de usuario de Facebook: letras, numeros y puntos.
  return /^[A-Za-z0-9.]{3,60}$/.test(v) ? v : null;
}
