import { useEffect, useState } from "react";
import type { Player } from "@tv-trivia/shared";
import { getSavedCurrentPlayerIndex, saveCurrentPlayerIndex } from "../lib/gameState";
import { getSavedPlayers, savePlayers } from "../lib/players";

export function PlayerScoreboardPage() {
  const [players, setPlayers] = useState<Player[]>(getSavedPlayers);
  const [activePlayerIndex, setActivePlayerIndex] = useState(getSavedCurrentPlayerIndex);

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
    }
  }, [activePlayerIndex, players.length]);

  function updatePlayerName(playerId: string, name: string) {
    setPlayers((prev) =>
      prev.map((player) => (player.id === playerId ? { ...player, name } : player))
    );
  }

  function addPlayer() {
    setPlayers((prev) => {
      const nextIndex = prev.length + 1;
      return [
        ...prev,
        { id: `player-${Date.now()}`, name: `Player ${nextIndex}`, score: 0 },
      ];
    });
  }

  function deletePlayer(playerId: string) {
    setPlayers((prev) => prev.filter((player) => player.id !== playerId));
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

  return (
    <section className="space-y-8">
      <div className="space-y-3">
        <h2 className="font-display text-3xl text-trivia-paper sm:text-4xl">
          Player Scoreboard
        </h2>
        <p className="max-w-2xl text-base text-white/85 sm:text-lg">
          Track current standings, active player turns, and score totals.
        </p>
      </div>

      <div className="rounded-2xl border border-white/15 bg-black/25 p-5">
        <p className="mb-3 text-sm font-semibold uppercase tracking-[0.12em] text-trivia-gold">
          Live Scoreboard
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
                <input
                  value={player.name}
                  onChange={(event) => updatePlayerName(player.id, event.target.value)}
                  onBlur={() => normalizePlayerName(player.id, player.name)}
                  className="min-w-[170px] flex-1 rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-white outline-none transition focus:border-white/50"
                  placeholder={`Player ${index + 1}`}
                />
                <span className="rounded-md bg-white/10 px-3 py-1 text-sm font-bold text-white">
                  {player.score} pts
                </span>
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
        <button type="button" onClick={addPlayer} className="btn-secondary mt-4">
          Add player
        </button>
      </div>
    </section>
  );
}
