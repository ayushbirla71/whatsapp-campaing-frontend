import { useEffect, useState, useCallback, useRef } from "react";
import ChatHeader from "./ChatHeader";
import MessageBubble from "./MessageBubble";
import MessageComposer from "./MessageComposer";
import api from "../../services/api";

export default function ChatWindow({
  conversation,
  isMobile,
  onBack,
}: any) {
  const [messages, setMessages] = useState<any[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  const fetchMessages = useCallback(async () => {
    if (!conversation?.conversationId) return;

    try {
      const res = await api.getConversationMessages(
        conversation.conversationId
      );
      setMessages(res?.data?.messages || []);
    } catch (err) {
      console.error(err);
    }
  }, [conversation?.conversationId]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div style={styles.chatWindow}>
     <ChatHeader
  conversation={conversation}
  isMobile={isMobile}
  onBack={onBack}
/>


      <div style={styles.messages}>
        {messages.map((m) => (
          <MessageBubble key={m.id || m._id} message={m} />
        ))}
        <div ref={bottomRef} />
      </div>

      <MessageComposer conversation={conversation} onSent={fetchMessages} />
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
    padding: "12px 16px",
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
  },
} as const;
