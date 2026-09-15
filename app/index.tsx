import AsyncStorage from "@react-native-async-storage/async-storage";
import { BlurView } from "expo-blur";
import { router } from "expo-router";
import { useFocusEffect } from "expo-router/react-navigation";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Dimensions,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  FadeIn,
  FadeInUp,
  FadeOut,
  FadeOutDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useDarkMode } from "./DarkModeContext";

const { width } = Dimensions.get("window");

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
type WidgetKind = "display" | "action" | "hybrid";
type WidgetLayout = "compact" | "comfortable" | "detailed";

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
  style?: "primary" | "secondary" | "danger" | "ghost";
}

interface Widget {
  id: string;
  title: string;
  description?: string;
  kind?: WidgetKind;
  apiUrl: string;
  method?: HttpMethod;
  headers?: string;
  body?: string;
  refreshInterval: number;
  autoRefresh?: boolean;
  layout?: WidgetLayout;
  borderRadius?: number;
  textSize?: "s" | "m" | "l";
  backgroundColor: string;
  textColor: string;
  accentColor?: string;
  showTitle?: boolean;
  showLastUpdated?: boolean;
  data?: any;
  lastUpdated?: string;
  fields?: WidgetField[];
  actions?: WidgetAction[];
}

function WidgetCardShell({
  index,
  radius,
  isSelected,
  isDimmed,
  isDarkMode,
  style,
  onLongPress,
  onPress,
  children,
}: {
  index: number;
  radius: number;
  isSelected: boolean;
  isDimmed: boolean;
  isDarkMode: boolean;
  style: any;
  onLongPress: () => void;
  onPress: () => void;
  children: React.ReactNode;
}) {
  const selP = useSharedValue(0);
  const dimP = useSharedValue(0);

  useEffect(() => {
    selP.value = withSpring(isSelected ? 1 : 0, {
      damping: 15,
      stiffness: 220,
    });
    dimP.value = withTiming(isDimmed ? 1 : 0, { duration: 220 });
  }, [isSelected, isDimmed, selP, dimP]);

  const cardAnim = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + selP.value * 0.04 - dimP.value * 0.02 }],
    opacity: 1 - dimP.value * 0.15,
  }));

  return (
    <Animated.View
      entering={FadeInUp.delay(index * 100)}
      exiting={FadeOutDown}
      style={[style, cardAnim]}
    >
      <TouchableOpacity
        activeOpacity={0.96}
        style={{ paddingVertical: 6 }}
        onLongPress={onLongPress}
        onPress={onPress}
      >
        {children}
      </TouchableOpacity>
      {/* Sibling overlay (not nested in the card touchable): a single,
          unambiguous tap target — taps anywhere on a dimmed card
          deselect without responder conflicts. */}
      {isDimmed && (
        <Animated.View
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(200)}
          style={{
            ...StyleSheet.absoluteFill,
            borderRadius: radius,
            zIndex: 3,
          }}
        >
          <Pressable
            onPress={onPress}
            style={{ flex: 1, borderRadius: radius, overflow: "hidden" }}
          >
            <BlurView
              intensity={100}
              tint={isDarkMode ? "dark" : "light"}
              pointerEvents="none"
              style={{ ...StyleSheet.absoluteFill }}
            />
            <View
              pointerEvents="none"
              style={{
                ...StyleSheet.absoluteFill,
                backgroundColor: isDarkMode
                  ? "rgba(0,0,0,0.35)"
                  : "rgba(248,250,252,0.55)",
              }}
            />
          </Pressable>
        </Animated.View>
      )}
    </Animated.View>
  );
}

export default function HomeScreen() {
  const { isDarkMode } = useDarkMode();
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedWidget, setExpandedWidget] = useState<string | null>(null);
  const [selectedWidgetId, setSelectedWidgetId] = useState<string | null>(null);
  const scale = useSharedValue(1);

  useFocusEffect(
    React.useCallback(() => {
      loadWidgets();
    }, []),
  );

  useEffect(() => {
    loadWidgets();
  }, []);

  const loadWidgets = async () => {
    try {
      const storedWidgets = await AsyncStorage.getItem("widgets");
      if (storedWidgets) {
        const parsedWidgets = (JSON.parse(storedWidgets) as Widget[]).map(
          (w) => ({ ...w, fields: normalizeFields((w as any).fields) }),
        );
        setWidgets(parsedWidgets);
        fetchAllWidgetData(parsedWidgets);
      }
    } catch (error) {
      console.error("Error loading widgets:", error);
    }
  };

  const fetchAllWidgetData = async (widgetList: Widget[]) => {
    const updatedWidgets = await Promise.all(
      widgetList.map(async (widget) => {
        if (!widget.apiUrl?.trim()) {
          return {
            ...widget,
            lastUpdated: new Date().toLocaleTimeString(),
          };
        }
        try {
          let parsedHeaders: Record<string, string> = {};
          if (widget.headers) {
            try {
              parsedHeaders = JSON.parse(widget.headers);
            } catch {
              parsedHeaders = {};
            }
          }
          const response = await fetch(widget.apiUrl, {
            method: widget.method || "GET",
            headers: { "Content-Type": "application/json", ...parsedHeaders },
            body:
              (widget.method || "GET") === "GET"
                ? undefined
                : widget.body || undefined,
          });
          const text = await response.text();
          let data;
          try {
            data = JSON.parse(text);
          } catch {
            data = text;
          }
          return {
            ...widget,
            data,
            lastUpdated: new Date().toLocaleTimeString(),
          };
        } catch (error) {
          return {
            ...widget,
            data: { error: "Couldn't fetch data" },
            lastUpdated: new Date().toLocaleTimeString(),
          };
        }
      }),
    );
    setWidgets(updatedWidgets);
    await AsyncStorage.setItem("widgets", JSON.stringify(updatedWidgets));
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAllWidgetData(widgets);
    setRefreshing(false);
  };

  const deleteWidget = (widgetId: string) => {
    Alert.alert(
      "Delete Widget",
      "Are you sure you want to delete this widget?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            const updatedWidgets = widgets.filter((w) => w.id !== widgetId);
            setWidgets(updatedWidgets);
            await AsyncStorage.setItem(
              "widgets",
              JSON.stringify(updatedWidgets),
            );
          },
        },
      ],
    );
  };

  const editWidget = (widget: Widget) => {
    setSelectedWidgetId(null);
    const editableWidget = {
      id: widget.id,
      title: widget.title,
      description: widget.description || "",
      kind: widget.kind || "display",
      apiUrl: widget.apiUrl,
      method: widget.method || "GET",
      headers: widget.headers || "",
      body: widget.body || "",
      refreshInterval: widget.refreshInterval,
      autoRefresh: widget.autoRefresh ?? true,
      layout: widget.layout || "comfortable",
      borderRadius: widget.borderRadius ?? 16,
      textSize: widget.textSize || "m",
      backgroundColor: widget.backgroundColor,
      textColor: widget.textColor,
      accentColor: widget.accentColor || "#2563EB",
      showTitle: widget.showTitle ?? true,
      showLastUpdated: widget.showLastUpdated ?? true,
      fields: widget.fields || [],
      actions: widget.actions || [],
    };
    router.push({
      pathname: "/create",
      params: { editWidget: JSON.stringify(editableWidget) },
    });
  };

  const [firingId, setFiringId] = useState<string | null>(null);

  const fireAction = async (widget: Widget, action: WidgetAction) => {
    const doFire = async () => {
      const url = action.url?.trim() || widget.apiUrl?.trim();
      if (!url) {
        Alert.alert("Missing URL", "This button has no URL configured.");
        return;
      }
      setFiringId(`${widget.id}:${action.id}`);
      try {
        const res = await fetch(url, {
          method: action.method || "POST",
          headers: { "Content-Type": "application/json" },
          body:
            (action.method || "POST") === "GET"
              ? undefined
              : action.body || undefined,
        });
        const text = await res.text();
        let preview = text;
        try {
          preview = JSON.stringify(JSON.parse(text), null, 2).substring(0, 400);
        } catch {
          preview = text.substring(0, 400);
        }
        Alert.alert(
          res.ok
            ? `${action.label} — OK (${res.status})`
            : `${action.label} — ${res.status}`,
          preview || "(empty response)",
        );
        if (widget.apiUrl?.trim()) fetchAllWidgetData(widgets);
      } catch {
        Alert.alert("Failed", `Could not reach ${action.label}.`);
      } finally {
        setFiringId(null);
      }
    };
    if (action.confirm) {
      Alert.alert(`Trigger "${action.label}"?`, "This will call the API.", [
        { text: "Cancel", style: "cancel" },
        { text: "Trigger", onPress: doFire },
      ]);
    } else {
      doFire();
    }
  };

  const getActionStyle = (action: WidgetAction, widget: Widget) => {
    const accent = widget.accentColor || "#2563EB";
    switch (action.style) {
      case "danger":
        return {
          backgroundColor: "#EF4444",
          borderColor: "#EF4444",
          color: "#fff",
        };
      case "secondary":
        return {
          backgroundColor: "transparent",
          borderColor: "#94A3B8",
          color: widget.textColor,
        };
      case "ghost":
        return {
          backgroundColor: "transparent",
          borderColor: "transparent",
          color: accent,
        };
      default:
        return { backgroundColor: accent, borderColor: accent, color: "#fff" };
    }
  };

  const renderWidgetData = (
    data: any,
    fields?: WidgetField[],
    isRaw?: boolean,
  ) => {
    if (!data)
      return (
        <Text
          style={[
            styles.widgetDataItem,
            isDarkMode && darkStyles.widgetDataItem,
          ]}
        >
          Loading...
        </Text>
      );
    if (data.error)
      return (
        <Text
          style={[
            styles.widgetDataItem,
            isDarkMode && darkStyles.widgetDataItem,
          ]}
        >
          {data.error}
        </Text>
      );
    if (typeof data === "string") {
      return (
        <View
          style={[styles.plainTextBox, isDarkMode && darkStyles.plainTextBox]}
        >
          <ScrollView horizontal>
            <Text
              style={[styles.plainText, isDarkMode && darkStyles.plainText]}
            >
              {data}
            </Text>
          </ScrollView>
        </View>
      );
    }
    if (fields && fields.length > 0) {
      return fields.map((field, idx) => (
        <View
          key={`field-${field.id || field.label || idx}`}
          style={[styles.customFieldRow, { alignItems: "flex-start" }]}
        >
          <Text
            style={[
              styles.customFieldLabel,
              isDarkMode && darkStyles.customFieldLabel,
            ]}
          >
            {field.label}:
          </Text>
          <Text
            style={[
              styles.customFieldValue,
              isDarkMode && darkStyles.customFieldValue,
            ]}
          >
            {formatFieldValue(getValueAtPath(data, field.key))}
          </Text>
        </View>
      ));
    }
    if (typeof data === "object") {
      return (
        <View
          style={[
            styles.jsonPreviewBox,
            isDarkMode && darkStyles.jsonPreviewBox,
          ]}
        >
          <ScrollView horizontal>
            <Text
              style={[
                styles.jsonPreviewText,
                isDarkMode && darkStyles.jsonPreviewText,
              ]}
            >
              {JSON.stringify(data, null, 2).substring(0, isRaw ? 2000 : 300)}
              {isRaw ? "" : JSON.stringify(data).length > 300 ? "..." : ""}
            </Text>
          </ScrollView>
        </View>
      );
    }
    return (
      <Text
        style={[styles.widgetDataItem, isDarkMode && darkStyles.widgetDataItem]}
      >
        {String(data).substring(0, 100)}
      </Text>
    );
  };

  const darkStyles = StyleSheet.create({
    container: { backgroundColor: "#18181b" },
    header: { backgroundColor: "#23232a", borderBottomColor: "#27272a" },
    headerTitle: { color: "#f1f5f9" },
    addButton: { backgroundColor: "#23232a" },
    addButtonText: { color: "#60a5fa" },
    widgetCard: {},
    widgetContent: { backgroundColor: "#18181b", borderColor: "#27272a" },
    widgetTitle: { color: "#f1f5f9" },
    dataContainer: { backgroundColor: "#23232a", borderColor: "#27272a" },
    rawToggle: { backgroundColor: "#18181b" },
    rawToggleText: { color: "#60a5fa" },
    rawDataBox: { backgroundColor: "#18181b", borderColor: "#27272a" },
    rawDataText: { color: "#f1f5f9" },
    jsonPreviewBox: { backgroundColor: "#23232a" },
    jsonPreviewText: { color: "#f1f5f9" },
    plainTextBox: { backgroundColor: "#23232a" },
    plainText: { color: "#f1f5f9" },
    customFieldLabel: { color: "#f1f5f9" },
    customFieldValue: { color: "#a1a1aa" },
    widgetDataItem: { color: "#a1a1aa" },
    lastUpdated: { color: "#dddde0ff" },
    emptyContainer: { backgroundColor: "#18181b" },
    emptyIcon: { color: "#3B82F6" },
    emptyTitle: { color: "#f1f5f9" },
    emptyDescription: { color: "#a1a1aa" },
    createButton: { backgroundColor: "#3B82F6" },
    createButtonIcon: { color: "white" },
    createButtonText: { color: "white" },
  });

  if (widgets.length === 0) {
    return (
      <View
        style={[styles.emptyContainer, isDarkMode && darkStyles.emptyContainer]}
      >
        <View style={styles.emptyContent}>
          <Text
            style={[styles.emptyTitle, isDarkMode && darkStyles.emptyTitle]}
          >
            No Widgets Yet
          </Text>
          <Text
            style={[
              styles.emptyDescription,
              isDarkMode && darkStyles.emptyDescription,
            ]}
          >
            Create your first widget to start displaying API data
          </Text>
          <TouchableOpacity
            style={[styles.createButton, isDarkMode && darkStyles.createButton]}
            onPress={() => router.push("/create")}
          >
            <Text
              style={[
                styles.createButtonText,
                isDarkMode && darkStyles.createButtonText,
              ]}
            >
              Create Widget
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const selectedWidget = widgets.find((w) => w.id === selectedWidgetId) ?? null;

  return (
    <View style={[styles.container, isDarkMode && darkStyles.container]}>
      <View style={[styles.header, isDarkMode && darkStyles.header]}>
        <Pressable
          style={{ flex: 1 }}
          onPress={() => setSelectedWidgetId(null)}
        >
          <Text
            style={[styles.headerTitle, isDarkMode && darkStyles.headerTitle]}
          >
            My Dashboard
          </Text>
        </Pressable>
        <View style={styles.headerRight}>
          {selectedWidget ? (
            <>
              <TouchableOpacity
                style={[styles.addButton, isDarkMode && darkStyles.addButton]}
                onPress={() => editWidget(selectedWidget)}
              >
                <Image
                  source={require("../assets/icons/edit.png")}
                  style={{
                    width: 20,
                    height: 20,
                    tintColor: isDarkMode ? "white" : undefined,
                  }}
                  resizeMode="contain"
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.addButton, isDarkMode && darkStyles.addButton]}
                onPress={() => {
                  setSelectedWidgetId(null);
                  deleteWidget(selectedWidget.id);
                }}
              >
                <Image
                  source={require("../assets/icons/delete.png")}
                  style={{
                    width: 20,
                    height: 20,
                    tintColor: isDarkMode ? "white" : undefined,
                  }}
                  resizeMode="contain"
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.addButton, isDarkMode && darkStyles.addButton]}
                onPress={() => setSelectedWidgetId(null)}
              >
                <Text
                  style={[
                    styles.addButtonText,
                    isDarkMode && darkStyles.addButtonText,
                    { fontSize: 16 },
                  ]}
                >
                  ✕
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              style={[styles.addButton, isDarkMode && darkStyles.addButton]}
              onPress={() => router.push("/create")}
            >
              <Text
                style={[
                  styles.addButtonText,
                  isDarkMode && darkStyles.addButtonText,
                ]}
              >
                ➕
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { flexGrow: 1 }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {widgets.map((widget, index) => {
          const radius = widget.borderRadius ?? 16;
          const cardPadding =
            widget.layout === "compact"
              ? 10
              : widget.layout === "detailed"
                ? 18
                : 14;
          const titleSize =
            widget.textSize === "s" ? 16 : widget.textSize === "l" ? 21 : 18;
          const showTitle = widget.showTitle ?? true;
          const showUpdated = widget.showLastUpdated ?? true;
          const isActionOnly =
            widget.kind === "action" && !widget.apiUrl?.trim();
          const isSelected = selectedWidgetId === widget.id;
          const isDimmed =
            selectedWidgetId !== null && selectedWidgetId !== widget.id;
          const selectAccent = widget.accentColor || "#2563EB";
          return (
            <WidgetCardShell
              key={widget.id}
              index={index}
              radius={radius}
              isSelected={isSelected}
              isDimmed={isDimmed}
              isDarkMode={isDarkMode}
              style={[
                styles.widgetCard,
                isDarkMode && darkStyles.widgetCard,
                { borderRadius: radius },
                isSelected && styles.widgetCardSelected,
              ]}
              onLongPress={() => {
                // Long-press selects when nothing is selected;
                // anywhere else (including here) unselects.
                if (selectedWidgetId === null) setSelectedWidgetId(widget.id);
                else setSelectedWidgetId(null);
              }}
              onPress={() => {
                // Anything but the header edit/delete buttons unselects.
                setSelectedWidgetId(null);
              }}
            >
              <View
                style={[
                  styles.widgetContent,
                  isDarkMode && darkStyles.widgetContent,
                  { borderRadius: radius, padding: cardPadding },
                  widget.backgroundColor &&
                    !isDarkMode && { backgroundColor: widget.backgroundColor },
                  widget.backgroundColor &&
                    isDarkMode && { backgroundColor: widget.backgroundColor },
                  isSelected && { borderColor: selectAccent, borderWidth: 2 },
                ]}
              >
                {isDarkMode &&
                  widget.backgroundColor &&
                  isLightColor(widget.backgroundColor) && (
                    <View
                      style={{
                        ...StyleSheet.absoluteFill,
                        backgroundColor: "rgba(24,24,27,0.7)",
                        borderRadius: radius,
                        zIndex: 1,
                      }}
                    />
                  )}
                <View style={{ zIndex: 2 }}>
                  <View style={styles.widgetHeader}>
                    <View style={styles.widgetHeaderLeft}>
                      {showTitle ? (
                        <View style={{ flexShrink: 1 }}>
                          <Text
                            style={[
                              styles.widgetTitle,
                              isDarkMode
                                ? { color: widget.textColor || "#f1f5f9" }
                                : { color: widget.textColor || "#1e293b" },
                              { fontWeight: "bold", fontSize: titleSize },
                            ]}
                            numberOfLines={1}
                            ellipsizeMode="tail"
                          >
                            {widget.title}
                          </Text>
                          {!!widget.description && (
                            <Text
                              numberOfLines={2}
                              style={{
                                fontSize: 12,
                                marginTop: 2,
                                color: widget.textColor || "#64748b",
                                opacity: 0.7,
                              }}
                            >
                              {widget.description}
                            </Text>
                          )}
                        </View>
                      ) : null}
                    </View>
                  </View>
                  {!isActionOnly && (
                    <View style={styles.widgetBody}>
                      <View
                        style={[
                          styles.dataContainer,
                          isDarkMode && darkStyles.dataContainer,
                        ]}
                      >
                        {renderWidgetData(widget.data, widget.fields)}
                        {typeof widget.data === "object" ||
                        typeof widget.data === "string" ? (
                          <TouchableOpacity
                            style={[
                              styles.rawToggle,
                              isDarkMode && darkStyles.rawToggle,
                            ]}
                            onPress={() =>
                              setExpandedWidget(
                                expandedWidget === widget.id ? null : widget.id,
                              )
                            }
                          >
                            <Text
                              style={[
                                styles.rawToggleText,
                                isDarkMode && darkStyles.rawToggleText,
                              ]}
                            >
                              {expandedWidget === widget.id
                                ? "Hide Raw Data"
                                : "Show Raw Data"}
                            </Text>
                          </TouchableOpacity>
                        ) : null}
                        {expandedWidget === widget.id && (
                          <View
                            style={[
                              styles.rawDataBox,
                              isDarkMode && darkStyles.rawDataBox,
                            ]}
                          >
                            <ScrollView
                              style={styles.rawDataScroll}
                              nestedScrollEnabled
                            >
                              <ScrollView horizontal nestedScrollEnabled>
                                <Text
                                  style={[
                                    styles.rawDataText,
                                    isDarkMode && darkStyles.rawDataText,
                                  ]}
                                >
                                  {typeof widget.data === "string"
                                    ? widget.data
                                    : JSON.stringify(widget.data, null, 2)}
                                </Text>
                              </ScrollView>
                            </ScrollView>
                          </View>
                        )}
                      </View>
                    </View>
                  )}
                  {!!widget.actions?.length && (
                    <View style={styles.triggerRow}>
                      {widget.actions.map((a) => {
                        const st = getActionStyle(a, widget);
                        const busy = firingId === `${widget.id}:${a.id}`;
                        return (
                          <TouchableOpacity
                            key={a.id}
                            disabled={busy}
                            onPress={() => fireAction(widget, a)}
                            style={[
                              styles.triggerBtn,
                              {
                                backgroundColor: st.backgroundColor,
                                borderColor: st.borderColor,
                                opacity: busy ? 0.6 : 1,
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.triggerBtnText,
                                { color: st.color },
                              ]}
                            >
                              {busy ? "…" : a.label}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}
                  {showUpdated && widget.lastUpdated && (
                    <Text
                      style={[
                        styles.lastUpdated,
                        isDarkMode && darkStyles.lastUpdated,
                      ]}
                    >
                      Last updated: {widget.lastUpdated}
                    </Text>
                  )}
                </View>
              </View>
            </WidgetCardShell>
          );
        })}
        {/* Tappable empty space below the cards unselects */}
        <Pressable
          style={{ flexGrow: 1, minHeight: 80 }}
          onPress={() => setSelectedWidgetId(null)}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 24,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1e293b",
  },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f1f5f9",
    justifyContent: "center",
    alignItems: "center",
  },
  addButtonText: {
    fontSize: 18,
    color: "#3B82F6",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 12,
  },
  widgetCard: {
    marginBottom: 0,
  },
  widgetCardSelected: {
    transform: [{ scale: 1.02 }],
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 16,
    elevation: 8,
  },
  widgetContent: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  widgetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  widgetHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    flexShrink: 1,
    flexGrow: 1,
    minWidth: 0,
    marginRight: 8,
  },
  widgetTitle: {
    fontSize: 20,
    fontWeight: "bold",
    flexShrink: 1,
    minWidth: 0,
    maxWidth: "100%",
    overflow: "hidden",
  },
  widgetBody: {
    marginBottom: 4,
  },
  widgetData: {
    fontSize: 14,
    lineHeight: 20,
  },
  widgetDataItem: {
    fontSize: 13,
    marginBottom: 4,
    color: "#dbdbdbff",
  },
  lastUpdated: {
    fontSize: 11,
    color: "#e9e9e9ff",
    marginTop: 8,
    textAlign: "right",
  },
  emptyContainer: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  emptyContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1e293b",
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 16,
    color: "#64748b",
    textAlign: "center",
    marginBottom: 32,
  },
  createButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#3B82F6",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  createButtonIcon: {
    fontSize: 16,
    color: "white",
    marginRight: 8,
  },
  createButtonText: {
    color: "white",
    fontWeight: "600",
  },
  dataContainer: {
    backgroundColor: "#f1f5f9",
    borderRadius: 8,
    padding: 10,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  customFieldRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  customFieldLabel: {
    fontWeight: "600",
    color: "#1e293b",
    minWidth: 80,
  },
  customFieldValue: {
    color: "#64748b",
    marginLeft: 8,
    flexShrink: 1,
    flexWrap: "wrap",
    maxWidth: "100%",
  },
  jsonPreviewBox: {
    backgroundColor: "#e0e7ef",
    borderRadius: 6,
    padding: 8,
    marginBottom: 4,
  },
  jsonPreviewText: {
    fontFamily: "monospace",
    fontSize: 12,
    color: "#334155",
  },
  plainTextBox: {
    backgroundColor: "#e0e7ef",
    borderRadius: 6,
    padding: 8,
    marginBottom: 4,
  },
  plainText: {
    fontFamily: "monospace",
    fontSize: 13,
    color: "#334155",
  },
  rawToggle: {
    marginTop: 6,
    alignSelf: "flex-end",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: "#cbd5e1",
  },
  rawToggleText: {
    fontSize: 12,
    color: "#1e293b",
    fontWeight: "500",
  },
  rawDataBox: {
    backgroundColor: "#fff",
    borderRadius: 6,
    padding: 8,
    marginTop: 6,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    maxHeight: 220,
  },
  rawDataScroll: {
    maxHeight: 204,
  },
  rawDataText: {
    fontFamily: "monospace",
    fontSize: 12,
    color: "#334155",
  },
  triggerRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 4,
    marginBottom: 4,
  },
  triggerBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginRight: 8,
    marginBottom: 8,
    minWidth: 88,
    alignItems: "center",
  },
  triggerBtnText: {
    fontSize: 14,
    fontWeight: "600",
  },
});

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

function normalizeFields(raw: any): WidgetField[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((f) => f && typeof f.key === "string" && f.key.length > 0)
    .map((f, i) => ({
      id: typeof f.id === "string" && f.id ? f.id : `field-${Date.now()}-${i}`,
      label: typeof f.label === "string" && f.label ? f.label : String(f.key),
      key: String(f.key),
      type:
        f.type === "number" || f.type === "boolean"
          ? f.type
          : ("text" as const),
    }));
}

function isLightColor(color: string) {
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
}
