import React from "react";

export default function MessageBubble({ message }: any) {
  const isOutbound = message.direction === "outbound";

  return (
    <div
      style={{
        display: "flex",
        justifyContent: isOutbound ? "flex-end" : "flex-start",
        width: "100%",
        marginBottom: 6,
      }}
    >
      <div
        style={{
          ...styles.bubble,
          background: isOutbound ? "#DCF8C6" : "#FFFFFF",
          borderTopLeftRadius: isOutbound ? 8 : 0,
          borderTopRightRadius: isOutbound ? 0 : 8,
        }}
      >
        {/* TEXT */}
        {message.type === "text" && <div>{message.message}</div>}

        {/* IMAGE */}
        {message.type === "image" && message.media_url && (
          <img src={message.media_url} style={styles.image} />
        )}

        {/* TEMPLATE (DISPLAY ONLY) */}
        {message.type === "template" && message.template && (
          <div>{renderTemplate(message.template)}</div>
        )}

        {/* INTERACTIVE BUTTON REPLY (INBOUND CLICK EVENT MESSAGE) */}
        {message.type === "button" && (
          <div style={styles.replyText}>
            👉 {message.interactive?.data?.button_title}
          </div>
        )}

        {/* FOOTER */}
        <div style={styles.footer}>
          <span>{formatTime(message.created_at)}</span>
          {isOutbound && <MessageStatus status={message.status} />}
        </div>
      </div>
    </div>
  );
}

/* ---------------- STATUS ---------------- */

function MessageStatus({ status }: { status: string }) {
  const base = { fontSize: 11, marginLeft: 4 };

  if (status === "read")
    return <span style={{ ...base, color: "#34B7F1" }}>✓✓</span>;
  if (status === "delivered") return <span style={base}>✓✓</span>;
  if (status === "sent") return <span style={base}>✓</span>;
  if (status === "failed")
    return <span style={{ ...base, color: "red" }}>❌</span>;
  return null;
}

function formatTime(date?: string) {
  if (!date) return "";
  return new Date(date).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/* ---------------- TEMPLATE RENDER ---------------- */

function renderTemplate(template: any) {
  if (!template?.components) return null;

  const body = template.components.find((c: any) => c.type === "BODY");
  const buttons = template.components.find((c: any) => c.type === "BUTTONS");

  if (!body) return null;

  let text = body.text || "";

  // Replace {{1}}, {{2}}
  (template.parameters || []).forEach((p: any, i: number) => {
    text = text.replaceAll(`{{${i + 1}}}`, p.value ?? "");
  });

  return (
    <div style={styles.templateWrapper}>
      <div style={styles.templateText}>{text}</div>

      {/* DISPLAY ONLY BUTTONS */}
      {buttons?.buttons?.map((btn: any, idx: number) => (
        <div key={idx} style={styles.templateButton}>
          {btn.text}
        </div>
      ))}
    </div>
  );
}

/* ---------------- STYLES ---------------- */

const styles: Record<string, React.CSSProperties> = {
  bubble: {
    maxWidth: window.innerWidth < 768 ? "85%" : "70%",
    padding: "8px 10px",
    borderRadius: 8,
    boxShadow: "0 1px 0.5px rgba(0,0,0,0.13)",
    fontSize: 14,
    lineHeight: "18px",
    wordBreak: "break-word" as const, // ✅ FIXED
  },

  footer: {
    display: "flex",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 4,
    fontSize: 11,
    color: "#667781",
    marginTop: 4,
  },

  image: {
    maxWidth: 240,
    borderRadius: 6,
    marginTop: 6,
  },

  replyText: {
    fontSize: 13,
    color: "#3b4a54",
  },

  /* TEMPLATE */
  templateWrapper: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },

  templateText: {
    whiteSpace: "pre-line" as const,
    fontSize: 14,
    lineHeight: "18px",
  },

  templateButton: {
    padding: "8px",
    border: "1px solid #d1d7db",
    borderRadius: 6,
    textAlign: "center" as const,
    fontSize: 13,
    color: "#54656f",
    background: "#f0f2f5",
    userSelect: "none",
    pointerEvents: "none", // 🔒 DISPLAY ONLY
  },
};
