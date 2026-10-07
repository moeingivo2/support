import { lazy } from "react";

const ChatPage = lazy(() => import("./pages/ChatPage"));

export function ChatRoute() {
    return <ChatPage />;
}
