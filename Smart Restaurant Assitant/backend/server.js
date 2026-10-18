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
import Conversation from "./models/Conversation.js";

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

const recommendFoodTool = new DynamicStructuredTool({
    name: "recommendFoodTool",

    description: `
        Recommend restaurant dishes based on the user's preferences.

        Use this tool when the user asks for food recommendations,
        suggestions based on budget, dietary preferences, spice level,
        or a particular meal category.

        Always retrieve matching dishes from MongoDB.
        Never invent menu items or prices.
    `,

    schema: z.object({
        category: z
            .enum(["Breakfast", "Lunch", "Dinner"])
            .optional()
            .describe("Meal category, or null if unspecified"),

        maxPrice: z
            .number()
            .nonnegative()
            .optional()
            .describe("Maximum price per dish, or null if unspecified"),

        isVegetarian: z
            .boolean()
            .optional()
            .describe("Whether the user requires vegetarian food, or null if unspecified"),

        spiceLevel: z
            .enum(["Low", "Medium", "High"])
           .optional()
            .describe("Requested spice level, or null if unspecified"),
    }),

func: async ({ category, maxPrice, isVegetarian, spiceLevel }) => {
    try {
        const filter = {
            isAvailable: true,
        };

        if (category !== undefined) {
            filter.category = category;
        }

        if (maxPrice !== undefined) {
            filter.price = { $lte: maxPrice };
        }

        if (isVegetarian !== undefined) {
            filter.isVegetarian = isVegetarian;
        }

        if (spiceLevel !== undefined) {
            filter.spiceLevel = spiceLevel;
        }

        const dishes = await Menu.find(filter)
            .select(
                "name category price isVegetarian spiceLevel ingredients preparationTime"
            )
            .sort({ price: 1 })
            .limit(10)
            .lean();

        if (dishes.length === 0) {
            return JSON.stringify({
                success: true,
                count: 0,
                message:
                    "No available dishes match these preferences. Suggest relaxing one or more filters.",
                dishes: [],
            });
        }

        return JSON.stringify({
            success: true,
            count: dishes.length,
            dishes,
        });
    } catch (error) {
        console.error("Food recommendation error:", error);

        return JSON.stringify({
            success: false,
            message: "Unable to retrieve food recommendations right now.",
            dishes: [],
        });
    }
},
});


const agent = createAgent({
    model,

    tools: [
        getMenuTool,
        recommendFoodTool,
    ],

    systemPrompt: `
        You are a helpful Smart Restaurant Assistant.

        You can answer questions about breakfast, lunch, dinner,
        and recommend dishes based on user preferences.

        RULES:

        1. Use getMenuTool for requests asking for the menu
           of a particular meal category.

        2. Use recommendFoodTool when the user asks for
           personalized food recommendations or wants dishes
           filtered by budget, dietary preference, or spice level.

        3. Use only the dish names, prices, and details returned
           by your tools.

        4. Never invent menu items, prices, ingredients,
           availability, or preparation times.

        5. If no dishes match, explain that no matching dishes
           were found and suggest relaxing a preference.

        6. If a tool reports a database error, explain that
           recommendations are temporarily unavailable.
           Do not claim the search succeeded.

        7. Keep responses conversational and easy to understand.
    `,
});




app.get("/", (req, res) => {
    res.sendFile(path.join(frontendPath, "index.html"));
});




app.post("/api/chat", async (req, res) => {
    const { input, conversationId } = req.body;

    if (
        typeof input !== "string" ||
        !input.trim() ||
        input.length > 2000
    ) {
        return res.status(400).json({
            output: "Please enter a valid message.",
        });
    }

    if (
        typeof conversationId !== "string" ||
        !/^[a-f0-9-]{36}$/i.test(conversationId)
    ) {
        return res.status(400).json({
            output: "Invalid conversation ID.",
        });
    }

    try {
        // Find the existing conversation or create a new one.
        let conversation = await Conversation.findOne({
            conversationId,
        });

        if (!conversation) {
            conversation = new Conversation({
                conversationId,
                messages: [],
            });
        }

        // Get previous messages before adding the current message.
        // Only the latest 20 messages are passed to the AI.
        const previousMessages = conversation.messages
            .slice(-20)
            .map((message) => ({
                role: message.role,
                content: message.content,
            }));

        // Save the current user message.
        conversation.messages.push({
            role: "user",
            content: input.trim(),
        });

        // Keep at most 50 messages in persistent history.
        if (conversation.messages.length > 50) {
            conversation.messages =
                conversation.messages.slice(-50);
        }

        await conversation.save();

        // Send previous messages and the current message to the agent.
        const response = await agent.invoke({
            messages: [
                ...previousMessages,
                {
                    role: "user",
                    content: input.trim(),
                },
            ],
        });

        // Extract the final assistant response.
        const lastMessage =
            response.messages[response.messages.length - 1];

        let output = lastMessage.content;

        // Normalize text content if Gemini returns content blocks.
        if (Array.isArray(output)) {
            output = output
                .filter((block) => block.type === "text")
                .map((block) => block.text)
                .join("\n");
        }

        if (typeof output !== "string") {
            output = JSON.stringify(output);
        }

        // Save the assistant's response.
        conversation.messages.push({
            role: "assistant",
            content: output,
        });

        // Enforce the history limit again.
        if (conversation.messages.length > 50) {
            conversation.messages =
                conversation.messages.slice(-50);
        }

        await conversation.save();

        return res.status(200).json({
            output,
            conversationId,
        });
    } catch (error) {
        console.error("Chat error:", error);

        return res.status(500).json({
            output: "Something went wrong. Please try again.",
        });
    }
});

app.get("/api/chat/:conversationId", async (req, res) => {
    const { conversationId } = req.params;

    if (!/^[a-f0-9-]{36}$/i.test(conversationId)) {
        return res.status(400).json({
            message: "Invalid conversation ID.",
        });
    }

    try {
        const conversation = await Conversation.findOne({
            conversationId,
        }).lean();

        if (!conversation) {
            return res.status(200).json({
                conversationId,
                messages: [],
            });
        }

        return res.status(200).json({
            conversationId,
            messages: conversation.messages.map((message) => ({
                role: message.role,
                content: message.content,
                timestamp: message.timestamp,
            })),
        });
    } catch (error) {
        console.error("Conversation retrieval error:", error);

        return res.status(500).json({
            message: "Unable to retrieve conversation history.",
        });
    }
});

connectDB().then(() => {
    app.listen(port, () => {
        console.log(`Server is running on port ${port}`);
    });
}).catch((error) => {
    console.error("Failed to connect to MongoDB:", error);
    process.exit(1);
});