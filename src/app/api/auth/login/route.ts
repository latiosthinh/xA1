import { NextResponse } from "next/server";
import { signAdminToken, COOKIE_NAME } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();

    const expectedUser = process.env.ADMIN_USERNAME || "admin";
    const expectedPass = process.env.ADMIN_PASSWORD || "admin";

    if (!username || !password || username !== expectedUser || password !== expectedPass) {
      return NextResponse.json({ error: "Invalid username or password" }, { status: 401 });
    }

    const token = await signAdminToken(username);

    const response = NextResponse.json({ success: true, message: "Logged in successfully" });
    response.cookies.set({
      name: COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    });

    return response;
  } catch (error) {
    return NextResponse.json({ error: "Authentication failed" }, { status: 500 });
  }
}
