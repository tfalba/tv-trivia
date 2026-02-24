import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { Player } from "@tv-trivia/shared";
import { CategoryCard } from "../components/CategoryCard";
import { DifficultyBadge } from "../components/DifficultyBadge";
import {
  fetchPopularShowsForDecade,
  fetchQuestionBankStatus,
  seedQuestionBank,
} from "../lib/api";
import {
  getSavedDecade,
  getSavedSelectedShowsByDecade,
  saveSelectedShowsByDecade,
  selectedDecadeStorageKey,
  type DecadeKey,
} from "../lib/decades";
import { hasRoundWinner, startNextRound } from "../lib/gameState";
import { getSavedPlayers, savePlayers } from "../lib/players";
import { About } from "../components/About";

const decades: DecadeKey[] = ["1970s", "1980s", "1990s", "2000s", "2010s"];
const maxSelectedShows = 5;

export function HomePage() {
  const [players, setPlayers] = useState<Player[]>(getSavedPlayers);
  const [selectedDecade, setSelectedDecade] =
    useState<DecadeKey>(getSavedDecade);
  const [showsByDecade, setShowsByDecade] = useState<
    Partial<Record<DecadeKey, string[]>>
  >({});
  const [selectedShowsByDecade, setSelectedShowsByDecade] = useState<
    Partial<Record<DecadeKey, string[]>>
  >(getSavedSelectedShowsByDecade);
  const [isLoadingShows, setIsLoadingShows] = useState(false);
  const [isCheckingQuestionStatus, setIsCheckingQuestionStatus] =
    useState(false);
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false);
  const [needsQuestionGeneration, setNeedsQuestionGeneration] = useState(false);
  const [selectorMessage, setSelectorMessage] = useState<string>("");

  const availableShows = showsByDecade[selectedDecade] ?? [];
  const selectedShows = selectedShowsByDecade[selectedDecade] ?? [];
  const selectedShowSet = useMemo(
    () => new Set(selectedShows),
    [selectedShows],
  );
  const roundHasWinner = useMemo(() => hasRoundWinner(players), [players]);

  useEffect(() => {
    void refreshQuestionGenerationState(selectedDecade, selectedShows);
  }, [selectedDecade, selectedShows]);

  function persistSelectedShows(next: Partial<Record<DecadeKey, string[]>>) {
    setSelectedShowsByDecade(next);
    saveSelectedShowsByDecade(next);
  }

  async function selectDecade(decade: DecadeKey) {
    setSelectedDecade(decade);
    window.localStorage.setItem(selectedDecadeStorageKey, decade);
    setSelectorMessage("");

    if (showsByDecade[decade]) {
      void refreshQuestionGenerationState(
        decade,
        selectedShowsByDecade[decade] ?? [],
      );
      return;
    }

    setIsLoadingShows(true);
    try {
      const shows = await fetchPopularShowsForDecade(decade);
      setShowsByDecade((prev) => ({ ...prev, [decade]: shows }));
      setSelectorMessage(
        `Loaded ${shows.length} popular shows for ${decade}. Pick 5.`,
      );
    } catch (error) {
      console.error(error);
      setSelectorMessage("Could not load shows for that decade. Try again.");
    } finally {
      setIsLoadingShows(false);
      void refreshQuestionGenerationState(
        decade,
        selectedShowsByDecade[decade] ?? [],
      );
    }
  }

  async function refreshQuestionGenerationState(
    decade: DecadeKey,
    shows: string[],
  ) {
    if (shows.length !== maxSelectedShows) {
      setNeedsQuestionGeneration(false);
      return;
    }

    setIsCheckingQuestionStatus(true);
    try {
      const status = await fetchQuestionBankStatus({ decade, shows });
      setNeedsQuestionGeneration(
        !status.hasBank || status.matchesSelectedShows === false,
      );
    } catch (error) {
      console.error(error);
      setNeedsQuestionGeneration(true);
    } finally {
      setIsCheckingQuestionStatus(false);
    }
  }

  function toggleShow(show: string) {
    const current = selectedShowsByDecade[selectedDecade] ?? [];
    const isSelected = current.includes(show);

    if (isSelected) {
      const nextShows = current.filter((item) => item !== show);
      persistSelectedShows({
        ...selectedShowsByDecade,
        [selectedDecade]: nextShows,
      });
      void refreshQuestionGenerationState(selectedDecade, nextShows);
      return;
    }

    if (current.length >= maxSelectedShows) {
      setSelectorMessage(
        `You can only pick ${maxSelectedShows} shows for ${selectedDecade}.`,
      );
      return;
    }

    const next = [...current, show];
    persistSelectedShows({
      ...selectedShowsByDecade,
      [selectedDecade]: next,
    });
    void refreshQuestionGenerationState(selectedDecade, next);
    if (next.length === maxSelectedShows) {
      setSelectorMessage(`${selectedDecade} is ready with 5 selected shows.`);
    }
  }

  function handleStartNextRound() {
    const resetPlayers = startNextRound(players);
    setPlayers(resetPlayers);
    savePlayers(resetPlayers);
    setSelectorMessage(
      "Next round started. Scores reset and turn order restarted.",
    );
  }

  function clearSelectedShows() {
    persistSelectedShows({
      ...selectedShowsByDecade,
      [selectedDecade]: [],
    });
    setNeedsQuestionGeneration(false);
    setSelectorMessage(
      `${selectedDecade} selections were cleared. Pick 5 shows.`,
    );
  }

  async function handleGenerateQuestions() {
    if (selectedShows.length !== maxSelectedShows) {
      return;
    }

    setIsGeneratingQuestions(true);
    try {
      await seedQuestionBank({
        decade: selectedDecade,
        shows: selectedShows,
        questionsPerShow: 18,
        seed: Number(selectedDecade.slice(0, 4)),
      });
      setSelectorMessage(
        `Generated ${selectedDecade} questions for the selected 5 shows.`,
      );
      setNeedsQuestionGeneration(false);
    } catch (error) {
      console.error(error);
      setSelectorMessage(
        "Could not generate questions. Check API and OPENAI_API_KEY.",
      );
    } finally {
      setIsGeneratingQuestions(false);
      void refreshQuestionGenerationState(selectedDecade, selectedShows);
    }
  }

  return (
    <section className="space-y-8">
      {/* <About /> */}
      <div className="entry-title-panel page-enter-title space-y-3">
        <h2 className="font-display text-3xl text-trivia-paper sm:text-4xl">
          Choose your decade and favorite shows
        </h2>
        <p className="text-white/90">
          Pick 5 of your favorite shows and generate questions from easy to hard.
        </p>
        <div className="flex flex-wrap gap-2">
          <DifficultyBadge difficulty="easy" />
          <DifficultyBadge difficulty="medium" />
          <DifficultyBadge difficulty="hard" />
        </div>
      </div>
      <div className="page-enter-up entry-delay-1 flex flex-wrap gap-4">
        {decades.map((decade) => (
          <button
            key={decade}
            type="button"
            onClick={() => void selectDecade(decade)}
            className="text-left"
          >
            <div
              className={[
                "rounded-2xl transition",
                selectedDecade === decade ? "ring-2 ring-trivia-gold/70" : "",
              ].join(" ")}
            >
              <CategoryCard
                title={decade}
                subtitle=""
                // subtitle="Pick 5 popular TV shows."
              />
            </div>
          </button>
        ))}
      </div>

      <div className="page-enter-up entry-delay-2 rounded-2xl border border-white/15 bg-black/25 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-semibold uppercase tracking-[0.12em] text-trivia-gold">
            {selectedDecade} Show Picker ({selectedShows.length}/
            {maxSelectedShows})
          </p>
          {selectedShows.length === maxSelectedShows ? (
            <button
              type="button"
              onClick={clearSelectedShows}
              className="btn-secondary"
            >
              Clear selected shows
            </button>
          ) : null}
        </div>

        {selectorMessage ? (
          <p className="mt-3 text-sm text-white/85">{selectorMessage}</p>
        ) : null}

        {isLoadingShows ? (
          <p className="mt-3 text-sm text-white/85">Loading shows...</p>
        ) : null}

        {!isLoadingShows && selectedShows.length < maxSelectedShows ? (
          <div className="mt-4 max-h-72 overflow-auto rounded-xl border border-white/15 bg-black/35 p-3">
            {availableShows.length === 0 ? (
              <p className="text-sm text-white/75">
                Click on a decade above to load shows.
              </p>
            ) : (
              <ul className="space-y-2">
                {availableShows.map((show) => {
                  const checked = selectedShowSet.has(show);
                  return (
                    <li key={show}>
                      <label className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 hover:bg-white/10">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleShow(show)}
                          className="h-4 w-4"
                        />
                        <span className="text-sm text-white">{show}</span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        ) : null}

        {selectedShows.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {selectedShows.map((show) => (
              <span
                key={show}
                className="chip border-[var(--color-violet)] text-[white]/75"
              >
                {show}
              </span>
            ))}
          </div>
        ) : null}
      </div>

      <div className="page-enter-up entry-delay-3 flex flex-wrap gap-3">
        <Link to="/game" className="btn-primary">
          Start game board
        </Link>
        {roundHasWinner ? (
          <button
            type="button"
            className="btn-primary"
            onClick={handleStartNextRound}
          >
            Start next round
          </button>
        ) : null}
        {selectedShows.length === maxSelectedShows &&
        needsQuestionGeneration ? (
          <button
            type="button"
            className="btn-secondary"
            onClick={() => void handleGenerateQuestions()}
            disabled={isGeneratingQuestions || isCheckingQuestionStatus}
          >
            {isGeneratingQuestions || isCheckingQuestionStatus
              ? "Generating questions..."
              : `Generate ${selectedDecade} questions`}
          </button>
        ) : null}
      </div>
    </section>
  );
}
