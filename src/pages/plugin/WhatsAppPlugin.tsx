import { useEffect, useState } from "react";
import Sidebar from "../../components/whatsapp-plugin/Sidebar";
import ChatWindow from "../../components/whatsapp-plugin/ChatWindow";

export default function WhatsAppPlugin() {
  const [conversations, setConversations] = useState<any[]>([]);
  const [activeConversation, setActiveConversation] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const baseUrl = process.env.REACT_APP_API_URL;



  const params = new URLSearchParams(window.location.search);
  const token = params.get("token");
  const organizationId = params.get("orgId"); // 🔑 plugin-safe

  useEffect(() => {
    if (!token || !organizationId) {
      setError("Missing token or organizationId");
      return;
    }

    localStorage.setItem("whatsapp_token", token);

    fetch(
      `${baseUrl}/api/messages/inbox?organizationId=${organizationId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    )
      .then(async (res) => {
        if (!res.ok) {
          throw new Error("Unauthorized or API error");
        }
        return res.json();
      })
      .then((res) => setConversations(res.data))
      .catch((err) => setError(err.message));
  }, [token, organizationId]); // ✅ FIXED


  return (
    <div style={styles.wrapper}>
      <Sidebar
        conversations={conversations}
        onSelect={setActiveConversation}
      />
      {activeConversation ? (
        <ChatWindow conversation={activeConversation} />
      ) : (
        <div style={styles.empty}>Select a chat</div>
      )}
    </div>
  );
}

const styles = {
  wrapper: {
    display: "flex",
    height: "100vh",
    width: "100vw",
    backgroundColor: "#ece5dd",
  },
  empty: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#666",
  },
} as const;
