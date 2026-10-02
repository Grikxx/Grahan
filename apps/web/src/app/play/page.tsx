"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import {
  LEVELS, RAHU, SURYA, VARIANTS, moveName, playerName, pointName,
  type GameState, type Level, type Player, type VariantId,
} from "@grahan/engine";
import Board from "@/components/Board";
import SiteNav from "@/components/SiteNav";
import StoneIcon from "@/components/StoneIcon";
import TurnCounter from "@/components/TurnCounter";
import WinningAnimation from "@/components/WinningAnimation";
import { DEFAULT_SETUP, useGrahan, type Setup } from "@/hooks/useGrahan";
import { getSoundEnabled, getSoundServerSnapshot, setSoundEnabled, subscribeSound } from "@/lib/sound";

export default function PlayPage() {
  const game = useGrahan();
  const [phase, setPhase] = useState<"setup" | "game">("setup");
  const [draft, setDraft] = useState<Setup>(DEFAULT_SETUP);

  const begin = (setup: Setup) => {
    game.start(setup);
    setPhase("game");
  };

  return (
    <>
      <SiteNav />
      {phase === "setup" ? (
        <SetupScreen draft={draft} onChange={setDraft} onStart={() => begin(draft)} />
      ) : (
        <GameTable
          game={game}
          onRematch={() => begin(game.setup)}
          onChangeSetup={() => {
            setDraft(game.setup);
            setPhase("setup");
          }}
        />
      )}
    </>
  );
}

// ─── Setup ──────────────────────────────────────────────────────────

function Choice<T extends string | number>({
  legend, name, value, options, onChange,
}: {
  legend: string;
  name: string;
  value: T;
  options: { value: T; title: string; sub?: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <fieldset className="choice">
      <legend>{legend}</legend>
      <div className="choice-row">
        {options.map((o) => (
          <label key={String(o.value)}>
            <input type="radio" name={name} checked={value === o.value} onChange={() => onChange(o.value)} />
            <span className="choice-title">{o.title}</span>
            {o.sub && <span className="choice-sub">{o.sub}</span>}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function SetupScreen({ draft, onChange, onStart }: { draft: Setup; onChange: (s: Setup) => void; onStart: () => void }) {
  const set = (patch: Partial<Setup>) => onChange({ ...draft, ...patch });
  return (
    <main className="page pb-16">
      <form
        className="plate mx-auto mt-4 flex max-w-2xl flex-col gap-7 p-6 md:p-9"
        onSubmit={(e) => {
          e.preventDefault();
          onStart();
        }}
      >
        <div>
          <h1 className="h-section">New game</h1>
          <p className="muted mt-1">Rahu, the shadow, always moves first.</p>
        </div>

        <Choice<VariantId>
          legend="Board Size"
          name="variant"
          value={draft.variant}
          onChange={(variant) => set({ variant })}
          options={[
            { value: "grahan-6", title: "6 × 6", sub: "12 stones each, take 5 to win · 100 turns limit" },
            { value: "grahan-7", title: "7 × 7", sub: "14 stones each, take 6 to win · 125 turns limit" },
            { value: "grahan-8", title: "8 × 8", sub: "16 stones each, take 7 to win · 150 turns limit" },
            { value: "grahan-9", title: "9 × 9", sub: "18 stones each, take 8 to win · 175 turns limit" },
            { value: "grahan-10", title: "10 × 10", sub: "20 stones each, take 9 to win · 200 turns limit" },
          ]}
        />

        <Choice
          legend="Opponent"
          name="opponent"
          value={draft.opponent}
          onChange={(opponent) => set({ opponent })}
          options={[
            { value: "computer", title: "Computer" },
            { value: "friend", title: "A friend", sub: "Take turns on this device" },
          ]}
        />

        {draft.opponent === "computer" && (
          <>
            <Choice
              legend="Computer strength"
              name="level"
              value={draft.level}
              onChange={(level) => set({ level: level as Level })}
              options={([1, 2, 3] as const).map((l) => ({ value: l, title: LEVELS[l].name, sub: LEVELS[l].blurb }))}
            />
            <Choice
              legend="You play"
              name="side"
              value={draft.human}
              onChange={(human) => set({ human: human as Player })}
              options={[
                { value: RAHU, title: "Rahu", sub: "The shadow, moves first" },
                { value: SURYA, title: "Surya", sub: "The sun, moves second" },
              ]}
            />
          </>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" className="btn btn-brass">Start game</button>
          <Link href="/tutorial" className="btn btn-quiet">New here? Take the 3-minute lesson</Link>
        </div>
      </form>
    </main>
  );
}

// ─── Game table ─────────────────────────────────────────────────────

type Game = ReturnType<typeof useGrahan>;

function roleOf(game: Game, side: Player) {
  if (game.setup.opponent === "friend") return side === RAHU ? "Player 1" : "Player 2";
  return side === game.setup.human ? "You" : `Computer, ${LEVELS[game.setup.level].name}`;
}

function PlayerPlate({ game, side }: { game: Game; side: Player }) {
  const target = game.state.variant.captureTarget;
  const taken = game.state.captured[side === RAHU ? 0 : 1];
  const active = !game.over && game.state.turn === side;
  const enemy: Player = side === RAHU ? SURYA : RAHU;
  const computer = game.setup.opponent === "computer" && side !== game.setup.human;
  return (
    <div className="player" data-active={active}>
      <StoneIcon who={side} size={34} />
      <div>
        <div className="player-name">{playerName(side)}</div>
        <div className="player-role">
          {roleOf(game, side)}
          {active && (computer ? ", thinking" : ", to move")}
        </div>
      </div>
      <div className="tally" aria-label={`${taken} of ${target} enemy stones taken`}>
        {Array.from({ length: target }, (_, i) => (
          <StoneIcon key={i} who={enemy} size={22} eclipsed={i < taken} faded={i >= taken} />
        ))}
        <span className="muted ml-1 text-sm">{taken} of {target} taken</span>
      </div>
    </div>
  );
}

type LogEntry = { text: string; caps: number };

function MoveLog({ timeline }: { timeline: readonly GameState[] }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [timeline.length]);

  const entries: LogEntry[] = timeline.slice(1).map((s) => ({ text: moveName(s.plane, s.lastMove!), caps: s.lastCaptured.length }));
  const rows: { n: number; a?: LogEntry; b?: LogEntry }[] = [];
  for (let i = 0; i < entries.length; i += 2) rows.push({ n: i / 2 + 1, a: entries[i], b: entries[i + 1] });

  const cell = (e?: LogEntry) =>
    e ? (
      <span>
        {e.text.replace(/ ×\d+$/, "")}
        {e.caps > 0 && <span className="cap"> ×{e.caps}</span>}
      </span>
    ) : (
      <span />
    );

  return (
    <div className="plate move-log" ref={ref} aria-label="Moves played" tabIndex={0}>
      {rows.length === 0 ? (
        <p className="muted text-sm">Moves appear here.</p>
      ) : (
        <ol>
          {rows.map((r) => (
            <li key={r.n} className="contents">
              <span className="num">{r.n}.</span>
              {cell(r.a)}
              {cell(r.b)}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function statusText(game: Game, showDanger: boolean): React.ReactNode {
  const { state, setup } = game;
  const name = playerName(state.turn);
  if (game.over) return "Game over.";
  if (game.hint) {
    const fromName = pointName(state.plane, game.hint.from);
    const toName = pointName(state.plane, game.hint.to);
    return (
      <span className="text-moon font-medium">
        💡 Hint: Slide {fromName} to {toName}.
      </span>
    );
  }
  if (game.thinking) return `${name} is thinking…`;
  const vsComputer = setup.opponent === "computer";
  const threatened = showDanger ? game.danger.size : 0;
  const warn =
    threatened > 0 ? (
      <span className="text-sindoor">
        {" "}
        {threatened === 1 ? "One stone, ringed in red, can be taken." : `${threatened} stones, ringed in red, can be taken.`}
      </span>
    ) : null;
  if (game.selected !== null) {
    return game.targets.length > 0 ? (
      <>Choose a ring to slide there, or pick another stone.{warn}</>
    ) : (
      <>That stone cannot move right now. Pick another.{warn}</>
    );
  }
  return (
    <>
      {vsComputer ? "Your move." : `${name} to move.`} Pick one of {vsComputer ? "your" : `${name}’s`} stones.{warn}
    </>
  );
}

function ResultCard({ game, onRematch, onChangeSetup }: { game: Game; onRematch: () => void; onChangeSetup: () => void }) {
  const { result, setup, state } = game;
  const winner: Player | null = result.winner === "rahu" ? RAHU : result.winner === "surya" ? SURYA : null;
  const winnerName = winner ? playerName(winner) : "";
  const loserName = winner ? playerName(winner === RAHU ? SURYA : RAHU) : "";
  const target = state.variant.captureTarget;

  let title = "Drawn game";
  if (winner) {
    title = setup.opponent === "computer" && winner === setup.human ? "You win" : `${winnerName} wins`;
  }
  const reason =
    result.reason === "target"
      ? `${winnerName} eclipsed ${target} stones.`
      : result.reason === "trapped"
        ? `${loserName} had no legal move left.`
        : winner
          ? `The ${state.variant.maxTurns}-turn limit was reached and ${winnerName} had more stones.`
          : `The ${state.variant.maxTurns}-turn limit was reached with equal stones.`;

  return (
    <div className="result" role="dialog" aria-labelledby="result-title">
      <div className="result-card">
        {winner && (
          <div className="mb-3 flex justify-center">
            <StoneIcon who={winner} size={56} />
          </div>
        )}
        <h2 id="result-title" className="h-section">{title}</h2>
        <p className="muted mt-2">{reason}</p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <button className="btn btn-brass" onClick={onRematch}>Play again</button>
          <button className="btn btn-line" onClick={onChangeSetup}>Change setup</button>
        </div>
      </div>
    </div>
  );
}

function GameTable({ game, onRematch, onChangeSetup }: { game: Game; onRematch: () => void; onChangeSetup: () => void }) {
  const [showDanger, setShowDanger] = useState(true);
  const soundOn = useSyncExternalStore(subscribeSound, getSoundEnabled, getSoundServerSnapshot);
  const variant = VARIANTS[game.setup.variant];
  const humanTurn = game.canAct;

  return (
    <main className="table">
      <h1 className="sr-only">Grahan, {variant.q} by {variant.q}</h1>
      <section className="table-board" aria-label="Board">
        <Board
          state={game.state}
          selected={game.selected}
          targets={game.targets}
          danger={showDanger && humanTurn ? game.danger : null}
          hint={game.hint}
          interactive={humanTurn}
          sound
          onCellClick={game.clickCell}
          onEscape={game.deselect}
          onAnimating={game.setAnimating}
        />
        {game.over && (
          <WinningAnimation
            winner={game.result.winner === "rahu" ? RAHU : game.result.winner === "surya" ? SURYA : null}
            opponent={game.setup.opponent}
            human={game.setup.human}
            reason={
              game.result.reason === "target"
                ? `${game.result.winner === "rahu" ? "Rahu" : "Surya"} reached ${game.state.variant.captureTarget} captures.`
                : game.result.reason === "trapped"
                  ? `${game.result.winner === "rahu" ? "Surya" : "Rahu"} was completely trapped with no legal moves.`
                  : game.result.winner
                    ? `The turn limit was reached and ${game.result.winner === "rahu" ? "Rahu" : "Surya"} held more territory.`
                    : "The turn limit was reached with an equal number of stones."
            }
            captures={
              game.result.winner === "rahu"
                ? game.state.captured[0]
                : game.result.winner === "surya"
                  ? game.state.captured[1]
                  : 0
            }
            target={game.state.variant.captureTarget}
            ply={game.state.ply}
            maxTurns={variant.maxTurns}
            onRematch={onRematch}
            onChangeSetup={onChangeSetup}
          />
        )}
      </section>

      <aside className="almanac" aria-label="Game panel">
        <TurnCounter
          ply={game.state.ply}
          maxTurns={variant.maxTurns}
          maxPly={variant.maxPly}
          turn={game.state.turn}
          over={game.over}
          variantName={variant.name}
        />
        <PlayerPlate game={game} side={RAHU} />
        <PlayerPlate game={game} side={SURYA} />

        <p className="status" aria-live="polite">{statusText(game, showDanger)}</p>

        <div className="toolbar" role="toolbar" aria-label="Game controls">
          <button className="btn btn-quiet btn-sm" onClick={game.undo} disabled={!game.canUndo}>Undo</button>
          <button className="btn btn-quiet btn-sm" onClick={game.askHint} disabled={!humanTurn || game.hinting}>
            {game.hinting ? "Looking…" : "Hint"}
          </button>
          <button className="btn btn-quiet btn-sm" aria-pressed={showDanger} onClick={() => setShowDanger((d) => !d)}>
            Show danger
          </button>
          <button className="btn btn-quiet btn-sm" aria-pressed={soundOn} onClick={() => setSoundEnabled(!soundOn)}>
            Sound
          </button>
        </div>

        <MoveLog timeline={game.timeline} />

        <div className="flex flex-wrap gap-2">
          <button className="btn btn-line btn-sm" onClick={onRematch}>Restart</button>
          <button className="btn btn-quiet btn-sm" onClick={onChangeSetup}>Change setup</button>
        </div>
      </aside>
    </main>
  );
}
