import "server-only";
import { GoogleGenAI } from "@google/genai";

// Ключ и модели читаются из .env.local (см. .env.example).
const API_KEY = process.env.GEMINI_API_KEY?.trim();

export const MODEL_EXTRACT = process.env.GEMINI_MODEL_EXTRACT?.trim() || "gemini-3.5-flash";
export const MODEL_CHAT = process.env.GEMINI_MODEL_CHAT?.trim() || "gemini-3.5-flash";

/** Есть ли живой ключ. Если нет — система работает в демо-режиме. */
export function isLiveMode(): boolean {
  return Boolean(API_KEY);
}

let client: GoogleGenAI | null = null;

export function getClient(): GoogleGenAI {
  if (!API_KEY) {
    throw new Error(
      "GEMINI_API_KEY не задан. Добавьте ключ в .env.local или пользуйтесь демо-режимом.",
    );
  }
  if (!client) client = new GoogleGenAI({ apiKey: API_KEY });
  return client;
}
