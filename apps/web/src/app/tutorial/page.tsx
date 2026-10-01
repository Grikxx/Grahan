"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  RAHU, applyMove, buildPlane, legalMovesFrom, newGame, positionFromRows,
  type GameState, type Move, type VariantId,
} from "@grahan/engine";
import Board from "@/components/Board";
import SiteNav from "@/components/SiteNav";

interface Lesson {
  title: string;
  text: string;
  variant: VariantId;
  rows?: string[];
  marks?: string[];
  /** Returns true when solved, or a short nudge explaining what to try instead. */
  check?: (move: Move, after: GameState) => true | string;
  success?: string;
}

const at = (name: string) => {
  return buildPlane(6).point(name.charCodeAt(0) - 97, Number(name.slice(1)) - 1);
};

const LESSONS: Lesson[] = [
  {
    title: "Your stones",
    text:
      "You play Rahu, the dark stones with a silver rim. Pick one of them. Rings appear on every point it can reach, and coloured lines show the straight lines and diagonals it can travel along. Then choose a ring to slide there.",
    variant: "grahan-6",
    check: () => true,
    success: "That is a whole turn: one stone, one slide along one straight line or diagonal, as far as you like.",
  },
  {
    title: "Straight lines & diagonals",
    text:
      "Stones slide in straight paths: horizontally, vertically, or diagonally. Movement is bounded by the edges of the board. Slide your stone from b3 to the star on e3.",
    variant: "grahan-6",
    rows: [
      "......",
      "......",
      ".R....",
      "......",
      "......",
      "......",
    ],
    marks: ["e3"],
    check: (m) => (m.to === at("e3") ? true : "Try sliding straight right from b3 to e3."),
    success: "Pieces slide smoothly along straight lines and stop at the board edges or before blocking stones.",
  },
  {
    title: "Eclipse a sun",
    text:
      "When your stone lands so that enemy stones sit in a straight row between it and another of your stones, those enemy stones are taken. Move a stone to c4 to take the sun on c3.",
    variant: "grahan-6",
    rows: [
      "......",
      "..R...",
      "..S...",
      "R.....",
      "......",
      "......",
    ],
    marks: ["c4"],
    check: (_m, after) =>
      after.lastCaptured.length > 0 ? true : "Put your stone on c4 so the sun on c3 sits between c2 and c4.",
    success: "Eclipsed. Only the enemy stones between your two stones are taken, and only by the stone that just moved.",
  },
  {
    title: "Landing in a trap is safe",
    text:
      "Only the stone that moves can capture. Slide into the gap on c3, right between two suns. Nothing happens to you: they would have to move a stone away and back to take you.",
    variant: "grahan-6",
    rows: [
      "......",
      "..S...",
      "R.....",
      "..S...",
      "......",
      "......",
    ],
    marks: ["c3"],
    check: (m) => (m.to === at("c3") ? true : "Slide the stone on a3 to the star on c3."),
    success: "Safe. A sandwich only counts at the moment you close it yourself.",
  },
  {
    title: "Two at once",
    text:
      "One landing can close sandwiches on several lines at the same time (e.g. horizontally and vertically). Find the move that takes both suns.",
    variant: "grahan-6",
    rows: [
      "......",
      "..R...",
      "..S...",
      "...SR.",
      ".R....",
      "......",
    ],
    marks: ["c4"],
    check: (_m, after) =>
      after.lastCaptured.length >= 2
        ? true
        : after.lastCaptured.length === 1
          ? "One taken. Find the landing point that closes both lines at once."
          : "Look for a point next to both suns.",
    success: "A double eclipse. Look for intersection points where multiple lines converge.",
  },
  {
    title: "How to win",
    text:
      "On this 6 × 6 board, take 5 stones to win! You also win if your opponent has no legal move. A position may never repeat (superko), so nobody can shuffle back and forth forever.",
    variant: "grahan-6",
  },
];

function startPosition(l: Lesson): GameState {
  return l.rows ? positionFromRows(l.variant, l.rows, RAHU) : newGame(l.variant);
}

export default function TutorialPage() {
  const [index, setIndex] = useState(0);
  const [done, setDone] = useState<ReadonlySet<number>>(new Set());
  const [position, setPosition] = useState(() => startPosition(LESSONS[0]));
  const [selected, setSelected] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<{ kind: "good" | "bad"; text: string } | null>(null);
  const [solved, setSolved] = useState(false);
  const resetTimer = useRef<number | undefined>(undefined);

  const lesson = LESSONS[index];
  const targets = useMemo(
    () => (selected !== null && !solved ? legalMovesFrom(position, selected) : []),
    [position, selected, solved],
  );

  const goTo = (i: number) => {
    if (resetTimer.current) clearTimeout(resetTimer.current);
    setIndex(i);
    setPosition(startPosition(LESSONS[i]));
    setSelected(null);
    setFeedback(null);
    setSolved(false);
  };

  const next = () => {
    if (index + 1 < LESSONS.length) goTo(index + 1);
  };

  const prev = () => {
    if (index > 0) goTo(index - 1);
  };

  const restartLesson = () => {
    if (resetTimer.current) clearTimeout(resetTimer.current);
    setPosition(startPosition(lesson));
    setSelected(null);
    setFeedback(null);
    setSolved(false);
  };

  const onCellClick = (cell: number) => {
    if (solved) return;
    if (selected !== null) {
      const m = targets.find((t) => t.to === cell);
      if (m) {
        const after = applyMove(position, m);
        setPosition(after);
        setSelected(null);
        if (lesson.check) {
          const res = lesson.check(m, after);
          if (res === true) {
            setFeedback({ kind: "good", text: lesson.success ?? "Well played." });
            setSolved(true);
            setDone((d) => new Set([...d, index]));
          } else {
            setFeedback({ kind: "bad", text: res });
            resetTimer.current = window.setTimeout(restartLesson, 2200);
          }
        }
        return;
      }
    }
    if (position.board[cell] === RAHU && cell !== selected) {
      setSelected(cell);
      setFeedback(null);
    } else {
      setSelected(null);
    }
  };

  const marks = useMemo(() => (lesson.marks ?? []).map((m) => at(m)), [lesson]);

  return (
    <>
      <SiteNav />
      <main className="table">
        <h1 className="sr-only">Grahan lesson {index + 1}: {lesson.title}</h1>
        <section className="table-board" aria-label="Interactive board">
          <Board
            state={position}
            selected={selected}
            targets={targets}
            marks={marks}
            interactive={!solved && Boolean(lesson.check)}
            sound
            label={`Lesson board: ${lesson.title}`}
            onCellClick={onCellClick}
            onEscape={() => setSelected(null)}
          />
        </section>

        <aside className="almanac flex flex-col justify-between" aria-label="Lesson panel">
          <div>
            <nav className="lesson-tabs" aria-label="Lessons">
              {LESSONS.map((l, i) => (
                <button
                  key={l.title}
                  className="lesson-tab"
                  aria-current={i === index ? "step" : undefined}
                  onClick={() => goTo(i)}
                  title={`${i + 1}. ${l.title}`}
                >
                  <span className="sr-only">{i + 1}. {l.title}</span>
                  {done.has(i) ? "✓" : i + 1}
                </button>
              ))}
            </nav>

            <p className="lesson-badge">Lesson {index + 1} of {LESSONS.length}</p>
            <h2 className="h-section mt-1">{lesson.title}</h2>
            <p className="muted mt-3">{lesson.text}</p>

            {feedback && (
              <div
                className={`feedback mt-4 ${feedback.kind === "good" ? "feedback-good" : "feedback-bad"}`}
                role="status"
              >
                {feedback.text}
              </div>
            )}
          </div>

          <div className="mt-8 flex flex-col gap-3">
            <div className="flex flex-wrap gap-2">
              {index > 0 && (
                <button className="btn btn-quiet btn-sm" onClick={prev}>Previous</button>
              )}
              {Boolean(lesson.check) && (
                <button className="btn btn-quiet btn-sm" onClick={restartLesson}>Reset</button>
              )}
              {index + 1 < LESSONS.length && (
                <button className={`btn btn-sm ${solved ? "btn-brass" : "btn-line"}`} onClick={next}>
                  {solved ? "Next lesson →" : "Skip →"}
                </button>
              )}
              {index + 1 === LESSONS.length && (
                <Link href="/play" className="btn btn-brass">Play a game now →</Link>
              )}
            </div>
            <p className="caption">You can skip back and forth between lessons at any time.</p>
          </div>
        </aside>
      </main>
    </>
  );
}
