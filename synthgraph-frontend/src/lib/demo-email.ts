import { Resend } from "resend";
import type { DemoRequest } from "@/lib/demo-request";

/** A submission with the honeypot already stripped by the route. */
type Submission = Omit<DemoRequest, "website">;

const NOT_GIVEN = "—";

/** UTC, spelled out — the inbox is read by people, not parsers. */
function formatReceivedAt(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(new Date(iso)) + " UTC";
}

/**
 * Escapes the five characters that can break out of HTML text or an attribute.
 * Every value in the email body comes from an anonymous form, so none of it is
 * trusted — the plain-text part is safe by construction, this guards the HTML.
 */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Collapses whitespace to a single line.
 *
 * The subject is built from free-text input, and a newline in a header is the
 * classic way to append headers of your own. Resend takes JSON and encodes the
 * header itself, so this is defence in depth rather than the only guard — but a
 * subject line was never supposed to wrap anyway.
 */
function singleLine(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

/** Ordered for reading, not for the shape of the schema: who, then what. */
function fieldsOf(submission: Submission): Array<[string, string]> {
  const optional = (value: string | undefined) => value?.trim() || NOT_GIVEN;

  return [
    ["Name", submission.name],
    ["Email", submission.email],
    ["Institution", submission.institution],
    ["Role", submission.role],
    ["Team size", submission.teamSize],
    ["Research area", submission.researchArea],
    ["Workflow", submission.workflow.join(", ")],
    ["Current tools", submission.currentTools],
    ["Dataset scale", optional(submission.datasetScale)],
    ["Generator", optional(submission.generator)],
    ["Training framework", optional(submission.trainingFramework)],
    ["Experiment tracking", optional(submission.experimentTracking)],
    ["GitHub", optional(submission.github)],
    ["LinkedIn", optional(submission.linkedin)],
    ["Goal", submission.goal],
    ["Message", submission.message],
  ];
}

function renderText(submission: Submission, receivedAt: string): string {
  const rows = fieldsOf(submission)
    .map(([label, value]) => `${label}: ${value}`)
    .join("\n");
  return `New demo request\n\n${rows}\n\nReceived: ${formatReceivedAt(receivedAt)}\n`;
}

function renderHtml(submission: Submission, receivedAt: string): string {
  // Table layout and inline styles: email clients are not browsers, and grid,
  // flexbox and <style> blocks are unreliable across them.
  const rows = fieldsOf(submission)
    .map(([label, value]) => {
      const isProse = label === "Goal" || label === "Message";
      return `<tr>
        <td style="padding:8px 16px 8px 0;vertical-align:top;color:#626d81;font-size:13px;white-space:nowrap;">${escapeHtml(label)}</td>
        <td style="padding:8px 0;vertical-align:top;color:#12151c;font-size:14px;${isProse ? "white-space:pre-wrap;" : ""}">${escapeHtml(value)}</td>
      </tr>`;
    })
    .join("");

  return `<!doctype html>
<html>
  <body style="margin:0;padding:24px;background:#f4f6fa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,sans-serif;">
    <div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e2e7f0;border-radius:10px;padding:28px;">
      <h1 style="margin:0 0 4px;font-size:17px;font-weight:600;color:#12151c;">New demo request</h1>
      <p style="margin:0 0 20px;font-size:13px;color:#626d81;">
        ${escapeHtml(submission.name)} · ${escapeHtml(submission.institution)}
      </p>
      <table style="width:100%;border-collapse:collapse;">${rows}</table>
      <p style="margin:20px 0 0;padding-top:16px;border-top:1px solid #e2e7f0;font-size:12px;color:#626d81;">
        Received ${escapeHtml(formatReceivedAt(receivedAt))} · reply to this email to reach ${escapeHtml(submission.email)} directly.
      </p>
    </div>
  </body>
</html>`;
}

const HONORIFICS = new Set([
  "dr", "prof", "professor", "mr", "mrs", "ms", "mx", "miss", "sir", "dame",
]);

/**
 * Picks a name to greet with. Academic signups routinely lead with a title, and
 * "Hi Dr.," is worse than no greeting at all — so titles are skipped, and an
 * unusable name falls back to something neutral.
 */
function firstNameOf(fullName: string): string {
  for (const part of fullName.trim().split(/\s+/)) {
    const word = part.replace(/[.,]/g, "");
    if (word && !HONORIFICS.has(word.toLowerCase())) return word;
  }
  return "there";
}

/** Thrown when the send is misconfigured or the provider rejects it. */
export class DemoEmailError extends Error {}

/**
 * Emails a demo request to the team inbox.
 *
 * Reply-to is the requester, so answering from the inbox reaches them without
 * anyone copying the address out of the body.
 */
export async function sendDemoRequestEmail(
  submission: Submission,
  receivedAt: string,
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.DEMO_NOTIFY_TO;
  const from = process.env.DEMO_NOTIFY_FROM;

  if (!apiKey || !to || !from) {
    throw new DemoEmailError(
      "RESEND_API_KEY, DEMO_NOTIFY_TO and DEMO_NOTIFY_FROM must all be set to send demo requests.",
    );
  }

  const { data, error } = await new Resend(apiKey).emails.send({
    from,
    to,
    replyTo: submission.email,
    subject: singleLine(`Demo request — ${submission.institution} (${submission.role})`),
    text: renderText(submission, receivedAt),
    html: renderHtml(submission, receivedAt),
  });

  if (error) {
    throw new DemoEmailError(`${error.name}: ${error.message}`);
  }

  // Accepted by Resend is not the same as landed in an inbox. The id is how you
  // look up what happened to it afterwards at resend.com/emails.
  console.info(`[demo-request] team notification accepted, id=${data?.id} to=${to}`);
}

/**
 * Confirms to the requester that their request arrived.
 *
 * Best-effort by design: the route never fails a request because this send
 * failed. The team already has the submission at that point, and asking someone
 * to retry would only file it twice.
 */
export async function sendDemoConfirmationEmail(submission: Submission): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.DEMO_NOTIFY_FROM;
  const team = process.env.DEMO_NOTIFY_TO;

  if (!apiKey || !from || !team) {
    throw new DemoEmailError("Mailer is not configured.");
  }

  const firstName = firstNameOf(submission.name);
  const text = `Hi ${firstName},

Thanks for requesting a SynthGraph demo — we have your research context and
will follow up with next steps.

For reference, here is what you told us:

  Institution:   ${submission.institution}
  Research area: ${submission.researchArea}
  Workflow:      ${submission.workflow.join(", ")}

Just reply to this email if you want to add anything.

— The SynthGraph team
`;

  const { data, error } = await new Resend(apiKey).emails.send({
    from,
    to: submission.email,
    replyTo: team,
    subject: "Your SynthGraph demo request",
    text,
    html: `<!doctype html>
<html>
  <body style="margin:0;padding:24px;background:#f4f6fa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,sans-serif;">
    <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e2e7f0;border-radius:10px;padding:28px;">
      <h1 style="margin:0 0 16px;font-size:17px;font-weight:600;color:#12151c;">Request received.</h1>
      <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#12151c;">
        Hi ${escapeHtml(firstName)}, thanks for requesting a SynthGraph demo — we have your
        research context and will follow up with next steps.
      </p>
      <table style="width:100%;border-collapse:collapse;margin:0 0 16px;">
        <tr><td style="padding:6px 16px 6px 0;color:#626d81;font-size:13px;white-space:nowrap;">Institution</td><td style="padding:6px 0;color:#12151c;font-size:14px;">${escapeHtml(submission.institution)}</td></tr>
        <tr><td style="padding:6px 16px 6px 0;color:#626d81;font-size:13px;white-space:nowrap;">Research area</td><td style="padding:6px 0;color:#12151c;font-size:14px;">${escapeHtml(submission.researchArea)}</td></tr>
        <tr><td style="padding:6px 16px 6px 0;color:#626d81;font-size:13px;white-space:nowrap;">Workflow</td><td style="padding:6px 0;color:#12151c;font-size:14px;">${escapeHtml(submission.workflow.join(", "))}</td></tr>
      </table>
      <p style="margin:0;padding-top:16px;border-top:1px solid #e2e7f0;font-size:13px;color:#626d81;">
        Just reply to this email if you want to add anything.
      </p>
    </div>
  </body>
</html>`,
  });

  if (error) {
    throw new DemoEmailError(`${error.name}: ${error.message} (to ${submission.email})`);
  }

  console.info(`[demo-request] confirmation accepted, id=${data?.id} to=${submission.email}`);
}

/** Whether the mailer has everything it needs. Lets the route pick a path. */
export function isDemoEmailConfigured(): boolean {
  return Boolean(
    process.env.RESEND_API_KEY && process.env.DEMO_NOTIFY_TO && process.env.DEMO_NOTIFY_FROM,
  );
}
