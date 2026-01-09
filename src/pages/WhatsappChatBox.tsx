import { useEffect, useState } from "react";
import Sidebar from "../components/whatsapp-plugin/Sidebar";
import ChatWindow from "../components/whatsapp-plugin/ChatWindow";
import api from "../services/api";

export default function WhatsappChatBox() {
  const [conversations, setConversations] = useState<any[]>([]);
  const [active, setActive] = useState<any>(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const resize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  useEffect(() => {
    api.getChatingInbox().then((res) => {
      setConversations(res.data);
      if (!isMobile) {
        setActive(res.data[0]);
      }
    });
  }, [isMobile]);

  return (
    <div
      style={{
        ...styles.wrapper,
        height: isMobile ? "94vh" : "100vh",
      }}
    >
      {(!isMobile || !active) && (
        <Sidebar conversations={conversations} onSelect={setActive} />
      )}

      {active && (
        <ChatWindow
          conversation={active}
          onBack={() => isMobile && setActive(null)}
          isMobile={isMobile}
        />
      )}
    </div>
  );
}

const styles = {
  wrapper: {
    display: "flex",
    width: "100%",
    background: "#ece5dd",
  },
} as const;
