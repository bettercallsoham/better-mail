interface Attachment {
  filename: string;
  mimeType: string;
  content: string; // base64 encoded
  size?: number;
}

export class Rfc822Builder {
  static build(input: {
    from: string;
    to: string[];
    cc?: string[];
    bcc?: string[];
    subject: string;
    html: string;
    text?: string;
    inReplyTo?: string;
    references?: string[];
    attachments?: Attachment[];
  }): string {
    const headers = [];

    headers.push(`From: ${input.from}`);
    headers.push(`To: ${input.to.join(", ")}`);
    if (input.cc?.length) headers.push(`Cc: ${input.cc.join(", ")}`);
    if (input.bcc?.length) headers.push(`Bcc: ${input.bcc.join(", ")}`);
    headers.push(`Subject: ${input.subject}`);
    headers.push(`Message-ID: <${crypto.randomUUID()}@yourapp>`);

    if (input.inReplyTo) {
      headers.push(`In-Reply-To: ${input.inReplyTo}`);
      headers.push(`References: ${input.references?.join(" ")}`);
    }

    headers.push("MIME-Version: 1.0");

    // Handle attachments with multipart/mixed
    if (input.attachments?.length) {
      const boundary = `----=_Part_${crypto.randomUUID().replace(/-/g, "")}`;
      headers.push(`Content-Type: multipart/mixed; boundary="${boundary}"`);

      let body = "";

      // Content part (text/html)
      body += `--${boundary}\r\n`;
      body += `Content-Type: text/html; charset="UTF-8"\r\n`;
      body += `Content-Transfer-Encoding: quoted-printable\r\n\r\n`;
      body += input.html + "\r\n\r\n";

      // Attachment parts
      for (const attachment of input.attachments) {
        body += `--${boundary}\r\n`;
        body += `Content-Type: ${attachment.mimeType}; name="${attachment.filename}"\r\n`;
        body += `Content-Disposition: attachment; filename="${attachment.filename}"\r\n`;
        body += `Content-Transfer-Encoding: base64\r\n\r\n`;
        body += attachment.content + "\r\n\r\n";
      }

      body += `--${boundary}--`;

      return headers.join("\r\n") + "\r\n\r\n" + body;
    }

    // Simple HTML email without attachments
    headers.push(`Content-Type: text/html; charset="UTF-8"`);
    return headers.join("\r\n") + "\r\n\r\n" + input.html;
  }
}
