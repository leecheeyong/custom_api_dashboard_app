import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useDarkMode } from "./DarkModeContext";

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
  fields?: WidgetField[];
}

const colorPresets = [
  { background: "#c7036fff", text: "#ffffffff", name: "Pink" },
  { background: "#3B82F6", text: "#ffffff", name: "Blue" },
  { background: "#14B8A6", text: "#ffffff", name: "Teal" },
  { background: "#F97316", text: "#ffffff", name: "Orange" },
  { background: "#a10137ff", text: "#ffffff", name: "Red" },
];

export default function CreateWidgetScreen() {
  const { isDarkMode } = useDarkMode();
  const params = useLocalSearchParams();
  const editWidget = params.editWidget
    ? JSON.parse(params.editWidget as string)
    : null;
  const [title, setTitle] = useState("");
  const [apiUrl, setApiUrl] = useState("");
  const [refreshInterval, setRefreshInterval] = useState("300");
  const [backgroundColor, setBackgroundColor] = useState("#ffffff");
  const [textColor, setTextColor] = useState("#1e293b");
  const [testData, setTestData] = useState<any>(null);
  const [testing, setTesting] = useState(false);
  const [fields, setFields] = useState<WidgetField[]>([]);
  const [fieldLabel, setFieldLabel] = useState("");
  const [fieldKey, setFieldKey] = useState("");
  const [fieldType, setFieldType] = useState<"text" | "number" | "boolean">(
    "text",
  );

  React.useEffect(() => {
    if (editWidget) {
      setTitle(editWidget.title || "");
      setApiUrl(editWidget.apiUrl || "");
      setRefreshInterval(editWidget.refreshInterval?.toString() || "300");
      setBackgroundColor(editWidget.backgroundColor || "#ffffff");
      setTextColor(editWidget.textColor || "#1e293b");
      setFields(editWidget.fields || []);
    } else {
      setTitle("");
      setApiUrl("");
      setRefreshInterval("300");
      setBackgroundColor("#ffffff");
      setTextColor("#1e293b");
      setFields([]);
    }
  }, [params.editWidget]);

  const testApiEndpoint = async () => {
    if (!apiUrl.trim()) {
      Alert.alert("Error", "Please enter an API URL");
      return;
    }
    setTesting(true);
    try {
      const response = await fetch(apiUrl);
      let data;
      const text = await response.text();
      try {
        data = JSON.parse(text);
      } catch {
        data = text;
      }
      setTestData(data);
      Alert.alert("Success", "API endpoint is working correctly!");
    } catch (error) {
      Alert.alert("Error", "Failed to fetch data from API endpoint");
      setTestData({ error: "Failed to connect" });
    } finally {
      setTesting(false);
    }
  };

  const addField = () => {
    if (!fieldLabel.trim() || !fieldKey.trim()) return;
    setFields([
      ...fields,
      {
        id: Date.now().toString(),
        label: fieldLabel,
        key: fieldKey,
        type: fieldType,
      },
    ]);
    setFieldLabel("");
    setFieldKey("");
    setFieldType("text");
  };

  const removeField = (id: string) => {
    setFields(fields.filter((f) => f.id !== id));
  };

  const saveWidget = async () => {
    if (!title.trim() || !apiUrl.trim()) {
      Alert.alert("Error", "Please fill in all required fields");
      return;
    }
    try {
      const storedWidgets = await AsyncStorage.getItem("widgets");
      const widgets = storedWidgets ? JSON.parse(storedWidgets) : [];
      const widget: Widget = {
        id: editWidget?.id || Date.now().toString(),
        title: title.trim(),
        apiUrl: apiUrl.trim(),
        refreshInterval: parseInt(refreshInterval) || 30,
        backgroundColor,
        textColor,
        fields,
      };

      let updatedWidgets;
      if (editWidget) {
        updatedWidgets = widgets.map((w: Widget) =>
          w.id === editWidget.id ? widget : w,
        );
      } else {
        updatedWidgets = [...widgets, widget];
      }

      await AsyncStorage.setItem("widgets", JSON.stringify(updatedWidgets));
      Alert.alert(
        "Success",
        `Widget ${editWidget ? "updated" : "created"} successfully!`,
        [{ text: "OK", onPress: () => router.back() }],
      );
    } catch (error) {
      Alert.alert("Error", "Failed to save widget");
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, isDarkMode && { backgroundColor: "#18181b" }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
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
          {editWidget ? "Edit Widget" : "Create Widget"}
        </Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        <View
          style={[styles.section, isDarkMode && { backgroundColor: "#23232a" }]}
        >
          <Text
            style={[styles.sectionTitle, isDarkMode && { color: "#f1f5f9" }]}
          >
            Widget Details
          </Text>
          <View style={styles.inputGroup}>
            <Text style={[styles.label, isDarkMode && { color: "#a1a1aa" }]}>
              Title *
            </Text>
            <TextInput
              style={[
                styles.input,
                isDarkMode && {
                  backgroundColor: "#23232a",
                  color: "#f1f5f9",
                  borderColor: "#27272a",
                },
              ]}
              value={title}
              onChangeText={setTitle}
              placeholder="Enter widget title"
              placeholderTextColor={isDarkMode ? "#52525b" : "#94a3b8"}
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={[styles.label, isDarkMode && { color: "#a1a1aa" }]}>
              API URL *
            </Text>
            <TextInput
              style={[
                styles.input,
                isDarkMode && {
                  backgroundColor: "#23232a",
                  color: "#f1f5f9",
                  borderColor: "#27272a",
                },
              ]}
              value={apiUrl}
              onChangeText={setApiUrl}
              placeholder="https://api.example.com/data"
              placeholderTextColor={isDarkMode ? "#52525b" : "#94a3b8"}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={[styles.label, isDarkMode && { color: "#a1a1aa" }]}>
              Refresh Interval (seconds)
            </Text>
            <TextInput
              style={[
                styles.input,
                isDarkMode && {
                  backgroundColor: "#23232a",
                  color: "#f1f5f9",
                  borderColor: "#27272a",
                },
              ]}
              value={refreshInterval}
              onChangeText={setRefreshInterval}
              placeholder="30"
              placeholderTextColor={isDarkMode ? "#52525b" : "#94a3b8"}
              keyboardType="numeric"
            />
          </View>
          <TouchableOpacity
            style={[
              styles.testButton,
              isDarkMode && { backgroundColor: "#3B82F6" },
            ]}
            onPress={testApiEndpoint}
            disabled={testing}
          >
            <Text
              style={[styles.testButtonText, isDarkMode && { color: "white" }]}
            >
              {testing ? "Testing..." : "Test API"}
            </Text>
          </TouchableOpacity>
          {testData && (
            <View
              style={[
                styles.testResult,
                isDarkMode && { backgroundColor: "#18181b" },
              ]}
            >
              <Text
                style={[
                  styles.testResultTitle,
                  isDarkMode && { color: "#f1f5f9" },
                ]}
              >
                Test Result:
              </Text>
              <Text
                style={[
                  styles.testResultData,
                  isDarkMode && { color: "#a1a1aa" },
                ]}
              >
                {JSON.stringify(testData, null, 2).substring(0, 200)}...
              </Text>
            </View>
          )}
        </View>
        <View
          style={[styles.section, isDarkMode && { backgroundColor: "#23232a" }]}
        >
          <Text
            style={[styles.sectionTitle, isDarkMode && { color: "#f1f5f9" }]}
          >
            Appearance
          </Text>
          <Text style={[styles.label, isDarkMode && { color: "#a1a1aa" }]}>
            Color Presets
          </Text>
          <View style={styles.colorPresets}>
            {colorPresets.map((preset, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.colorPreset,
                  { backgroundColor: preset.background },
                  backgroundColor === preset.background &&
                    styles.colorPresetSelected,
                  isDarkMode && { borderColor: "#27272a" },
                ]}
                onPress={() => {
                  setBackgroundColor(preset.background);
                  setTextColor(preset.text);
                }}
              >
                <Text
                  style={[
                    styles.colorPresetText,
                    {
                      color:
                        !isDarkMode || !isLightColor(preset.background)
                          ? preset.text
                          : "#18181b",
                    },
                  ]}
                >
                  {preset.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        <View
          style={[styles.section, isDarkMode && { backgroundColor: "#23232a" }]}
        >
          <Text
            style={[styles.sectionTitle, isDarkMode && { color: "#f1f5f9" }]}
          >
            Custom Fields
          </Text>
          <View style={styles.customFieldsRow}>
            <TextInput
              style={[
                styles.input,
                { flex: 1, marginRight: 8 },
                isDarkMode && {
                  backgroundColor: "#23232a",
                  color: "#f1f5f9",
                  borderColor: "#27272a",
                },
              ]}
              value={fieldLabel}
              onChangeText={setFieldLabel}
              placeholder="Field Label"
              placeholderTextColor={isDarkMode ? "#52525b" : "#94a3b8"}
            />
            <TextInput
              style={[
                styles.input,
                { flex: 1, marginRight: 8 },
                isDarkMode && {
                  backgroundColor: "#23232a",
                  color: "#f1f5f9",
                  borderColor: "#27272a",
                },
              ]}
              value={fieldKey}
              onChangeText={setFieldKey}
              placeholder="Field Key (JSON key)"
              placeholderTextColor={isDarkMode ? "#52525b" : "#94a3b8"}
            />
            <TouchableOpacity
              onPress={addField}
              style={[
                styles.addFieldButton,
                isDarkMode && { backgroundColor: "#3B82F6" },
              ]}
            >
              <Text
                style={[
                  styles.addFieldButtonText,
                  isDarkMode && { color: "white" },
                ]}
              >
                ＋
              </Text>
            </TouchableOpacity>
          </View>
          <View style={styles.fieldTypeRow}>
            {["text", "number", "boolean"].map((type) => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.fieldTypeButton,
                  fieldType === type && styles.fieldTypeButtonSelected,
                  isDarkMode && { backgroundColor: "#23232a" },
                  fieldType === type &&
                    isDarkMode && { backgroundColor: "#3B82F6" },
                ]}
                onPress={() => setFieldType(type as any)}
              >
                <Text
                  style={
                    fieldType === type
                      ? { color: "white" }
                      : isDarkMode
                        ? { color: "#a1a1aa" }
                        : { color: "#1e293b" }
                  }
                >
                  {type}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.fieldsList}>
            {fields.length > 0 &&
              fields.map((field, idx) => (
                <View
                  key={field.id || field.label || idx}
                  style={[
                    styles.fieldPill,
                    isDarkMode && { backgroundColor: "#18181b" },
                  ]}
                >
                  <Text
                    style={[
                      styles.fieldPillText,
                      isDarkMode && { color: "#f1f5f9" },
                    ]}
                  >
                    {field.label} ({field.key}) [{field.type}]
                  </Text>
                  <TouchableOpacity onPress={() => removeField(field.id)}>
                    <Text
                      style={[
                        styles.fieldPillRemove,
                        isDarkMode && { color: "#ef4444" },
                      ]}
                    >
                      ×
                    </Text>
                  </TouchableOpacity>
                </View>
              ))}
          </View>
        </View>
        <TouchableOpacity
          style={[
            styles.saveButton,
            isDarkMode && { backgroundColor: "#3B82F6" },
          ]}
          onPress={saveWidget}
        >
          <Text
            style={[styles.saveButtonText, isDarkMode && { color: "white" }]}
          >
            {editWidget ? "Update Widget" : "Save Widget"}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
  },
  section: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 18,
    marginBottom: 18,
    shadowColor: "transparent",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "500",
    color: "#1e293b",
    marginBottom: 10,
  },
  inputGroup: {
    marginBottom: 12,
  },
  label: {
    fontSize: 13,
    fontWeight: "400",
    color: "#64748b",
    marginBottom: 4,
  },
  input: {
    backgroundColor: "#f1f5f9",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: "#1e293b",
    borderWidth: 0,
  },
  testButton: {
    backgroundColor: "#14B8A6",
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 18,
    alignItems: "center",
    alignSelf: "flex-start",
    marginTop: 6,
  },
  testButtonText: {
    color: "white",
    fontWeight: "500",
    fontSize: 15,
  },
  testResult: {
    backgroundColor: "#f1f5f9",
    borderRadius: 8,
    padding: 10,
    marginTop: 10,
  },
  testResultTitle: {
    fontSize: 13,
    fontWeight: "500",
    color: "#1e293b",
    marginBottom: 4,
  },
  testResultData: {
    fontSize: 12,
    color: "#64748b",
    fontFamily: "monospace",
  },
  colorPresets: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 10,
  },
  colorPreset: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "transparent",
  },
  colorPresetSelected: {
    borderColor: "#3B82F6",
  },
  colorPresetText: {
    fontSize: 12,
    fontWeight: "500",
  },
  customFieldsRow: {
    flexDirection: "row",
    marginBottom: 8,
  },
  addFieldButton: {
    backgroundColor: "#3B82F6",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  addFieldButtonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
  },
  fieldTypeRow: {
    flexDirection: "row",
    marginBottom: 10,
  },
  fieldTypeButton: {
    backgroundColor: "#e5e7eb",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    marginRight: 8,
  },
  fieldTypeButtonSelected: {
    backgroundColor: "#3B82F6",
  },
  fieldsList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  fieldPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f1f5f9",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    marginBottom: 8,
  },
  fieldPillText: {
    fontSize: 12,
    color: "#1e293b",
    marginRight: 6,
  },
  fieldPillRemove: {
    color: "#ef4444",
    fontSize: 16,
    fontWeight: "bold",
  },
  saveButton: {
    backgroundColor: "#3B82F6",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 10,
    marginBottom: 24,
  },
  saveButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
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
