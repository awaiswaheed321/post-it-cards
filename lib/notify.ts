// Sends a content-free "new note" email alert to the other person via EmailJS
// (client-side, no backend). No note text is included — only who it's from and a
// link — so end-to-end encryption is preserved. No-ops until EmailJS is configured.

const APP_URL = 'https://postcards.awaiswaheed.net';

export async function notifyNewNote(
  toEmail: string,
  toName: string,
  fromName: string,
): Promise<void> {
  const serviceId = process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID;
  const templateId = process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID;
  const publicKey = process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY;
  if (!serviceId || !templateId || !publicKey || !toEmail) return;

  try {
    const res = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        service_id: serviceId,
        template_id: templateId,
        user_id: publicKey,
        template_params: {
          to_email: toEmail,
          to_name: toName,
          from_name: fromName,
          app_url: APP_URL,
        },
      }),
    });
    if (!res.ok) console.error('notify failed:', res.status, await res.text());
  } catch (err) {
    console.error('notify error:', err);
  }
}
