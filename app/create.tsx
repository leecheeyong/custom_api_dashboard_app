import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useDarkMode } from "./DarkModeContext";

// ---------- Types ----------

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
type WidgetKind = "display" | "action" | "hybrid";
type WidgetLayout = "compact" | "comfortable" | "detailed";
type TextSize = "s" | "m" | "l";
type ActionStyle = "primary" | "secondary" | "danger" | "ghost";

interface WidgetField {
  id: string;
  label: string;
  key: string;
  type: "text" | "number" | "boolean";
}

interface WidgetAction {
  id: string;
  label: string;
  method: HttpMethod;
  url: string;
  body?: string;
  confirm?: boolean;
  style?: ActionStyle;
}

interface Widget {
  id: string;
  title: string;
  description?: string;
  kind: WidgetKind;
  apiUrl: string;
  method: HttpMethod;
  headers?: string;
  body?: string;
  refreshInterval: number;
  autoRefresh: boolean;
  layout: WidgetLayout;
  borderRadius: number;
  textSize: TextSize;
  backgroundColor: string;
  textColor: string;
  accentColor: string;
  showTitle: boolean;
  showLastUpdated: boolean;
  fields?: WidgetField[];
  actions?: WidgetAction[];
}

// ---------- Constants ----------

const METHODS: HttpMethod[] = ["GET", "POST", "PUT", "PATCH", "DELETE"];

const STEP_DEFS = [
  { id: "basics", title: "Basics", hint: "Name & purpose" },
  { id: "source", title: "Source", hint: "API, fields & layout" },
  { id: "actions", title: "Actions", hint: "Buttons" },
  { id: "style", title: "Theme", hint: "Look & save" },
];

const KIND_OPTIONS: { id: WidgetKind; title: string; desc: string }[] = [
  {
    id: "display",
    title: "Display",
    desc: "Show live data from an API",
  },
  {
    id: "action",
    title: "Action",
    desc: "Buttons that trigger API calls",
  },
  {
    id: "hybrid",
    title: "Hybrid",
    desc: "Show data + trigger actions",
  },
];

const LAYOUT_OPTIONS: { id: WidgetLayout; title: string; desc: string }[] = [
  { id: "compact", title: "Compact", desc: "Dense, minimal padding" },
  { id: "comfortable", title: "Comfortable", desc: "Balanced default" },
  { id: "detailed", title: "Detailed", desc: "Roomy, raw data friendly" },
];

const RADIUS_OPTIONS = [8, 12, 16, 20, 24];

const LIGHT_THEME_PRESETS = [
  { background: "#FFFFFF", text: "#0F172A", accent: "#2563EB", name: "Clean" },
  { background: "#F8FAFC", text: "#0F172A", accent: "#0F172A", name: "Paper" },
  { background: "#EFF6FF", text: "#1E3A8A", accent: "#2563EB", name: "Sky" },
  { background: "#ECFDF5", text: "#064E3B", accent: "#059669", name: "Mint" },
  { background: "#FFF7ED", text: "#7C2D12", accent: "#EA580C", name: "Peach" },
  { background: "#FDF2F8", text: "#831843", accent: "#DB2777", name: "Rose" },
  { background: "#F5F3FF", text: "#4C1D95", accent: "#7C3AED", name: "Lav" },
  { background: "#FEFCE8", text: "#713F12", accent: "#CA8A04", name: "Sand" },
];

const DARK_THEME_PRESETS = [
  { background: "#18181B", text: "#FAFAFA", accent: "#60A5FA", name: "Night" },
  { background: "#0F172A", text: "#F8FAFC", accent: "#38BDF8", name: "Ink" },
  { background: "#1C1917", text: "#FAFAF9", accent: "#FB923C", name: "Ember" },
  { background: "#052E16", text: "#ECFDF5", accent: "#34D399", name: "Forest" },
  { background: "#1E1B4B", text: "#EEF2FF", accent: "#A78BFA", name: "Grape" },
  { background: "#500724", text: "#FFF1F2", accent: "#FB7185", name: "Wine" },
  { background: "#27272A", text: "#F4F4F5", accent: "#E4E4E7", name: "Zinc" },
  { background: "#082F49", text: "#F0F9FF", accent: "#22D3EE", name: "Deep" },
];

const PICKER_SWATCHES = [
  "#FFFFFF",
  "#F1F5F9",
  "#94A3B8",
  "#0F172A",
  "#18181B",
  "#000000",
  "#EF4444",
  "#F97316",
  "#EAB308",
  "#22C55E",
  "#14B8A6",
  "#3B82F6",
  "#8B5CF6",
  "#EC4899",
  "#38BDF8",
  "#64748B",
];

const ACTION_STYLES: { id: ActionStyle; title: string }[] = [
  { id: "primary", title: "Primary" },
  { id: "secondary", title: "Secondary" },
  { id: "ghost", title: "Ghost" },
  { id: "danger", title: "Danger" },
];

// ---------- Helpers ----------

function isLightColor(color: string) {
  try {
    const c = color.charAt(0) === "#" ? color.substring(1) : color;
    const rgb =
      c.length === 3
        ? [
            parseInt(c[0] + c[0], 16),
            parseInt(c[1] + c[1], 16),
            parseInt(c[2] + c[2], 16),
          ]
        : [
            parseInt(c.substring(0, 2), 16),
            parseInt(c.substring(2, 4), 16),
            parseInt(c.substring(4, 6), 16),
          ];
    const brightness = (rgb[0] * 299 + rgb[1] * 587 + rgb[2] * 114) / 1000;
    return brightness > 180;
  } catch {
    return true;
  }
}

function safeParseEdit(raw: unknown): Partial<Widget> | null {
  if (!raw || typeof raw !== "string") return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function humanizeKey(path: string): string {
  const last = path.split(".").pop() || path;
  return last
    .replace(/[_-]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^./, (c) => c.toUpperCase());
}

function normalizeHex(hex: string): string | null {
  const h = hex.trim();
  const m = /^#?([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/.exec(h);
  if (!m) return null;
  let c = m[1];
  if (c.length === 3)
    c = c
      .split("")
      .map((ch) => ch + ch)
      .join("");
  return `#${c.toUpperCase()}`;
}

function getValueAtPath(data: any, path: string): any {
  if (!path) return data;
  return path.split(".").reduce((acc: any, part: string) => {
    if (acc === null || acc === undefined) return undefined;
    if (Array.isArray(acc)) {
      const i = parseInt(part, 10);
      return Number.isNaN(i) ? undefined : acc[i];
    }
    return acc[part];
  }, data);
}

function formatFieldValue(v: any): string {
  if (v === undefined) return "—";
  if (v === null) return "null";
  if (typeof v === "object")
    return Array.isArray(v) ? `array[${v.length}]` : JSON.stringify(v);
  return String(v);
}

// ---------- Color picker (no hex typing required) ----------

interface ThemeTokens {
  card: string;
  card2: string;
  input: string;
  border: string;
  text: string;
  sub: string;
  faint: string;
  primary: string;
  onPrimary: string;
}

function ColorPicker({
  label,
  value,
  onChange,
  t,
}: {
  label: string;
  value: string;
  onChange: (hex: string) => void;
  t: ThemeTokens;
}) {
  const current = normalizeHex(value) || value;
  return (
    <View style={{ marginTop: 14 }}>
      <View style={styles.rowBetween}>
        <Text style={[styles.optionTitle, { color: t.text }]}>{label}</Text>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <View
            style={{
              width: 20,
              height: 20,
              borderRadius: 10,
              backgroundColor: current,
              borderWidth: 1,
              borderColor: t.border,
              marginRight: 8,
            }}
          />
          <Text style={[styles.monoSmall, { color: t.sub }]}>{current}</Text>
        </View>
      </View>
      <View style={styles.swatchGrid}>
        {PICKER_SWATCHES.map((c) => {
          const selected = normalizeHex(value) === normalizeHex(c);
          return (
            <TouchableOpacity
              key={`${label}-${c}`}
              onPress={() => onChange(c)}
              style={[
                styles.swatch,
                {
                  backgroundColor: c,
                  borderColor: selected ? t.primary : t.border,
                  borderWidth: selected ? 3 : 1,
                },
              ]}
            />
          );
        })}
      </View>
    </View>
  );
}

// ---------- Interactive JSON tree: every key is a tappable button ----------

function JsonTree({
  node,
  basePath,
  depth,
  onKeyPress,
  addedKeys,
  t,
}: {
  node: any;
  basePath: string;
  depth: number;
  onKeyPress: (path: string) => void;
  addedKeys: string[];
  t: ThemeTokens;
}) {
  if (depth > 4) {
    return <Text style={[styles.monoSmall, { color: t.faint }]}>…</Text>;
  }
  if (node !== null && typeof node === "object") {
    const isArray = Array.isArray(node);
    const entries: [string, any][] = isArray
      ? (node as any[]).slice(0, 6).map((v, i) => [String(i), v])
      : Object.entries(node).slice(0, 24);
    if (entries.length === 0) {
      return (
        <Text style={[styles.monoSmall, { color: t.sub }]}>
          {isArray ? "[]" : "{}"}
        </Text>
      );
    }
    return (
      <View>
        <Text style={[styles.monoSmall, { color: t.faint }]}>
          {isArray ? "[" : "{"}
        </Text>
        {entries.map(([k, v]) => {
          const path = basePath ? `${basePath}.${k}` : k;
          const added = addedKeys.includes(path);
          const isObj = v !== null && typeof v === "object";
          return (
            <View key={path} style={{ marginLeft: 12, marginTop: 3 }}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  flexWrap: "wrap",
                }}
              >
                <TouchableOpacity
                  onPress={() => onKeyPress(path)}
                  style={[
                    styles.jsonKey,
                    {
                      backgroundColor: added ? t.primary + "22" : t.card,
                      borderColor: added ? t.primary : t.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.jsonKeyText,
                      { color: added ? t.primary : "#38BDF8" },
                    ]}
                  >
                    {added ? "✓ " : ""}
                    {isArray ? `[${k}]` : k}
                  </Text>
                </TouchableOpacity>
                <Text style={[styles.monoSmall, { color: t.faint }]}>: </Text>
                {!isObj && (
                  <Text
                    style={[styles.monoSmall, { color: t.sub }]}
                    numberOfLines={1}
                  >
                    {typeof v === "string"
                      ? `"${String(v).substring(0, 40)}"`
                      : String(v).substring(0, 40)}
                  </Text>
                )}
              </View>
              {isObj && (
                <JsonTree
                  node={v}
                  basePath={path}
                  depth={depth + 1}
                  onKeyPress={onKeyPress}
                  addedKeys={addedKeys}
                  t={t}
                />
              )}
            </View>
          );
        })}
        <Text style={[styles.monoSmall, { color: t.faint }]}>
          {isArray ? "]" : "}"}
        </Text>
      </View>
    );
  }
  return (
    <Text style={[styles.monoSmall, { color: t.sub }]}>
      {typeof node === "string"
        ? `"${String(node).substring(0, 120)}"`
        : String(node).substring(0, 120)}
    </Text>
  );
}

// ---------- Screen ----------

export default function CreateWidgetScreen() {
  const { isDarkMode } = useDarkMode();
  const params = useLocalSearchParams();
  const editWidget = useMemo(
    () => safeParseEdit(params.editWidget),
    [params.editWidget],
  );

  const t = useMemo(
    () =>
      isDarkMode
        ? {
            bg: "#09090B",
            card: "#18181B",
            card2: "#232329",
            input: "#232329",
            border: "#27272A",
            text: "#FAFAFA",
            sub: "#A1A1AA",
            faint: "#52525B",
            primary: "#3B82F6",
            onPrimary: "#FFFFFF",
          }
        : {
            bg: "#F8FAFC",
            card: "#FFFFFF",
            card2: "#F1F5F9",
            input: "#F1F5F9",
            border: "#E2E8F0",
            text: "#0F172A",
            sub: "#64748B",
            faint: "#94A3B8",
            primary: "#0F172A",
            onPrimary: "#FFFFFF",
          },
    [isDarkMode],
  );

  const [step, setStep] = useState(0);
  const [previewCollapsed, setPreviewCollapsed] = useState(false);

  // Step 0 — basics
  const [kind, setKind] = useState<WidgetKind>(
    (editWidget?.kind as WidgetKind) || "display",
  );
  const [title, setTitle] = useState(editWidget?.title || "");
  const [description, setDescription] = useState(editWidget?.description || "");

  // Step 1 — source
  const [apiUrl, setApiUrl] = useState(editWidget?.apiUrl || "");
  const [method, setMethod] = useState<HttpMethod>(editWidget?.method || "GET");
  const [headers, setHeaders] = useState(editWidget?.headers || "");
  const [body, setBody] = useState(editWidget?.body || "");
  const [refreshInterval, setRefreshInterval] = useState(
    editWidget?.refreshInterval?.toString() || "300",
  );
  const [autoRefresh, setAutoRefresh] = useState(
    editWidget?.autoRefresh ?? true,
  );
  const [testing, setTesting] = useState(false);
  const [testData, setTestData] = useState<any>(null);
  const [testStatus, setTestStatus] = useState<number | null>(null);

  // Step 2 — content
  const [fields, setFields] = useState<WidgetField[]>(editWidget?.fields || []);
  const [fieldLabel, setFieldLabel] = useState("");
  const [fieldKey, setFieldKey] = useState("");
  const [fieldType, setFieldType] = useState<"text" | "number" | "boolean">(
    "text",
  );
  const [layout, setLayout] = useState<WidgetLayout>(
    editWidget?.layout || "comfortable",
  );
  const [showTitle, setShowTitle] = useState(editWidget?.showTitle ?? true);
  const [showLastUpdated, setShowLastUpdated] = useState(
    editWidget?.showLastUpdated ?? true,
  );

  // Step 3 — actions
  const [actions, setActions] = useState<WidgetAction[]>(
    editWidget?.actions || [],
  );
  const [actionLabel, setActionLabel] = useState("");
  const [actionMethod, setActionMethod] = useState<HttpMethod>("POST");
  const [actionUrl, setActionUrl] = useState("");
  const [actionBody, setActionBody] = useState("");
  const [actionStyle, setActionStyle] = useState<ActionStyle>("primary");
  const [actionConfirm, setActionConfirm] = useState(false);

  // Step 4 — style
  const [backgroundColor, setBackgroundColor] = useState(
    editWidget?.backgroundColor || "#FFFFFF",
  );
  const [textColor, setTextColor] = useState(
    editWidget?.textColor || "#0F172A",
  );
  const [accentColor, setAccentColor] = useState(
    editWidget?.accentColor || "#2563EB",
  );
  const [borderRadius, setBorderRadius] = useState(
    editWidget?.borderRadius ?? 16,
  );
  const [textSize, setTextSize] = useState<TextSize>(
    editWidget?.textSize || "m",
  );

  // Key → label flow (tap a JSON key, then name it)
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [pendingLabel, setPendingLabel] = useState("");

  const editId = (editWidget as any)?.id ?? null;

  // Re-sync the whole form whenever a different widget is opened for edit.
  // (State initializers only run on first mount, so without this the second
  // edited widget would show the previous widget's values.)
  useEffect(() => {
    if (!editWidget) return;
    setKind((editWidget.kind as WidgetKind) || "display");
    setTitle(editWidget.title || "");
    setDescription(editWidget.description || "");
    setApiUrl(editWidget.apiUrl || "");
    setMethod(editWidget.method || "GET");
    setHeaders(editWidget.headers || "");
    setBody(editWidget.body || "");
    setRefreshInterval(editWidget.refreshInterval?.toString() || "300");
    setAutoRefresh(editWidget.autoRefresh ?? true);
    setFields(editWidget.fields || []);
    setFieldLabel("");
    setFieldKey("");
    setFieldType("text");
    setLayout(editWidget.layout || "comfortable");
    setShowTitle(editWidget.showTitle ?? true);
    setShowLastUpdated(editWidget.showLastUpdated ?? true);
    setActions(editWidget.actions || []);
    setActionLabel("");
    setActionUrl("");
    setActionBody("");
    setActionMethod("POST");
    setActionStyle("primary");
    setActionConfirm(false);
    setBackgroundColor(editWidget.backgroundColor || "#FFFFFF");
    setTextColor(editWidget.textColor || "#0F172A");
    setAccentColor(editWidget.accentColor || "#2563EB");
    setBorderRadius(editWidget.borderRadius ?? 16);
    setTextSize(editWidget.textSize || "m");
    setTestData(null);
    setTestStatus(null);
    setPendingKey(null);
    setPendingLabel("");
    setStep(0);
  }, [editId]);

  const needsSource = kind !== "action";
  const needsActions = kind !== "display";

  const visibleSteps = useMemo(() => {
    if (kind === "display") return STEP_DEFS.filter((s) => s.id !== "actions");
    if (kind === "action") return STEP_DEFS.filter((s) => s.id !== "source");
    return STEP_DEFS;
  }, [kind]);

  const currentStepId =
    visibleSteps[Math.min(step, visibleSteps.length - 1)]?.id ?? "basics";

  const handleKindChange = (next: WidgetKind) => {
    setKind(next);
    // Keep the user on a valid step when the flow shrinks/grows.
    // Basics (0) is always safe; otherwise clamp.
    setStep((prev) => {
      const nextSteps =
        next === "display"
          ? STEP_DEFS.filter((s) => s.id !== "actions")
          : next === "action"
            ? STEP_DEFS.filter((s) => s.id !== "source")
            : STEP_DEFS;
      return Math.min(prev, nextSteps.length - 1);
    });
  };

  const goToStepId = (id: string) => {
    const idx = visibleSteps.findIndex((s) => s.id === id);
    if (idx >= 0) setStep(idx);
  };

  // ---------- API test ----------

  const testApiEndpoint = async () => {
    const url = apiUrl.trim();
    if (!url) {
      Alert.alert("Missing URL", "Enter an API URL to test.");
      return;
    }
    setTesting(true);
    setTestStatus(null);
    try {
      let parsedHeaders: Record<string, string> = {};
      if (headers.trim()) {
        try {
          parsedHeaders = JSON.parse(headers);
        } catch {
          Alert.alert(
            "Invalid headers",
            'Headers must be valid JSON, e.g. {"Authorization": "Bearer …"}',
          );
          setTesting(false);
          return;
        }
      }
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", ...parsedHeaders },
        body: method === "GET" ? undefined : body.trim() || undefined,
      });
      setTestStatus(res.status);
      const text = await res.text();
      try {
        setTestData(JSON.parse(text));
      } catch {
        setTestData(text);
      }
    } catch {
      setTestData({ error: "Failed to connect" });
    } finally {
      setTesting(false);
    }
  };

  // ---------- Fields ----------

  const addField = (label?: string, key?: string) => {
    const l = (label ?? fieldLabel).trim();
    const k = (key ?? fieldKey).trim();
    if (!l || !k) return;
    setFields((f) => [
      ...f,
      { id: Date.now().toString(), label: l, key: k, type: fieldType },
    ]);
    setFieldLabel("");
    setFieldKey("");
    setFieldType("text");
  };

  const removeField = (id: string) =>
    setFields((f) => f.filter((x) => x.id !== id));

  // ---------- Actions ----------

  const addAction = () => {
    if (!actionLabel.trim()) {
      Alert.alert("Missing label", "Give your button a label.");
      return;
    }
    if (!actionUrl.trim() && !apiUrl.trim()) {
      Alert.alert(
        "Missing URL",
        "Enter a button URL, or set a widget API URL it can reuse.",
      );
      return;
    }
    setActions((a) => [
      ...a,
      {
        id: Date.now().toString(),
        label: actionLabel.trim(),
        method: actionMethod,
        url: actionUrl.trim(),
        body: actionBody.trim() || undefined,
        confirm: actionConfirm,
        style: actionStyle,
      },
    ]);
    setActionLabel("");
    setActionUrl("");
    setActionBody("");
    setActionMethod("POST");
    setActionStyle("primary");
    setActionConfirm(false);
  };

  const removeAction = (id: string) =>
    setActions((a) => a.filter((x) => x.id !== id));

  // ---------- Save ----------

  const canContinue = () => {
    if (currentStepId === "basics") return title.trim().length > 0;
    if (currentStepId === "source") return apiUrl.trim().length > 0;
    return true;
  };

  const saveWidget = async () => {
    if (!title.trim()) {
      Alert.alert("Missing title", "Give your widget a name first.");
      goToStepId("basics");
      return;
    }
    if (needsSource && !apiUrl.trim()) {
      Alert.alert("Missing API URL", "Display widgets need a data source.");
      goToStepId("source");
      return;
    }
    if (needsActions && actions.length === 0) {
      Alert.alert(
        "No buttons yet",
        "Action widgets need at least one custom button. Add one in the Actions step.",
      );
      goToStepId("actions");
      return;
    }
    try {
      const stored = await AsyncStorage.getItem("widgets");
      const widgets = stored ? JSON.parse(stored) : [];
      const widget: Widget = {
        id: (editWidget as any)?.id || Date.now().toString(),
        title: title.trim(),
        description: description.trim() || undefined,
        kind,
        apiUrl: apiUrl.trim(),
        method,
        headers: headers.trim() || undefined,
        body: body.trim() || undefined,
        refreshInterval: parseInt(refreshInterval) || 300,
        autoRefresh,
        layout,
        borderRadius,
        textSize,
        backgroundColor,
        textColor,
        accentColor,
        showTitle,
        showLastUpdated,
        fields,
        actions,
      };
      const updated = editWidget
        ? widgets.map((w: Widget) =>
            w.id === (editWidget as any).id ? { ...w, ...widget } : w,
          )
        : [...widgets, widget];
      await AsyncStorage.setItem("widgets", JSON.stringify(updated));
      Alert.alert(
        "Saved",
        `Widget ${editWidget ? "updated" : "created"} successfully.`,
        [{ text: "Done", onPress: () => router.back() }],
      );
    } catch {
      Alert.alert("Error", "Failed to save widget.");
    }
  };

  const themePresets = isDarkMode ? DARK_THEME_PRESETS : LIGHT_THEME_PRESETS;
  const textScale = textSize === "s" ? 0.9 : textSize === "l" ? 1.15 : 1;

  const confirmPendingKey = () => {
    if (!pendingKey) return;
    const label = pendingLabel.trim() || humanizeKey(pendingKey);
    addField(label, pendingKey);
    setPendingKey(null);
    setPendingLabel("");
  };

  // ---------- Render helpers ----------

  const renderPreview = () => (
    <View>
      <TouchableOpacity
        onPress={() => setPreviewCollapsed((v) => !v)}
        style={styles.previewBarHeader}
      >
        <Text style={[styles.previewLabel, { color: t.faint }]}>Preview</Text>
        <Text style={[styles.previewToggle, { color: t.sub }]}>
          {previewCollapsed ? "Show ▾" : "Hide ▴"}
        </Text>
      </TouchableOpacity>
      {!previewCollapsed && (
        <View
          style={[
            styles.live,
            {
              backgroundColor,
              borderRadius,
              borderColor: isLightColor(backgroundColor)
                ? "#E2E8F0"
                : "#27272A",
            },
          ]}
        >
          {showTitle && (
            <Text
              style={{
                color: textColor,
                fontSize: 16 * textScale,
                fontWeight: "700",
                marginBottom: 2,
              }}
              numberOfLines={1}
            >
              {title.trim() || "Untitled widget"}
            </Text>
          )}
          {!!description.trim() && (
            <Text
              style={{
                color: textColor,
                opacity: 0.65,
                fontSize: 12 * textScale,
                marginBottom: 8,
              }}
              numberOfLines={2}
            >
              {description.trim()}
            </Text>
          )}
          {needsSource && (
            <View
              style={{
                backgroundColor: isLightColor(backgroundColor)
                  ? "rgba(0,0,0,0.04)"
                  : "rgba(255,255,255,0.08)",
                borderRadius: Math.max(8, borderRadius - 6),
                padding:
                  layout === "compact" ? 8 : layout === "detailed" ? 14 : 11,
                marginBottom: actions.length > 0 ? 8 : 0,
              }}
            >
              {fields.length > 0 ? (
                <>
                  {fields.slice(0, 3).map((f) => (
                    <View
                      key={f.id}
                      style={{ flexDirection: "row", marginBottom: 3 }}
                    >
                      <Text
                        style={{
                          color: textColor,
                          fontWeight: "600",
                          fontSize: 13 * textScale,
                        }}
                      >
                        {f.label}:{" "}
                      </Text>
                      <Text
                        style={{
                          color: textColor,
                          opacity: testData ? 0.85 : 0.45,
                          fontSize: 13 * textScale,
                          flexShrink: 1,
                        }}
                        numberOfLines={1}
                      >
                        {testData
                          ? formatFieldValue(getValueAtPath(testData, f.key))
                          : "—"}
                      </Text>
                    </View>
                  ))}
                  {fields.length > 3 && (
                    <Text
                      style={{
                        color: textColor,
                        opacity: 0.5,
                        fontSize: 11 * textScale,
                      }}
                    >
                      +{fields.length - 3} more
                    </Text>
                  )}
                </>
              ) : testData !== null && typeof testData === "object" ? (
                <Text
                  style={{
                    color: textColor,
                    opacity: 0.7,
                    fontSize: 12 * textScale,
                    fontFamily: "monospace",
                  }}
                  numberOfLines={3}
                >
                  {JSON.stringify(testData).substring(0, 140)}
                </Text>
              ) : testData !== null ? (
                <Text
                  style={{
                    color: textColor,
                    opacity: 0.7,
                    fontSize: 12 * textScale,
                  }}
                  numberOfLines={2}
                >
                  {String(testData).substring(0, 140)}
                </Text>
              ) : (
                <Text
                  style={{
                    color: textColor,
                    opacity: 0.45,
                    fontSize: 12 * textScale,
                  }}
                >
                  No data yet — test your API below.
                </Text>
              )}
            </View>
          )}
          {actions.length > 0 && (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {actions.slice(0, 3).map((a) => (
                <View
                  key={a.id}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 7,
                    borderRadius: 8,
                    backgroundColor:
                      a.style === "primary"
                        ? accentColor
                        : a.style === "danger"
                          ? "#EF4444"
                          : "transparent",
                    borderWidth:
                      a.style === "ghost" || a.style === "secondary" ? 1 : 0,
                    borderColor: textColor + "44",
                  }}
                >
                  <Text
                    style={{
                      color:
                        a.style === "primary" || a.style === "danger"
                          ? "#fff"
                          : textColor,
                      fontSize: 12,
                      fontWeight: "600",
                    }}
                  >
                    {a.label}
                  </Text>
                </View>
              ))}
              {actions.length > 3 && (
                <Text style={{ color: textColor, opacity: 0.5, fontSize: 11 }}>
                  +{actions.length - 3} more
                </Text>
              )}
            </View>
          )}
          {showLastUpdated && (
            <Text
              style={{
                color: textColor,
                opacity: 0.5,
                fontSize: 10,
                marginTop: 6,
                textAlign: "right",
              }}
            >
              {testData ? "Last updated: just now" : "Not fetched yet"}
            </Text>
          )}
        </View>
      )}
    </View>
  );

  const renderStepper = () => (
    <View
      style={[
        styles.stepper,
        { backgroundColor: "transparent", borderColor: "transparent" },
      ]}
    >
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {visibleSteps.map((s, i) => {
          const active = i === step;
          const done = i < step;
          return (
            <TouchableOpacity
              key={s.id}
              onPress={() => setStep(i)}
              style={styles.stepItem}
            >
              <View
                style={[
                  styles.stepDot,
                  {
                    backgroundColor: active
                      ? t.primary
                      : done
                        ? t.primary + "33"
                        : t.card2,
                    borderColor: active ? t.primary : t.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.stepDotText,
                    { color: active ? t.onPrimary : t.sub },
                  ]}
                >
                  {i + 1}
                </Text>
              </View>
              <View>
                <Text
                  style={[styles.stepTitle, { color: active ? t.text : t.sub }]}
                >
                  {s.title}
                </Text>
                <Text style={[styles.stepHint, { color: t.faint }]}>
                  {s.hint}
                </Text>
              </View>
              {i < visibleSteps.length - 1 && (
                <View
                  style={[styles.stepLine, { backgroundColor: t.border }]}
                />
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );

  const renderBasics = () => (
    <View>
      <View
        style={[
          styles.card,
          { backgroundColor: t.card, borderColor: t.border },
        ]}
      >
        <Text style={[styles.cardTitle, { color: t.text }]}>What is this?</Text>
        <Text style={[styles.cardSub, { color: t.sub }]}>
          Display live data, trigger actions, or both.
        </Text>
        {KIND_OPTIONS.map((o) => {
          const selected = kind === o.id;
          return (
            <TouchableOpacity
              key={o.id}
              onPress={() => handleKindChange(o.id)}
              style={[
                styles.option,
                {
                  backgroundColor: selected ? t.card2 : "transparent",
                  borderColor: selected ? t.primary : t.border,
                },
              ]}
            >
              <View
                style={[
                  styles.radio,
                  {
                    borderColor: selected ? t.primary : t.faint,
                    backgroundColor: selected ? t.primary : "transparent",
                  },
                ]}
              >
                {selected && <View style={styles.radioInner} />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.optionTitle, { color: t.text }]}>
                  {o.title}
                </Text>
                <Text style={[styles.optionDesc, { color: t.sub }]}>
                  {o.desc}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      <View
        style={[
          styles.card,
          { backgroundColor: t.card, borderColor: t.border },
        ]}
      >
        <Text style={[styles.cardTitle, { color: t.text }]}>Name it</Text>
        <Text style={[styles.label, { color: t.sub }]}>Title *</Text>
        <TextInput
          style={[
            styles.input,
            { backgroundColor: t.input, color: t.text, borderColor: t.border },
          ]}
          value={title}
          onChangeText={setTitle}
          placeholder="e.g. Weather, Deploy hook, Server status"
          placeholderTextColor={t.faint}
        />
        <Text style={[styles.label, { color: t.sub }]}>Description</Text>
        <TextInput
          style={[
            styles.input,
            { backgroundColor: t.input, color: t.text, borderColor: t.border },
          ]}
          value={description}
          onChangeText={setDescription}
          placeholder="Optional one-liner shown on the card"
          placeholderTextColor={t.faint}
        />
      </View>
    </View>
  );

  const renderSource = () => (
    <View>
      <View
        style={[
          styles.card,
          { backgroundColor: t.card, borderColor: t.border },
        ]}
      >
        <Text style={[styles.cardTitle, { color: t.text }]}>Data source</Text>
        <Text style={[styles.cardSub, { color: t.sub }]}>
          Where should this widget fetch its data?
        </Text>
        <Text style={[styles.label, { color: t.sub }]}>Method</Text>
        <View style={styles.chips}>
          {METHODS.map((m) => (
            <TouchableOpacity
              key={m}
              onPress={() => setMethod(m)}
              style={[
                styles.chip,
                {
                  backgroundColor: method === m ? t.primary : t.card2,
                  borderColor: method === m ? t.primary : t.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.chipText,
                  { color: method === m ? t.onPrimary : t.sub },
                ]}
              >
                {m}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={[styles.label, { color: t.sub }]}>
          API URL {needsSource ? "*" : ""}
        </Text>
        <TextInput
          style={[
            styles.input,
            { backgroundColor: t.input, color: t.text, borderColor: t.border },
          ]}
          value={apiUrl}
          onChangeText={setApiUrl}
          placeholder="https://api.example.com/data"
          placeholderTextColor={t.faint}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {method !== "GET" && (
          <>
            <Text style={[styles.label, { color: t.sub }]}>
              Request body (JSON)
            </Text>
            <TextInput
              style={[
                styles.input,
                styles.mono,
                {
                  backgroundColor: t.input,
                  color: t.text,
                  borderColor: t.border,
                },
              ]}
              value={body}
              onChangeText={setBody}
              placeholder='{"key": "value"}'
              placeholderTextColor={t.faint}
              autoCapitalize="none"
              multiline
            />
          </>
        )}
        <Text style={[styles.label, { color: t.sub }]}>
          Headers (JSON, optional)
        </Text>
        <TextInput
          style={[
            styles.input,
            styles.mono,
            { backgroundColor: t.input, color: t.text, borderColor: t.border },
          ]}
          value={headers}
          onChangeText={setHeaders}
          placeholder='{"Authorization": "Bearer …"}'
          placeholderTextColor={t.faint}
          autoCapitalize="none"
          multiline
        />
        <View style={styles.rowBetween}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.optionTitle, { color: t.text }]}>
              Auto-refresh
            </Text>
            <Text style={[styles.optionDesc, { color: t.sub }]}>
              Re-fetch in the background
            </Text>
          </View>
          <Switch
            value={autoRefresh}
            onValueChange={setAutoRefresh}
            trackColor={{ false: t.border, true: t.primary }}
          />
        </View>
        <View style={styles.row}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text style={[styles.label, { color: t.sub }]}>Refresh (sec)</Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: t.input,
                  color: t.text,
                  borderColor: t.border,
                },
              ]}
              value={refreshInterval}
              onChangeText={setRefreshInterval}
              keyboardType="numeric"
              placeholder="300"
              placeholderTextColor={t.faint}
            />
          </View>
          <TouchableOpacity
            style={[
              styles.testBtn,
              { backgroundColor: t.primary, opacity: testing ? 0.6 : 1 },
            ]}
            onPress={testApiEndpoint}
            disabled={testing}
          >
            <Text style={[styles.testBtnText, { color: t.onPrimary }]}>
              {testing ? "Testing…" : "Test"}
            </Text>
          </TouchableOpacity>
        </View>
        {testStatus !== null && (
          <Text style={[styles.optionDesc, { color: t.sub }]}>
            Status: {testStatus}
          </Text>
        )}
        {testData !== null && (
          <View
            style={[
              styles.previewBox,
              { backgroundColor: t.card2, borderColor: t.border },
            ]}
          >
            <Text
              style={[styles.optionDesc, { color: t.sub, marginBottom: 6 }]}
            >
              Tap any key in the JSON to add it as a field:
            </Text>
            {testData !== null && typeof testData === "object" ? (
              <JsonTree
                node={testData}
                basePath=""
                depth={0}
                onKeyPress={(path) => {
                  setPendingKey(path);
                  setPendingLabel(humanizeKey(path));
                }}
                addedKeys={fields.map((f) => f.key)}
                t={t}
              />
            ) : (
              <Text style={[styles.monoSmall, { color: t.sub }]}>
                {String(testData).substring(0, 600)}
              </Text>
            )}
          </View>
        )}
      </View>
    </View>
  );

  const renderFieldsAndLayout = () => (
    <View>
      <View
        style={[
          styles.card,
          { backgroundColor: t.card, borderColor: t.border },
        ]}
      >
        <Text style={[styles.cardTitle, { color: t.text }]}>
          Fields to show
        </Text>
        <Text style={[styles.cardSub, { color: t.sub }]}>
          Pick JSON keys to surface. Leave empty to show a smart preview.
        </Text>
        <View style={styles.fieldRow}>
          <TextInput
            style={[
              styles.input,
              {
                flex: 1,
                marginRight: 8,
                backgroundColor: t.input,
                color: t.text,
                borderColor: t.border,
              },
            ]}
            value={fieldLabel}
            onChangeText={setFieldLabel}
            placeholder="Label"
            placeholderTextColor={t.faint}
          />
          <TextInput
            style={[
              styles.input,
              {
                flex: 1,
                backgroundColor: t.input,
                color: t.text,
                borderColor: t.border,
              },
            ]}
            value={fieldKey}
            onChangeText={setFieldKey}
            placeholder="JSON key"
            placeholderTextColor={t.faint}
            autoCapitalize="none"
          />
        </View>
        <View style={styles.rowBetween}>
          <View style={styles.chips}>
            {(["text", "number", "boolean"] as const).map((ty) => (
              <TouchableOpacity
                key={ty}
                onPress={() => setFieldType(ty)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: fieldType === ty ? t.primary : t.card2,
                    borderColor: fieldType === ty ? t.primary : t.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.chipText,
                    { color: fieldType === ty ? t.onPrimary : t.sub },
                  ]}
                >
                  {ty}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity
            onPress={() => addField()}
            style={[styles.addBtn, { backgroundColor: t.primary }]}
          >
            <Text style={[styles.addBtnText, { color: t.onPrimary }]}>Add</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.pills}>
          {fields.length === 0 && (
            <Text style={[styles.optionDesc, { color: t.faint }]}>
              No custom fields — we will render a tidy preview instead.
            </Text>
          )}
          {fields.map((f) => (
            <View
              key={f.id}
              style={[
                styles.pill,
                { backgroundColor: t.card2, borderColor: t.border },
              ]}
            >
              <Text style={[styles.pillText, { color: t.text }]}>
                {f.label} · {f.key}
              </Text>
              <TouchableOpacity onPress={() => removeField(f.id)}>
                <Text style={styles.pillX}> ×</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </View>

      <View
        style={[
          styles.card,
          { backgroundColor: t.card, borderColor: t.border },
        ]}
      >
        <Text style={[styles.cardTitle, { color: t.text }]}>Layout</Text>
        {LAYOUT_OPTIONS.map((o) => {
          const selected = layout === o.id;
          return (
            <TouchableOpacity
              key={o.id}
              onPress={() => setLayout(o.id)}
              style={[
                styles.option,
                {
                  backgroundColor: selected ? t.card2 : "transparent",
                  borderColor: selected ? t.primary : t.border,
                },
              ]}
            >
              <View
                style={[
                  styles.mini,
                  { borderColor: t.faint },
                  o.id === "compact" && { padding: 4 },
                  o.id === "detailed" && { padding: 10 },
                ]}
              >
                <View style={[styles.miniLine, { backgroundColor: t.faint }]} />
                <View
                  style={[
                    styles.miniLine,
                    { backgroundColor: t.border, width: "70%" },
                  ]}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.optionTitle, { color: t.text }]}>
                  {o.title}
                </Text>
                <Text style={[styles.optionDesc, { color: t.sub }]}>
                  {o.desc}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
        <View style={styles.toggleRow}>
          <Text style={[styles.optionTitle, { color: t.text }]}>
            Show title
          </Text>
          <Switch value={showTitle} onValueChange={setShowTitle} />
        </View>
        <View style={styles.toggleRow}>
          <Text style={[styles.optionTitle, { color: t.text }]}>
            Show last updated
          </Text>
          <Switch value={showLastUpdated} onValueChange={setShowLastUpdated} />
        </View>
      </View>
    </View>
  );

  const renderActions = () => (
    <View>
      <View
        style={[
          styles.card,
          { backgroundColor: t.card, borderColor: t.border },
        ]}
      >
        <Text style={[styles.cardTitle, { color: t.text }]}>
          Custom buttons
        </Text>
        <Text style={[styles.cardSub, { color: t.sub }]}>
          Buttons live on the widget and trigger any API request. Leave the URL
          empty to reuse the widget URL.
        </Text>
        {actions.map((a) => (
          <View
            key={a.id}
            style={[
              styles.actionRow,
              { backgroundColor: t.card2, borderColor: t.border },
            ]}
          >
            <View style={{ flex: 1 }}>
              <Text style={[styles.optionTitle, { color: t.text }]}>
                {a.label}
              </Text>
              <Text style={[styles.monoSmall, { color: t.sub }]}>
                {a.method} {a.url || "(widget URL)"}
                {a.confirm ? " · asks to confirm" : ""}
              </Text>
            </View>
            <TouchableOpacity onPress={() => removeAction(a.id)}>
              <Text style={styles.deleteX}>×</Text>
            </TouchableOpacity>
          </View>
        ))}
        {actions.length === 0 && (
          <Text
            style={[styles.optionDesc, { color: t.faint, marginBottom: 8 }]}
          >
            No buttons yet. E.g. “Restart”, “Deploy”, “Toggle light”.
          </Text>
        )}
        <Text style={[styles.label, { color: t.sub }]}>Button label *</Text>
        <TextInput
          style={[
            styles.input,
            { backgroundColor: t.input, color: t.text, borderColor: t.border },
          ]}
          value={actionLabel}
          onChangeText={setActionLabel}
          placeholder="e.g. Restart server"
          placeholderTextColor={t.faint}
        />
        <Text style={[styles.label, { color: t.sub }]}>Method</Text>
        <View style={styles.chips}>
          {METHODS.map((m) => (
            <TouchableOpacity
              key={m}
              onPress={() => setActionMethod(m)}
              style={[
                styles.chip,
                {
                  backgroundColor: actionMethod === m ? t.primary : t.card2,
                  borderColor: actionMethod === m ? t.primary : t.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.chipText,
                  { color: actionMethod === m ? t.onPrimary : t.sub },
                ]}
              >
                {m}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={[styles.label, { color: t.sub }]}>
          URL (optional — defaults to widget URL)
        </Text>
        <TextInput
          style={[
            styles.input,
            { backgroundColor: t.input, color: t.text, borderColor: t.border },
          ]}
          value={actionUrl}
          onChangeText={setActionUrl}
          placeholder="https://api.example.com/restart"
          placeholderTextColor={t.faint}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <Text style={[styles.label, { color: t.sub }]}>
          Body (JSON, optional)
        </Text>
        <TextInput
          style={[
            styles.input,
            styles.mono,
            { backgroundColor: t.input, color: t.text, borderColor: t.border },
          ]}
          value={actionBody}
          onChangeText={setActionBody}
          placeholder='{"action": "restart"}'
          placeholderTextColor={t.faint}
          autoCapitalize="none"
          multiline
        />
        <Text style={[styles.label, { color: t.sub }]}>Button style</Text>
        <View style={styles.chips}>
          {ACTION_STYLES.map((s) => (
            <TouchableOpacity
              key={s.id}
              onPress={() => setActionStyle(s.id)}
              style={[
                styles.chip,
                {
                  backgroundColor: actionStyle === s.id ? t.primary : t.card2,
                  borderColor: actionStyle === s.id ? t.primary : t.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.chipText,
                  { color: actionStyle === s.id ? t.onPrimary : t.sub },
                ]}
              >
                {s.title}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.toggleRow}>
          <Text style={[styles.optionTitle, { color: t.text }]}>
            Ask to confirm before firing
          </Text>
          <Switch value={actionConfirm} onValueChange={setActionConfirm} />
        </View>
        <TouchableOpacity
          onPress={addAction}
          style={[
            styles.fullBtn,
            { backgroundColor: t.card2, borderColor: t.border },
          ]}
        >
          <Text style={[styles.fullBtnText, { color: t.text }]}>
            + Add button
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderStyle = () => (
    <View>
      <View
        style={[
          styles.card,
          { backgroundColor: t.card, borderColor: t.border },
        ]}
      >
        <Text style={[styles.cardTitle, { color: t.text }]}>Theme</Text>
        <Text style={[styles.cardSub, { color: t.sub }]}>
          {isDarkMode
            ? "Dark-mode friendly presets, then fine-tune with the pickers."
            : "Light-mode presets, then fine-tune with the pickers."}
        </Text>
        <View style={styles.presets}>
          {themePresets.map((p) => {
            const selected =
              normalizeHex(backgroundColor) === normalizeHex(p.background);
            return (
              <TouchableOpacity
                key={p.name}
                onPress={() => {
                  setBackgroundColor(p.background);
                  setTextColor(p.text);
                  setAccentColor(p.accent);
                }}
                style={[
                  styles.preset,
                  {
                    backgroundColor: p.background,
                    borderColor: selected ? t.primary : t.border,
                    borderWidth: selected ? 3 : 1,
                  },
                ]}
              >
                <Text style={[styles.presetName, { color: p.text }]}>
                  {p.name}
                </Text>
                <View
                  style={[styles.presetDot, { backgroundColor: p.accent }]}
                />
              </TouchableOpacity>
            );
          })}
        </View>
        <ColorPicker
          label="Background"
          value={backgroundColor}
          onChange={setBackgroundColor}
          t={t}
        />
        <ColorPicker
          label="Text"
          value={textColor}
          onChange={setTextColor}
          t={t}
        />
        <ColorPicker
          label="Accent (buttons & highlights)"
          value={accentColor}
          onChange={setAccentColor}
          t={t}
        />
        <Text style={[styles.label, { color: t.sub }]}>Corner radius</Text>
        <View style={styles.chips}>
          {RADIUS_OPTIONS.map((r) => (
            <TouchableOpacity
              key={r}
              onPress={() => setBorderRadius(r)}
              style={[
                styles.chip,
                {
                  backgroundColor: borderRadius === r ? t.primary : t.card2,
                  borderColor: borderRadius === r ? t.primary : t.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.chipText,
                  { color: borderRadius === r ? t.onPrimary : t.sub },
                ]}
              >
                {r}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={[styles.label, { color: t.sub }]}>Text size</Text>
        <View style={styles.chips}>
          {(
            [
              { id: "s", title: "Small" },
              { id: "m", title: "Medium" },
              { id: "l", title: "Large" },
            ] as const
          ).map((o) => (
            <TouchableOpacity
              key={o.id}
              onPress={() => setTextSize(o.id)}
              style={[
                styles.chip,
                {
                  backgroundColor: textSize === o.id ? t.primary : t.card2,
                  borderColor: textSize === o.id ? t.primary : t.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.chipText,
                  { color: textSize === o.id ? t.onPrimary : t.sub },
                ]}
              >
                {o.title}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: t.bg }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={[styles.header, { backgroundColor: t.bg }]}>
        <View style={styles.headerTopRow}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={[styles.backBtn, { backgroundColor: t.card2 }]}
          >
            <Text style={[styles.backText, { color: t.text }]}>‹</Text>
          </TouchableOpacity>
          <Text
            style={[styles.headerTitle, { color: t.text }]}
            numberOfLines={1}
          >
            {editWidget ? "Edit widget" : "New widget"}
          </Text>
        </View>
      </View>

      <View style={styles.previewFixed}>{renderPreview()}</View>

      {renderStepper()}

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {currentStepId === "basics" && renderBasics()}
        {currentStepId === "source" && (
          <View>
            {renderSource()}
            {renderFieldsAndLayout()}
          </View>
        )}
        {currentStepId === "actions" && renderActions()}
        {currentStepId === "style" && renderStyle()}
        <View style={{ height: 100 }} />
      </ScrollView>

      <Modal
        visible={!!pendingKey}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setPendingKey(null);
          setPendingLabel("");
        }}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalCard,
              { backgroundColor: t.card, borderColor: t.border },
            ]}
          >
            <Text style={[styles.cardTitle, { color: t.text }]}>Add field</Text>
            <Text style={[styles.monoSmall, { color: t.sub, marginBottom: 4 }]}>
              Key: {pendingKey}
            </Text>
            <Text style={[styles.label, { color: t.sub }]}>Label *</Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: t.input,
                  color: t.text,
                  borderColor: t.border,
                },
              ]}
              value={pendingLabel}
              onChangeText={setPendingLabel}
              placeholder={pendingKey ? humanizeKey(pendingKey) : "Label"}
              placeholderTextColor={t.faint}
              autoFocus
            />
            <View style={[styles.rowBetween, { marginTop: 14 }]}>
              <TouchableOpacity
                onPress={() => {
                  setPendingKey(null);
                  setPendingLabel("");
                }}
                style={[
                  styles.addBtn,
                  {
                    backgroundColor: "transparent",
                    borderWidth: 1,
                    borderColor: t.border,
                  },
                ]}
              >
                <Text style={[styles.addBtnText, { color: t.sub }]}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={confirmPendingKey}
                style={[styles.addBtn, { backgroundColor: t.primary }]}
              >
                <Text style={[styles.addBtnText, { color: t.onPrimary }]}>
                  Add field
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <View
        style={[
          styles.footer,
          { backgroundColor: t.card, borderColor: t.border },
        ]}
      >
        <TouchableOpacity
          onPress={() => (step === 0 ? router.back() : setStep(step - 1))}
          style={[
            styles.footerBtn,
            styles.footerSecondary,
            { borderColor: t.border },
          ]}
        >
          <Text style={[styles.footerSecondaryText, { color: t.text }]}>
            {step === 0 ? "Cancel" : "Back"}
          </Text>
        </TouchableOpacity>
        {step < visibleSteps.length - 1 ? (
          <TouchableOpacity
            onPress={() => canContinue() && setStep(step + 1)}
            style={[
              styles.footerBtn,
              styles.footerPrimary,
              { backgroundColor: t.primary, opacity: canContinue() ? 1 : 0.4 },
            ]}
            disabled={!canContinue()}
          >
            <Text style={[styles.footerPrimaryText, { color: t.onPrimary }]}>
              Continue
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={saveWidget}
            style={[
              styles.footerBtn,
              styles.footerPrimary,
              { backgroundColor: t.primary },
            ]}
          >
            <Text style={[styles.footerPrimaryText, { color: t.onPrimary }]}>
              {editWidget ? "Save changes" : "Create widget"}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

// ---------- Styles ----------

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 8,
  },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  backBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  backText: { fontSize: 18, fontWeight: "600", marginTop: -2 },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: "bold" },
  stepper: {
    borderBottomWidth: 0,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  stepItem: { flexDirection: "row", alignItems: "center", marginRight: 16 },
  stepDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  stepDotText: { fontSize: 13, fontWeight: "700" },
  stepTitle: { fontSize: 13, fontWeight: "600" },
  stepHint: { fontSize: 11 },
  stepLine: { width: 16, height: 1, marginLeft: 12, opacity: 0.6 },
  scroll: { flex: 1 },
  scrollContent: { padding: 16 },
  previewFixed: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 },
  previewBarHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
    paddingHorizontal: 2,
  },
  previewLabel: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  previewToggle: { fontSize: 13, fontWeight: "600" },
  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  cardTitle: { fontSize: 16, fontWeight: "700", marginBottom: 2 },
  cardSub: { fontSize: 13, marginBottom: 12, lineHeight: 18 },
  label: { fontSize: 13, fontWeight: "600", marginBottom: 6, marginTop: 10 },
  input: {
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    borderWidth: 1,
  },
  mono: { fontFamily: "monospace", fontSize: 13 },
  monoSmall: { fontFamily: "monospace", fontSize: 12, lineHeight: 17 },
  row: { flexDirection: "row", alignItems: "flex-end", marginTop: 8 },
  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
  },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    marginRight: 8,
    marginBottom: 8,
  },
  chipText: { fontSize: 13, fontWeight: "600" },
  option: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    gap: 12,
  },
  optionTitle: { fontSize: 14, fontWeight: "600" },
  optionDesc: { fontSize: 12, marginTop: 2, lineHeight: 16 },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  radioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "white",
  },
  testBtn: {
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  testBtnText: { fontWeight: "700", fontSize: 14 },
  previewBox: {
    borderRadius: 10,
    padding: 10,
    marginTop: 10,
    borderWidth: 1,
  },
  fieldRow: { flexDirection: "row", marginBottom: 4 },
  addBtn: { borderRadius: 10, paddingHorizontal: 18, paddingVertical: 10 },
  addBtnText: { fontWeight: "700" },
  pills: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    marginRight: 8,
    marginBottom: 8,
  },
  pillText: { fontSize: 12, fontWeight: "600" },
  pillX: { color: "#EF4444", fontSize: 16, fontWeight: "700" },
  mini: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    padding: 7,
    justifyContent: "center",
    gap: 4,
  },
  miniLine: { height: 4, borderRadius: 2, width: "100%" },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  deleteX: {
    color: "#EF4444",
    fontSize: 22,
    fontWeight: "700",
    paddingLeft: 8,
  },
  fullBtn: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 12,
  },
  fullBtnText: { fontWeight: "700", fontSize: 14 },
  presets: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  preset: {
    width: "48%",
    borderRadius: 12,
    padding: 12,
    borderWidth: 2,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  presetName: { fontSize: 13, fontWeight: "700" },
  presetDot: { width: 16, height: 16, borderRadius: 8 },
  swatchGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },
  swatch: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  pendingBox: {
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 12,
    marginTop: 10,
  },
  jsonKey: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
    marginRight: 2,
  },
  jsonKeyText: { fontFamily: "monospace", fontSize: 12, fontWeight: "700" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalCard: {
    width: "100%",
    maxWidth: 380,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
  },
  live: { padding: 14, borderWidth: 1 },
  footer: {
    flexDirection: "row",
    gap: 10,
    padding: 14,
    paddingBottom: 28,
    borderTopWidth: 1,
  },
  footerBtn: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  footerSecondary: { borderWidth: 1, backgroundColor: "transparent" },
  footerSecondaryText: { fontWeight: "600", fontSize: 15 },
  footerPrimary: {},
  footerPrimaryText: { fontWeight: "700", fontSize: 15 },
});
