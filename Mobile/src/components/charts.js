import React, { useCallback, useMemo, useRef, useState } from "react";
import { PanResponder, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
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
const PAD = { l: 36, r: 16, t: 14, b: 24 };

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
        if (labels.length === 12 && i % 2 === 1) return null;
        if (labels.length > 7 && labels.length !== 12 && i % 2 === 1 && i !== labels.length - 1) return null;
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

// ---------- line chart (multi-series, interactive touch) ----------
export const LineChart = ({ labels = [], series = [], width, height = 210, formatValue }) => {
  const { colors, isDark } = useTheme();
  const [activeIndex, setActiveIndex] = useState(null);
  const initialXRef = useRef(0);

  const all = series.flatMap((s) => s.values || []);
  const max = Math.max(1, ...all);
  const min = Math.min(0, ...all);
  const iw = Math.max(10, width - PAD.l - PAD.r);
  const ih = height - PAD.t - PAD.b;
  const x = (i) => PAD.l + (labels.length === 1 ? iw / 2 : (iw * i) / Math.max(1, labels.length - 1));
  const y = (v) => PAD.t + ih - ((v - min) / (max - min || 1)) * ih;

  const handleTouchCoord = useCallback(
    (coordX) => {
      const relX = coordX - PAD.l;
      if (labels.length <= 1) {
        setActiveIndex(0);
        return;
      }
      const step = iw / (labels.length - 1);
      const idx = Math.min(labels.length - 1, Math.max(0, Math.round(relX / step)));
      setActiveIndex(idx);
    },
    [labels.length, iw]
  );

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onStartShouldSetPanResponderCapture: () => false,
        onMoveShouldSetPanResponder: (_, gestureState) => {
          return Math.abs(gestureState.dx) > Math.abs(gestureState.dy) && Math.abs(gestureState.dx) > 3;
        },
        onMoveShouldSetPanResponderCapture: (_, gestureState) => {
          return Math.abs(gestureState.dx) > Math.abs(gestureState.dy) && Math.abs(gestureState.dx) > 3;
        },
        onPanResponderGrant: (evt) => {
          const locX = evt.nativeEvent.locationX;
          initialXRef.current = locX;
          handleTouchCoord(locX);
        },
        onPanResponderMove: (_, gestureState) => {
          handleTouchCoord(initialXRef.current + gestureState.dx);
        },
        onPanResponderTerminationRequest: () => true,
        onPanResponderRelease: () => {},
      }),
    [handleTouchCoord]
  );

  if (!labels.length || !series.length) {
    return null;
  }

  const activeLabel = activeIndex !== null ? labels[activeIndex] : null;

  return (
    <View style={{ width }}>
      {/* Interactive inspection banner above the chart */}
      {activeIndex !== null ? (
        <View
          style={{
            backgroundColor: isDark ? "rgba(30, 27, 75, 0.45)" : "rgba(139, 92, 246, 0.08)",
            paddingVertical: 8,
            paddingHorizontal: 10,
            borderRadius: 12,
            marginBottom: 10,
            borderWidth: 1,
            borderColor: colors.primary + "44",
          }}
        >
          {/* Top row: Active month and dismiss button */}
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
              <Ionicons name="calendar" size={13} color={colors.primary} />
              <Text style={{ color: colors.text, fontWeight: "800", fontSize: 13 }}>
                {activeLabel}
              </Text>
            </View>
            <Pressable onPress={() => setActiveIndex(null)} hitSlop={12} style={{ padding: 2 }}>
              <Ionicons name="close-circle" size={17} color={colors.sub} />
            </Pressable>
          </View>

          {/* Series breakdown in equal responsive sub-cards */}
          <View style={{ flexDirection: "row", gap: 6 }}>
            {series.map((s) => {
              const val = s.values?.[activeIndex] ?? 0;
              const formatted = formatValue ? formatValue(val) : inr(val);
              return (
                <View
                  key={s.name}
                  style={{
                    flex: 1,
                    backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.85)",
                    borderRadius: 8,
                    paddingVertical: 5,
                    paddingHorizontal: 4,
                    alignItems: "center",
                    borderWidth: 1,
                    borderColor: s.color + "33",
                  }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 3.5, marginBottom: 2 }}>
                    <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: s.color }} />
                    <Text style={{ color: colors.sub, fontSize: 10, fontWeight: "700" }} numberOfLines={1}>
                      {s.name}
                    </Text>
                  </View>
                  <Text
                    style={{
                      color: val < 0 ? "#ef4444" : s.color,
                      fontWeight: "800",
                      fontSize: 12,
                    }}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.7}
                  >
                    {formatted}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      ) : (
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginBottom: 8, paddingVertical: 4 }}>
          <Ionicons name="finger-print-outline" size={14} color={colors.primary} />
          <Text style={{ color: colors.sub, fontSize: 11.5 }}>
            Tap or slide on graph to inspect exact values
          </Text>
        </View>
      )}

      {/* SVG Line Chart + Touch Container */}
      <View
        style={{ width, height, position: "relative" }}
        {...panResponder.panHandlers}
      >
        <Svg width={width} height={height}>
          <Axes width={width} height={height} min={min} max={max} labels={labels} colors={colors} />

          {/* Vertical cursor guide line when active */}
          {activeIndex !== null && (
            <Line
              x1={x(activeIndex)}
              x2={x(activeIndex)}
              y1={PAD.t}
              y2={height - PAD.b}
              stroke={colors.primary}
              strokeWidth={1.5}
              strokeDasharray="4 3"
            />
          )}

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

          {/* Active indicator points (outer halo + ring) */}
          {activeIndex !== null &&
            series.map((s) => {
              const v = s.values?.[activeIndex] ?? 0;
              const cx = x(activeIndex);
              const cy = y(v);

              return (
                <G key={s.name + "_active"}>
                  <Circle cx={cx} cy={cy} r={8} fill={s.color} opacity={0.3} />
                  <Circle cx={cx} cy={cy} r={4.5} fill={colors.card} stroke={s.color} strokeWidth={2.5} />
                </G>
              );
            })}

          {/* If single series, also render single floating callout badge */}
          {activeIndex !== null && series.length === 1 && (() => {
            const s = series[0];
            const v = s.values?.[activeIndex] ?? 0;
            const cx = x(activeIndex);
            const cy = y(v);
            const formatted = formatValue ? formatValue(v) : inr(v);
            const badgeW = Math.max(52, formatted.length * 7 + 10);
            const badgeX = Math.min(width - PAD.r - badgeW, Math.max(PAD.l, cx - badgeW / 2));
            const badgeY = cy > PAD.t + 28 ? cy - 24 : cy + 10;

            return (
              <G key="single_badge">
                <Rect
                  x={badgeX}
                  y={badgeY}
                  width={badgeW}
                  height={18}
                  rx={5}
                  fill={isDark ? "rgba(15,23,42,0.95)" : "rgba(255,255,255,0.96)"}
                  stroke={s.color}
                  strokeWidth={1.2}
                />
                <SvgText
                  x={badgeX + badgeW / 2}
                  y={badgeY + 12.5}
                  fontSize={10}
                  fontWeight="bold"
                  fill={s.color}
                  textAnchor="middle"
                >
                  {formatted}
                </SvgText>
              </G>
            );
          })()}
        </Svg>
      </View>
    </View>
  );
};

// ---------- bar chart (supports negatives, interactive touch) ----------
export const BarChart = ({
  labels = [],
  values = [],
  width,
  height = 200,
  color = "#875CF5",
  negativeColor = "#FA2C37",
  formatValue,
  valueLabel = "",
}) => {
  const { colors, isDark } = useTheme();
  const [activeIndex, setActiveIndex] = useState(null);
  const initialXRef = useRef(0);

  const max = Math.max(1, ...values, 0);
  const min = Math.min(0, ...values);
  const iw = Math.max(10, width - PAD.l - PAD.r);
  const ih = height - PAD.t - PAD.b;
  const slot = iw / Math.max(1, values.length);
  const bw = Math.min(26, slot * 0.62);
  const y = (v) => PAD.t + ih - ((v - min) / (max - min || 1)) * ih;
  const zero = y(0);
  const every = Math.ceil(values.length / 7);

  const handleTouchCoord = useCallback(
    (coordX) => {
      const relX = coordX - PAD.l;
      if (values.length <= 1) {
        setActiveIndex(0);
        return;
      }
      const idx = Math.min(values.length - 1, Math.max(0, Math.floor(relX / slot)));
      setActiveIndex(idx);
    },
    [values.length, slot]
  );

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onStartShouldSetPanResponderCapture: () => false,
        onMoveShouldSetPanResponder: (_, gestureState) => {
          return Math.abs(gestureState.dx) > Math.abs(gestureState.dy) && Math.abs(gestureState.dx) > 3;
        },
        onMoveShouldSetPanResponderCapture: (_, gestureState) => {
          return Math.abs(gestureState.dx) > Math.abs(gestureState.dy) && Math.abs(gestureState.dx) > 3;
        },
        onPanResponderGrant: (evt) => {
          const locX = evt.nativeEvent.locationX;
          initialXRef.current = locX;
          handleTouchCoord(locX);
        },
        onPanResponderMove: (_, gestureState) => {
          handleTouchCoord(initialXRef.current + gestureState.dx);
        },
        onPanResponderTerminationRequest: () => true,
        onPanResponderRelease: () => {},
      }),
    [handleTouchCoord]
  );

  if (!labels.length || !values.length) {
    return null;
  }

  const activeLabel = activeIndex !== null ? labels[activeIndex] : null;
  const activeVal = activeIndex !== null ? values[activeIndex] : null;
  const formattedVal =
    activeVal !== null
      ? formatValue
        ? formatValue(activeVal)
        : inr(activeVal)
      : null;

  return (
    <View style={{ width }}>
      {/* Interactive inspection banner above the chart */}
      {activeIndex !== null ? (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.04)",
            paddingVertical: 8,
            paddingHorizontal: 12,
            borderRadius: 12,
            marginBottom: 8,
            borderWidth: 1,
            borderColor: colors.primary,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
            <Ionicons name="calendar" size={14} color={color} />
            <Text style={{ color: colors.text, fontWeight: "800", fontSize: 13 }}>{activeLabel}</Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            {valueLabel ? <Text style={{ color: colors.sub, fontSize: 12 }}>{valueLabel}:</Text> : null}
            <Text
              style={{
                color: activeVal < 0 ? negativeColor : color,
                fontWeight: "800",
                fontSize: 14,
              }}
            >
              {formattedVal}
            </Text>
          </View>
          <Pressable onPress={() => setActiveIndex(null)} hitSlop={12} style={{ padding: 2 }}>
            <Ionicons name="close-circle" size={18} color={colors.sub} />
          </Pressable>
        </View>
      ) : (
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginBottom: 8, paddingVertical: 4 }}>
          <Ionicons name="finger-print-outline" size={14} color={color} />
          <Text style={{ color: colors.sub, fontSize: 11.5 }}>
            Tap or slide on any bar to view exact {valueLabel ? valueLabel.toLowerCase() : "amount"}
          </Text>
        </View>
      )}

      {/* SVG Bar Chart + Touch Container */}
      <View
        style={{ width, height, position: "relative" }}
        {...panResponder.panHandlers}
      >
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

          {/* Zero baseline when negative values exist */}
          {min < 0 && (
            <Line
              x1={PAD.l}
              x2={width - PAD.r}
              y1={zero}
              y2={zero}
              stroke={colors.sub}
              strokeWidth={1}
              strokeDasharray="2 2"
            />
          )}

          {/* Active column highlight pillar */}
          {activeIndex !== null && (
            <Rect
              x={PAD.l + slot * activeIndex}
              y={PAD.t}
              width={slot}
              height={ih}
              rx={6}
              fill={isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.06)"}
            />
          )}

          {values.map((v, i) => {
            const cx = PAD.l + slot * i + slot / 2;
            const top = Math.min(y(v), zero);
            const h = Math.max(2, Math.abs(y(v) - zero));
            const isSelected = activeIndex === i;
            const barOpacity = activeIndex !== null ? (isSelected ? 1 : 0.4) : 1;

            return (
              <G key={i}>
                <Rect
                  x={cx - bw / 2}
                  y={top}
                  width={bw}
                  height={h}
                  rx={5}
                  fill={v < 0 ? negativeColor : color}
                  opacity={barOpacity}
                  stroke={isSelected ? (isDark ? "#ffffff" : "#0f172a") : "none"}
                  strokeWidth={isSelected ? 1.5 : 0}
                />
                {i % every === 0 && (
                  <SvgText
                    x={cx}
                    y={height - 6}
                    fontSize={10}
                    fontWeight={isSelected ? "bold" : "normal"}
                    fill={isSelected ? colors.text : colors.sub}
                    textAnchor="middle"
                  >
                    {labels[i]}
                  </SvgText>
                )}
              </G>
            );
          })}

          {/* Floating badge directly on top of touched bar */}
          {activeIndex !== null && (() => {
            const v = values[activeIndex];
            const cx = PAD.l + slot * activeIndex + slot / 2;
            const top = y(v);
            const isNeg = v < 0;
            const badgeW = Math.max(54, (formattedVal?.length || 5) * 7.5);
            const badgeX = Math.min(width - PAD.r - badgeW, Math.max(PAD.l, cx - badgeW / 2));
            const calloutY = isNeg ? Math.min(height - PAD.b - 20, top + 8) : Math.max(PAD.t + 4, top - 22);

            return (
              <G>
                <Rect
                  x={badgeX}
                  y={calloutY}
                  width={badgeW}
                  height={18}
                  rx={5}
                  fill={isDark ? "rgba(15,23,42,0.95)" : "rgba(255,255,255,0.96)"}
                  stroke={isNeg ? negativeColor : color}
                  strokeWidth={1.5}
                />
                <SvgText
                  x={badgeX + badgeW / 2}
                  y={calloutY + 12.5}
                  fontSize={10}
                  fontWeight="bold"
                  fill={isNeg ? negativeColor : color}
                  textAnchor="middle"
                >
                  {formattedVal}
                </SvgText>
              </G>
            );
          })()}
        </Svg>
      </View>
    </View>
  );
};
