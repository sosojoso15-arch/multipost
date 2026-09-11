import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export const maxDuration = 120;

const LIMITE_BYTES = 50 * 1024 * 1024; // 50 MB

const TIPOS: Record<string, { ext: string; clase: "image" | "video" }> = {
  "image/jpeg": { ext: "jpg", clase: "image" },
  "image/png": { ext: "png", clase: "image" },
  "image/webp": { ext: "webp", clase: "image" },
  "image/gif": { ext: "gif", clase: "image" },
  "video/mp4": { ext: "mp4", clase: "video" },
  "video/quicktime": { ext: "mov", clase: "video" },
};

/**
 * Recibe un archivo del PC del cliente y lo deja en el bucket `media`.
 * Devuelve la URL publica, que es la que Meta va a descargar.
 *
 * El archivo NO se queda para siempre: cuando la publicacion sale bien,
 * el publisher lo borra.
 */
export async function POST(req: Request) {
  const sb = await supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "No se pudo leer el archivo" }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Falta el archivo" }, { status: 400 });
  }

  const tipo = TIPOS[file.type];
  if (!tipo) {
    return NextResponse.json(
      { error: "Ese formato no sirve. Usa JPG, PNG, WEBP, GIF, MP4 o MOV." },
      { status: 415 },
    );
  }

  if (file.size > LIMITE_BYTES) {
    const mb = Math.round(file.size / 1024 / 1024);
    return NextResponse.json(
      { error: `El archivo pesa ${mb} MB y el tope son 50 MB.` },
      { status: 413 },
    );
  }

  // La primera carpeta tiene que ser el id del usuario: asi lo exige el RLS.
  const ruta = `${user.id}/${crypto.randomUUID()}.${tipo.ext}`;

  const { error } = await sb.storage.from("media").upload(ruta, file, {
    contentType: file.type,
    upsert: false,
  });

  if (error) {
    return NextResponse.json({ error: `No se pudo subir: ${error.message}` }, { status: 500 });
  }

  const { data } = sb.storage.from("media").getPublicUrl(ruta);

  return NextResponse.json({
    url: data.publicUrl,
    path: ruta,
    type: tipo.clase,
    name: file.name,
    size: file.size,
  });
}

/** Borrar un archivo que el cliente quito antes de publicar. */
export async function DELETE(req: Request) {
  const sb = await supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { path } = (await req.json()) as { path?: string };
  if (!path) return NextResponse.json({ error: "Falta la ruta" }, { status: 400 });

  // Doble reja: el RLS ya lo impide, pero no está de más.
  if (!path.startsWith(`${user.id}/`)) {
    return NextResponse.json({ error: "Ese archivo no es tuyo" }, { status: 403 });
  }

  const { error } = await sb.storage.from("media").remove([path]);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
