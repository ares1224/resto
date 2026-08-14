"use client";

import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { PUNCTUALITY_LABELS } from "@/lib/timeclock";

export function QrScanner() {
  const [scanning, setScanning] = useState(false);
  const [lastResult, setLastResult] = useState<{
    employeeName: string;
    action: string;
    time: string;
    punctuality?: string;
  } | null>(null);
  const [error, setError] = useState("");
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const processingRef = useRef(false);

  useEffect(() => {
    return () => {
      scannerRef.current?.stop().catch(() => {});
    };
  }, []);

  async function startScan() {
    setError("");
    setScanning(true);
    const scanner = new Html5Qrcode("qr-reader");
    scannerRef.current = scanner;
    try {
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        async (decoded) => {
          if (processingRef.current) return;
          processingRef.current = true;
          try {
            const parsed = JSON.parse(decoded) as { token?: string };
            if (!parsed.token) throw new Error("QR invalide");
            const res = await fetch("/api/timeclock/scan", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ token: parsed.token }),
            });
            const data = await res.json();
            if (!res.ok) {
              setError(data.error ?? "Scan échoué");
            } else {
              setLastResult(data.result);
              setError("");
            }
          } catch {
            setError("QR code non reconnu");
          } finally {
            setTimeout(() => { processingRef.current = false; }, 2000);
          }
        },
        () => {}
      );
    } catch {
      setError("Impossible d'accéder à la caméra. Vérifiez les permissions du navigateur.");
      setScanning(false);
    }
  }

  async function stopScan() {
    await scannerRef.current?.stop().catch(() => {});
    scannerRef.current = null;
    setScanning(false);
  }

  return (
    <Card title="Scanner QR — pointage">
      <p className="mb-3 text-sm text-amber-900">Scannez le QR code personnel de l&apos;employé (entrée puis sortie automatiques).</p>
      <div id="qr-reader" className="mx-auto max-w-sm overflow-hidden rounded-xl" />
      <div className="mt-4 flex flex-wrap gap-2">
        {!scanning ? (
          <Button size="lg" onClick={startScan}>Démarrer la caméra</Button>
        ) : (
          <Button size="lg" variant="secondary" onClick={stopScan}>Arrêter</Button>
        )}
      </div>
      {error && <p className="mt-3 text-sm font-semibold text-red-700">{error}</p>}
      {lastResult && (
        <div className="mt-4 rounded-xl border-2 border-green-300 bg-green-50 p-4">
          <p className="font-bold text-green-900">{lastResult.employeeName}</p>
          <p className="text-sm">{lastResult.action} enregistrée à {lastResult.time}</p>
          {lastResult.punctuality && (
            <Badge variant={lastResult.punctuality === "late" ? "danger" : lastResult.punctuality === "early" ? "info" : "success"}>
              {PUNCTUALITY_LABELS[lastResult.punctuality as keyof typeof PUNCTUALITY_LABELS] ?? lastResult.punctuality}
            </Badge>
          )}
        </div>
      )}
    </Card>
  );
}
