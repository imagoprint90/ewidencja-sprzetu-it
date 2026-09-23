import nodemailer from "nodemailer";

// Wspólny helper wysyłki SMTP — używany zarówno przy ręcznej wysyłce (notification-actions.ts,
// w kontekście zalogowanego admina), jak i przez zadanie cron obsługujące harmonogramy
// (src/app/api/cron/notification-schedules/route.ts, bez sesji użytkownika). Tworzy nowy
// transporter na każde wywołanie — prostsze niż utrzymywanie puli połączeń między
// bezstanowymi wywołaniami serverless.

export interface SendEmailResult {
  ok: boolean;
  error?: string;
}

export async function sendSmtpEmail(input: {
  to: string;
  subject: string;
  text: string;
}): Promise<SendEmailResult> {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const password = process.env.SMTP_PASSWORD;
  const from = process.env.SMTP_FROM_EMAIL;

  if (!host || !port || !user || !password || !from) {
    return {
      ok: false,
      error:
        "Wysyłka mailowa nie jest jeszcze skonfigurowana — uzupełnij zmienne środowiskowe SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD i SMTP_FROM_EMAIL.",
    };
  }

  try {
    const portNumber = Number(port);
    // Port 465 = szyfrowanie od razu (SSL/TLS), inne porty (np. 587) = STARTTLS.
    // Można to też wymusić jawnie zmienną SMTP_SECURE=true, gdyby dostawca odbiegał od normy.
    const secure = process.env.SMTP_SECURE === "true" || portNumber === 465;

    const transporter = nodemailer.createTransport({
      host,
      port: portNumber,
      secure,
      auth: { user, pass: password },
    });

    await transporter.sendMail({ from, to: input.to, subject: input.subject, text: input.text });
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Nie udało się wysłać wiadomości przez SMTP.";
    return { ok: false, error: message };
  }
}
