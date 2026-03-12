import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TrendingUp } from "lucide-react";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";

interface PRHistoryChartProps {
  userId: string;
  exerciseId: string;
  exerciseName: string;
}

interface PRPoint {
  date: string;
  weight: number;
}

const chartConfig: ChartConfig = {
  weight: {
    label: "PR (kg)",
    color: "hsl(var(--secondary))",
  },
};

export default function PRHistoryChart({ userId, exerciseId, exerciseName }: PRHistoryChartProps) {
  const [data, setData] = useState<PRPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data: sets } = await supabase
        .from("sets")
        .select("weight, completed_at")
        .eq("user_id", userId)
        .eq("exercise_id", exerciseId)
        .not("completed_at", "is", null)
        .order("completed_at", { ascending: true });

      if (!sets || sets.length === 0) {
        setLoading(false);
        return;
      }

      // Build PR evolution: track running max over time
      let maxWeight = 0;
      const prPoints: PRPoint[] = [];
      const seenDates = new Set<string>();

      for (const s of sets) {
        const w = Number(s.weight);
        const dateStr = new Date(s.completed_at!).toLocaleDateString("pt-BR", {
          day: "2-digit",
          month: "2-digit",
        });

        if (w > maxWeight) {
          maxWeight = w;
          // Only add point when PR is broken
          if (!seenDates.has(dateStr) || w > (prPoints[prPoints.length - 1]?.weight || 0)) {
            // Remove duplicate date if exists
            if (seenDates.has(dateStr)) {
              const idx = prPoints.findIndex(p => p.date === dateStr);
              if (idx !== -1) prPoints.splice(idx, 1);
            }
            prPoints.push({ date: dateStr, weight: maxWeight });
            seenDates.add(dateStr);
          }
        }
      }

      setData(prPoints);
      setLoading(false);
    };
    load();
  }, [userId, exerciseId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (data.length < 2) {
    return (
      <p className="text-xs text-muted-foreground text-center py-2">
        Dados insuficientes para gráfico
      </p>
    );
  }

  return (
    <div className="space-y-2 pt-2">
      <div className="flex items-center gap-1.5 px-2">
        <TrendingUp className="w-3.5 h-3.5 text-secondary" />
        <span className="text-xs font-display font-bold text-secondary">
          EVOLUÇÃO DO PR
        </span>
      </div>
      <ChartContainer config={chartConfig} className="h-[140px] w-full">
        <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10 }}
            className="fill-muted-foreground"
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={{ fontSize: 10 }}
            className="fill-muted-foreground"
            tickLine={false}
            axisLine={false}
            width={35}
            unit="kg"
          />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Line
            type="monotone"
            dataKey="weight"
            stroke="hsl(var(--secondary))"
            strokeWidth={2}
            dot={{ fill: "hsl(var(--secondary))", r: 3 }}
            activeDot={{ r: 5, fill: "hsl(var(--secondary))" }}
          />
        </LineChart>
      </ChartContainer>
    </div>
  );
}
