import { useEffect, useState } from "react";
import ChatHeader from "./ChatHeader";
import MessageBubble from "./MessageBubble";
import MessageComposer from "./MessageComposer";

export default function ChatWindow({ conversation }: any) {
  const [messages, setMessages] = useState<any[]>([]);
  const params = new URLSearchParams(window.location.search);
  const token = params.get("token");

  useEffect(() => {
    if (!conversation?.conversationId) return;

    fetch(
      `http://localhost:3000/api/messages/${conversation.conversationId}/messages`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    )
      .then(res => res.json())
      .then(res => setMessages(res.data.messages));
  }, [conversation.conversationId]);

  return (
    <div style={styles.chatWindow}>
      <ChatHeader conversation={conversation} />

      <div style={styles.messages}>
        {messages.map(m => (
          <MessageBubble key={m.id} message={m} />
        ))}
      </div>

      <MessageComposer
        conversation={conversation}
        onSent={() => {
          // reload messages
          fetch(
            `http://localhost:3000/api/messages/${conversation.conversationId}/messages`,
            { headers: { Authorization: `Bearer ${token}` } }
          )
            .then(res => res.json())
            .then(res => setMessages(res.data.messages));
        }}
      />
    </div>
  );
}

const styles = {
  chatWindow: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    background: "#efeae2",
  },
  messages: {
    flex: 1,
    padding: 16,
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
} as const;
