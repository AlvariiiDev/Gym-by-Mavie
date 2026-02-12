import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";

interface SetInputProps {
  value: number;
  field: "weight" | "reps";
  onSave: (value: number) => void;
}

export default function SetInput({ value, field, onSave }: SetInputProps) {
  const [localValue, setLocalValue] = useState(value || "");
  const savedRef = useRef(value);

  useEffect(() => {
    if (value !== savedRef.current) {
      setLocalValue(value || "");
      savedRef.current = value;
    }
  }, [value]);

  const handleBlur = () => {
    const num = Number(localValue) || 0;
    if (num !== savedRef.current) {
      savedRef.current = num;
      onSave(num);
    }
  };

  return (
    <Input
      type="number"
      value={localValue}
      onChange={(e) => setLocalValue(e.target.value)}
      onBlur={handleBlur}
      className="h-8 text-xs bg-background border-border text-center"
    />
  );
}
