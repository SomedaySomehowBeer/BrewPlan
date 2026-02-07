interface UnitDisplayProps {
  value: number;
  unit: string;
  decimals?: number;
}

export function UnitDisplay({ value, unit, decimals = 1 }: UnitDisplayProps) {
  const formatted = Number(value).toFixed(decimals);
  return (
    <span>
      {formatted} {unit}
    </span>
  );
}
