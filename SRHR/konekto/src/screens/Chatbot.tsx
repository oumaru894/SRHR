// src/screens/Chatbot.tsx
import React, { useState, useRef, useEffect, useContext } from "react";
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

//networl status
import { useNetwork } from "../context/NetworkContext";
import NetworkStatusIndicator from "../components/NetworkStatusIndicator";
import { GEMINI_API_KEY } from "@env";








// Llama.RN imports
import RNFS from 'react-native-fs'; // File system module

import { initLlama, releaseAllLlama } from "llama.rn";

// Import Google Gemini API client
import { GoogleGenAI } from "@google/genai";

const instruction = `
You are an SRHR (Sexual and Reproductive Health and Rights) specialist in Liberia.
Always explain things in simple English that an ordinary Liberian with little schooling can easily understand.
Avoid medical jargon or big words. Use short sentences, simple examples, and everyday language.
Speak with respect, kindness, and care — like a trusted community health worker talking to a neighbor.
Keep your answers culturally sensitive to Liberia.
If the question involves a health risk, give clear, practical advice on what actions the person should take. your name is Konektoh.
`;

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
const [messages, setMessages] = useState<Message[]>([
  {
    id: "1",
    content: "Hi 👋 I'm here to answer your questions privately.",
    role: "system",
  },
]);


const [inputText, setInputText] = useState("");
const [listening, setListening] = useState(false);
const flatListRef = useRef<FlatList>(null);
const [responseData, setResponseData] = useState("");

// checking network status
const { isConnected, connectionType } = useNetwork();
console.log("Network status:", isConnected, connectionType);


  useEffect(() => {
  const checkModelAndPrompt = async () => {
    const modelName = "Llama-3.2-1B-Instruct-Q2_K.gguf";
    const destPath = `${RNFS.DocumentDirectoryPath}/${modelName}`;

    const fileExists = await RNFS.exists(destPath);

    if (!fileExists) {
      // Show the popup only if model doesn't exist
      Alert.alert(
        "Offline Model Download",
        "Please download my brain for offline use.",
        [
          {
            text: "Download",
            onPress: () => handleDownloadModel(modelName),
          },
          {
            text: "Cancel",
            style: "cancel",
          },
        ],
        { cancelable: true }
      );
    } else {
      console.log("Model already exists. No need to download.");
      // Optionally load the model immediately
      await loadModel(modelName);
    }
  };

  checkModelAndPrompt();
}, []);



// The client gets the API key from the environment variable `GEMINI_API_KEY`.
const ai = new GoogleGenAI({apiKey: GEMINI_API_KEY});


// parsing text response to bold certain words
const parseBold = (text) => {
  const parts = text.split(/(\*\*.*?\*\*)/g); // split by **text**
  return parts.map((part, index) => {
    if ((part.startsWith("**") && part.endsWith("**")) ||(part.startsWith("*"))) {
      return (
        <Text key={index} style={{ fontWeight: "bold" }}>
          {part.slice(2, -2)}
        </Text>
      );
    } else {
      return <Text key={index}>{part}</Text>;
    }
  });
};




// Loading the model
const loadModel = async (modelName: string) => {
  try {
    const destPath = `${RNFS.DocumentDirectoryPath}/${modelName}`;

    
    

    // Ensure the model file exists before attempting to load it
    const fileExists = await RNFS.exists(destPath);
    console.log("Model path:", destPath);
    // ✅ Check model file size
    const stats = await RNFS.stat(destPath);
    const sizeMB = (Number(stats.size) / (1024 * 1024)).toFixed(2);
    console.log(`Model downloaded: ${sizeMB} MB at ${destPath}`);

    if (!fileExists) {
      Alert.alert('Error Loading Model', 'The model file does not exist.');
      console.log("Model path:", destPath);

      return false;
    }


    // Release any existing model context before loading a new one
    if (context) {
      await releaseAllLlama();
      setContext(null);
      setConversation(INITIAL_CONVERSATION);
    }


    const llamaContext = await initLlama({
      model: destPath,
      use_mlock: true,
      n_ctx: 2048,
      n_gpu_layers: 1
    });
    console.log("llamaContext", llamaContext);
    setContext(llamaContext);
    return true;
  } catch (error) {
    Alert.alert('Error Loading Model', error instanceof Error ? error.message : 'An unknown error occurred.');
    return false;
  }
};






const handleDownloadModel = async (file: string) => {

  //https://huggingface.co/google/gemma-3-1b-it-qat-q4_0-gguf/resolve/main/gemma-3-1b-it-q4_0.gguf";
  const downloadUrl = `https://huggingface.co/medmekk/Llama-3.2-1B-Instruct.GGUF/resolve/main/${file}`

  // we set the isDownloading state to true to show the progress bar and set the progress to 0
  setIsDownloading(true);
  setProgress(0);

  try {
    // we download the model using the downloadModel function, it takes the selected GGUF file, the download URL, and a progress callback function to update the progress bar
    const destPath = await downloadModel(file, downloadUrl, progress =>
      setProgress(progress),
      
    );

    // inside the handleDownloadModel function, just after the download is complete 
    if (destPath) {
      await loadModel(file);
    }
    Alert.alert('Success', 'Model downloaded and loaded successfully.');
  } catch (error) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : 'Download failed due to an unknown error.';
    Alert.alert('Error', errorMessage);
    console.log('err:', error)
  } finally {
    setIsDownloading(false);
  }
};

  
  
  
 

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
    // get response based on connectivity
    const fetchOnlineReply = async (text: string) => {
      try {
        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: text,
          config: {
            thinkingConfig: { thinkingBudget: 0 },
            systemInstruction: instruction,
          },
        });
        return response.text || "Sorry, I didn't understand that.";
      } catch (e) {
        console.warn('fetchOnlineReply error', e);
        return null;
      }
    };

    const generateOfflineReply = async (text: string) => {
      if (!context) {
        Alert.alert("Model Not Loaded", "Please download or load the offline model first.");
        return null;
      }
      // Append user message to conversation for context
      const newConversation = [...conversation, userMessage];
      const stopWords = ["</s>", "<|end|>", "user:", "assistant:", "<|im_end|>", "<|eot_id|>", "<|end▁of▁sentence|>"];
      try {
        const result = await context.completion({
          messages: newConversation,
          n_predict: 200,
          stop: stopWords,
        });
        // update conversation for offline context
        setConversation(newConversation);
        return result.content || "Sorry, I couldn't generate a response offline.";
      } catch (e) {
        console.warn('generateOfflineReply error', e);
        return null;
      }
    };

    let botResponse = null;
    if (isConnected) {
      botResponse = await fetchOnlineReply(userMessage.content);
      // if online fails, try offline
      if (botResponse == null) {
        botResponse = await generateOfflineReply(userMessage.content);
      }
    } else {
      botResponse = await generateOfflineReply(userMessage.content);
    }

    if (botResponse == null) {
      // remove typing placeholder and show failure
      setMessages((prev) => prev.map((msg) => (msg.id === typingId ? { ...msg, content: "⚠️ Failed to get response. Try again." } : msg)));
      return;
    }

    // Replace typing with actual bot response
    const systemMessage: Message = {
      id: (Date.now() + 2).toString(),
      content: botResponse,
      role: "system",
    };

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


  return (
  <>
      {/* Your existing UI code */}

      <SafeAreaView style={styles.safe}>
        {/* Header */}
        <Header title="KONEKTOH" onBack={() => navigation.goBack()} rightComponent={<NetworkStatusIndicator/>}/>

        {/* Chat */}
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
        >
          {isDownloading && (
        <ProgressBar progress={progress} />
      )}
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ padding: 12, paddingBottom: 80 }}
            renderItem={({ item }) => (
              <View
                style={[
                  styles.messageContainer,
                  item.role === "user"
                    ? styles.userMessageWrap
                    : styles.systemMessageWrap,
                ]}
              >
                <View
                  style={[
                    styles.bubble,
                    item.role === "user"
                      ? styles.userBubble
                      : styles.systemBubble,
                  ]}
                >
                  {item.content === "Typing..." ? (
                    <ActivityIndicator color="#555" size="small" />
                  ) : (
                    <Text
                      style={
                        item.role === "user"
                          ? styles.userText
                          : styles.systemText
                      }
                    >
                      {parseBold(item.content)}
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
            <TouchableOpacity style={styles.iconBtn} onPress={sendMessage}
              
            >
              {inputText.trim() === "" ? (
                <Ionicons name={listening ? "mic" : "mic-outline"} size={24} color="#fff" />
              ) : (
                <Ionicons name="send" size={22} color="#fff" />
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>

       
      


    </>
    
  );
}



const styles = StyleSheet.create({
  progressContainer: {
  position: 'absolute',
  bottom: 0,
  left: 0,
  right: 0,
  padding: 10,
  backgroundColor: 'rgba(0,0,0,0.1)',
},
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
    margin: 10,
    alignSelf: "center",
    borderRadius: 25,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    width: "90%",
    zIndex: 1,
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
    backgroundColor: "#1a57dbff",
    borderRadius: 25,
    padding: 10,
    justifyContent: "center",
    alignItems: "center",
  },
});
