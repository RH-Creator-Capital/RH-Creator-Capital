import { NextResponse } from "next/server";

// RPC Proxy: The NEXT_PUBLIC_RPC_URL is set to /api/rpc, so wagmi
// routes all RPC calls here. We forward them to the actual RH Chain RPC.
export async function POST(request: Request) {
  try {
    const body = await request.text();
    
    const rpcUrl = process.env.RH_CHAIN_RPC_URL;
    if (!rpcUrl) {
      throw new Error("RH_CHAIN_RPC_URL environment variable is missing");
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
