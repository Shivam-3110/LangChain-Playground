import express from "express";
import dotenv from "dotenv";

import {ChatGoogleGenerativeAI} from "@langchain/google-genai";
import { createAgent } from "langchain";
import { DynamicStructuredTool } from "langchain";
import {ChatPromptTemplate} from "@langchain/core/prompts";
import {AgentExecutor , createToolCallingAgent} from "langchain"
 dotenv.config();
const port = 3000;
const app = express();

const model = new ChatGoogleGenerativeAI ({
    model:"gemini-3.5-flash-lite",
    maxOutputTokens:720,
    temperature:0.7,
    apiKey:process.env.GOOGLE_API_KEY,
});

const getMenuTool = new DynamicStructuredTool({
    name:"getMenuTool",
    description:"Return the final answer for today's menu for the given category(breakfast,lunch, or dinner)"
})

app.use(express.json());
app.get("/",(req,res)=>{
   return res.send("app healthy")
});

app.listen(port,() => {
    console.log(`'server is running on ${port}'`)
})