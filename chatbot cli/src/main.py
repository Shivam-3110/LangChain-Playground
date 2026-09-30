from google import genai
from dotenv import load_dotenv
import os

load_dotenv()
apiKey = os.getenv("GEMINI_API_KEY")

if not apiKey:
    raise ValueError("API key not found")

client = genai.Client(api_key=apiKey)

chat = client.chats.create(
    model="gemini-3.5-flash-lite"
)

print(" GenAI CLI Chatbot")
print("Type 'exit' to quit .\n")

while True:
    userInput = input("you: ")
    if userInput.lower() == "exit":
        print("Goodbye !")
        break

    response = chat.send_message(userInput)

    print("AI",response.text)