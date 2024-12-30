"""WebSocket server for Radio Telemetry Tracker Drone Ground Control Station."""

import asyncio
import logging

import websockets
from websockets.server import WebSocketServerProtocol

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

connected_clients = set()


async def handler(websocket: WebSocketServerProtocol) -> None:
    """Handle WebSocket connections and broadcast messages to other clients."""
    connected_clients.add(websocket)
    logger.info("New client connected.")

    try:
        async for message in websocket:
            logger.info("Received: %s", message)
            # Echo to all connected clients
            for client in connected_clients:
                if client != websocket:
                    await client.send(message)
    except websockets.exceptions.ConnectionClosed:
        pass
    finally:
        connected_clients.remove(websocket)
        logger.info("Client disconnected.")


async def main() -> None:
    """Start the WebSocket server and run indefinitely."""
    async with websockets.serve(handler, "localhost", 8765):
        logger.info("WebSocket server started on ws://localhost:8765")
        await asyncio.Future()  # run forever


def run_server() -> None:
    """A non-async function that properly runs the 'main()' coroutine.

    This is what we'll reference in pyproject.toml.
    """
    asyncio.run(main())


if __name__ == "__main__":
    run_server()
