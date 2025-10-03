import { Dimensions } from "react-native";  



const { width: WIDTH } = Dimensions.get("window");
const { height: HEIGHT } = Dimensions.get("window");
const COLORS = {
    primary: "#5B6BFF",
    secondary: "#F7F7FA",
    accent: "#FF6B6B",

    background: "#FFFFFF",
    text: "#333333",
    border: "#E0E0E0",
    placeholder: "#A0A0A0",
    success: "#4CAF50",
    warning: "#FFC107",
    error: "#F44336",
    info: "#2196F3",
}



export {
    WIDTH,
    HEIGHT
}