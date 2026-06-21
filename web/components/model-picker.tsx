"use client";

import { MODELS } from "@/lib/models";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

export function ModelPicker({
  id,
  label,
  value,
  onChange,
  hint,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (model: string) => void;
  hint?: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Select id={id} value={value} onChange={(e) => onChange(e.target.value)}>
        {MODELS.map((m) => (
          <option key={m.id} value={m.id}>
            {m.label} · {m.hint}
          </option>
        ))}
        {!MODELS.some((m) => m.id === value) && <option value={value}>{value} (current)</option>}
      </Select>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
