import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Generate workout plan using Lovable AI (tool calling for structured output)
export const generateAIPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { goal: string; level: string; daysPerWeek: number; equipment: string[]; focus?: string }) =>
    z.object({
      goal: z.string().min(1).max(50),
      level: z.string().min(1).max(50),
      daysPerWeek: z.number().min(1).max(7),
      equipment: z.array(z.string()).min(1).max(20),
      focus: z.string().max(200).optional(),
    }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("AI nicht konfiguriert");

    const { data: exercises } = await supabase.from("exercises").select("id,name,primary_muscle,equipment,is_compound").eq("is_public", true).limit(200);
    const exerciseList = (exercises ?? []).map((e: any) => `${e.id}|${e.name}|${e.primary_muscle}|${e.equipment}`).join("\n");

    const systemPrompt = `Du bist ein erfahrener Strength-Coach. Erstelle einen Trainingsplan auf Basis der bereitgestellten Übungs-Bibliothek.
Wähle ausschließlich exercise_id-Werte aus der Liste. Halte dich strikt an verfügbares Equipment.`;
    const userPrompt = `Ziel: ${data.goal}
Level: ${data.level}
Tage pro Woche: ${data.daysPerWeek}
Verfügbares Equipment: ${data.equipment.join(", ")}
${data.focus ? `Fokus: ${data.focus}` : ""}

Übungs-Bibliothek (id|name|muskel|equipment):
${exerciseList}

Erstelle ${data.daysPerWeek} Trainings-Tage mit jeweils 5-7 Übungen.`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
        tools: [{
          type: "function",
          function: {
            name: "create_plan",
            description: "Returns workout days for the plan.",
            parameters: {
              type: "object",
              properties: {
                plan_name: { type: "string" },
                days: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      name: { type: "string" },
                      description: { type: "string" },
                      exercises: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            exercise_id: { type: "string" },
                            sets: { type: "number" },
                            reps: { type: "number" },
                            rest_seconds: { type: "number" },
                          },
                          required: ["exercise_id", "sets", "reps", "rest_seconds"],
                          additionalProperties: false,
                        },
                      },
                    },
                    required: ["name", "description", "exercises"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["plan_name", "days"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "create_plan" } },
      }),
    });

    if (res.status === 429) throw new Error("AI Rate-Limit erreicht. Bitte später nochmal versuchen.");
    if (res.status === 402) throw new Error("AI-Credits aufgebraucht. Bitte im Workspace aufladen.");
    if (!res.ok) throw new Error(`AI-Fehler: ${res.status}`);

    const json = await res.json();
    const toolCall = json.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("AI lieferte keinen strukturierten Plan");
    const plan = JSON.parse(toolCall.function.arguments);

    // Create templates in DB
    const validIds = new Set((exercises ?? []).map((e: any) => e.id));
    const created: string[] = [];
    for (const day of plan.days) {
      const { data: t, error: tErr } = await supabase.from("workout_templates").insert({
        name: `${plan.plan_name} — ${day.name}`,
        description: day.description,
        created_by: userId,
        is_public: false,
        difficulty: data.level,
        category: "KI-Plan",
      }).select("id").single();
      if (tErr || !t) continue;
      created.push(t.id);
      const teRows = day.exercises
        .filter((e: any) => validIds.has(e.exercise_id))
        .map((e: any, i: number) => ({
          template_id: t.id, exercise_id: e.exercise_id, position: i,
          target_sets: e.sets, target_reps: e.reps, rest_seconds: e.rest_seconds,
        }));
      if (teRows.length > 0) await supabase.from("template_exercises").insert(teRows);
    }
    return { planName: plan.plan_name, templateIds: created };
  });
