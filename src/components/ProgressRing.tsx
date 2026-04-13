const ProgressRing = ({ percentage }: { percentage: number }) => {
  const radius = 60;
  const stroke = 8;
  const normalizedRadius = radius - stroke / 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative">
      <svg height={radius * 2} width={radius * 2}>
        <circle stroke="hsl(var(--secondary))" fill="transparent" strokeWidth={stroke} r={normalizedRadius} cx={radius} cy={radius} />
        <circle stroke="hsl(var(--primary))" fill="transparent" strokeWidth={stroke} strokeLinecap="round" strokeDasharray={`${circumference} ${circumference}`} style={{ strokeDashoffset, transition: "stroke-dashoffset 0.6s ease" }} r={normalizedRadius} cx={radius} cy={radius} transform={`rotate(-90 ${radius} ${radius})`} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold text-foreground">{percentage}%</span>
      </div>
    </div>
  );
};

export default ProgressRing;