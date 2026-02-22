import { useEffect, useState } from "react";
import type { Player, Question } from "@tv-trivia/shared";
import { fetchQuestionBank, seedQuestionBank } from "../lib/api";
import {
  decadeShowPresets,
  getSavedDecade,
  getSavedSelectedShowsByDecade,
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
import {
  getSavedCurrentPlayerIndex,
  getSavedRoundNumber,
  saveCurrentPlayerIndex,
  startNextRoundWithRandomRotation,
} from "../lib/gameState";
import { getSavedPlayers, savePlayers } from "../lib/players";

export function SettingsPage() {
  const [selectedDecade, setSelectedDecade] = useState<DecadeKey>(getSavedDecade);
  const [selectedTheme, setSelectedTheme] = useState<AppThemeKey>(getSavedTheme);
  const [players, setPlayers] = useState<Player[]>(getSavedPlayers);
  const [newPlayerIds, setNewPlayerIds] = useState<string[]>([]);
  const [editingPlayerIds, setEditingPlayerIds] = useState<string[]>([]);
  const [activePlayerIndex, setActivePlayerIndex] = useState(getSavedCurrentPlayerIndex);
  const [isGenerating, setIsGenerating] = useState(false);
  const [questionBank, setQuestionBank] = useState<Question[]>([]);
  const [statusMessage, setStatusMessage] = useState(
    "Select a decade and generate the AI question bank."
  );

  const selectedShowsByDecade = getSavedSelectedShowsByDecade();
  const selectedShowsForDecade = selectedShowsByDecade[selectedDecade] ?? [];
  const canGenerateForDecade = selectedShowsForDecade.length === 5;

  useEffect(() => {
    void loadQuestionBank();
  }, [selectedDecade]);

  useEffect(() => {
    savePlayers(players);
  }, [players]);

  useEffect(() => {
    if (players.length === 0) {
      setActivePlayerIndex(0);
      saveCurrentPlayerIndex(0);
      return;
    }
    const normalizedIndex = activePlayerIndex % players.length;
    if (normalizedIndex !== activePlayerIndex) {
      setActivePlayerIndex(normalizedIndex);
      saveCurrentPlayerIndex(normalizedIndex);
      return;
    }
    saveCurrentPlayerIndex(activePlayerIndex);
  }, [activePlayerIndex, players.length]);

  async function loadQuestionBank() {
    try {
      const questions = await fetchQuestionBank(selectedDecade);
      setQuestionBank(questions);
      if (questions.length > 0) {
        setStatusMessage(`Loaded ${questions.length} ${selectedDecade} questions from the API.`);
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
    if (!canGenerateForDecade) {
      setStatusMessage(
        `Pick exactly 5 shows for ${selectedDecade} on Home before generating.`
      );
      return;
    }

    setIsGenerating(true);
    try {
      const generated = await seedQuestionBank({
        decade: selectedDecade,
        shows: selectedShowsForDecade,
        questionsPerShow: 18,
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

  function updatePlayerName(playerId: string, name: string) {
    setPlayers((prev) =>
      prev.map((player) => (player.id === playerId ? { ...player, name } : player))
    );
  }

  function addPlayer() {
    setPlayers((prev) => {
      const nextIndex = prev.length + 1;
      const newPlayerId = `player-${Date.now()}`;
      setNewPlayerIds((current) => [...current, newPlayerId]);
      setEditingPlayerIds((current) => [...current, newPlayerId]);
      return [
        ...prev,
        { id: newPlayerId, name: `Player ${nextIndex}`, score: 0 },
      ];
    });
  }

  function deletePlayer(playerId: string) {
    setPlayers((prev) => prev.filter((player) => player.id !== playerId));
    setNewPlayerIds((prev) => prev.filter((id) => id !== playerId));
    setEditingPlayerIds((prev) => prev.filter((id) => id !== playerId));
  }

  function normalizePlayerName(playerId: string, currentName: string) {
    const trimmed = currentName.trim();
    if (!trimmed) {
      setPlayers((prev) =>
        prev.map((player) =>
          player.id === playerId ? { ...player, name: "Unnamed Player" } : player
        )
      );
    }
  }

  function clearDefaultNameOnFirstFocus(playerId: string, currentName: string) {
    if (!newPlayerIds.includes(playerId)) {
      return;
    }
    if (!/^Player \d+$/.test(currentName.trim())) {
      setNewPlayerIds((prev) => prev.filter((id) => id !== playerId));
      return;
    }
    updatePlayerName(playerId, "");
    setNewPlayerIds((prev) => prev.filter((id) => id !== playerId));
  }

  function beginEditingPlayer(playerId: string) {
    setEditingPlayerIds((prev) => (prev.includes(playerId) ? prev : [...prev, playerId]));
  }

  function savePlayerName(playerId: string, currentName: string) {
    const trimmed = currentName.trim();
    setPlayers((prev) =>
      prev.map((player) =>
        player.id === playerId
          ? { ...player, name: trimmed.length > 0 ? trimmed : "Unnamed Player" }
          : player
      )
    );
    setEditingPlayerIds((prev) => prev.filter((id) => id !== playerId));
    setNewPlayerIds((prev) => prev.filter((id) => id !== playerId));
  }

  function clearRoundAndStartNewRandomRound() {
    if (players.length === 0) {
      setStatusMessage("Add at least one player before starting a new round.");
      return;
    }

    const resetPlayers = startNextRoundWithRandomRotation(players);
    const startingPlayer = resetPlayers[0];
    setPlayers(resetPlayers);
    setActivePlayerIndex(0);
    setStatusMessage(
      `Round ${getSavedRoundNumber()} started. ${startingPlayer?.name ?? "Player 1"} goes first.`
    );
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

      {/* <div className="rounded-2xl border border-white/15 bg-black/25 p-5">
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
          Home selections ({selectedShowsForDecade.length}/5):{" "}
          <span className="font-semibold text-trivia-gold">
            {selectedShowsForDecade.length > 0
              ? selectedShowsForDecade.join(", ")
              : "No shows selected"}
          </span>
        </p>
        {!canGenerateForDecade ? (
          <p className="mt-2 text-sm text-white/75">
            Go to Home and select exactly 5 shows for this decade.
          </p>
        ) : null}
        <button
          type="button"
          onClick={generateQuestionBank}
          className="btn-secondary mt-4"
          disabled={isGenerating || !canGenerateForDecade}
        >
          {isGenerating
            ? `Generating ${selectedDecade}...`
            : `Generate ${selectedDecade} AI question bank`}
        </button>
      </div> */}

      <div className="rounded-2xl border border-white/15 bg-black/25 p-5">
        <p className="mb-3 text-sm font-semibold uppercase tracking-[0.12em] text-trivia-gold">
          Manage Players
        </p>
        <ul className="space-y-3">
          {players.map((player, index) => (
            <li
              key={player.id}
              className={[
                "rounded-xl border px-4 py-3",
                index === activePlayerIndex
                  ? "border-trivia-gold/70 bg-trivia-gold/15"
                  : "border-white/15 bg-black/25",
              ].join(" ")}
            >
              <div className="flex flex-wrap items-center gap-2">
                {editingPlayerIds.includes(player.id) ? (
                  <input
                    value={player.name}
                    onChange={(event) => updatePlayerName(player.id, event.target.value)}
                    onFocus={() => clearDefaultNameOnFirstFocus(player.id, player.name)}
                    onBlur={() => normalizePlayerName(player.id, player.name)}
                    className="min-w-[170px] flex-1 rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-white outline-none transition focus:border-white/50"
                    placeholder={`Player ${index + 1}`}
                  />
                ) : (
                  <p className="min-w-[170px] flex-1 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-white">
                    {player.name}
                  </p>
                )}
                <span className="rounded-md bg-white/10 px-3 py-1 text-sm font-bold text-white">
                  {player.score} pts
                </span>
                <button
                  type="button"
                  onClick={() =>
                    editingPlayerIds.includes(player.id)
                      ? savePlayerName(player.id, player.name)
                      : beginEditingPlayer(player.id)
                  }
                  className="rounded-md border border-white/30 bg-white/10 px-3 py-1 text-sm font-semibold text-white transition hover:bg-white/20"
                >
                  {editingPlayerIds.includes(player.id) ? "Save" : "Edit"}
                </button>
                <button
                  type="button"
                  onClick={() => deletePlayer(player.id)}
                  className="rounded-md border border-red-300/50 bg-red-500/20 px-3 py-1 text-sm font-semibold text-white transition hover:bg-red-500/35"
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap gap-4">
        <button type="button" onClick={addPlayer} className="btn-secondary mt-4">
          Add player
        </button>
        <button
          type="button"
          onClick={clearRoundAndStartNewRandomRound}
          className="btn-primary mt-3"
          disabled={players.length === 0}
        >
          Clear round + start new round
        </button>
        </div>
      </div>
    </section>
  );
}
