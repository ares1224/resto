import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { requireApiRole, apiError } from "@/lib/api-auth";
import { issueQrToken, buildQrPayload } from "@/lib/qr-token";

export async function GET() {
  try {
    const session = await requireApiRole(["employe"]);
    if (!session.employeeId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const token = await issueQrToken(session.employeeId);
    const payload = buildQrPayload(token);
    const dataUrl = await QRCode.toDataURL(payload, { width: 280, margin: 2 });

    return NextResponse.json({
      dataUrl,
      expiresAt: token.expiresAt,
      refreshInSeconds: 120,
    });
  } catch (e) {
    return apiError(e);
  }
}
