import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": Deno.env.get("APP_ORIGIN") ?? "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed." }, 405);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return json({ error: "Authentication required." }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const geminiKey = Deno.env.get("GEMINI_API_KEY");
  const model = Deno.env.get("GEMINI_MODEL") ?? "gemini-3.8-flash";
  if (!supabaseUrl || !anonKey || !geminiKey) {
    return json({ error: "Tutor service is not configured. Set the required Edge Function secrets." }, 503);
  }

  const token = authHeader.slice("Bearer ".length);
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: userData, error: userError } = await userClient.auth.getUser(token);
  if (userError || !userData.user) return json({ error: "Your session is invalid. Sign in again." }, 401);

  const { error: quotaError } = await userClient.rpc("consume_ai_quota");
  if (quotaError) {
    const message = quotaError.message.includes("Daily study-buddy limit")
      ? quotaError.message
      : "Unable to verify tutor usage limit.";
    return json({ error: message }, 429);
  }

  let body: { messages?: Array<{ role?: string; content?: string }> };
  try { body = await req.json(); } catch { return json({ error: "Invalid request body." }, 400); }
  const messages = Array.isArray(body.messages) ? body.messages.slice(-12) : [];
  const contents = messages
    .filter(m => typeof m.content === "string" && m.content.trim().length > 0)
    .map(m => ({
      role: m.role === "model" ? "model" : "user",
      parts: [{ text: String(m.content).slice(0, 4000) }],
    }));
  // Gemini chat history should begin with a user turn, not the tutor's welcome message.
  while (contents.length && contents[0].role === "model") contents.shift();
  if (!contents.length) return json({ error: "Send a question to begin." }, 400);

  const systemInstruction = `You are Thinkwise Buddy, a careful university study tutor. Your purpose is to strengthen independent thinking, not provide shortcut answers.
Rules:
1. Start by understanding what the learner knows. Prefer one focused hint, a guiding question, or a short conceptual explanation.
2. Do not immediately give complete answers to homework, quizzes, or problem-solving questions. Break a solution into steps and ask the learner to attempt the next step.
3. When a learner has made a genuine attempt, give feedback on the reasoning and then explain the concept clearly.
4. For factual questions, be accurate, state uncertainty when needed, and encourage checking course material for high-stakes or syllabus-specific details.
5. Use concise, friendly language suitable for a university student. Use simple formatting and no excessive motivational filler.
6. Never claim to have accessed a user's course files, grades, or private data unless provided in the current chat.
7. If the request is unrelated to learning, politely steer the conversation back to study support.`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": geminiKey },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemInstruction }] },
          contents,
          generationConfig: { temperature: 0.55, maxOutputTokens: 650 },
        }),
      },
    );
    const result = await response.json();
    if (!response.ok) {
      console.error("Gemini response error", response.status, JSON.stringify(result).slice(0, 1200));
      return json({ error: "The tutor service is temporarily unavailable. Please try again." }, 502);
    }
    const reply = result?.candidates?.[0]?.content?.parts
      ?.map((p: { text?: string }) => p.text ?? "")
      .join("")
      .trim();
    if (!reply) return json({ error: "The tutor couldn't produce a response. Try rephrasing your question." }, 502);
    return json({ reply });
  } catch (error) {
    console.error("Tutor request failed", error);
    return json({ error: "Couldn't reach the tutor service. Please try again." }, 502);
  }
});
