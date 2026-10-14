import express from "express";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import connectDB from "./db.js";
import menuRoutes from "./routes/menuRoutes.js";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { createAgent, DynamicStructuredTool } from "langchain";
import { z } from "zod";
import Menu from "./models/menuModel.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, ".env") });

const port = 3000;
const app = express();

app.use(express.json());
app.use("/api/menu", menuRoutes);

const frontendPath = path.resolve(__dirname, "../frontend");
app.use(express.static(frontendPath));



const model = new ChatGoogleGenerativeAI({
    model: "gemini-3.5-flash-lite",
    maxOutputTokens: 720,
    temperature: 0.7,
    apiKey: process.env.GOOGLE_API_KEY,
});






const getMenuTool = new DynamicStructuredTool({
    name: "getMenuTool",

    description:
        "Fetch available restaurant dishes for breakfast, lunch, or dinner from MongoDB.",

    schema: z.object({
        category: z
            .enum(["breakfast", "lunch", "dinner"])
            .describe("The meal category"),
    }),

    func: async ({ category }) => {
        const menuItems = await Menu.find({
            category: {
                $regex: `^${category}$`,
                $options: "i",
            },
            isAvailable: true,
        }).select("name price ingredients spiceLevel preparationTime");

        if (menuItems.length === 0) {
            return `No available menu items found for ${category}.`;
        }

        return JSON.stringify(menuItems);
    },
});




const agent = createAgent({
    model,

    tools: [getMenuTool],

    systemPrompt: `
        You are a helpful food assistant.

        You can answer questions about today's breakfast,
        lunch, and dinner menu.

        Always use the getMenuTool when the user asks
        about today's menu.

        Never invent menu items.
    `,
});




app.get("/", (req, res) => {
    res.sendFile(path.join(frontendPath, "index.html"));
});




app.post("/api/chat", async (req, res) => {

    const userInput = req.body.input;

    console.log("User:", userInput);

    try {

        const response = await agent.invoke({
            messages: [
                {
                    role: "user",
                    content: userInput,
                },
            ],
        });

        console.log("Agent response:", response);

        const lastMessage =
            response.messages[response.messages.length - 1];

        return res.json({
            output: lastMessage.content,
        });

    } catch (error) {

        console.error("Agent error:", error);

        return res.status(500).json({
            output: "Something went wrong.",
        });
    }
});

connectDB()

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});