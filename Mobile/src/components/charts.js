import React from "react";
import { Text, View } from "react-native";
import Svg, { Circle, G, Line, Path, Rect, Text as SvgText } from "react-native-svg";
import { useTheme } from "../theme";
import { inr } from "../utils/format";

// same palette as the web app
export const CHART_COLORS = ["#875CF5", "#FA2C37", "#FF6900", "#4ADE80", "#3B82F6", "#ec4899", "#06b6d4", "#f59e0b", "#6366f1", "#14b8a6", "#a855f7", "#0ea5e9"];

const compact = (n) => {
  const a = Math.abs(n);
  if (a >= 10000000) return (n / 10000000).toFixed(1).replace(/\.0$/, "") + "Cr";
  if (a >= 100000) return (n / 100000).toFixed(1).replace(/\.0$/, "") + "L";
  if (a >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, "") + "k";
  return String(Math.round(n));
};

// ---------- donut ----------
export const DonutChart = ({ data, centerLabel, centerValue, size = 190, colors: palette = CHART_COLORS }) => {
  const { colors } = useTheme();
  const total = data.reduce((s, d) => s + d.value, 0);
  const stroke = 26;
  const r = (size - stroke) / 2;
  const C = 2 * Math.PI * r;
  let offset = 0;

  return (
    <View style={{ alignItems: "center", justifyContent: "center", width: size, height: size, alignSelf: "center" }}>
      <Svg width={size} height={size}>
        <G rotation={-90} origin={`${size / 2}, ${size / 2}`}>
          <Circle cx={size / 2} cy={size / 2} r={r} stroke={colors.track} strokeWidth={stroke} fill="none" />
          {total > 0 &&
            data.map((d, i) => {
              const len = (d.value / total) * C;
              const seg = (
                <Circle
                  key={i}
                  cx={size / 2}
                  cy={size / 2}
                  r={r}
                  stroke={d.color || palette[i % palette.length]}
                  strokeWidth={stroke}
                  fill="none"
                  strokeDasharray={`${Math.max(0, len - 1.5)} ${C - Math.max(0, len - 1.5)}`}
                  strokeDashoffset={-offset}
                />
              );
              offset += len;
              return seg;
            })}
        </G>
      </Svg>
      <View style={{ position: "absolute", alignItems: "center", paddingHorizontal: 30 }}>
        <Text style={{ color: colors.sub, fontSize: 12 }}>{centerLabel}</Text>
        <Text style={{ color: colors.text, fontSize: 18, fontWeight: "800", marginTop: 2 }} numberOfLines={1} adjustsFontSizeToFit>
          {centerValue}
        </Text>
      </View>
    </View>
  );
};

export const Legend = ({ data, colors: palette = CHART_COLORS }) => {
  const { colors } = useTheme();
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  return (
    <View style={{ marginTop: 14, gap: 9 }}>
      {data.map((d, i) => (
        <View key={d.name + i} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <View style={{ width: 11, height: 11, borderRadius: 6, backgroundColor: d.color || palette[i % palette.length] }} />
          <Text style={{ flex: 1, color: colors.text, fontSize: 13 }} numberOfLines={1}>
            {d.name}
          </Text>
          <Text style={{ color: colors.sub, fontSize: 12 }}>{Math.round((d.value / total) * 100)}%</Text>
          <Text style={{ color: colors.text, fontSize: 13, fontWeight: "700", minWidth: 78, textAlign: "right" }}>{inr(d.value)}</Text>
        </View>
      ))}
    </View>
  );
};

// ---------- shared axes ----------
const PAD = { l: 40, r: 8, t: 10, b: 24 };

const Axes = ({ width, height, min, max, labels, colors }) => {
  const ih = height - PAD.t - PAD.b;
  const iw = width - PAD.l - PAD.r;
  const ticks = [0, 1, 2, 3];
  return (
    <>
      {ticks.map((t) => {
        const y = PAD.t + (ih * t) / 3;
        const val = max - ((max - min) * t) / 3;
        return (
          <G key={t}>
            <Line x1={PAD.l} x2={width - PAD.r} y1={y} y2={y} stroke={colors.border} strokeWidth={1} strokeDasharray="3 4" />
            <SvgText x={PAD.l - 6} y={y + 4} fontSize={10} fill={colors.sub} textAnchor="end">
              {compact(val)}
            </SvgText>
          </G>
        );
      })}
      {labels.map((l, i) => {
        if (labels.length > 7 && i % 2 === 1 && i !== labels.length - 1) return null;
        const x = PAD.l + (labels.length === 1 ? iw / 2 : (iw * i) / (labels.length - 1));
        return (
          <SvgText key={i} x={x} y={height - 6} fontSize={10} fill={colors.sub} textAnchor="middle">
            {l}
          </SvgText>
        );
      })}
    </>
  );
};

// ---------- line chart (multi-series) ----------
export const LineChart = ({ labels, series, width, height = 210 }) => {
  const { colors } = useTheme();
  const all = series.flatMap((s) => s.values);
  const max = Math.max(1, ...all);
  const min = Math.min(0, ...all);
  const iw = width - PAD.l - PAD.r;
  const ih = height - PAD.t - PAD.b;
  const x = (i) => PAD.l + (labels.length === 1 ? iw / 2 : (iw * i) / (labels.length - 1));
  const y = (v) => PAD.t + ih - ((v - min) / (max - min || 1)) * ih;

  return (
    <Svg width={width} height={height}>
      <Axes width={width} height={height} min={min} max={max} labels={labels} colors={colors} />
      {series.map((s) => {
        const d = s.values.map((v, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(v)}`).join(" ");
        return (
          <G key={s.name}>
            <Path d={d} stroke={s.color} strokeWidth={2.5} fill="none" strokeLinejoin="round" strokeLinecap="round" />
            {s.values.map((v, i) => (
              <Circle key={i} cx={x(i)} cy={y(v)} r={3} fill={colors.card} stroke={s.color} strokeWidth={2} />
            ))}
          </G>
        );
      })}
    </Svg>
  );
};

// ---------- bar chart (supports negatives) ----------
export const BarChart = ({ labels, values, width, height = 200, color = "#875CF5", negativeColor = "#FA2C37" }) => {
  const { colors } = useTheme();
  const max = Math.max(1, ...values, 0);
  const min = Math.min(0, ...values);
  const iw = width - PAD.l - PAD.r;
  const ih = height - PAD.t - PAD.b;
  const slot = iw / values.length;
  const bw = Math.min(26, slot * 0.62);
  const y = (v) => PAD.t + ih - ((v - min) / (max - min || 1)) * ih;
  const zero = y(0);
  const every = Math.ceil(values.length / 7);

  return (
    <Svg width={width} height={height}>
      {[0, 1, 2, 3].map((t) => {
        const yy = PAD.t + (ih * t) / 3;
        const val = max - ((max - min) * t) / 3;
        return (
          <G key={t}>
            <Line x1={PAD.l} x2={width - PAD.r} y1={yy} y2={yy} stroke={colors.border} strokeWidth={1} strokeDasharray="3 4" />
            <SvgText x={PAD.l - 6} y={yy + 4} fontSize={10} fill={colors.sub} textAnchor="end">
              {compact(val)}
            </SvgText>
          </G>
        );
      })}
      {values.map((v, i) => {
        const cx = PAD.l + slot * i + slot / 2;
        const top = Math.min(y(v), zero);
        const h = Math.max(2, Math.abs(y(v) - zero));
        return (
          <G key={i}>
            <Rect x={cx - bw / 2} y={top} width={bw} height={h} rx={5} fill={v < 0 ? negativeColor : color} />
            {i % every === 0 && (
              <SvgText x={cx} y={height - 6} fontSize={10} fill={colors.sub} textAnchor="middle">
                {labels[i]}
              </SvgText>
            )}
          </G>
        );
      })}
    </Svg>
  );
};
