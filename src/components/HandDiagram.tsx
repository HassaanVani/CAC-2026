import { lessons, type Letter } from "../lib/handshape";
// Original simplified palm-facing illustrations; text instructions and the linked
// ASL University reference provide the thumb-placement detail these omit.
export default function HandDiagram({
  letter,
  small = false,
}: {
  letter: Letter;
  small?: boolean;
}) {
  const extended = lessons[letter].fingers;
  const fingers = [
    { x: 87, base: 135, top: 52 },
    { x: 113, base: 127, top: 33 },
    { x: 139, base: 132, top: 46 },
    { x: 164, base: 146, top: 76 },
  ];
  return (
    <svg
      viewBox="0 0 240 250"
      className={`hand-diagram ${small ? "small" : ""}`}
      role="img"
      aria-label={`Simplified palm-facing handshape for ASL letter ${letter}. ${lessons[letter].instruction}`}
    >
      <g
        fill="var(--hand-fill, #eee9dc)"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M82 218 L80 195 Q63 176 69 149 L77 122 Q113 111 166 132 L179 161 Q182 187 159 205 L159 228" />
        {fingers.map((f, i) => {
          const x =
            letter === "V"
              ? f.x + (i === 0 ? -6 : i === 1 ? 9 : 0)
              : letter === "Y" && i === 3
                ? f.x + 16
                : f.x;
          return extended[i] ? (
            <path
              key={i}
              d={`M${f.x - 11} ${f.base + 17} L${x - 11} ${f.top + 12} Q${x - 11} ${f.top} ${x} ${f.top} Q${x + 11} ${f.top} ${x + 11} ${f.top + 12} L${f.x + 11} ${f.base + 20}`}
            />
          ) : (
            <g key={i}>
              <rect
                x={f.x - 12}
                y={f.base - 4}
                width="24"
                height="39"
                rx="11"
              />
              <path d={`M${f.x - 6} ${f.base + 20} h12`} opacity=".4" />
            </g>
          );
        })}
        {letter === "L" || letter === "Y" ? (
          <path d="M86 196 Q71 193 58 174 L27 149 Q17 139 25 132 Q32 126 43 134 L78 154 Q95 159 99 176" />
        ) : letter === "A" ? (
          <path d="M77 190 Q61 175 59 147 L59 119 Q61 107 70 110 Q78 111 78 123 L83 148 Q101 158 100 178" />
        ) : (
          <path d="M77 187 Q65 176 73 164 Q79 157 91 160 L127 171 Q141 175 137 186 Q134 195 123 191 L100 184" />
        )}
        <path d="M112 204 Q133 194 146 200" opacity=".35" />
      </g>
    </svg>
  );
}
