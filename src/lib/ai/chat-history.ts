import type { AiChatMessage, AiChatSession, Database, GerantAiChat } from "@/types";

const MAX_MESSAGES_PER_SESSION = 100;
const MAX_SESSIONS = 30;

function sessionTitle(firstUserMessage: string): string {
  const t = firstUserMessage.trim();
  return t.length > 48 ? `${t.slice(0, 48)}…` : t || "Nouvelle conversation";
}

function migrateChat(raw: GerantAiChat): GerantAiChat {
  if (raw.sessions?.length) return raw;
  const id = crypto.randomUUID();
  const now = raw.updatedAt ?? new Date().toISOString();
  return {
    userId: raw.userId,
    activeSessionId: id,
    sessions: [
      {
        id,
        title: raw.messages?.length ? sessionTitle(raw.messages.find((m) => m.role === "user")?.content ?? "") : "Conversation",
        messages: raw.messages ?? [],
        createdAt: now,
        updatedAt: now,
      },
    ],
  };
}

function ensureChat(db: Database, userId: string): GerantAiChat {
  let chat = db.gerantAiChats.find((c) => c.userId === userId);
  if (!chat) {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    chat = {
      userId,
      activeSessionId: id,
      sessions: [{ id, title: "Nouvelle conversation", messages: [], createdAt: now, updatedAt: now }],
    };
    db.gerantAiChats.push(chat);
    return chat;
  }
  const migrated = migrateChat(chat);
  Object.assign(chat, migrated);
  if (!chat.sessions.find((s) => s.id === chat.activeSessionId)) {
    chat.activeSessionId = chat.sessions[0]?.id ?? crypto.randomUUID();
  }
  return chat;
}

function activeSession(chat: GerantAiChat): AiChatSession {
  return chat.sessions.find((s) => s.id === chat.activeSessionId) ?? chat.sessions[0];
}

export type GerantChatState = {
  sessions: { id: string; title: string; updatedAt: string; messageCount: number }[];
  activeSessionId: string;
  messages: AiChatMessage[];
};

export function getGerantChatState(db: Database, userId: string): GerantChatState {
  const chat = ensureChat(db, userId);
  const session = activeSession(chat);
  return {
    sessions: chat.sessions
      .slice()
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .map((s) => ({
        id: s.id,
        title: s.title,
        updatedAt: s.updatedAt,
        messageCount: s.messages.length,
      })),
    activeSessionId: chat.activeSessionId,
    messages: session.messages,
  };
}

export function appendGerantChat(
  db: Database,
  userId: string,
  userContent: string,
  assistantContent: string
): GerantChatState {
  const chat = ensureChat(db, userId);
  const session = activeSession(chat);
  const now = new Date().toISOString();

  const userMsg: AiChatMessage = {
    id: crypto.randomUUID(),
    role: "user",
    content: userContent,
    createdAt: now,
  };
  const assistantMsg: AiChatMessage = {
    id: crypto.randomUUID(),
    role: "assistant",
    content: assistantContent,
    createdAt: new Date().toISOString(),
  };

  if (session.messages.length === 0) {
    session.title = sessionTitle(userContent);
  }

  session.messages.push(userMsg, assistantMsg);
  if (session.messages.length > MAX_MESSAGES_PER_SESSION) {
    session.messages = session.messages.slice(-MAX_MESSAGES_PER_SESSION);
  }
  session.updatedAt = assistantMsg.createdAt;

  return getGerantChatState(db, userId);
}

export function createGerantChatSession(db: Database, userId: string): GerantChatState {
  const chat = ensureChat(db, userId);
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  chat.sessions.unshift({
    id,
    title: "Nouvelle conversation",
    messages: [],
    createdAt: now,
    updatedAt: now,
  });
  chat.activeSessionId = id;
  if (chat.sessions.length > MAX_SESSIONS) {
    chat.sessions = chat.sessions.slice(0, MAX_SESSIONS);
  }
  return getGerantChatState(db, userId);
}

export function switchGerantChatSession(db: Database, userId: string, sessionId: string): GerantChatState | null {
  const chat = ensureChat(db, userId);
  if (!chat.sessions.some((s) => s.id === sessionId)) return null;
  chat.activeSessionId = sessionId;
  return getGerantChatState(db, userId);
}

export function deleteGerantChatSession(db: Database, userId: string, sessionId: string): GerantChatState {
  const chat = ensureChat(db, userId);
  chat.sessions = chat.sessions.filter((s) => s.id !== sessionId);
  if (chat.sessions.length === 0) {
    return createGerantChatSession(db, userId);
  }
  if (chat.activeSessionId === sessionId) {
    chat.activeSessionId = chat.sessions[0].id;
  }
  return getGerantChatState(db, userId);
}
