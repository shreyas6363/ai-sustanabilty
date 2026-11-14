import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/database/prisma";
import { createSessionToken, setSessionCookie } from "@/lib/auth/session";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      include: { organization: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Invalid credentials. Check email and password." },
        { status: 401 }
      );
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return NextResponse.json(
        { error: "Invalid credentials. Check email and password." },
        { status: 401 }
      );
    }

    const sessionUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role as "ADMIN" | "MANAGER" | "VIEWER",
      organizationId: user.organizationId,
      organizationName: user.organization.name,
    };

    const token = await createSessionToken(sessionUser);
    setSessionCookie(token);

    // Record login audit log
    await prisma.auditLog.create({
      data: {
        organizationId: user.organizationId,
        userId: user.id,
        action: "LOGIN",
        entityType: "USER",
        entityId: user.id,
        details: `User logged in from ${req.headers.get("user-agent") || "Web Browser"}`,
      },
    });

    return NextResponse.json({ success: true, user: sessionUser });
  } catch (error) {
    console.error("Login API error:", error);
    return NextResponse.json(
      { error: "Internal authentication error." },
      { status: 500 }
    );
  }
}
