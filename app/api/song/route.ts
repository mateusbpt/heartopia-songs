import * as cheerio from "cheerio";
import { NextRequest, NextResponse } from "next/server";
import { isNoteLine } from "@/lib/notation";

/**
 * The song's notes are plain text in the served HTML — the site's own client-side
 * script is what wraps each note in a <span>. So we fetch the page and read the
 * text of `.post-content`, then keep the lines that are notes rather than lyrics.
 */

const ALLOWED_HOST = "noobnotes.net";

function parseTarget(raw: string): URL | null {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  // Guard against the endpoint being used as an open proxy to arbitrary hosts.
  if (url.hostname !== ALLOWED_HOST && url.hostname !== `www.${ALLOWED_HOST}`) return null;
  url.protocol = "https:";
  return url;
}

export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get("url");
  if (!raw) {
    return NextResponse.json({ error: "Informe a URL da música." }, { status: 400 });
  }

  const target = parseTarget(raw);
  if (!target) {
    return NextResponse.json(
      { error: `Só aceito links de ${ALLOWED_HOST}.` },
      { status: 400 },
    );
  }

  let html: string;
  try {
    const response = await fetch(target, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; heartopia-songs/1.0)" },
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) {
      return NextResponse.json(
        { error: `O noobnotes respondeu ${response.status}. Confira o link.` },
        { status: 502 },
      );
    }
    html = await response.text();
  } catch {
    return NextResponse.json({ error: "Não consegui acessar o noobnotes." }, { status: 502 });
  }

  const $ = cheerio.load(html);
  const title = $("h1").first().text().trim() || target.pathname;

  const content = $(".post-content").first();
  if (content.length === 0) {
    return NextResponse.json(
      { error: "Não achei o bloco de notas nessa página. É mesmo a página de uma música?" },
      { status: 422 },
    );
  }

  content.find("br").replaceWith("\n");
  // Keep every line in document order so the client can pair notes with lyrics;
  // only require that at least one line is actually notes.
  const lines = content
    .find("p")
    .toArray()
    .flatMap((el) => $(el).text().split("\n"))
    .map((l) => l.trim())
    .filter(Boolean);

  if (!lines.some(isNoteLine)) {
    return NextResponse.json(
      { error: "A página carregou, mas nenhuma linha parecia ser de notas." },
      { status: 422 },
    );
  }

  return NextResponse.json({ title, notation: lines.join("\n"), source: target.toString() });
}
