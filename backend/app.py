import asyncio
import websockets
import json
import base64
from openai import OpenAI
from dotenv import load_dotenv
import os

connected = set()
transcribed = False

load_dotenv()
client = OpenAI(
    api_key=os.getenv("openAI_key")
)


async def handler(ws):
    connected.add(ws)
    print("Client connected")
    try:
        async for message in ws:
            data = json.loads(message)
            print("Received: ", data.get("type"))

            if data.get("type") == "Stop":
                for c in connected:
                    if c != ws:
                        await c.send(json.dumps({"type": "Stop"}))
                await ws.close(code=1000, reason="Manual closure requested")
                print("WebSocket closed manually")
                global transcribed
                transcribed = True

            else: 
                # append to audio to file
                audio_bytes = base64.b64decode(data["payload"])
                with open("chunk.webm", "ab") as f:
                    f.write(audio_bytes)
                # Relay to other clients
                for c in connected:
                    if c != ws:
                        await c.send(message)
    except websockets.ConnectionClosed:
        print("Client disconnected")

    finally:
        connected.remove(ws)

        if transcribed:
            with open("chunk.webm", "rb") as audio_file:
                transcript = client.audio.transcriptions.create(model="whisper-1", file=audio_file)

            print(transcript.text)

            if os.path.exists("chunk.webm"):
                os.remove("chunk.webm")
                print("File deleted")
                transcribed = False

async def main():
    async with websockets.serve(handler, "0.0.0.0", 5000):
        print("WebSocket server running on ws://0.0.0.0:5000")
        await asyncio.Future()  # run forever


asyncio.run(main())
