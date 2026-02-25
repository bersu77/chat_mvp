import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { generateVerificationToken } from "@/lib/tokens";
import { sendVerificationEmail } from "@/lib/mail";

export async function POST(req: NextRequest) {
  try {
    const { name, email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      // If they exist but aren't verified, resend the verification email
      if (!existingUser.emailVerified) {
        const token = await generateVerificationToken(email);
        await sendVerificationEmail(email, token.token);
        return NextResponse.json({
          success: true,
          message: "Verification email resent. Please check your inbox.",
        });
      }

      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await prisma.user.create({
      data: {
        name: name || email,
        email,
        password: hashedPassword,
        emailVerified: false,
      },
    });

    const token = await generateVerificationToken(email);
    await sendVerificationEmail(email, token.token);

    return NextResponse.json({
      success: true,
      message: "Account created. Please check your email to verify.",
    });
  } catch (error) {
    console.error("[POST /api/auth/register]", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
