"""Shared utility functions for build and development."""

import logging
import platform
import subprocess
from pathlib import Path

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

NPM_CMD = "npm.cmd" if platform.system() == "Windows" else "npm"

ALLOWED_COMMANDS = {
    NPM_CMD: ["run", "build"],
}


def validate_command(cmd: list[str]) -> bool:
    """Validate that the command is in the allowed list."""
    if not cmd:
        return False
    program = cmd[0]
    return program in ALLOWED_COMMANDS and all(arg in ALLOWED_COMMANDS[program] for arg in cmd[1:])


def build_frontend() -> Path:
    """Build the frontend using npm."""
    frontend_dir = Path(__file__).parent.parent / "frontend"
    logger.info("Building frontend...")
    cmd = [NPM_CMD, "run", "build"]
    if not validate_command(cmd):
        msg = "Invalid command"
        raise ValueError(msg)
    subprocess.run(cmd, cwd=frontend_dir, check=True, text=True)  # noqa: S603
    return frontend_dir
