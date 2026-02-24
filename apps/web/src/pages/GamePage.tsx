import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import type { Difficulty, Player, Question } from "@tv-trivia/shared";
import { QuestionCard } from "../components/QuestionCard";
import { fetchQuestionBank } from "../lib/api";
import { getConfiguredShowsForDecade, getSavedDecade } from "../lib/decades";
import {
  getSavedCurrentPlayerIndex,
  getSavedRoundNumber,
  getSavedUsedQuestionIds,
  saveCurrentPlayerIndex,
  saveUsedQuestionIds,
  startNextRound,
} from "../lib/gameState";
import { getSavedPlayers, savePlayers } from "../lib/players";

const pointsByDifficulty: Record<Difficulty, number> = {
  easy: 50,
  medium: 100,
  hard: 200,
};

export function GamePage() {
  const [players, setPlayers] = useState<Player[]>(getSavedPlayers);
  const [selectedDecade] = useState(getSavedDecade);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(getSavedCurrentPlayerIndex);
  const [roundNumber, setRoundNumber] = useState(getSavedRoundNumber);
  const [spunShow, setSpunShow] = useState<string | null>(null);
  const [activeQuestion, setActiveQuestion] = useState<Question | null>(null);
  const [questionBank, setQuestionBank] = useState<Question[]>([]);
  const [usedQuestionIds, setUsedQuestionIds] = useState<string[]>(() =>
    getSavedUsedQuestionIds(getSavedDecade())
  );
  const [answerRevealed, setAnswerRevealed] = useState(false);
  const [statusMessage, setStatusMessage] = useState(
    "Select a TV show panel, then draw a question."
  );
  const [turnNumber, setTurnNumber] = useState(0);
  const [showSelectedForTurn, setShowSelectedForTurn] = useState<number | null>(null);
  const [questionDrawnForTurn, setQuestionDrawnForTurn] = useState<number | null>(null);
  const [isSelectingShow, setIsSelectingShow] = useState(false);
  const [animatedShowIndex, setAnimatedShowIndex] = useState<number | null>(null);
  const showAnimationIntervalRef = useRef<number | null>(null);
  const showAnimationTimeoutRef = useRef<number | null>(null);
  const completingTurnRef = useRef(false);

  const showPool = getConfiguredShowsForDecade(selectedDecade);
  const currentPlayer = players[currentPlayerIndex] ?? players[0];
  const rankedPlayers = [...players].sort((a, b) => b.score - a.score);
  const winnerPlayer =
    players.length > 0
      ? players.reduce((best, player) => (player.score > best.score ? player : best), players[0])
      : null;
  const hasWinner = Boolean(winnerPlayer && winnerPlayer.score >= 1000);

  useEffect(() => {
    void loadQuestionBank();
  }, []);

  useEffect(() => {
    savePlayers(players);
  }, [players]);

  useEffect(() => {
    saveCurrentPlayerIndex(currentPlayerIndex);
  }, [currentPlayerIndex]);

  useEffect(() => {
    saveUsedQuestionIds(selectedDecade, usedQuestionIds);
  }, [selectedDecade, usedQuestionIds]);

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
      const questions = await fetchQuestionBank(selectedDecade);
      setQuestionBank(questions);
      if (questions.length > 0) {
        setStatusMessage(
          `Loaded ${questions.length} generated ${selectedDecade} questions. Select a show to start.`
        );
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
      setStatusMessage("Add players in Settings > Manage Players before starting.");
      return;
    }

    setSpunShow(show);
    completingTurnRef.current = false;
    setShowSelectedForTurn(turnNumber);
    setQuestionDrawnForTurn(null);
    setActiveQuestion(null);
    setAnswerRevealed(false);
    setStatusMessage(`${currentPlayer.name} selected: ${show}. Draw a question.`);
  }

  function runShowSelectionAnimation() {
    if (isSelectingShow) {
      return;
    }

    if (!currentPlayer) {
      setStatusMessage("Add players in Settings > Manage Players before starting.");
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
    completingTurnRef.current = false;
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
      setShowSelectedForTurn(turnNumber);
      setQuestionDrawnForTurn(null);
      setStatusMessage(`${currentPlayer.name} selected: ${finalShow}. Draw a question.`);
    }, 5000);
  }

  function drawQuestion() {
    if (hasWinner) {
      setStatusMessage("Round complete. Use Start new round.");
      return;
    }

    if (!spunShow || showSelectedForTurn !== turnNumber) {
      setStatusMessage("Select a new TV show for this player, then draw a question.");
      return;
    }

    if (questionDrawnForTurn === turnNumber || activeQuestion) {
      setStatusMessage("A question is already active for this turn.");
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
    completingTurnRef.current = false;
    setActiveQuestion(selectedQuestion);
    setQuestionDrawnForTurn(turnNumber);
    setUsedQuestionIds((prev) => [...prev, selectedQuestion.id]);
    setAnswerRevealed(false);
    setStatusMessage(`Question loaded for ${currentPlayer.name} from ${spunShow}.`);
  }

  function completeTurn(isCorrect: boolean) {
    if (!activeQuestion || completingTurnRef.current) {
      return;
    }
    completingTurnRef.current = true;

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
    setTurnNumber((prev) => prev + 1);
    setStatusMessage(
      isCorrect
        ? `${currentPlayer.name} earned ${points} points. ${nextPlayerName} is up next.`
        : `${currentPlayer.name} missed. ${nextPlayerName} is up next.`
    );
    setActiveQuestion(null);
    setSpunShow(null);
    setShowSelectedForTurn(null);
    setQuestionDrawnForTurn(null);
    setAnswerRevealed(false);
  }

  function skipActiveQuestion() {
    if (!activeQuestion) {
      return;
    }
    setActiveQuestion(null);
    setAnswerRevealed(false);
    setQuestionDrawnForTurn(null);
    setStatusMessage(
      `Skipped question for ${currentPlayer.name}. Draw another question for ${spunShow ?? "this show"}.`
    );
  }

  function startNewRoundFromPopup() {
    const resetPlayers = startNextRound(players);
    setPlayers(resetPlayers);
    setRoundNumber(getSavedRoundNumber());
    setCurrentPlayerIndex(0);
    setTurnNumber(0);
    setSpunShow(null);
    setActiveQuestion(null);
    setAnswerRevealed(false);
    setShowSelectedForTurn(null);
    setQuestionDrawnForTurn(null);
    setAnimatedShowIndex(null);
    setIsSelectingShow(false);
    completingTurnRef.current = false;
    setStatusMessage("New round started. Select a TV show panel, then draw a question.");
  }

  return (
    <section className="space-y-8">
      <div className="entry-title-panel page-enter-title flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-trivia-gold">
            Round {roundNumber}
          </p>
          <h2 className="font-display text-2xl text-trivia-paper sm:text-4xl">
            Game Board
          </h2>
        </div>
        <span
          className="rounded-xl px-4 py-2 text-lg font-bold text-white"
          style={{ backgroundColor: "var(--color-success)" }}
        >
          {currentPlayer?.name ?? "No Player"}'s Turn
        </span>
      </div>

      <div className="page-enter-up entry-delay-1 rounded-2xl border border-white/15 bg-black/25 p-5">
        <p className="mb-3 text-lg font-semibold uppercase tracking-[0.12em] text-trivia-gold">
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
                {/* <p className="text-xs font-semibold uppercase tracking-[0.12em] text-trivia-gold">
                  Show
                </p> */}
                <p className="mt-1 font-display text-lg text-trivia-paper">{show}</p>
              </button>
            );
          })}
        </div>
      </div>

      <div className="page-enter-up entry-delay-2 rounded-2xl border border-white/15 bg-black/25 p-5">
        <p className="mb-3 text-lg font-semibold uppercase tracking-[0.12em] text-trivia-gold">
          Select + Draw Flow
        </p>
        <p className="mb-4 text-white/85">{statusMessage}</p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={spunShow ? "btn-secondary" : "btn-primary"}
            onClick={runShowSelectionAnimation}
            disabled={isSelectingShow}
          >
            {isSelectingShow ? "Selecting..." : "Select random show"}
          </button>
          <button
            type="button"
            className={!spunShow || showSelectedForTurn !== turnNumber || questionDrawnForTurn === turnNumber || Boolean(activeQuestion) ? "btn-secondary" : "btn-primary"}
            onClick={drawQuestion}
            disabled={
              !spunShow ||
              showSelectedForTurn !== turnNumber ||
              questionDrawnForTurn === turnNumber ||
              Boolean(activeQuestion)
            }
          >
            Draw question
          </button>
        </div>
        <p className="mt-4 text-sm text-white/80">
          Active decade: <span className="font-semibold text-trivia-gold">{selectedDecade}</span>
        </p>
      </div>

      {activeQuestion ? (
        <div className="fixed inset-0 z-50 grid place-items-center rounded-2xl p-4 backdrop-blur-md">
          <div className="w-full max-w-2xl rounded-2xl bg-black/80">
            <QuestionCard
              showTitle={activeQuestion.showTitle ?? activeQuestion.showId}
              difficulty={activeQuestion.difficulty}
              prompt={activeQuestion.prompt}
              answer={activeQuestion.answer}
              isRevealed={answerRevealed}
              onReveal={() => setAnswerRevealed(true)}
              onSkip={skipActiveQuestion}
              onMarkCorrect={() => completeTurn(true)}
              onMarkWrong={() => completeTurn(false)}
            />
          </div>
        </div>
      ) : null}

      {hasWinner && winnerPlayer ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-2xl border border-white/20 bg-black/85 p-6 text-center shadow-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-trivia-gold">
              Round Complete
            </p>
            <h3 className="mt-2 font-display text-4xl text-trivia-paper">
              {winnerPlayer.name} Wins!
            </h3>
            <p className="mt-3 text-white/85">
              {winnerPlayer.name} reached {winnerPlayer.score} points and won Round {roundNumber}.
            </p>
            <button type="button" className="btn-primary mt-6" onClick={startNewRoundFromPopup}>
              Start new round
            </button>
          </div>
        </div>
      ) : null}

      <div
        className="page-enter-up entry-delay-3 rounded-2xl p-5 space-y-4"
        style={{
          border: "1px solid color-mix(in oklab, var(--color-success) 95%, transparent 5%)",
          background:
            "color-mix(in oklab, var(--color-success) 15%, transparent 85%)",
        }}
      >
        <p className="mb-2 text-lg font-semibold uppercase tracking-[0.12em] text-trivia-gold">
          Scoreboard
        </p>
        <div className="flex flex-wrap gap-4">
          {rankedPlayers.map((player, index) => (
            <div
              key={player.id}
              className="flex flex-1 min-w-[200px] max-w-[200px] items-center justify-between rounded-lg border border-white/15 bg-black/40 px-3 py-2"
            >
              <p className="text-white/90">
                <span className="mr-2 font-semibold text-trivia-gold">#{index + 1}</span>
                {player.name}
              </p>
              <p className="font-semibold text-white">{player.score} pts</p>
            </div>
          ))}
        </div>
      </div>

      <Link to="/" className="page-enter-up entry-delay-4 btn-secondary">
        Back to home
      </Link>
    </section>
  );
}
