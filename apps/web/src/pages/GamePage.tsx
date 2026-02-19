import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import type { Difficulty, Player, Question } from "@tv-trivia/shared";
import { QuestionCard } from "../components/QuestionCard";
import { fetchQuestionBank } from "../lib/api";
import { decadeShowPresets, getSavedDecade } from "../lib/decades";
import { getSavedPlayers, savePlayers } from "../lib/players";

const pointsByDifficulty: Record<Difficulty, number> = {
  easy: 100,
  medium: 200,
  hard: 300,
};

export function GamePage() {
  const [players, setPlayers] = useState<Player[]>(getSavedPlayers);
  const [selectedDecade] = useState(getSavedDecade);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [spunShow, setSpunShow] = useState<string | null>(null);
  const [activeQuestion, setActiveQuestion] = useState<Question | null>(null);
  const [questionBank, setQuestionBank] = useState<Question[]>([]);
  const [usedQuestionIds, setUsedQuestionIds] = useState<string[]>([]);
  const [answerRevealed, setAnswerRevealed] = useState(false);
  const [statusMessage, setStatusMessage] = useState(
    "Select a TV show panel, then draw a question."
  );
  const [isSelectingShow, setIsSelectingShow] = useState(false);
  const [animatedShowIndex, setAnimatedShowIndex] = useState<number | null>(null);
  const showAnimationIntervalRef = useRef<number | null>(null);
  const showAnimationTimeoutRef = useRef<number | null>(null);

  const showPool = decadeShowPresets[selectedDecade];
  const currentPlayer = players[currentPlayerIndex] ?? players[0];

  useEffect(() => {
    void loadQuestionBank();
  }, []);

  useEffect(() => {
    savePlayers(players);
  }, [players]);

  useEffect(() => {
    return () => {
      if (showAnimationIntervalRef.current) {
        window.clearInterval(showAnimationIntervalRef.current);
      }
      if (showAnimationTimeoutRef.current) {
        window.clearTimeout(showAnimationTimeoutRef.current);
      }
    };
  }, []);

  async function loadQuestionBank() {
    try {
      const questions = await fetchQuestionBank();
      setQuestionBank(questions);
      if (questions.length > 0) {
        setStatusMessage(`Loaded ${questions.length} generated questions. Select a show to start.`);
      }
    } catch (error) {
      console.error(error);
      setStatusMessage("Question bank unavailable. Generate questions to continue.");
    }
  }

  function selectShow(show: string) {
    if (isSelectingShow) {
      return;
    }

    if (!currentPlayer) {
      setStatusMessage("Add players in Player Scoreboard before starting.");
      return;
    }

    setSpunShow(show);
    setActiveQuestion(null);
    setAnswerRevealed(false);
    setStatusMessage(`${currentPlayer.name} selected: ${show}. Draw a question.`);
  }

  function runShowSelectionAnimation() {
    if (isSelectingShow) {
      return;
    }

    if (!currentPlayer) {
      setStatusMessage("Add players in Player Scoreboard before starting.");
      return;
    }

    if (showAnimationIntervalRef.current) {
      window.clearInterval(showAnimationIntervalRef.current);
    }
    if (showAnimationTimeoutRef.current) {
      window.clearTimeout(showAnimationTimeoutRef.current);
    }

    const finalIndex = Math.floor(Math.random() * showPool.length);
    const finalShow = showPool[finalIndex];

    setIsSelectingShow(true);
    setActiveQuestion(null);
    setAnswerRevealed(false);
    setSpunShow(null);
    setStatusMessage(`${currentPlayer.name} is selecting a show...`);

    let currentIndex = 0;
    setAnimatedShowIndex(currentIndex);
    showAnimationIntervalRef.current = window.setInterval(() => {
      currentIndex = (currentIndex + 1) % showPool.length;
      setAnimatedShowIndex(currentIndex);
    }, 120);

    showAnimationTimeoutRef.current = window.setTimeout(() => {
      if (showAnimationIntervalRef.current) {
        window.clearInterval(showAnimationIntervalRef.current);
      }
      setIsSelectingShow(false);
      setAnimatedShowIndex(finalIndex);
      setSpunShow(finalShow);
      setStatusMessage(`${currentPlayer.name} selected: ${finalShow}. Draw a question.`);
    }, 5000);
  }

  function drawQuestion() {
    if (!spunShow) {
      setStatusMessage("Select a TV show first, then draw a question.");
      return;
    }

    const availableQuestions = questionBank.filter(
      (question) =>
        (question.showTitle ?? question.showId) === spunShow &&
        !usedQuestionIds.includes(question.id)
    );

    if (availableQuestions.length === 0) {
      setStatusMessage(`${spunShow} has no unused questions left. Spin again.`);
      return;
    }

    const selectedQuestion =
      availableQuestions[Math.floor(Math.random() * availableQuestions.length)];
    setActiveQuestion(selectedQuestion);
    setUsedQuestionIds((prev) => [...prev, selectedQuestion.id]);
    setAnswerRevealed(false);
    setStatusMessage(`Question loaded for ${currentPlayer.name} from ${spunShow}.`);
  }

  function completeTurn(isCorrect: boolean) {
    if (!activeQuestion) {
      return;
    }

    const points = pointsByDifficulty[activeQuestion.difficulty];
    const nextPlayerIndex = (currentPlayerIndex + 1) % players.length;
    const nextPlayerName = players[nextPlayerIndex]?.name ?? "Next player";

    setPlayers((prev) =>
      prev.map((player, index) =>
        index === currentPlayerIndex
          ? { ...player, score: player.score + (isCorrect ? points : 0) }
          : player
      )
    );
    setCurrentPlayerIndex(nextPlayerIndex);
    setStatusMessage(
      isCorrect
        ? `${currentPlayer.name} earned ${points} points. ${nextPlayerName} is up next.`
        : `${currentPlayer.name} missed. ${nextPlayerName} is up next.`
    );
    setActiveQuestion(null);
    setSpunShow(null);
    setAnswerRevealed(false);
  }

  return (
    <section className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-trivia-gold">
            Round One
          </p>
          <h2 className="font-display text-3xl text-trivia-paper sm:text-4xl">
            Game Board
          </h2>
        </div>
        <span
          className="rounded-xl px-4 py-2 text-sm font-bold text-white"
          style={{ backgroundColor: "var(--color-success)" }}
        >
          {currentPlayer?.name ?? "No Player"}'s Turn
        </span>
      </div>

      <div className="rounded-2xl border border-white/15 bg-black/25 p-5">
        <p className="mb-3 text-sm font-semibold uppercase tracking-[0.12em] text-trivia-gold">
          TV Show Panels
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {showPool.map((show) => {
            const highlightedShow =
              animatedShowIndex !== null && showPool[animatedShowIndex]
                ? showPool[animatedShowIndex]
                : spunShow;
            const isSelected = highlightedShow === show;
            return (
              <button
                key={show}
                type="button"
                onClick={() => selectShow(show)}
                disabled={isSelectingShow}
                className={[
                  "rounded-xl border px-4 py-4 text-left transition",
                  isSelected
                    ? "border-trivia-gold/70 bg-trivia-gold/15"
                    : "border-white/15 bg-black/25 hover:bg-white/10",
                ].join(" ")}
              >
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-trivia-gold">
                  Show
                </p>
                <p className="mt-1 font-display text-lg text-trivia-paper">{show}</p>
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-2xl border border-white/15 bg-black/25 p-5">
        <p className="mb-3 text-sm font-semibold uppercase tracking-[0.12em] text-trivia-gold">
          Select + Draw Flow
        </p>
        <p className="mb-4 text-white/85">{statusMessage}</p>
        <div className="flex flex-wrap gap-2">
          <Link to="/settings" className="btn-secondary">
            Open Settings
          </Link>
          <button
            type="button"
            className="btn-primary"
            onClick={runShowSelectionAnimation}
            disabled={isSelectingShow}
            >
              {isSelectingShow ? "Selecting..." : "Select show"}
              </button>
          <button
            type="button"
            className="btn-primary"
            onClick={drawQuestion}
            disabled={!spunShow}
          >
            Draw question
          </button>
        </div>
        <p className="mt-4 text-sm text-white/80">
          Active decade: <span className="font-semibold text-trivia-gold">{selectedDecade}</span>
        </p>
      </div>

      {activeQuestion ? (
        <QuestionCard
          showTitle={activeQuestion.showTitle ?? activeQuestion.showId}
          difficulty={activeQuestion.difficulty}
          prompt={activeQuestion.prompt}
          answer={activeQuestion.answer}
          isRevealed={answerRevealed}
          onReveal={() => setAnswerRevealed(true)}
          onMarkCorrect={() => completeTurn(true)}
          onMarkWrong={() => completeTurn(false)}
        />
      ) : null}

      <div
        className="rounded-2xl p-5"
        style={{
          border: "1px solid color-mix(in oklab, var(--color-accent) 55%, black 15%)",
          background:
            "color-mix(in oklab, var(--color-accent) 26%, var(--color-surface-2) 74%)",
        }}
      >
        <p className="mb-2 text-sm font-semibold uppercase tracking-[0.12em] text-trivia-gold">
          Recommendation
        </p>
        <p className="text-white/90">
          Add a projected scoreboard panel on this screen so hosts can quickly
          resolve ties between close players.
        </p>
      </div>

      <Link to="/" className="btn-secondary">
        Back to home
      </Link>
    </section>
  );
}
