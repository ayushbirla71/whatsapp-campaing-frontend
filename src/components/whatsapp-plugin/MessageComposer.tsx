import { useEffect, useRef, useState } from "react";

export default function MessageComposer({ conversation, onSent }: any) {
  const [text, setText] = useState("");
  const [canSend, setCanSend] = useState(true);
  const [sending, setSending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
   const baseUrl = process.env.REACT_APP_API_URL;

  const params = new URLSearchParams(window.location.search);
  const token = params.get("token");

  const conversationId = conversation?.conversationId;

  /* 🔐 Check 24-hour window */
  useEffect(() => {
    if (!conversationId) return;

    fetch(
      `${baseUrl}/api/messages/${conversationId}/can-send`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    )
      .then(res => res.json())
      .then(res => setCanSend(res.canSend))
      .catch(() => setCanSend(false));
  }, [conversationId, token]);

  /* 🧠 Unified payload builder */
  const buildPayload = (type: string, data: any) => {
    switch (type) {
      case "text":
        return {
          messageType: "text",
          messageContent: data.text,
        };

      case "image":
        return {
          messageType: "image",
          mediaUrl: data.url,
          mediaType: "image",
          caption: data.caption || "",
        };

      case "document":
        return {
          messageType: "document",
          mediaUrl: data.url,
          mediaType: "document",
          caption: data.caption || "",
        };

      case "template":
        return {
          messageType: "template",
          templateName: data.templateName,
          templateLanguage: "en_US",
          templateParameters: data.parameters || [],
        };

      default:
        throw new Error("Unsupported message type");
    }
  };

  /* 🚀 Send message to backend */
  const sendMessage = async (payload: any) => {
    if (!conversationId) return;

    setSending(true);

    await fetch(
      `${baseUrl}/api/conversations/${conversationId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }
    );

    setSending(false);
    onSent?.();
  };

  /* 💬 Send text */
  const sendText = async () => {
    if (!text.trim()) return;

    if (!canSend) {
      alert("24-hour window expired. Please use a template.");
      return;
    }

    const payload = buildPayload("text", { text });
    await sendMessage(payload);
    setText("");
  };

  /* 📎 Upload media → send */
  const handleFile = async (file: File) => {
    if (!canSend) {
      alert("24-hour window expired. Media not allowed.");
      return;
    }

    // 1️⃣ Upload file (example endpoint)
    const form = new FormData();
    form.append("file", file);

    const uploadRes = await fetch(
      ` ${baseUrl}/api/media/upload`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      }
    ).then(res => res.json());

    const fileUrl = uploadRes.url;

    // 2️⃣ Build message payload
    const payload = buildPayload(
      file.type.startsWith("image/") ? "image" : "document",
      { url: fileUrl, caption: file.name }
    );

    await sendMessage(payload);
  };

  /* 📩 Example template send (use when canSend=false) */
  const sendTemplate = async () => {
    const payload = buildPayload("template", {
      templateName: "hello_user",
      parameters: [{ type: "text", text: conversation?.name || "User" }],
    });

    await sendMessage(payload);
  };

  return (
    <div style={styles.wrapper}>
      {!canSend && (
        <div style={styles.warning}>
          ⏰ 24-hour window expired — only templates allowed
          <button style={styles.templateBtn} onClick={sendTemplate}>
            Send Template
          </button>
        </div>
      )}

      <div style={styles.row}>
        <button
          disabled={!canSend || sending}
          onClick={() => fileInputRef.current?.click()}
          style={styles.attach}
        >
          📎
        </button>

        <input
          ref={fileInputRef}
          type="file"
          hidden
          accept="image/*,application/pdf"
          onChange={e => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
            e.target.value = "";
          }}
        />

        <input
          disabled={!canSend || sending}
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Type a message"
          style={styles.input}
        />

        <button
          disabled={!canSend || sending}
          onClick={sendText}
          style={styles.send}
        >
          ➤
        </button>
      </div>
    </div>
  );
}

/* 🎨 Styles */
const styles = {
  wrapper: {
    padding: 10,
    background: "#f0f2f5",
    borderTop: "1px solid #ddd",
  },
  warning: {
    fontSize: 12,
    color: "#d93025",
    marginBottom: 6,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  templateBtn: {
    fontSize: 12,
    padding: "4px 8px",
    borderRadius: 6,
    border: "none",
    cursor: "pointer",
    background: "#25d366",
    color: "#fff",
  },
  row: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  attach: {
    fontSize: 18,
    background: "transparent",
    border: "none",
    cursor: "pointer",
  },
  input: {
    flex: 1,
    padding: 10,
    borderRadius: 20,
    border: "1px solid #ccc",
    outline: "none",
  },
  send: {
    padding: "6px 14px",
    borderRadius: 20,
    background: "#25d366",
    color: "#fff",
    border: "none",
    cursor: "pointer",
  },
} as const;
