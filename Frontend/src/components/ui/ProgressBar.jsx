import React from "react";
import { getProgressTone } from "../../utils/helper";

const ProgressBar = ({ percent = 0, barClass, height = "h-2.5" }) => {
  const clamped = Math.max(0, Math.min(100, percent));
  const tone = barClass || getProgressTone(percent).bar;
  return (
    <div
      className={`progress-track ${height}`}
      role="progressbar"
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div className={`progress-fill ${tone}`} style={{ width: `${clamped}%` }} />
    </div>
  );
};

export default ProgressBar;
