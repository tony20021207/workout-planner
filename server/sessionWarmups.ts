/**
 * Session warmup engine — generates exactly 3 dynamic warmups for each
 * training day in the user's split, tailored to:
 *   1. The exercises about to be trained that session (joint actions, prime
 *      movers, equipment context).
 *   2. The user's lifestyle profile (desk-job / runner / competitive sports
 *      / bed-rot / standing-physical-labor) — chronic restrictions and
 *      under-active muscle groups specific to that profile drive what gets
 *      mobilized / activated in the warmup.
 *
 * Output: per-day { warmups: [{ name, durationSeconds, instructions[],
 * lifestyleCue }] × 3 } that the SplitBuilder day cards render above the
 * exercise list.
 */
import { z } from "zod";
import { invokeLLM } from "./_core/llm";
import { publicProcedure, router } from "./_core/trpc";

const LIFESTYLE_GUIDANCE = `LIFESTYLE PROFILES — chronic restrictions to counter in the warmup:

DESK JOB (≥6h sitting/day):
  Restrictions: Thoracic spine extension, hip flexors, scapular upward rotators / lower trap, anterior shoulder.
  Warmup bias: Open the thoracic spine (cat-cow, foam-roller T-spine extension), activate lower trap + serratus (wall slides, prone Y/T/W), mobilize hip flexors (couch stretch, kneeling hip flexor stretch with reach), fire glutes (banded glute bridge, monster walks).

RUNNER / ENDURANCE (≥3 runs/wk):
  Restrictions: Ankle dorsiflexion, hip flexor / quad tightness, glute med weakness, hamstring shortening.
  Warmup bias: Ankle mobility (knee-to-wall, calf foam roll), glute med activation (clamshells, banded side-steps), hip flexor mobilization (90/90 stretch, dynamic lunges), single-leg balance prep (single-leg RDL with no weight).

COMPETITIVE SPORTS (basketball / soccer / tennis / volleyball etc.):
  Restrictions: Asymmetric loading from dominant side, rotator cuff fatigue, hip / ankle stability under load, connective tissue from impact.
  Warmup bias: Multi-planar mobility (world's greatest stretch), rotator cuff prep (band external rotations, prone Y/T/W), single-leg dynamic stability (lateral lunges, lateral bound landing), light CNS priming (low-load explosive prep — NEVER high-volume jumps).

BED-ROT / SEDENTARY (mostly horizontal day-to-day):
  Restrictions: Generalized joint stiffness, hip flexors AND extensors both inhibited, spinal mobility loss, low cardiovascular conditioning, low loading history.
  Warmup bias: 5–8 min light cardio FIRST (longer than typical), full-body joint capsule mobilization (CARs — controlled articular rotations), gradual ramp-up emphasis. Be conservative — avoid intense activation drills the user can't yet handle.

STANDING / PHYSICAL LABOR (trades / retail / healthcare / warehouse):
  Restrictions: Lower back fatigue, forearm / grip overuse, calf pump from standing, shoulder asymmetry from lifting / carrying.
  Warmup bias: De-load mobility — open the lower back (cat-cow, child's pose), decompress the spine (dead hang, hip flexor stretch with reach), mobilize ankles AND release calves (foam roll), AVOID adding fatigue with heavy activation work — the user is already accumulating during their workday.`;

const SESSION_WARMUP_PROMPT = `You generate session warmups for a strength-training day. Output exactly 3 warmups per day. Each warmup is short (90–180 seconds), targeted, and tied to BOTH the exercises in that session AND the user's lifestyle profile.

${LIFESTYLE_GUIDANCE}

CONSTRAINTS:
- Exactly 3 warmups per day.
- Each warmup has a NAME (specific movement, not "general activation"), a duration in seconds (60-240), 2-4 INSTRUCTION lines (form / cue / target), and ONE lifestyleCue line that explains WHY this warmup is on the list given the user's profile.
- The 3 warmups together should: (a) prep the major movers about to be trained that session, (b) mobilize the chronic restrictions of the user's lifestyle profile, (c) activate stabilizers under-recruited in that profile.
- Order the 3 warmups: most general / mobility first, most specific / activation last.
- Avoid generic prescriptions ("5 min cardio"). Each warmup names a specific movement.
- Use exercise names the user can recognize and execute without equipment beyond bands, foam roller, and the gym they're already in.
- If the day has only 1-2 exercises, still provide 3 warmups (the remaining slot becomes a lifestyle-mobility piece).

YOU MUST RESPOND WITH STRICT JSON matching the provided schema.`;

const sessionWarmupInputSchema = z.object({
  lifestyle: z.enum([
    "desk-job",
    "runner",
    "competitive-sports",
    "bed-rot",
    "physical-labor",
  ]),
  days: z.array(
    z.object({
      dayName: z.string(),
      scheduleHint: z.string().optional(),
      exercises: z.array(
        z.object({
          exercise: z.string(),
          equipment: z.string().optional(),
          angle: z.string().optional(),
          jointActions: z.array(z.string()).optional(),
          targetedMuscles: z.array(z.string()).optional(),
          category: z.enum(["systemic", "regional"]).optional(),
        }),
      ),
    }),
  ),
});

const warmupSchema = {
  type: "object",
  additionalProperties: false,
  required: ["name", "durationSeconds", "instructions", "lifestyleCue"],
  properties: {
    name: { type: "string", description: "Specific movement name." },
    durationSeconds: { type: "number", description: "60-240 seconds." },
    instructions: {
      type: "array",
      items: { type: "string" },
      description: "2-4 short form / cue / target lines.",
    },
    lifestyleCue: {
      type: "string",
      description:
        "1 sentence explaining why this warmup is on the list given the user's lifestyle profile.",
    },
  },
} as const;

const sessionWarmupOutputSchema = {
  type: "object",
  additionalProperties: false,
  required: ["days"],
  properties: {
    days: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["dayName", "warmups"],
        properties: {
          dayName: { type: "string" },
          warmups: {
            type: "array",
            description: "Exactly 3 warmups, ordered general → specific.",
            items: warmupSchema,
          },
        },
      },
    },
  },
};

function serializeDaysToText(days: z.infer<typeof sessionWarmupInputSchema>["days"]): string {
  const lines: string[] = [];
  days.forEach((day, idx) => {
    lines.push(
      `=== Day ${idx + 1}: ${day.dayName}${day.scheduleHint ? ` (${day.scheduleHint})` : ""} ===`,
    );
    if (day.exercises.length === 0) {
      lines.push("  (no exercises assigned)");
    } else {
      day.exercises.forEach((ex, i) => {
        const tag = [ex.exercise, ex.equipment ? `(${ex.equipment})` : "", ex.angle ? `[${ex.angle}]` : ""]
          .filter(Boolean)
          .join(" ");
        lines.push(`  ${i + 1}. ${tag}`);
        if (ex.jointActions && ex.jointActions.length > 0) {
          lines.push(`     Joint actions: ${ex.jointActions.join(", ")}`);
        }
        if (ex.targetedMuscles && ex.targetedMuscles.length > 0) {
          lines.push(`     Targets: ${ex.targetedMuscles.join(", ")}`);
        }
      });
    }
    lines.push("");
  });
  return lines.join("\n");
}

export const sessionWarmupRouter = router({
  generate: publicProcedure
    .input(sessionWarmupInputSchema)
    .mutation(async ({ input }) => {
      const text = serializeDaysToText(input.days);
      const intro = `Generate session warmups for this user.\n\nLifestyle profile: ${input.lifestyle}\n\nWeekly split (${input.days.length} training day${input.days.length === 1 ? "" : "s"}):\n\n${text}`;

      const result = await invokeLLM({
        messages: [
          { role: "system", content: SESSION_WARMUP_PROMPT },
          {
            role: "user",
            content: [{ type: "text", text: intro }],
          },
        ],
        outputSchema: {
          name: "session_warmups",
          schema: sessionWarmupOutputSchema,
          strict: true,
        },
      });

      const raw = result.choices[0]?.message?.content;
      const out = typeof raw === "string"
        ? raw
        : Array.isArray(raw)
          ? raw.map((p) => (p.type === "text" ? p.text : "")).join("")
          : "";

      try {
        return JSON.parse(out);
      } catch {
        throw new Error("Failed to parse session warmup response: " + out.slice(0, 200));
      }
    }),
});
