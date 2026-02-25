import { randomBytes } from "crypto";
import prisma from "@/lib/prisma";

export async function generateVerificationToken(email: string) {
  // Delete any existing tokens for this email
  await prisma.verificationToken.deleteMany({ where: { email } });

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60); // 1 hour

  const verificationToken = await prisma.verificationToken.create({
    data: { token, email, expiresAt },
  });

  return verificationToken;
}

export async function generatePasswordResetToken(email: string) {
  // Delete any existing tokens for this email
  await prisma.passwordResetToken.deleteMany({ where: { email } });

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60); // 1 hour

  const resetToken = await prisma.passwordResetToken.create({
    data: { token, email, expiresAt },
  });

  return resetToken;
}
