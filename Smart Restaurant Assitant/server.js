import express from "express";
import dotenv from "dotenv";
import path from "path";

import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { createAgent, DynamicStructuredTool } from "langchain";
import { z } from "zod";

dotenv.config();

const port = 3000;
const app = express();

app.use(express.json());


const __dirname = path.resolve();
app.use(express.static(path.join(__dirname, "frontend")));



const model = new ChatGoogleGenerativeAI({
    model: "gemini-3.5-flash-lite",
    maxOutputTokens: 720,
    temperature: 0.7,
    apiKey: process.env.GOOGLE_API_KEY,
});




const getMenuTool = new DynamicStructuredTool({
    name: "getMenuTool",

    description:
        "Return today's menu for a given category: breakfast, lunch, or dinner.",

    schema: z.object({
        category: z
            .string()
            .describe("Type of food: breakfast, lunch, or dinner"),
    }),

    func: async ({ category }) => {

        const menus = {
            breakfast: "Aloo paratha, Poha, Masala Chai",
            lunch: "Paneer Butter Masala, Dal Fry, Jeera Rice, Roti",
            dinner: "Veg Biryani, Raita, Salad, Gulab Jamun",
        };

        return (
            menus[category.toLowerCase()] ||
            "No menu found for this category"
        );
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
    res.sendFile(
        path.join(__dirname, "frontend", "index.html")
    );
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


app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});