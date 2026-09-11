import { config } from "dotenv";
config();
import {ChatGoogleGenerativeAI} from "@langchain/google-genai";
import {SerpAPI} from "@langchain/community/tools/serpapi";
import { createAgent } from "langchain";
 
// step 1 setup the model or LLM
const model = new ChatGoogleGenerativeAI ({
    model:"gemini-3.5-flash-lite",
    maxOutputTokens:720,
    temperature:0.7,
    apiKey:process.env.GOOGLE_API_KEY,
});
// step 2 Directly using Built-in tool
const searchTool = new SerpAPI(process.env.SERPAPI_API_KEY,{
    location:"India",
});

// step 3 make agent 

const agent = await createAgent({
   model ,
  tools:[searchTool],

});
// step 4 give it a try question

const result = await agent.invoke({
  messages: [
    {
      role: "user",
      content: "What is the latest news about floods in north India?"
    }
  ]
});

console.log(
  "Final Output:",
  result.messages[result.messages.length - 1].content
);