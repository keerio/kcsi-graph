#!/usr/bin/env python3
"""Tiny HTTP sync runner — runs sync_graph.sh with proper Docker access."""
import http.server
import json
import subprocess


class SyncHandler(http.server.BaseHTTPRequestHandler):
    def do_POST(self):
        r = subprocess.run(
            ['bash', '/sync_graph.sh'],
            capture_output=True, text=True, timeout=180
        )
        body = json.dumps({
            'ok': r.returncode == 0,
            'output': (r.stdout + r.stderr).strip(),
        }).encode()
        self.send_response(200 if r.returncode == 0 else 500)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, fmt, *args):
        pass  # quiet


if __name__ == '__main__':
    server = http.server.HTTPServer(('127.0.0.1', 3201), SyncHandler)
    print('sync-runner listening on 127.0.0.1:3201', flush=True)
    server.serve_forever()
