"use client";

import { Button } from "@/components/Button";
import { Screen } from "@/components/Screen";
import { nextPath } from "@/lib/funnel";
import { saveAnswer, useFunnel } from "@/lib/funnel-state";
import { useRouter } from "next/navigation";

const PLACEHOLDER_OPTIONS = ["Barely any", "A few", "A lot", "No idea"];

/**
 * Placeholder quiz step. The real questions and screens come from the designs —
 * what matters here is the pattern: answer is written to sessionStorage the moment
 * it's picked (not on submit), and the next route comes from the funnel config
 * rather than a hardcoded push.
 */
export default function QuizPage() {
  const router = useRouter();
  // Reads straight from the store, so a reloaded tab comes back already answered.
  const selected = useFunnel().answers["photos-online"] ?? null;

  return (
    <Screen
      footer={
        <Button
          disabled={!selected}
          onClick={() => {
            const path = nextPath("quiz-questions");
            if (path) router.push(path);
          }}
        >
          Continue
        </Button>
      }
    >
      <div className="flex flex-col gap-6 py-10">
        <h1 className="text-2xl font-bold text-balance">
          How many photos of you are online?
        </h1>

        <div className="flex flex-col gap-3">
          {PLACEHOLDER_OPTIONS.map((option) => (
            <button
              key={option}
              onClick={() => saveAnswer("photos-online", option)}
              className={`rounded-2xl border px-5 py-4 text-left text-base transition-colors ${
                selected === option
                  ? "border-brand bg-brand-soft/25 font-semibold"
                  : "border-line bg-canvas"
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      </div>
    </Screen>
  );
}
