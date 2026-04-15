import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const tools = [
  {
    type: "function",
    function: {
      name: "list_workouts",
      description: "Lista todos os treinos do usuário com exercícios e séries",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "create_workout",
      description: "Cria um novo treino",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Nome do treino" },
          day_of_week: { type: "string", description: "Dia da semana (segunda, terca, quarta, quinta, sexta, sabado, domingo)", enum: ["segunda", "terca", "quarta", "quinta", "sexta", "sabado", "domingo"] },
        },
        required: ["name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "delete_workout",
      description: "Deleta um treino pelo nome ou ID",
      parameters: {
        type: "object",
        properties: {
          workout_name: { type: "string", description: "Nome do treino a deletar" },
        },
        required: ["workout_name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "add_exercise",
      description: "Adiciona um exercício a um treino existente",
      parameters: {
        type: "object",
        properties: {
          workout_name: { type: "string", description: "Nome do treino" },
          exercise_name: { type: "string", description: "Nome do exercício" },
          sets_count: { type: "number", description: "Quantidade de séries" },
          reps: { type: "number", description: "Repetições por série" },
          weight: { type: "number", description: "Peso em kg" },
          rest_seconds: { type: "number", description: "Tempo de descanso em segundos" },
        },
        required: ["workout_name", "exercise_name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "delete_exercise",
      description: "Remove um exercício de um treino",
      parameters: {
        type: "object",
        properties: {
          workout_name: { type: "string", description: "Nome do treino" },
          exercise_name: { type: "string", description: "Nome do exercício" },
        },
        required: ["workout_name", "exercise_name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_exercise",
      description: "Atualiza séries, reps, peso ou descanso de um exercício",
      parameters: {
        type: "object",
        properties: {
          workout_name: { type: "string", description: "Nome do treino" },
          exercise_name: { type: "string", description: "Nome do exercício" },
          sets_count: { type: "number", description: "Nova quantidade de séries" },
          reps: { type: "number", description: "Novas repetições" },
          weight: { type: "number", description: "Novo peso em kg" },
          rest_seconds: { type: "number", description: "Novo tempo de descanso em segundos" },
        },
        required: ["workout_name", "exercise_name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "rename_workout",
      description: "Renomeia um treino",
      parameters: {
        type: "object",
        properties: {
          old_name: { type: "string" },
          new_name: { type: "string" },
        },
        required: ["old_name", "new_name"],
      },
    },
  },
];

async function executeToolCall(
  fnName: string,
  args: any,
  supabase: any,
  userId: string
): Promise<string> {
  try {
    switch (fnName) {
      case "list_workouts": {
        const { data: workouts } = await supabase
          .from("workouts")
          .select("*")
          .eq("user_id", userId)
          .order("sort_order");
        if (!workouts?.length) return JSON.stringify({ message: "Nenhum treino encontrado." });

        const { data: exercises } = await supabase
          .from("exercises")
          .select("*")
          .eq("user_id", userId)
          .order("sort_order");
        const { data: sets } = await supabase
          .from("sets")
          .select("*")
          .eq("user_id", userId)
          .order("sort_order");

        const result = workouts.map((w: any) => {
          const wExercises = (exercises || []).filter((e: any) => e.workout_id === w.id);
          return {
            name: w.name,
            day_of_week: w.day_of_week,
            exercises: wExercises.map((e: any) => {
              const eSets = (sets || []).filter((s: any) => s.exercise_id === e.id);
              return {
                name: e.name,
                rest_seconds: e.rest_seconds,
                sets: eSets.map((s: any) => ({ weight: s.weight, reps: s.reps, completed: s.completed })),
              };
            }),
          };
        });
        return JSON.stringify(result);
      }

      case "create_workout": {
        const { data: existing } = await supabase
          .from("workouts")
          .select("id")
          .eq("user_id", userId);
        const sortOrder = existing?.length || 0;

        const { data, error } = await supabase
          .from("workouts")
          .insert({ user_id: userId, name: args.name, sort_order: sortOrder, day_of_week: args.day_of_week || null })
          .select()
          .single();
        if (error) return JSON.stringify({ error: error.message });
        return JSON.stringify({ success: true, workout: { id: data.id, name: data.name } });
      }

      case "delete_workout": {
        const { data: workouts } = await supabase
          .from("workouts")
          .select("id, name")
          .eq("user_id", userId)
          .ilike("name", `%${args.workout_name}%`);
        if (!workouts?.length) return JSON.stringify({ error: "Treino não encontrado" });
        const w = workouts[0];
        await supabase.from("workouts").delete().eq("id", w.id);
        return JSON.stringify({ success: true, deleted: w.name });
      }

      case "add_exercise": {
        const { data: workouts } = await supabase
          .from("workouts")
          .select("id, name")
          .eq("user_id", userId)
          .ilike("name", `%${args.workout_name}%`);
        if (!workouts?.length) return JSON.stringify({ error: "Treino não encontrado" });
        const w = workouts[0];

        const { data: existingEx } = await supabase
          .from("exercises")
          .select("id")
          .eq("workout_id", w.id);
        const sortOrder = existingEx?.length || 0;

        const { data: ex, error } = await supabase
          .from("exercises")
          .insert({
            workout_id: w.id,
            user_id: userId,
            name: args.exercise_name,
            sort_order: sortOrder,
            rest_seconds: args.rest_seconds || 60,
          })
          .select()
          .single();
        if (error) return JSON.stringify({ error: error.message });

        // Create sets if specified
        const setsCount = args.sets_count || 3;
        const reps = args.reps || 12;
        const weight = args.weight || 0;
        const setsToInsert = Array.from({ length: setsCount }, (_, i) => ({
          exercise_id: ex.id,
          user_id: userId,
          weight,
          reps,
          sort_order: i,
        }));
        await supabase.from("sets").insert(setsToInsert);

        return JSON.stringify({
          success: true,
          exercise: args.exercise_name,
          workout: w.name,
          sets: setsCount,
          reps,
          weight,
          rest_seconds: args.rest_seconds || 60,
        });
      }

      case "delete_exercise": {
        const { data: workouts } = await supabase
          .from("workouts")
          .select("id")
          .eq("user_id", userId)
          .ilike("name", `%${args.workout_name}%`);
        if (!workouts?.length) return JSON.stringify({ error: "Treino não encontrado" });

        const { data: exercises } = await supabase
          .from("exercises")
          .select("id, name")
          .eq("workout_id", workouts[0].id)
          .ilike("name", `%${args.exercise_name}%`);
        if (!exercises?.length) return JSON.stringify({ error: "Exercício não encontrado" });

        await supabase.from("exercises").delete().eq("id", exercises[0].id);
        return JSON.stringify({ success: true, deleted: exercises[0].name });
      }

      case "update_exercise": {
        const { data: workouts } = await supabase
          .from("workouts")
          .select("id")
          .eq("user_id", userId)
          .ilike("name", `%${args.workout_name}%`);
        if (!workouts?.length) return JSON.stringify({ error: "Treino não encontrado" });

        const { data: exercises } = await supabase
          .from("exercises")
          .select("id, name")
          .eq("workout_id", workouts[0].id)
          .ilike("name", `%${args.exercise_name}%`);
        if (!exercises?.length) return JSON.stringify({ error: "Exercício não encontrado" });

        const exId = exercises[0].id;

        if (args.rest_seconds !== undefined) {
          await supabase.from("exercises").update({ rest_seconds: args.rest_seconds }).eq("id", exId);
        }

        if (args.sets_count !== undefined || args.reps !== undefined || args.weight !== undefined) {
          const { data: currentSets } = await supabase
            .from("sets")
            .select("*")
            .eq("exercise_id", exId)
            .order("sort_order");

          if (args.sets_count !== undefined) {
            const diff = args.sets_count - (currentSets?.length || 0);
            if (diff > 0) {
              const newSets = Array.from({ length: diff }, (_, i) => ({
                exercise_id: exId,
                user_id: userId,
                weight: args.weight ?? (currentSets?.[0]?.weight || 0),
                reps: args.reps ?? (currentSets?.[0]?.reps || 12),
                sort_order: (currentSets?.length || 0) + i,
              }));
              await supabase.from("sets").insert(newSets);
            } else if (diff < 0) {
              const toDelete = (currentSets || []).slice(diff).map((s: any) => s.id);
              if (toDelete.length) await supabase.from("sets").delete().in("id", toDelete);
            }
          }

          // Update existing sets with new reps/weight
          if (args.reps !== undefined || args.weight !== undefined) {
            const updateData: any = {};
            if (args.reps !== undefined) updateData.reps = args.reps;
            if (args.weight !== undefined) updateData.weight = args.weight;
            await supabase.from("sets").update(updateData).eq("exercise_id", exId);
          }
        }

        return JSON.stringify({ success: true, updated: exercises[0].name });
      }

      case "rename_workout": {
        const { data: workouts } = await supabase
          .from("workouts")
          .select("id, name")
          .eq("user_id", userId)
          .ilike("name", `%${args.old_name}%`);
        if (!workouts?.length) return JSON.stringify({ error: "Treino não encontrado" });
        await supabase.from("workouts").update({ name: args.new_name }).eq("id", workouts[0].id);
        return JSON.stringify({ success: true, old_name: workouts[0].name, new_name: args.new_name });
      }

      default:
        return JSON.stringify({ error: "Função desconhecida" });
    }
  } catch (e) {
    return JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" });
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { messages } = await req.json();
    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "Messages array required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const systemPrompt = `Você é o assistente de treinos do SquadLift. Você tem acesso total aos treinos do usuário e pode:
- Listar treinos
- Criar novos treinos
- Deletar treinos
- Adicionar exercícios com séries, repetições, peso e tempo de descanso
- Remover exercícios
- Atualizar exercícios (séries, reps, peso, descanso)
- Renomear treinos

Sempre responda em português brasileiro de forma breve e amigável. Use emojis moderadamente.
Quando o usuário pedir pra fazer algo, use as ferramentas disponíveis. Sempre confirme o que fez.
Se o usuário pedir algo vago, pergunte antes de agir.
Peso é sempre em kg. Tempo de descanso em segundos.`;

    let aiMessages = [{ role: "system", content: systemPrompt }, ...messages];

    // Loop for tool calls
    for (let i = 0; i < 5; i++) {
      const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: aiMessages,
          tools,
        }),
      });

      if (!aiResponse.ok) {
        const status = aiResponse.status;
        if (status === 429) {
          return new Response(JSON.stringify({ error: "Limite de requisições atingido. Tente novamente em alguns segundos." }), {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (status === 402) {
          return new Response(JSON.stringify({ error: "Créditos de IA esgotados." }), {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const text = await aiResponse.text();
        console.error("AI error:", status, text);
        throw new Error("AI gateway error");
      }

      const data = await aiResponse.json();
      const choice = data.choices[0];

      if (choice.finish_reason === "tool_calls" || choice.message?.tool_calls?.length) {
        aiMessages.push(choice.message);

        for (const tc of choice.message.tool_calls) {
          const args = typeof tc.function.arguments === "string"
            ? JSON.parse(tc.function.arguments)
            : tc.function.arguments;
          const result = await executeToolCall(tc.function.name, args, supabase, user.id);
          aiMessages.push({
            role: "tool",
            tool_call_id: tc.id,
            content: result,
          });
        }
        continue;
      }

      // Final response
      return new Response(
        JSON.stringify({ reply: choice.message.content }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ reply: "Desculpe, não consegui completar a operação. Tente novamente." }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("Error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
