import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import type { Difficulty, Question } from "@tv-trivia/shared";
import { QuestionCard } from "../components/QuestionCard";
import { WheelSpinner } from "../components/WheelSpinner";
import { fetchQuestionBank } from "../lib/api";
import { decadeShowPresets, getSavedDecade } from "../lib/decades";

const pointsByDifficulty: Record<Difficulty, number> = {
  easy: 100,
  medium: 200,
  hard: 300,
};

export function GamePage() {
  const [players, setPlayers] = useState([
    { playerName: "Player 1", score: 220 },
    { playerName: "Player 2", score: 190 },
    { playerName: "Player 3", score: 160 },
  ]);
  const [selectedDecade] = useState(getSavedDecade);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [spunShow, setSpunShow] = useState<string | null>(null);
  const [activeQuestion, setActiveQuestion] = useState<Question | null>(null);
  const [questionBank, setQuestionBank] = useState<Question[]>([]);
  const [usedQuestionIds, setUsedQuestionIds] = useState<string[]>([]);
  const [answerRevealed, setAnswerRevealed] = useState(false);
  const [statusMessage, setStatusMessage] = useState("Spin the wheel to start a turn.");
  const [wheelRotation, setWheelRotation] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const spinTimeoutRef = useRef<number | null>(null);

  const showPool = decadeShowPresets[selectedDecade];
  const currentPlayer = players[currentPlayerIndex];

  useEffect(() => {
    void loadQuestionBank();
  }, []);

  useEffect(() => {
    return () => {
      if (spinTimeoutRef.current) {
        window.clearTimeout(spinTimeoutRef.current);
      }
    };
  }, []);

  async function loadQuestionBank() {
    try {
      const questions = await fetchQuestionBank();
      setQuestionBank(questions);
      if (questions.length > 0) {
        setStatusMessage(`Loaded ${questions.length} generated questions. Spin to start.`);
      }
    } catch (error) {
      console.error(error);
      setStatusMessage("Question bank unavailable. Generate questions to continue.");
    }
  }

  function spinWheel() {
    if (isSpinning) {
      return;
    }

    const selectedIndex = Math.floor(Math.random() * showPool.length);
    const selectedShow = showPool[selectedIndex];
    const segmentAngle = 360 / showPool.length;
    const selectedCenterAngle = selectedIndex * segmentAngle + segmentAngle / 2;
    const currentMod = ((wheelRotation % 360) + 360) % 360;
    const alignmentDelta = (360 - ((currentMod + selectedCenterAngle) % 360)) % 360;
    const extraTurns = (5 + Math.floor(Math.random() * 3)) * 360;
    const nextRotation = wheelRotation + extraTurns + alignmentDelta;

    setIsSpinning(true);
    setWheelRotation(nextRotation);
    setSpunShow(null);
    setActiveQuestion(null);
    setAnswerRevealed(false);
    setStatusMessage(`${currentPlayer.playerName} is spinning the wheel...`);

    if (spinTimeoutRef.current) {
      window.clearTimeout(spinTimeoutRef.current);
    }
    spinTimeoutRef.current = window.setTimeout(() => {
      setIsSpinning(false);
      setSpunShow(selectedShow);
      setStatusMessage(`${currentPlayer.playerName} spun: ${selectedShow}. Draw a question.`);
    }, 2600);
  }

  function drawQuestion() {
    if (isSpinning) {
      setStatusMessage("Wait for the wheel to stop before drawing a question.");
      return;
    }

    if (!spunShow) {
      setStatusMessage("Spin the wheel first, then draw a question.");
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
    setStatusMessage(`Question loaded for ${currentPlayer.playerName} from ${spunShow}.`);
  }

  function completeTurn(isCorrect: boolean) {
    if (!activeQuestion) {
      return;
    }

    const points = pointsByDifficulty[activeQuestion.difficulty];
    const nextPlayerIndex = (currentPlayerIndex + 1) % players.length;
    const nextPlayerName = players[nextPlayerIndex]?.playerName ?? "Next player";

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
        ? `${currentPlayer.playerName} earned ${points} points. ${nextPlayerName} is up next.`
        : `${currentPlayer.playerName} missed. ${nextPlayerName} is up next.`
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
        <span className="rounded-xl bg-trivia-green px-4 py-2 text-sm font-bold text-white">
          {currentPlayer.playerName} Turn
        </span>
      </div>

      <WheelSpinner
        shows={showPool}
        rotation={wheelRotation}
        isSpinning={isSpinning}
        selectedShow={spunShow}
        onSpin={spinWheel}
      />

      <div className="rounded-2xl border border-white/15 bg-black/25 p-5">
        <p className="mb-3 text-sm font-semibold uppercase tracking-[0.12em] text-trivia-gold">
          Player Scoreboard
        </p>
        <p className="mb-4 text-white/85">
          View full player standings and highlights on the Player Scoreboard page.
        </p>
        <Link to="/player-scoreboard" className="btn-secondary">
          Go to Player Scoreboard
        </Link>
      </div>

      <div className="rounded-2xl border border-white/15 bg-black/25 p-5">
        <p className="mb-3 text-sm font-semibold uppercase tracking-[0.12em] text-trivia-gold">
          Spin + Draw Flow
        </p>
        <p className="mb-4 text-white/85">{statusMessage}</p>
        <div className="flex flex-wrap gap-2">
          <Link to="/settings" className="btn-secondary">
            Open Settings
          </Link>
          <button type="button" className="btn-primary" onClick={spinWheel} disabled={isSpinning}>
            {isSpinning ? "Spinning..." : "Spin wheel"}
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={drawQuestion}
            disabled={isSpinning || !spunShow}
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

      <div className="rounded-2xl border border-trivia-blue/50 bg-trivia-blue/20 p-5">
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
