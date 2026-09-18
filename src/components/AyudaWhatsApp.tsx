/**
 * Botón de soporte por WhatsApp.
 *
 * Va en las pantallas donde la gente se traba: conectar con Meta, aceptar la
 * invitación, el asistente de cinco pasos. Son las que tienen trampas que no
 * dependen de nosotros —la app de Facebook secuestrando enlaces, el SMS del
 * Centro de cuentas, los nombres raros de Meta— y donde alguien atascado se
 * va en vez de escribir.
 *
 * El mensaje va escrito de antemano con el paso donde se trabó: quien
 * responde no tiene que empezar preguntando "¿en qué vas?".
 */

/** Cambiar aquí si cambia el número. Va sin +, sin espacios y sin guiones. */
const NUMERO = "573135861270";

/** Para mostrarlo, con la forma que se lee en Colombia. */
const NUMERO_VISIBLE = "+57 313 586 1270";

export default function AyudaWhatsApp({
  paso,
  className = "",
}: {
  /** Dónde está atascado. Entra en el mensaje. */
  paso: string;
  className?: string;
}) {
  const texto = encodeURIComponent(
    `Hola, necesito ayuda con Multi-Post.\n\nEstoy en: ${paso}`,
  );

  return (
    <div className={`text-xs ${className}`} style={{ color: "var(--muted)" }}>
      <span>¿Te trabaste? </span>
      <a
        href={`https://wa.me/${NUMERO}?text=${texto}`}
        target="_blank"
        rel="noreferrer"
        className="font-semibold underline"
        style={{ color: "#25D366" }}
      >
        Escríbenos por WhatsApp
      </a>
      <span className="ml-1">({NUMERO_VISIBLE}) — te sacamos en un momento.</span>
    </div>
  );
}
