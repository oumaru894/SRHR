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
import axios from "axios";
import { Alert } from "react-native";
import { downloadModel } from "../api/model";
import ProgressBar from "../components/progressBar";

import * as FileSystem from "expo-file-system/legacy";
import { initLlama, releaseAllLlama } from "llama.rn";



type Message = {
  id: string;
  role: 'system' | 'user' | 'assistant';
  content: string;
};

const INITIAL_CONVERSATION: Message[] = [
    {
      id: '0',
      role: 'system',
      content:
        'This is a conversation between user and assistant, a friendly chatbot.',
    },
];

export default function Chatbot({ navigation }: any) {


const [conversation, setConversation] = useState<Message[]>(INITIAL_CONVERSATION);
const [selectedModelFormat, setSelectedModelFormat] = useState<string>('');
const [selectedGGUF, setSelectedGGUF] = useState<string | null>(null);
const [availableGGUFs, setAvailableGGUFs] = useState<string[]>([]);
const [userInput, setUserInput] = useState<string>('');
const [progress, setProgress] = useState<number>(0);
const [context, setContext] = useState<any>(null);
const [isDownloading, setIsDownloading] = useState<boolean>(false);
const [isGenerating, setIsGenerating] = useState<boolean>(false);



const modelFormats = [
  {label: 'Llama-3.2-1B-Instruct'},
  {label: 'Qwen2-0.5B-Instruct'},
  {label: 'DeepSeek-R1-Distill-Qwen-1.5B'},
  {label: 'SmolLM2-1.7B-Instruct'},
];

const HF_TO_GGUF = {
    "Offline Brain": "unsloth/gemma-3n-E2B-it-GGUF",
  };



// Loading the model
const loadModel = async (modelPath: string) => {
  try {
    // Ensure the model file exists before attempting to load it
    const fileInfo = await FileSystem.getInfoAsync(modelPath);
    if (!fileInfo.exists) {
      Alert.alert("Error Loading Model", "The model file does not exist.");
      return false;
    }

    // Release previous llama context if it exists
    if (context) {
      await releaseAllLlama();
      setContext(null);
      setConversation(INITIAL_CONVERSATION);
    }

    // Initialize llama model
    const llamaContext = await initLlama({
      model: modelPath.replace("file://", ""),
      use_mlock: true,
      n_ctx: 2048,
      n_gpu_layers: 1,
    });

    console.log("llamaContext", llamaContext);
    setContext(llamaContext);
    return true;
  } catch (error) {
    Alert.alert(
      "Error Loading Model",
      error instanceof Error ? error.message : "An unknown error occurred."
      
    );
    //console.error("error:", error)
    return false;
  }
};





  
  const fetchAvailableGGUFs = async () => {
    try {
      const response = await axios.get(
        `https://huggingface.co/api/models/unsloth/gemma-3n-E2B-it-GGUF`,
      );
  
      if (!response.data?.siblings) {
        throw new Error('Invalid API response format');
      }
  
      const files = response.data.siblings.filter((file: {rfilename: string}) =>
        file.rfilename.endsWith('.gguf'),
      );
  
      setAvailableGGUFs(files.map((file: {rfilename: string}) => file.rfilename));

    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to fetch .gguf files';
      Alert.alert('Error', errorMessage);
      setAvailableGGUFs([]);
    }
  };
  
  
  
  
const handleDownloadModel = async (file: string) => {
  const downloadUrl = `https://huggingface.co/${
    HF_TO_GGUF[selectedModelFormat as keyof typeof HF_TO_GGUF]
  }/resolve/main/${file}`;

  setIsDownloading(true);
  setProgress(0);

  try {
    const destPath = await downloadModel(file, downloadUrl, progress =>
      setProgress(progress)
    );

    console.log("Download completed:", destPath);

    if (destPath) {
      await loadModel(destPath); // 👈 Pass full path, not just filename
    }

  } catch (error) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Download failed due to an unknown error.";
    Alert.alert("Error", errorMessage);
  } finally {
    setIsDownloading(false);
  }
};

  
  
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      content: "Hi 👋 I'm here to answer your questions privately.",
      role: "system",
    },
  ]);
  const [inputText, setInputText] = useState("");
  const flatListRef = useRef<FlatList>(null);

  const sendMessage = async () => {
    if (inputText.trim() === "") return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputText,
      role: "user",
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText("");
    flatListRef.current?.scrollToEnd({ animated: true });

    // Add "typing…" placeholder
    const typingId = (Date.now() + 1).toString();
    setMessages((prev) => [
      ...prev,
      { id: typingId, content: "Typing...", role: "system" },
    ]);

    try {
      const response = await fetch("http://127.0.0.1:5000/chatbot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: userMessage.content }),
      });

      const data = await response.json();
      const systemMessage: Message = {
        id: (Date.now() + 2).toString(),
        content: data.response || "Sorry, I didn't understand that.",
        role: "system",
      };

      // Replace typing with real response
      setMessages((prev) =>
        prev.map((msg) => (msg.id === typingId ? systemMessage : msg))
      );
    } catch (error) {
      console.error("Error fetching bot reply:", error);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === typingId
            ? { ...msg, content: "⚠️ Failed to get response. Try again." }
            : msg
        )
      );
    }
  };

  return (<>
  {
  // <SafeAreaView style={styles.safe}>
    //   {/* Header */}
    //   <Header 
    //     title="SRHRConnect" 
    //     onBack={() => navigation.goBack()} 
    //   />

    //   {/* Chat */}
    //   <KeyboardAvoidingView
    //     style={{ flex: 1 }}
    //     behavior={Platform.OS === "ios" ? "padding" : "height"}
    //     keyboardVerticalOffset={90}
    //   >
    //     <FlatList
    //       ref={flatListRef}
    //       data={messages}
    //       keyExtractor={(item) => item.id}
    //       contentContainerStyle={{ padding: 12, paddingBottom: 80 }}
    //       renderItem={({ item }) => (
    //         <View
    //           style={[
    //             styles.messageContainer,
    //             item.role === "user"
    //               ? styles.userMessageWrap
    //               : styles.systemMessageWrap,
    //           ]}
    //         >
    //           <View
    //             style={[
    //               styles.bubble,
    //               item.role === "user"
    //                 ? styles.userBubble
    //                 : styles.systemBubble,
    //             ]}
    //           >
    //             {item.content === "Typing..." ? (
    //               <ActivityIndicator color="#555" size="small" />
    //             ) : (
    //               <Text
    //                 style={
    //                   item.role === "user"
    //                     ? styles.userText
    //                     : styles.systemText
    //                 }
    //               >
    //                 {item.content}
    //               </Text>
    //             )}
    //           </View>
    //         </View>
    //       )}
    //       onContentSizeChange={() =>
    //         flatListRef.current?.scrollToEnd({ animated: true })
    //       }
    //     />

    //     {/* Input bar */}
    //     <View style={styles.inputContainer}>
    //       <TextInput
    //         style={styles.input}
    //         placeholder="Type your message..."
    //         placeholderTextColor="#888"
    //         value={inputText}
    //         onChangeText={setInputText}
    //         returnKeyType="send"
    //         onSubmitEditing={sendMessage}
    //       />
    //       <TouchableOpacity
    //         onPress={sendMessage}
    //         style={styles.iconBtn}
    //       >
    //         {inputText.trim() === "" ? (
    //           <Ionicons name="mic-outline" size={24} color="#555" />
    //         ) : (
    //           <Ionicons name="send" size={22} color="#fff" />
    //         )}
    //       </TouchableOpacity>
    //     </View>
    //   </KeyboardAvoidingView>
    // </SafeAreaView>
  }

  <View style={{ marginTop: 30, marginBottom: 15 }}>
  {Object.keys(HF_TO_GGUF).map((format) => (
    <TouchableOpacity
      key={format}
      onPress={() => {
        setSelectedModelFormat(format);
      }}
    >
      <Text> {format} </Text>
    </TouchableOpacity>
  ))}
</View>
<Text style={{ marginBottom: 10, color: selectedModelFormat ? 'black' : 'gray' }}>
  {selectedModelFormat 
    ? `Selected: ${selectedModelFormat}` 
    : 'Please select a model format before downloading'}
</Text>
<TouchableOpacity
  onPress={() => {
    handleDownloadModel("gemma-3n-E2B-it-GGUF"); //Llama-3.2-1B-Instruct-Q2_K.gguf
  }}
>
  <Text>Download Model</Text>
</TouchableOpacity>
{isDownloading && <ProgressBar progress={progress} />}

      </>
    
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
  systemMessageWrap: {
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
  systemBubble: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 0,
    marginRight: "auto",
  },
  userBubble: {
    backgroundColor: "#4A6CFA",
    borderTopRightRadius: 0,
    marginLeft: "auto",
  },
  systemText: {
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
