#!/usr/bin/env python3
"""Small local server for Liquid GLSL.

Starts at port 5173 and increments until a free port is found.
"""
from __future__ import annotations

import contextlib
import http.server
import socket
import socketserver
import sys
import threading
import webbrowser
from pathlib import Path

ROOT = Path(__file__).resolve().parent
START_PORT = 5173
HOST = "127.0.0.1"


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def log_message(self, format, *args):
        sys.stdout.write((format % args) + "\n")


class ReusableTCPServer(socketserver.TCPServer):
    allow_reuse_address = True


def find_free_port(start: int) -> int:
    port = start

    while True:
        with contextlib.closing(socket.socket(socket.AF_INET, socket.SOCK_STREAM)) as sock:
            if sock.connect_ex((HOST, port)) != 0:
                return port

        print(f"Port {port} is busy; trying {port + 1}...")
        port += 1


def main() -> None:
    port = find_free_port(START_PORT)

    with ReusableTCPServer((HOST, port), NoCacheHandler) as httpd:
        url = f"http://localhost:{port}"
        print(f"Liquid GLSL: {url}")

        threading.Timer(0.2, lambda: webbrowser.open(url)).start()

        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nShutting down...")


if __name__ == "__main__":
    main()
