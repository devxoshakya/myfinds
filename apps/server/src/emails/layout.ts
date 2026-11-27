// Plain HTML templates (no build step, no React Email dependency). Inline
// styles only: email clients strip <style> blocks and class selectors.

export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function appUrl(path = ""): string {
  const base = (
    process.env.APP_URL ??
    process.env.CORS_ORIGIN ??
    "http://localhost:3001"
  ).replace(/\/+$/, "");
  return `${base}${path}`;
}

export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] || "there";
}

export function formatCategory(category: string): string {
  return category
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/^\w/, (character) => character.toUpperCase());
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export function formatDateTime(date: Date): string {
  const formatted = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(date);
  return `${formatted} UTC`;
}

type LayoutInput = {
  preheader: string;
  eyebrow: string;
  heading: string;
  body: string;
};

export function renderLayout({
  preheader,
  eyebrow,
  heading,
  body,
}: LayoutInput): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<title>${escapeHtml(heading)}</title>
</head>
<body style="margin:0;padding:0;background:#F4F5F7;color:#111111;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F4F5F7;">
  <tr>
    <td align="center" style="padding:32px 16px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background:#FFFFFF;border:1px solid #C9CED6;border-radius:2px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
        <tr>
          <td style="padding:20px 28px;border-bottom:1px solid #C9CED6;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td align="left" style="font-size:14px;font-weight:700;color:#111111;">
                  <span style="display:inline-block;border:1px solid #111111;border-radius:2px;padding:4px 8px;">MyFinds</span>
                </td>
                <td align="right" style="font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:11px;line-height:16px;letter-spacing:.04em;text-transform:uppercase;color:#5B6470;">${escapeHtml(eyebrow)}</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:28px;">
            <h1 style="margin:0 0 16px;font-size:22px;line-height:30px;font-weight:600;color:#111111;">${escapeHtml(heading)}</h1>
            ${body}
          </td>
        </tr>
        <tr>
          <td style="padding:18px 28px;border-top:1px solid #C9CED6;background:#FAFBFC;">
            <p style="margin:0;font-size:12px;line-height:18px;color:#5B6470;">Sent by MyFinds about your lost-and-found report. This is a transactional email.</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}

export function paragraph(html: string): string {
  return `<p style="margin:0 0 16px;font-size:15px;line-height:24px;color:#111111;">${html}</p>`;
}

export function note(html: string): string {
  return `<p style="margin:0;font-size:13px;line-height:20px;color:#5B6470;">${html}</p>`;
}

export function details(rows: Array<[string, string]>): string {
  const cells = rows
    .map(
      ([label, value]) => `<tr>
        <td style="padding:8px 0;border-top:1px solid #EEF0F3;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:11px;line-height:16px;letter-spacing:.04em;text-transform:uppercase;color:#5B6470;vertical-align:top;width:38%;">${label}</td>
        <td style="padding:8px 0;border-top:1px solid #EEF0F3;font-size:14px;line-height:20px;color:#111111;vertical-align:top;">${value}</td>
      </tr>`,
    )
    .join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 24px;">${cells}</table>`;
}

export function codeBlock(code: string, noteText: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 24px;">
    <tr>
      <td align="center" style="padding:20px 16px;background:#F4F5F7;border:1px dashed #111111;border-radius:2px;">
        <div style="font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:34px;line-height:42px;font-weight:700;letter-spacing:.2em;color:#111111;">${escapeHtml(code)}</div>
        <div style="margin-top:6px;font-size:12px;line-height:18px;color:#5B6470;">${escapeHtml(noteText)}</div>
      </td>
    </tr>
  </table>`;
}

export function actionButton(label: string, href: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px;">
    <tr>
      <td style="background:#111111;border-radius:2px;">
        <a href="${escapeHtml(href)}" style="display:inline-block;padding:12px 20px;font-size:14px;line-height:20px;font-weight:600;color:#FFFFFF;text-decoration:none;">${escapeHtml(label)}</a>
      </td>
    </tr>
  </table>`;
}

export function imageBlock(url: string, alt: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 20px;">
    <tr>
      <td style="border:1px solid #C9CED6;border-radius:2px;overflow:hidden;">
        <img src="${escapeHtml(url)}" alt="${escapeHtml(alt)}" width="504" style="display:block;width:100%;max-width:504px;height:auto;border:0;" />
      </td>
    </tr>
  </table>`;
}
