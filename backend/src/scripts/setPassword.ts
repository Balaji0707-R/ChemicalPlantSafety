
import { stdin as input, stdout as output } from "node:process";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { env } from "../config/env.js";
import User from "../models/user.js";

const readHidden = (): Promise<string> =>
  new Promise((resolve, reject) => {
    let value = "";
    output.write("New password: ");

    if (!input.isTTY || typeof input.setRawMode !== "function") {
      reject(
        new Error(
          "Interactive terminal required. Run this command directly in PowerShell."
        )
      );
      return;
    }

    input.setRawMode(true);
    input.resume();

    const onData = (chunk: Buffer): void => {
      const text = chunk.toString();

      if (text === "\r" || text === "\n") {
        input.setRawMode(false);
        input.pause();
        input.off("data", onData);
        output.write("\n");
        resolve(value);
        return;
      }

      if (text === "\u0003") {
        input.setRawMode(false);
        input.pause();
        input.off("data", onData);
        reject(new Error("Password entry cancelled."));
        return;
      }

      if (text === "\u007f" || text === "\b") {
        value = value.slice(0, -1);
        return;
      }

      if (text >= " " && text !== "\u007f") {
        value += text;
      }
    };

    input.on("data", onData);
  });

const run = async (): Promise<void> => {
  const email = (process.argv[2] || process.env.USER_EMAIL || "").trim();

  if (!email) {
    throw new Error("Pass the existing user email as the first argument.");
  }

  const password = await readHidden();

  if (password.length < 12) {
    throw new Error("Password must be at least 12 characters.");
  }

  const hash = await bcrypt.hash(password, 12);

  await mongoose.connect(env.mongodbUri, {
    serverSelectionTimeoutMS: 5000,
  });

  try {
    const escapedEmail = email.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    const result = await User.updateOne(
      {
        email: {
          $regex: `^${escapedEmail}$`,
          $options: "i",
        },
      },
      {
        $set: {
          password_hash: hash,
        },
      },
      {
        runValidators: true,
      }
    ).exec();

    if (result.matchedCount === 0) {
      throw new Error(`No user found for email: ${email}`);
    }

    console.log("Password updated for the existing user.");
  } finally {
    await mongoose.disconnect();
  }
};

run().catch((error: unknown) => {
  const message =
    error instanceof Error ? error.message : "Unknown error";

  console.error("Password provisioning failed:", message);
  process.exitCode = 1;
});
