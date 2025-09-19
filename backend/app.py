import asyncio
import websockets

connected = set()


async def handler(ws):
    connected.add(ws)
    print("Client connected")
    try:
        async for message in ws:
            print("Received:", message)
            # Relay to other clients
            for c in connected:
                if c != ws:
                    await c.send(message)
    except websockets.ConnectionClosed:
        print("Client disconnected")
    finally:
        connected.remove(ws)


async def main():
    async with websockets.serve(handler, "0.0.0.0", 5000):
        print("WebSocket server running on ws://0.0.0.0:5000")
        await asyncio.Future()  # run forever


asyncio.run(main())
