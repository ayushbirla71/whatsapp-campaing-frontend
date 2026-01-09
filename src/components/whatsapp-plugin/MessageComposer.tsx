import { useEffect, useRef, useState } from "react";
import api from "../../services/api";
import { buildMessagePayload } from "./utils";

export default function MessageComposer({ conversation, onSent }: any) {
  const [text, setText] = useState("");
  const [canSend, setCanSend] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!conversation?.conversationId) return;

    api.getIsActiveConversation(conversation.conversationId).then((res) => {
      setCanSend(Boolean(res?.canSend));
    });
  }, [conversation?.conversationId]);

  const sendText = async () => {
    if (!text.trim()) return;

    await api.sendMessage(
      conversation.conversationId,
      buildMessagePayload("text", { text })
    );

    setText("");
    onSent();
  };

  /**
   * 📎 MEDIA UPLOAD FLOW
   */
  const sendFile = async (file: File) => {
    try {
      setUploading(true);

      // 1️⃣ Upload to backend (S3)
      const uploadRes = await api.uploadMedia(file);
      const url = uploadRes.data.url;

      // 2️⃣ Detect type
      let type: "image" | "video" | "audio" | "document" = "document";

      if (file.type.startsWith("image")) type = "image";
      else if (file.type.startsWith("video")) type = "video";
      else if (file.type.startsWith("audio")) type = "audio";

      // 3️⃣ Send WhatsApp message
      await api.sendMessage(
        conversation.conversationId,
        buildMessagePayload(type, {
          url,
          caption: file.name,
        })
      );

      onSent();
    } catch (err) {
      console.error("Media upload failed", err);
      alert("Failed to upload file");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  /**
   * ⛔ WINDOW EXPIRED
   */
  if (!canSend) {
    return (
      <div style={styles.expiredWrapper}>
        ⏰ 24-hour messaging window expired.
        <br />
        You can only send WhatsApp template messages.
      </div>
    );
  }

  /**
   * ✅ NORMAL COMPOSER
   */
  return (
    <div style={styles.wrapper}>
      <button
        style={styles.attachBtn}
        onClick={() => fileRef.current?.click()}
        title="Attach"
        disabled={uploading}
      >
        📎
      </button>

      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Type a message"
        style={styles.input}
        disabled={uploading}
      />

      <button
        onClick={sendText}
        style={styles.sendBtn}
        disabled={uploading}
      >
        ➤
      </button>

      <input
        ref={fileRef}
        type="file"
        hidden
        accept="image/*,video/*,audio/*,.pdf,.doc,.docx"
        onChange={(e) =>
          e.target.files && sendFile(e.target.files[0])
        }
      />
    </div>
  );
}

const styles = {
  wrapper: {
    display: "flex",
    gap: 8,
    padding: "8px 10px",
    background: "#f0f2f5",
    borderTop: "1px solid #ddd",
    alignItems: "center",
  },
  expiredWrapper: {
    padding: "10px",
    textAlign: "center" as const,
    background: "#f0f2f5",
    borderTop: "1px solid #ddd",
    fontSize: 13,
    color: "#667781",
  },
  attachBtn: {
    border: "none",
    background: "transparent",
    fontSize: 20,
    cursor: "pointer",
  },
  input: {
    flex: 1,
    padding: "8px 12px",
    borderRadius: 20,
    border: "1px solid #ccc",
    outline: "none",
  },
  sendBtn: {
    border: "none",
    background: "#00a884",
    color: "#fff",
    borderRadius: "50%",
    width: 36,
    height: 36,
    cursor: "pointer",
  },
} as const;
