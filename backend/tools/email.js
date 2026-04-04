const { google } = require("googleapis");

async function sendEmail({ to, subject, body, accessToken }) {
  try {
    if (!accessToken) {
      return {
        success: false,
        error: "Not authenticated",
        fallback: "I need access to your Gmail to send emails. Please connect your Google account first.",
      };
    }

    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: accessToken });

    let recipient = to;
    // Check if AI hallucinated a placeholder string
    if (recipient && !recipient.includes("@")) {
      recipient = null;
    }
    
    if (!recipient) {
      try {
        const oauth2 = google.oauth2({ auth: oauth2Client, version: "v2" });
        const userInfo = await oauth2.userinfo.get();
        recipient = userInfo.data.email;
      } catch (err) {
        return {
          success: false,
          error: "Recipient email is required and could not be fetched from profile",
          fallback: "I need an email address to send to. Please specify the recipient.",
        };
      }
    }

    const gmail = google.gmail({ version: "v1", auth: oauth2Client });

    const emailSubject = subject || "Message from VaaniAI";
    const emailBody = body || "This email was sent via VaaniAI.";

    // Construct RFC 2822 message
    const message = [
      `To: ${recipient}`,
      `Subject: ${emailSubject}`,
      "Content-Type: text/plain; charset=utf-8",
      "",
      emailBody,
    ].join("\n");

    // Base64url encode
    const encodedMessage = Buffer.from(message)
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    await gmail.users.messages.send({
      userId: "me",
      requestBody: { raw: encodedMessage },
    });

    return {
      success: true,
      message: `Email sent successfully to ${to} with subject "${emailSubject}".`,
      data: { to, subject: emailSubject },
    };
  } catch (error) {
    console.error("[Tool:Email] Error:", error.message);
    return {
      success: false,
      error: error.message,
      fallback: "I couldn't send the email. Please verify your Gmail permissions and try again.",
    };
  }
}

async function listEmails({ limit = 5, query = "", accessToken }) {
  try {
    if (!accessToken) return { success: false, error: "Not authenticated" };

    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: accessToken });

    const gmail = google.gmail({ version: "v1", auth: oauth2Client });
    const qString = query ? `label:INBOX ${query}` : "label:INBOX";
    const response = await gmail.users.messages.list({
      userId: "me",
      maxResults: limit,
      q: qString,
    });

    const messages = response.data.messages || [];
    const emailSummaries = [];

    for (const msg of messages) {
      const details = await gmail.users.messages.get({
        userId: "me",
        id: msg.id,
        format: "full",
      });

      const headers = details.data.payload.headers;
      const subject = headers.find(h => h.name === "Subject")?.value || "No Subject";
      const from = headers.find(h => h.name === "From")?.value || "Unknown Sender";
      const snippet = details.data.snippet || "";

      emailSummaries.push({
        id: msg.id,
        subject,
        from,
        snippet,
        date: headers.find(h => h.name === "Date")?.value,
      });
    }

    return {
      success: true,
      message: `Found ${emailSummaries.length} recent emails in your inbox.`,
      data: emailSummaries,
    };
  } catch (error) {
    console.error("[Tool:Email] List error:", error.message);
    return { success: false, error: error.message };
  }
}

async function readEmail({ messageId, query = "", accessToken }) {
  try {
    if (!accessToken) return { success: false, error: "Authentication missing" };

    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: accessToken });
    const gmail = google.gmail({ version: "v1", auth: oauth2Client });

    let targetMessageId = messageId;

    // Smart Fallback: If AI doesn't know the ID, find the latest email matching the query
    if (!targetMessageId) {
      const qString = query ? `label:INBOX ${query}` : "label:INBOX";
      const listResponse = await gmail.users.messages.list({
        userId: "me",
        maxResults: 1,
        q: qString,
      });

      if (!listResponse.data.messages || listResponse.data.messages.length === 0) {
         return { success: false, error: "No emails found to read." };
      }
      targetMessageId = listResponse.data.messages[0].id;
    }

    const response = await gmail.users.messages.get({
      userId: "me",
      id: targetMessageId,
      format: "full",
    });

    const payload = response.data.payload;
    let body = "";

    if (payload.parts) {
      const part = payload.parts.find(p => p.mimeType === "text/plain") || payload.parts[0];
      if (part.body.data) {
        body = Buffer.from(part.body.data, "base64").toString("utf-8");
      }
    } else if (payload.body.data) {
      body = Buffer.from(payload.body.data, "base64").toString("utf-8");
    }

    const headers = payload.headers;
    const subject = headers.find(h => h.name === "Subject")?.value;
    const from = headers.find(h => h.name === "From")?.value;

    return {
      success: true,
      message: `Read email: "${subject}" from ${from}`,
      data: { subject, from, body: body.substring(0, 2000) }, // Cap at 2k chars for LLM readability
    };
  } catch (error) {
    console.error("[Tool:Email] Read error:", error.message);
    return { success: false, error: error.message };
  }
}

module.exports = { sendEmail, listEmails, readEmail };
