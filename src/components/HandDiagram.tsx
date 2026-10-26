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
  if (letter === "C" || letter === "O") {
    return (
      <svg
        viewBox="0 0 240 250"
        className={`hand-diagram ${small ? "small" : ""}`}
        role="img"
        aria-label={`Simplified side view of ${letter}. ${lessons[letter].instruction}`}
      >
        <g
          fill="var(--hand-fill, #e7eddb)"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path
            d={
              letter === "C"
                ? "M85 222 L83 195 Q60 171 64 137 L70 103 Q74 73 99 55 Q129 37 157 52 Q181 61 178 77 Q175 87 163 82 Q143 69 123 80 Q106 91 108 115 L112 140 L151 133 Q166 131 169 143 Q171 154 157 160 L132 168 Q151 184 151 222"
                : "M85 222 L83 195 Q60 171 64 137 L70 103 Q74 73 99 55 Q129 37 157 52 Q177 62 179 82 L175 118 Q172 141 153 150 L132 168 Q151 184 151 222"
            }
          />
          {letter === "O" && (
            <path
              d="M112 140 Q98 121 108 99 Q118 78 141 84 Q159 89 154 111 L150 124 Q135 119 124 132 Q118 139 112 140Z"
              fill="#f0f3e7"
            />
          )}
          <path
            d="M77 108 Q80 83 102 71 M83 120 Q86 98 106 87 M90 133 Q92 114 109 102"
            fill="none"
            opacity=".5"
          />
          <path
            d={
              letter === "C"
                ? "M82 169 Q90 144 112 140"
                : "M82 169 Q92 140 124 132 L153 128 Q164 129 160 141"
            }
            fill="none"
          />
          <path d="M102 195 Q117 183 132 188" fill="none" opacity=".4" />
        </g>
      </svg>
    );
  }
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
        transform={letter === "H" ? "rotate(90 120 125)" : undefined}
      >
        <path d="M82 218 L80 195 Q63 176 69 149 L77 122 Q113 111 166 132 L179 161 Q182 187 159 205 L159 228" />
        {fingers.map((f, i) => {
          const x =
            letter === "V" || letter === "W"
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
        ) : ["M", "N", "T"].includes(letter) ? (
          <path
            d={`M${letter === "M" ? 149 : letter === "N" ? 126 : 100} 151 l-2 -16 q4 -12 10 -3 l2 17`}
          />
        ) : letter === "F" ? (
          <path d="M78 186 Q55 170 65 145 Q72 130 89 136 Q107 143 98 158 Q89 171 78 160" />
        ) : letter === "D" ? (
          <path d="M76 186 Q64 173 78 162 L130 156 Q143 157 141 169 Q139 179 126 178 L101 181" />
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
