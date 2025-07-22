import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useState } from "react";
import {
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import { useDarkMode } from "./DarkModeContext";

interface CommunityWidget {
  id: string;
  title: string;
  description: string;
  apiUrl: string;
  backgroundColor: string;
  textColor: string;
  author: string;
  category: string;
  refreshInterval: number;
  fields: Object;
}

const DEFAULT_COMMUNITY_WIDGETS: CommunityWidget[] = [];

export default function CommunityScreen() {
  const { isDarkMode } = useDarkMode();
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [refreshing, setRefreshing] = useState(false);
  const [userWidgets, setUserWidgets] = useState<any[]>([]);
  const [communityWidgets, setCommunityWidgets] = useState<CommunityWidget[]>(
    DEFAULT_COMMUNITY_WIDGETS,
  );
  const categories = [
    "All",
    "Weather",
    "Finance",
    "Lifestyle",
    "Developer",
    "News",
    "Entertainment",
  ];

  useEffect(() => {
    loadUserWidgets();
    fetchCommunityWidgets();
  }, []);

  const fetchCommunityWidgets = async () => {
    try {
      const res = await fetch(
        "https://raw.githubusercontent.com/leecheeyong/community-widgets/refs/heads/main/widgets.json",
      );
      const data = await res.json();
      if (Array.isArray(data)) {
        setCommunityWidgets(data);
      }
    } catch (e) {
      setCommunityWidgets(DEFAULT_COMMUNITY_WIDGETS);
    }
  };

  const loadUserWidgets = async () => {
    try {
      const storedWidgets = await AsyncStorage.getItem("widgets");
      if (storedWidgets) {
        setUserWidgets(JSON.parse(storedWidgets));
      }
    } catch (error) {
      console.error("Error loading user widgets:", error);
    }
  };

  const filteredWidgets =
    selectedCategory === "All"
      ? communityWidgets
      : communityWidgets.filter(
          (widget) => widget.category === selectedCategory,
        );

  const downloadWidget = async (widget: CommunityWidget) => {
    try {
      const storedWidgets = await AsyncStorage.getItem("widgets");
      const widgets = storedWidgets ? JSON.parse(storedWidgets) : [];

      const existingWidget = widgets.find((w: any) => w.title === widget.title);
      if (existingWidget) {
        Alert.alert(
          "Already Installed",
          "This widget is already in your dashboard",
        );
        return;
      }

      const newWidget = {
        id: Date.now().toString(),
        title: widget.title,
        apiUrl: widget.apiUrl,
        refreshInterval: widget.refreshInterval,
        backgroundColor: widget.backgroundColor,
        textColor: widget.textColor,
        fields: widget.fields || [],
      };

      const updatedWidgets = [...widgets, newWidget];
      await AsyncStorage.setItem("widgets", JSON.stringify(updatedWidgets));
      setUserWidgets(updatedWidgets);

      Alert.alert("Success", "Widget has been added to your dashboard!", [
        { text: "OK" },
      ]);
    } catch (error) {
      Alert.alert("Error", "Failed to install widget");
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadUserWidgets(), fetchCommunityWidgets()]);
    setRefreshing(false);
  };

  const isWidgetInstalled = (widget: CommunityWidget) => {
    return userWidgets.some((w) => w.title === widget.title);
  };

  return (
    <View
      style={[styles.container, isDarkMode && { backgroundColor: "#18181b" }]}
    >
      <View
        style={[
          styles.header,
          isDarkMode && {
            backgroundColor: "#23232a",
            borderBottomColor: "#27272a",
          },
        ]}
      >
        <Text style={[styles.headerTitle, isDarkMode && { color: "#f1f5f9" }]}>
          Community Widgets
        </Text>
        <Text
          style={[styles.headerSubtitle, isDarkMode && { color: "#a1a1aa" }]}
        >
          Discover and install widgets created by the community
        </Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesContent}
        >
          {categories.map((category) => (
            <TouchableOpacity
              key={`category-${category}`}
              style={[
                styles.categoryButton,
                selectedCategory === category && styles.categoryButtonActive,
                isDarkMode && { backgroundColor: "#23232a" },
                selectedCategory === category &&
                  isDarkMode && { backgroundColor: "#3B82F6" },
              ]}
              onPress={() => setSelectedCategory(category)}
            >
              <Text
                style={[
                  styles.categoryButtonText,
                  selectedCategory === category &&
                    styles.categoryButtonTextActive,
                  isDarkMode && { color: "#f1f5f9" },
                  selectedCategory === category &&
                    isDarkMode && { color: "white" },
                ]}
              >
                {category}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {filteredWidgets.map((widget, index) => {
          const installed = isWidgetInstalled(widget);
          const previewIsLight = isLightColor(widget.backgroundColor);
          return (
            <Animated.View
              key={`widget-${widget.id}`}
              entering={FadeInUp.delay(index * 100)}
              style={[
                styles.widgetCard,
                isDarkMode && {
                  backgroundColor: "#23232a",
                  borderColor: "#27272a",
                  shadowColor: "#18181b",
                },
              ]}
            >
              <View style={styles.widgetHeader}>
                <View style={styles.widgetInfo}>
                  <Text
                    style={[
                      styles.widgetTitle,
                      isDarkMode && { color: "#f1f5f9" },
                    ]}
                  >
                    {widget.title}
                  </Text>
                  <Text
                    style={[
                      styles.widgetAuthor,
                      isDarkMode && { color: "#a1a1aa" },
                    ]}
                  >
                    by {widget.author}
                  </Text>
                </View>
                <View
                  style={[
                    styles.widgetCategory,
                    isDarkMode && { backgroundColor: "#23232a" },
                  ]}
                >
                  <Text
                    style={[
                      styles.categoryTag,
                      isDarkMode && { color: "#a1a1aa" },
                    ]}
                  >
                    {widget.category}
                  </Text>
                </View>
              </View>

              <Text
                style={[
                  styles.widgetDescription,
                  isDarkMode && { color: "#a1a1aa" },
                ]}
              >
                {widget.description}
              </Text>

              <TouchableOpacity
                style={[
                  styles.installButton,
                  installed && styles.installButtonDisabled,
                  isDarkMode && {
                    backgroundColor: installed ? "#23232a" : "#3B82F6",
                    borderColor: installed ? "#27272a" : "#3B82F6",
                  },
                ]}
                onPress={() => downloadWidget(widget)}
                disabled={installed}
              >
                <Text
                  style={[
                    styles.installButtonText,
                    installed && styles.installButtonTextDisabled,
                    isDarkMode && { color: installed ? "#3B82F6" : "white" },
                  ]}
                >
                  {installed ? "Installed" : "Install"}
                </Text>
              </TouchableOpacity>
            </Animated.View>
          );
        })}
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
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1e293b",
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#64748b",
  },
  categoriesContent: {
    paddingVertical: 16,
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#f1f5f9",
    marginRight: 8,
  },
  categoryButtonActive: {
    backgroundColor: "#3B82F6",
  },
  categoryButtonText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#64748b",
  },
  categoryButtonTextActive: {
    color: "white",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  widgetCard: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  widgetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  widgetInfo: {
    flex: 1,
  },
  widgetTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1e293b",
    marginBottom: 2,
  },
  widgetAuthor: {
    fontSize: 12,
    color: "#64748b",
  },
  widgetCategory: {
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  categoryTag: {
    fontSize: 10,
    fontWeight: "500",
    color: "#64748b",
    textTransform: "uppercase",
  },
  widgetDescription: {
    fontSize: 14,
    color: "#64748b",
    lineHeight: 20,
    marginBottom: 12,
  },
  widgetStats: {
    flexDirection: "row",
    marginBottom: 16,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 16,
  },
  statIcon: {
    fontSize: 12,
    marginRight: 4,
  },
  statText: {
    fontSize: 12,
    color: "#64748b",
  },
  widgetPreview: {
    marginBottom: 16,
  },
  previewCard: {
    borderRadius: 8,
    padding: 12,
    minHeight: 60,
  },
  previewTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 4,
  },
  previewData: {
    fontSize: 12,
    opacity: 0.8,
  },
  installButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#3B82F6",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    justifyContent: "center",
  },
  installButtonDisabled: {
    backgroundColor: "#f1f5f9",
  },
  installButtonIcon: {
    fontSize: 14,
    marginRight: 8,
  },
  installButtonText: {
    color: "white",
    fontWeight: "600",
  },
  installButtonTextDisabled: {
    color: "#94a3b8",
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
