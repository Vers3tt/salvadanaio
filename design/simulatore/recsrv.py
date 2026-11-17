# Serve la copia dell'app al simulatore e registra lo schermo quando la pagina lo chiede.
import http.server, functools, json, os, signal, subprocess, time, sys
SITE = sys.argv[1]; OUT = sys.argv[2]; PORT = int(sys.argv[3]); UDID = sys.argv[4]
os.makedirs(OUT, exist_ok=True)
state = {"proc": None, "t0": None}
class H(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store"); super().end_headers()
    def log_message(self, *a): pass
    def _ok(self, obj):
        b = json.dumps(obj).encode(); self.send_response(200); self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(b))); self.end_headers(); self.wfile.write(b)
    def do_POST(self):
        n = int(self.headers.get("Content-Length") or 0); body = self.rfile.read(n) if n else b""
        if self.path.startswith("/api/start"):
            name = self.path.split("name=")[-1] if "name=" in self.path else "rec"
            state["name"] = name
            state["proc"] = subprocess.Popen(["xcrun", "simctl", "io", UDID, "recordVideo", "--codec", "h264", "--force", os.path.join(OUT, name + ".mov")],
                                             stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
            # wait until the recorder says it started
            t_end = time.time() + 8
            while time.time() < t_end:
                line = state["proc"].stdout.readline().decode(errors="ignore")
                if "Recording started" in line or not line: break
            state["t0"] = time.time(); return self._ok({"ok": True})
        if self.path.startswith("/api/log"):
            data = json.loads(body or b"{}"); data["server_t0"] = state["t0"]
            open(os.path.join(OUT, state.get("name", "rec") + ".json"), "w").write(json.dumps(data, indent=1)); return self._ok({"ok": True})
        if self.path.startswith("/api/stop"):
            p = state["proc"]
            if p: p.send_signal(signal.SIGINT); p.wait(timeout=30)
            state["proc"] = None; return self._ok({"ok": True})
        if self.path.startswith("/api/shot"):
            from urllib.parse import urlparse, parse_qs
            q = {k: v[0] for k, v in parse_qs(urlparse(self.path).query).items()}; name = q["name"]
            pts_f = os.path.join(OUT, "shots", "points.json"); pts = json.load(open(pts_f)) if os.path.exists(pts_f) else {}
            pts[name] = [float(q["x"]), float(q["y"])] if "x" in q else None; json.dump(pts, open(pts_f, "w"), indent=1)
            subprocess.run(["xcrun", "simctl", "io", UDID, "screenshot", os.path.join(OUT, "shots", name + ".png")], capture_output=True)
            return self._ok({"ok": True})
        self.send_error(404)
os.makedirs(os.path.join(OUT, "shots"), exist_ok=True)
http.server.ThreadingHTTPServer(("", PORT), functools.partial(H, directory=SITE)).serve_forever()
