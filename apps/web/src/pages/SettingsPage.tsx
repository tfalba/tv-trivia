import { useEffect, useState } from "react";
import type { Question } from "@tv-trivia/shared";
import { fetchQuestionBank, seedQuestionBank } from "../lib/api";
import {
  decadeShowPresets,
  getConfiguredShowsForDecade,
  getSavedDecade,
  selectedDecadeStorageKey,
  type DecadeKey,
} from "../lib/decades";
import {
  appThemes,
  applyTheme,
  getSavedTheme,
  selectedThemeStorageKey,
  type AppThemeKey,
} from "../lib/theme";

export function SettingsPage() {
  const [selectedDecade, setSelectedDecade] = useState<DecadeKey>(getSavedDecade);
  const [selectedTheme, setSelectedTheme] = useState<AppThemeKey>(getSavedTheme);
  const [isGenerating, setIsGenerating] = useState(false);
  const [questionBank, setQuestionBank] = useState<Question[]>([]);
  const [statusMessage, setStatusMessage] = useState(
    "Select a decade and generate the AI question bank."
  );

  const showPool = getConfiguredShowsForDecade(selectedDecade);

  useEffect(() => {
    void loadQuestionBank();
  }, []);

  async function loadQuestionBank() {
    try {
      const questions = await fetchQuestionBank();
      setQuestionBank(questions);
      if (questions.length > 0) {
        setStatusMessage(`Loaded ${questions.length} questions from the API.`);
      }
    } catch {
      setStatusMessage("Question bank unavailable. Generate AI questions to continue.");
    }
  }

  function switchDecade(decade: DecadeKey) {
    setSelectedDecade(decade);
    window.localStorage.setItem(selectedDecadeStorageKey, decade);
    setStatusMessage(`${decade} selected. Generate questions for this decade.`);
  }

  function switchTheme(theme: AppThemeKey) {
    setSelectedTheme(theme);
    window.localStorage.setItem(selectedThemeStorageKey, theme);
    applyTheme(theme);
  }

  async function generateQuestionBank() {
    setIsGenerating(true);
    try {
      const generated = await seedQuestionBank({
        shows: showPool,
        questionsPerShow: 9,
        seed: Number(selectedDecade.slice(0, 4)),
      });
      setQuestionBank(generated);
      setStatusMessage(
        `Generated ${generated.length} questions for ${selectedDecade}.`
      );
    } catch {
      setStatusMessage("Generation failed. Check API and OPENAI_API_KEY, then retry.");
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <section className="space-y-8">
      <div className="space-y-3">
        <h2 className="font-display text-3xl text-trivia-paper sm:text-4xl">
          Settings
        </h2>
        <p className="max-w-2xl text-base text-white/85 sm:text-lg">
          This is the settings page where you can configure your game settings.
        </p>
      </div>

      <div className="rounded-2xl border border-white/15 bg-black/25 p-5">
        <p className="mb-3 text-sm font-semibold uppercase tracking-[0.12em] text-trivia-gold">
          App Theme
        </p>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(appThemes) as AppThemeKey[]).map((theme) => (
            <button
              key={theme}
              type="button"
              onClick={() => switchTheme(theme)}
              className={[
                "rounded-lg px-4 py-2 text-sm font-semibold transition",
                theme === selectedTheme
                  ? "bg-trivia-gold text-trivia-ink"
                  : "bg-white/10 text-white hover:bg-white/20",
              ].join(" ")}
            >
              {appThemes[theme]}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-white/15 bg-black/25 p-5">
        <p className="mb-3 text-sm font-semibold uppercase tracking-[0.12em] text-trivia-gold">
          Decade For AI Generation
        </p>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(decadeShowPresets) as DecadeKey[]).map((decade) => (
            <button
              key={decade}
              type="button"
              onClick={() => switchDecade(decade)}
              className={[
                "rounded-lg px-4 py-2 text-sm font-semibold transition",
                decade === selectedDecade
                  ? "bg-trivia-gold text-trivia-ink"
                  : "bg-white/10 text-white hover:bg-white/20",
              ].join(" ")}
            >
              {decade}
            </button>
          ))}
        </div>
        <p className="mt-3 text-sm text-white/80">
          Active shows:{" "}
          <span className="font-semibold text-trivia-gold">{showPool.join(", ")}</span>
        </p>
        <button
          type="button"
          onClick={generateQuestionBank}
          className="btn-secondary mt-4"
          disabled={isGenerating}
        >
          {isGenerating
            ? `Generating ${selectedDecade}...`
            : `Generate ${selectedDecade} AI question bank`}
        </button>
      </div>
    </section>
  );
}
