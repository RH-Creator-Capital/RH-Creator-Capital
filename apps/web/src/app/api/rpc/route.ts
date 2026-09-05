import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.text();
    
    const rpcUrl = process.env.HELIUS_RPC_URL;
    if (!rpcUrl) {
      throw new Error("HELIUS_RPC_URL environment variable is missing");
    }
    const response = await fetch(rpcUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body,
    });

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("RPC proxy error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
