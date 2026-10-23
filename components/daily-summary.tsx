import { progressPercent, remainingCalories } from "@/lib/nutrition/totals";
import type { NutritionTargets, NutritionTotals } from "@/lib/types";

type DailySummaryProps = {
  targets: NutritionTargets;
  consumed: NutritionTotals;
  isSample: boolean;
};

function MacroBar({
  label,
  consumed,
  target,
  unit,
}: {
  label: string;
  consumed: number;
  target: number;
  unit: string;
}) {
  const percent = progressPercent(consumed, target);
  const barId = `${label.toLowerCase()}-progress`;

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-[15px] text-foreground" id={`${barId}-label`}>
          {label}
        </p>
        <p className="text-sm tabular-nums text-muted">
          {Math.round(consumed)} / {target} {unit}
        </p>
      </div>
      <div
        id={barId}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={target}
        aria-valuenow={Math.round(consumed)}
        aria-labelledby={`${barId}-label`}
        className="h-[7px] w-full overflow-hidden rounded-full bg-[#e6e3db]"
      >
        <div
          className="rounded-full"
          style={{
            width: `${percent}%`,
            height: 7,
            minWidth: percent > 0 ? 7 : 0,
            backgroundColor: "#245c45",
          }}
        />
      </div>
    </div>
  );
}

function CalorieRing({
  consumed,
  target,
}: {
  consumed: number;
  target: number;
}) {
  const radius = 58;
  const circumference = 2 * Math.PI * radius;
  const percent = progressPercent(consumed, target);
  const offset = circumference - (percent / 100) * circumference;

  return (
    <div className="relative h-[148px] w-[148px] shrink-0">
      <svg viewBox="0 0 148 148" className="h-full w-full -rotate-90" aria-hidden="true">
        <circle
          cx="74"
          cy="74"
          r={radius}
          fill="none"
          stroke="#e6e3db"
          strokeWidth="10"
        />
        <circle
          cx="74"
          cy="74"
          r={radius}
          fill="none"
          stroke="#245c45"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <p className="text-[2rem] leading-none font-semibold tabular-nums tracking-tight text-foreground">
          {consumed.toLocaleString()}
        </p>
        <p className="mt-1 text-xs text-muted">kcal consumed</p>
      </div>
    </div>
  );
}

export function DailySummary({
  targets,
  consumed,
  isSample,
}: DailySummaryProps) {
  const remaining = remainingCalories(
    consumed.calories,
    targets.calorieTarget,
  );

  return (
    <section aria-labelledby="daily-summary-heading" className="px-1 pt-2">
      <h2 id="daily-summary-heading" className="sr-only">
        Today&apos;s nutrition
      </h2>
      {isSample ? (
        <span className="mb-3 inline-block rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-900">
          Sample day
        </span>
      ) : null}

      <div className="flex items-center justify-between gap-4">
        <CalorieRing
          consumed={Math.round(consumed.calories)}
          target={targets.calorieTarget}
        />
        <div className="min-w-0 flex-1 pr-1">
          <p className="text-[2.35rem] leading-none font-semibold tabular-nums tracking-tight text-forest">
            {remaining.toLocaleString()}
          </p>
          <p className="mt-1 text-sm text-muted">kcal remaining</p>
          <p className="mt-5 text-xl font-semibold tabular-nums text-foreground">
            {targets.calorieTarget.toLocaleString()} kcal
          </p>
          <p className="mt-0.5 text-sm text-muted">Daily target</p>
        </div>
      </div>

      <div
        className="sr-only"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={targets.calorieTarget}
        aria-valuenow={consumed.calories}
        aria-label={`Calories ${consumed.calories} of ${targets.calorieTarget}`}
      />

      <div className="mt-8 space-y-5">
        <MacroBar
          label="Protein"
          consumed={consumed.proteinG}
          target={targets.proteinG}
          unit="g"
        />
        <MacroBar
          label="Carbs"
          consumed={consumed.carbsG}
          target={targets.carbsG}
          unit="g"
        />
        <MacroBar
          label="Fat"
          consumed={consumed.fatG}
          target={targets.fatG}
          unit="g"
        />
      </div>
    </section>
  );
}
