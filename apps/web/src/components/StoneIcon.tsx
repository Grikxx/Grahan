import { RAHU, type Player } from "@grahan/engine";

/** Small static stone, matching the canvas pieces. `eclipsed` dims it with a shadow. */
export default function StoneIcon({ who, size = 28, eclipsed = false, faded = false }: {
  who: Player;
  size?: number;
  eclipsed?: boolean;
  faded?: boolean;
}) {
  const id = `g${who}${size}`;
  const rays = Array.from({ length: 12 }, (_, i) => (i / 12) * Math.PI * 2);
  return (
    <svg width={size} height={size} viewBox="-20 -20 40 40" aria-hidden="true" style={{ opacity: faded ? 0.3 : 1, flex: "none", display: "inline-block", verticalAlign: "-0.2em" }}>
      <defs>
        <radialGradient id={`${id}r`} cx="35%" cy="35%" r="70%">
          <stop offset="0" stopColor="#2E2768" />
          <stop offset="1" stopColor="#090718" />
        </radialGradient>
        <radialGradient id={`${id}s`} cx="38%" cy="38%" r="70%">
          <stop offset="0" stopColor="#FFF2C4" />
          <stop offset="0.55" stopColor="#F6B93B" />
          <stop offset="1" stopColor="#D07A22" />
        </radialGradient>
      </defs>
      {who === RAHU ? (
        <>
          <circle r="12" fill={`url(#${id}r)`} stroke="#B9C8F5" strokeWidth="1.6" />
          <circle cx="8.5" cy="-8.5" r="1.6" fill="#F4F7FF" />
        </>
      ) : (
        <>
          {rays.map((a) => (
            <polygon
              key={a}
              fill="#F2A93B"
              points={`${Math.cos(a - 0.14) * 11},${Math.sin(a - 0.14) * 11} ${Math.cos(a) * 16},${Math.sin(a) * 16} ${Math.cos(a + 0.14) * 11},${Math.sin(a + 0.14) * 11}`}
            />
          ))}
          <circle r="11" fill={`url(#${id}s)`} />
        </>
      )}
      {eclipsed && <circle cx="3" cy="-2" r="11.5" fill="#07051A" opacity="0.92" />}
    </svg>
  );
}
