import { NextResponse } from "next/server";
import { requireApiRole, apiError } from "@/lib/api-auth";
import { getDb, updateDb } from "@/lib/db/store";
import { answerGerantQuestion } from "@/lib/ai/gerant-agent";
import {
  appendGerantChat,
  createGerantChatSession,
  deleteGerantChatSession,
  getGerantChatState,
  switchGerantChatSession,
} from "@/lib/ai/chat-history";

export async function GET() {
  try {
    const session = await requireApiRole(["gerant"]);
    const db = await getDb();
    return NextResponse.json(getGerantChatState(db, session.userId));
  } catch (e) {
    return apiError(e);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireApiRole(["gerant"]);
    const body = await request.json();

    if (body.action === "new_session") {
      let state = getGerantChatState(await getDb(), session.userId);
      await updateDb((db) => {
        state = createGerantChatSession(db, session.userId);
      });
      return NextResponse.json(state);
    }

    if (body.action === "switch_session") {
      const sessionId = String(body.sessionId ?? "");
      let state = getGerantChatState(await getDb(), session.userId);
      await updateDb((db) => {
        state = switchGerantChatSession(db, session.userId, sessionId) ?? state;
      });
      return NextResponse.json(state);
    }

    if (body.action === "delete_session") {
      const sessionId = String(body.sessionId ?? "");
      let state = getGerantChatState(await getDb(), session.userId);
      await updateDb((db) => {
        state = deleteGerantChatSession(db, session.userId, sessionId);
      });
      return NextResponse.json(state);
    }

    const message = String(body.message ?? "").trim();
    if (!message) {
      return NextResponse.json({ error: "Message requis" }, { status: 400 });
    }
    if (message.length > 2000) {
      return NextResponse.json({ error: "Message trop long (2000 car. max)" }, { status: 400 });
    }

    const db = await getDb();
    const reply = answerGerantQuestion(db, message);

    let state = getGerantChatState(db, session.userId);
    await updateDb((dbInner) => {
      state = appendGerantChat(dbInner, session.userId, message, reply);
    });

    return NextResponse.json({ reply, ...state });
  } catch (e) {
    return apiError(e);
  }
}
