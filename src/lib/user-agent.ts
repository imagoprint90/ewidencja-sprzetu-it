// Lekki parser nagłówka User-Agent — wystarcza do czytelnego opisu "Chrome · Windows · Komputer"
// w dzienniku logowań (bez dodatkowej biblioteki).
export interface ParsedUserAgent {
  browser: string;
  os: string;
  device: "Komputer" | "Telefon" | "Tablet" | "Nieznane";
}

export function parseUserAgent(ua: string | null | undefined): ParsedUserAgent {
  if (!ua) return { browser: "Nieznana", os: "Nieznany", device: "Nieznane" };

  let browser = "Inna";
  if (/Edg(e|A|iOS)?\//.test(ua)) browser = "Edge";
  else if (/OPR\/|Opera/.test(ua)) browser = "Opera";
  else if (/Firefox\/|FxiOS\//.test(ua)) browser = "Firefox";
  else if (/Chrome\/|CriOS\//.test(ua)) browser = "Chrome";
  else if (/Safari\//.test(ua)) browser = "Safari";

  let os = "Inny";
  if (/Windows NT/.test(ua)) os = "Windows";
  else if (/Android/.test(ua)) os = "Android";
  else if (/iPhone|iPad|iPod/.test(ua)) os = "iOS";
  else if (/Mac OS X|Macintosh/.test(ua)) os = "macOS";
  else if (/CrOS/.test(ua)) os = "ChromeOS";
  else if (/Linux/.test(ua)) os = "Linux";

  let device: ParsedUserAgent["device"] = "Komputer";
  if (/iPad|Tablet/.test(ua) || (/Android/.test(ua) && !/Mobile/.test(ua))) device = "Tablet";
  else if (/Mobi|iPhone|Android/.test(ua)) device = "Telefon";

  return { browser, os, device };
}
