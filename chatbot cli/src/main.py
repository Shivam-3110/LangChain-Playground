from google import genai
from google.genai import types
from dotenv import load_dotenv
import os
import json

load_dotenv()
apiKey = os.getenv("GEMINI_API_KEY")

if not apiKey:
    raise ValueError("API key not found")

client = genai.Client(api_key=apiKey)


system_instruction ="""You are a helpful AI assistant
Give clear and concise answers.
Explain technical concepts using simple examples when appropriate."""

# conversation history
history = []

print(" GenAI CLI Chatbot")
print("Type 'exit' to quit .\n")

while True:
    try:
        userInput = input("You: ").strip()


    except (KeyboardInterrupt,EOFError):
        print("\n Goodbyee !")
        break
    
    if userInput.lower() =="exit":
        print("GoodByee !")
        break

    if not userInput:
        print("Please enter a message.\n")
        continue
    history.append(
                   {
                       "role":"user",
                       "parts":[{"text":userInput}]
                   }
               )

    try:

        response = client.models.generate_content(
            model="gemini-3.5-flash-lite",
            contents=history,
            config = types.GenerateContentConfig(
                system_instruction=system_instruction
            )
        )

        assistant_message = response.text
        

        history.append({
            "role":"model",
            "parts":[{"text":assistant_message}]
        })

        print(f" AI: {assistant_message}\n")

        print(history)

        if response.usage_metadata:
            print(
                f"[Tokens] "
                f"input={response.usage_metadata.prompt_token_count}, "
                f"output={response.usage_metadata.candidates_token_count}\n"
            )
    except Exception as error:

        print(f"Error: {error}\n")

        