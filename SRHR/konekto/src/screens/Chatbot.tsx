// src/screens/Chatbot.tsx
import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  ActivityIndicator,
  
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import Header from "../components/Header";

type Message = {
  id: string;
  text: string;
  sender: "user" | "bot";
};

export default function Chatbot({ navigation }: any) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      text: "Hi 👋 I'm here to answer your questions privately.",
      sender: "bot",
    },
  ]);
  const [inputText, setInputText] = useState("");
  const flatListRef = useRef<FlatList>(null);

  const sendMessage = async () => {
    if (inputText.trim() === "") return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText,
      sender: "user",
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText("");
    flatListRef.current?.scrollToEnd({ animated: true });

    // Add "typing…" placeholder
    const typingId = (Date.now() + 1).toString();
    setMessages((prev) => [
      ...prev,
      { id: typingId, text: "Typing...", sender: "bot" },
    ]);

    try {
      const response = await fetch("http://127.0.0.1:5000/chatbot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: userMessage.text }),
      });

      const data = await response.json();
      const botMessage: Message = {
        id: (Date.now() + 2).toString(),
        text: data.response || "Sorry, I didn't understand that.",
        sender: "bot",
      };

      // Replace typing with real response
      setMessages((prev) =>
        prev.map((msg) => (msg.id === typingId ? botMessage : msg))
      );
    } catch (error) {
      console.error("Error fetching bot reply:", error);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === typingId
            ? { ...msg, text: "⚠️ Failed to get response. Try again." }
            : msg
        )
      );
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <Header 
        title="SRHRConnect" 
        onBack={() => navigation.goBack()} 
      />

      {/* Chat */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={90}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 12, paddingBottom: 80 }}
          renderItem={({ item }) => (
            <View
              style={[
                styles.messageContainer,
                item.sender === "user"
                  ? styles.userMessageWrap
                  : styles.botMessageWrap,
              ]}
            >
              <View
                style={[
                  styles.bubble,
                  item.sender === "user"
                    ? styles.userBubble
                    : styles.botBubble,
                ]}
              >
                {item.text === "Typing..." ? (
                  <ActivityIndicator color="#555" size="small" />
                ) : (
                  <Text
                    style={
                      item.sender === "user"
                        ? styles.userText
                        : styles.botText
                    }
                  >
                    {item.text}
                  </Text>
                )}
              </View>
            </View>
          )}
          onContentSizeChange={() =>
            flatListRef.current?.scrollToEnd({ animated: true })
          }
        />

        {/* Input bar */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Type your message..."
            placeholderTextColor="#888"
            value={inputText}
            onChangeText={setInputText}
            returnKeyType="send"
            onSubmitEditing={sendMessage}
          />
          <TouchableOpacity
            onPress={sendMessage}
            style={styles.iconBtn}
          >
            {inputText.trim() === "" ? (
              <Ionicons name="mic-outline" size={24} color="#555" />
            ) : (
              <Ionicons name="send" size={22} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#F9F9F9",
  },
  
  messageContainer: {
    marginVertical: 6,
    flexDirection: "row",
  },
  botMessageWrap: {
    justifyContent: "flex-start",
  },
  userMessageWrap: {
    justifyContent: "flex-end",
  },
  bubble: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 18,
    maxWidth: "75%",
  },
  botBubble: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 0,
    marginRight: "auto",
  },
  userBubble: {
    backgroundColor: "#4A6CFA",
    borderTopRightRadius: 0,
    marginLeft: "auto",
  },
  botText: {
    color: "#111",
    fontSize: 15,
    lineHeight: 20,
  },
  userText: {
    color: "#fff",
    fontSize: 15,
    lineHeight: 20,
  },

  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
    backgroundColor: "#fff",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 10,
    paddingHorizontal: 12,
    color: "#000",
  },
  iconBtn: {
    marginLeft: 10,
    backgroundColor: "#4A6CFA",
    borderRadius: 25,
    padding: 10,
    justifyContent: "center",
    alignItems: "center",
  },
});
