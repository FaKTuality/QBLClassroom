// Put this next to Notif.jsx / ClassRoom.jsx.
// A simple analog-style countdown: an orange ring that drains, a hand that sweeps
// clockwise from 12 o'clock, tick marks, and the seconds left in the middle.
// Pinned to the top-left of the viewport so students don't have to scroll to see it,
// on its own white card so it stays readable over any page content (including mobile).

const CENTER = 50;
const RADIUS = 44;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const TICKS = Array.from({ length: 12 }, (_, i) => i * 30);

export const PenaltyClock = ({ remainingMs, totalSeconds }) => {
  const totalMs = Math.max(totalSeconds, 1) * 1000;
  const fraction = Math.min(Math.max(remainingMs / totalMs, 0), 1); // 1 → 0
  const secondsLeft = Math.ceil(remainingMs / 1000);
  const handAngle = (1 - fraction) * 360;

  return (
    <div
      className="penalty-clock"
      role="timer"
      aria-label={`Wrong answer. You can choose again in ${secondsLeft} seconds.`}
      style={{
        position: "fixed",
        top: "80px",
        left: "12px",
        zIndex: 1000,
        pointerEvents: "none",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "6px 10px 8px",
        backgroundColor: "#ffffff",
        borderRadius: "14px",
        boxShadow: "0 2px 10px rgba(0, 0, 0, 0.25)",
        color: "darkorange",
      }}
    >
      <svg width="90" height="90" viewBox="0 0 100 100" aria-hidden="true">
        {/* track */}
        <circle
          cx={CENTER}
          cy={CENTER}
          r={RADIUS}
          fill="none"
          stroke="currentColor"
          strokeOpacity="0.15"
          strokeWidth="6"
        />
        {/* draining ring */}
        <circle
          cx={CENTER}
          cy={CENTER}
          r={RADIUS}
          fill="none"
          stroke="currentColor"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={CIRCUMFERENCE * (1 - fraction)}
          transform={`rotate(-90 ${CENTER} ${CENTER})`}
        />
        {/* hour-style tick marks */}
        {TICKS.map((deg) => (
          <line
            key={deg}
            x1={CENTER}
            y1="10"
            x2={CENTER}
            y2="14"
            stroke="currentColor"
            strokeOpacity="0.5"
            strokeWidth="1.5"
            transform={`rotate(${deg} ${CENTER} ${CENTER})`}
          />
        ))}
        {/* sweeping hand */}
        <line
          x1={CENTER}
          y1={CENTER}
          x2={CENTER}
          y2="18"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          transform={`rotate(${handAngle} ${CENTER} ${CENTER})`}
        />
        <circle cx={CENTER} cy={CENTER} r="3" fill="currentColor" />
        <text
          x={CENTER}
          y="72"
          textAnchor="middle"
          fontSize="14"
          fontWeight="bold"
          fill="currentColor"
        >
          {secondsLeft}
        </text>
      </svg>
      <small style={{ color: "#444" }}>Try again in {secondsLeft}s</small>
    </div>
  );
};