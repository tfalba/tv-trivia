import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CategoryCard } from "../components/CategoryCard";
import { DifficultyBadge } from "../components/DifficultyBadge";
import { fetchPopularShowsForDecade } from "../lib/api";
import {
  getSavedDecade,
  getSavedSelectedShowsByDecade,
  saveSelectedShowsByDecade,
  selectedDecadeStorageKey,
  type DecadeKey,
} from "../lib/decades";

const decades: DecadeKey[] = ["1970s", "1980s", "1990s", "2000s", "2010s"];
const maxSelectedShows = 5;

export function HomePage() {
  const [selectedDecade, setSelectedDecade] = useState<DecadeKey>(getSavedDecade);
  const [showsByDecade, setShowsByDecade] = useState<Partial<Record<DecadeKey, string[]>>>({});
  const [selectedShowsByDecade, setSelectedShowsByDecade] = useState<
    Partial<Record<DecadeKey, string[]>>
  >(getSavedSelectedShowsByDecade);
  const [isLoadingShows, setIsLoadingShows] = useState(false);
  const [isSelectorOpen, setIsSelectorOpen] = useState(true);
  const [selectorMessage, setSelectorMessage] = useState<string>("");

  const availableShows = showsByDecade[selectedDecade] ?? [];
  const selectedShows = selectedShowsByDecade[selectedDecade] ?? [];
  const selectedShowSet = useMemo(() => new Set(selectedShows), [selectedShows]);

  function persistSelectedShows(next: Partial<Record<DecadeKey, string[]>>) {
    setSelectedShowsByDecade(next);
    saveSelectedShowsByDecade(next);
  }

  async function selectDecade(decade: DecadeKey) {
    setSelectedDecade(decade);
    window.localStorage.setItem(selectedDecadeStorageKey, decade);
    setIsSelectorOpen(true);
    setSelectorMessage("");

    if (showsByDecade[decade]) {
      return;
    }

    setIsLoadingShows(true);
    try {
      const shows = await fetchPopularShowsForDecade(decade);
      setShowsByDecade((prev) => ({ ...prev, [decade]: shows }));
      setSelectorMessage(`Loaded ${shows.length} popular shows for ${decade}. Pick 5.`);
    } catch (error) {
      console.error(error);
      setSelectorMessage("Could not load shows for that decade. Try again.");
    } finally {
      setIsLoadingShows(false);
    }
  }

  function toggleShow(show: string) {
    const current = selectedShowsByDecade[selectedDecade] ?? [];
    const isSelected = current.includes(show);

    if (isSelected) {
      persistSelectedShows({
        ...selectedShowsByDecade,
        [selectedDecade]: current.filter((item) => item !== show),
      });
      return;
    }

    if (current.length >= maxSelectedShows) {
      setSelectorMessage(`You can only pick ${maxSelectedShows} shows for ${selectedDecade}.`);
      return;
    }

    const next = [...current, show];
    persistSelectedShows({
      ...selectedShowsByDecade,
      [selectedDecade]: next,
    });
    if (next.length === maxSelectedShows) {
      setSelectorMessage(`${selectedDecade} is ready with 5 selected shows.`);
    }
  }

  return (
    <section className="space-y-8">
      <div className="space-y-3">
        <h2 className="font-display text-3xl text-trivia-paper sm:text-4xl">
          Spin. Guess. Score.
        </h2>
        <p className="max-w-2xl text-base text-white/85 sm:text-lg">
          Build a game with 2 to 8 players, spin for a show, and answer random
          easy/medium/hard questions from your selected decades.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
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
              <CategoryCard title={decade} subtitle="Pick 5 popular TV shows." />
            </div>
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-white/15 bg-black/25 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-semibold uppercase tracking-[0.12em] text-trivia-gold">
              {selectedDecade} Show Picker ({selectedShows.length}/{maxSelectedShows})
            </p>
            <button
              type="button"
              onClick={() => setIsSelectorOpen((prev) => !prev)}
              className="btn-secondary"
            >
              {isSelectorOpen ? "Hide selector" : "Show selector"}
            </button>
          </div>

          {selectorMessage ? (
            <p className="mt-3 text-sm text-white/85">{selectorMessage}</p>
          ) : null}

          {isLoadingShows ? <p className="mt-3 text-sm text-white/85">Loading shows...</p> : null}

          {isSelectorOpen && !isLoadingShows ? (
            <div className="mt-4 max-h-72 overflow-auto rounded-xl border border-white/15 bg-black/35 p-3">
              {availableShows.length === 0 ? (
                <p className="text-sm text-white/75">No shows loaded yet.</p>
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
                <span key={show} className="chip border-trivia-gold/60 text-trivia-gold">
                  {show}
                </span>
              ))}
            </div>
          ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        <DifficultyBadge difficulty="easy" />
        <DifficultyBadge difficulty="medium" />
        <DifficultyBadge difficulty="hard" />
      </div>

      <div className="flex flex-wrap gap-3">
        <Link to="/game" className="btn-primary">
          Start game board
        </Link>
        <Link to="/game" className="btn-secondary">
          Preview wheel mode
        </Link>
      </div>
    </section>
  );
}
