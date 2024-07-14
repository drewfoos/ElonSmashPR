// File: app/api/sse/route.ts
import { NextResponse } from "next/server";

const clients = new Set<ReadableStreamDefaultController>();

export async function GET() {
  const stream = new ReadableStream({
    start(controller) {
      clients.add(controller);

      return () => {
        clients.delete(controller);
      };
    },
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

export function sendSSEUpdate(data: any) {
  const message = `data: ${JSON.stringify(data)}\n\n`;
  clients.forEach((client) => {
    client.enqueue(new TextEncoder().encode(message));
  });
}

// Make sendSSEUpdate accessible globally
(global as any).sendSSEUpdate = sendSSEUpdate;
