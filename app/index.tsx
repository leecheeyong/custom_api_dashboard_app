import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Dimensions,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  FadeInUp,
  FadeOutDown,
  useSharedValue,
} from "react-native-reanimated";
import { useDarkMode } from "./DarkModeContext";

const { width } = Dimensions.get("window");

interface WidgetField {
  id: string;
  label: string;
  key: string;
  type: "text" | "number" | "boolean";
}

interface Widget {
  id: string;
  title: string;
  apiUrl: string;
  refreshInterval: number;
  backgroundColor: string;
  textColor: string;
  data?: any;
  lastUpdated?: string;
  fields?: WidgetField[];
}

export default function HomeScreen() {
  const { isDarkMode } = useDarkMode();
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedWidget, setExpandedWidget] = useState<string | null>(null);
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
        const parsedWidgets = JSON.parse(storedWidgets);
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
        try {
          const response = await fetch(widget.apiUrl);
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
    const editableWidget = {
      id: widget.id,
      title: widget.title,
      apiUrl: widget.apiUrl,
      refreshInterval: widget.refreshInterval,
      backgroundColor: widget.backgroundColor,
      textColor: widget.textColor,
      fields: widget.fields || [],
    };
    router.push({
      pathname: "/create",
      params: { editWidget: JSON.stringify(editableWidget) },
    });
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
            {String(data[field.key])}
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
    widgetCard: { backgroundColor: "#23232a", borderColor: "#27272a" },
    widgetContent: { backgroundColor: "#18181b", borderColor: "#27272a" },
    widgetTitle: { color: "#f1f5f9" },
    actionButton: { backgroundColor: "#23232a" },
    actionButtonText: { color: "#60a5fa" },
    actionButtonTextDelete: { color: "#ef4444" },
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

  return (
    <View style={[styles.container, isDarkMode && darkStyles.container]}>
      <View style={[styles.header, isDarkMode && darkStyles.header]}>
        <Text
          style={[styles.headerTitle, isDarkMode && darkStyles.headerTitle]}
        >
          My Dashboard
        </Text>
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
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {widgets.map((widget, index) => (
          <Animated.View
            key={widget.id}
            entering={FadeInUp.delay(index * 100)}
            exiting={FadeOutDown}
            style={[
              styles.widgetCard,
              isDarkMode && darkStyles.widgetCard,
              { borderRadius: 16 },
            ]}
          >
            <View
              style={[
                styles.widgetContent,
                isDarkMode && darkStyles.widgetContent,
                { borderRadius: 16 },
                widget.backgroundColor &&
                  !isDarkMode && { backgroundColor: widget.backgroundColor },
                widget.backgroundColor &&
                  isDarkMode && { backgroundColor: widget.backgroundColor },
              ]}
            >
              {isDarkMode &&
                widget.backgroundColor &&
                isLightColor(widget.backgroundColor) && (
                  <View
                    style={{
                      ...StyleSheet.absoluteFillObject,
                      backgroundColor: "rgba(24,24,27,0.7)",
                      borderRadius: 16,
                      zIndex: 1,
                    }}
                  />
                )}
              <View style={{ zIndex: 2 }}>
                <View style={styles.widgetHeader}>
                  <View style={styles.widgetHeaderLeft}>
                    <Text
                      style={[
                        styles.widgetTitle,
                        isDarkMode
                          ? { color: widget.textColor || "#f1f5f9" }
                          : { color: widget.textColor || "#1e293b" },
                        { fontWeight: "bold", fontSize: 20 },
                      ]}
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      {widget.title}
                    </Text>
                  </View>
                  <View style={styles.widgetActions}>
                    <TouchableOpacity
                      style={[
                        styles.actionButton,
                        isDarkMode && darkStyles.actionButton,
                      ]}
                      onPress={() => editWidget(widget)}
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
                      style={[
                        styles.actionButton,
                        isDarkMode && darkStyles.actionButton,
                      ]}
                      onPress={() => deleteWidget(widget.id)}
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
                  </View>
                </View>
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
                        <ScrollView horizontal>
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
                      </View>
                    )}
                  </View>
                </View>
                {widget.lastUpdated && (
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
          </Animated.View>
        ))}
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
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#f1f5f9",
    justifyContent: "center",
    alignItems: "center",
  },
  addButtonText: {
    fontSize: 20,
    color: "#3B82F6",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  widgetCard: {
    marginBottom: 24,
    borderRadius: 16,
    backgroundColor: "white",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
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
    marginBottom: 18,
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
  widgetActions: {
    flexDirection: "row",
    alignItems: "center",
    minWidth: 0,
    flexShrink: 0,
    flexGrow: 0,
    justifyContent: "flex-end",
  },
  actionButton: {
    padding: 8,
    marginLeft: 8,
    backgroundColor: "#f1f5f9",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 36,
  },
  actionButtonText: {
    fontSize: 18,
  },
  widgetBody: {
    minHeight: 60,
    marginBottom: 8,
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
    padding: 14,
    marginBottom: 8,
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
    maxHeight: 120,
  },
  rawDataText: {
    fontFamily: "monospace",
    fontSize: 12,
    color: "#334155",
  },
});

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
