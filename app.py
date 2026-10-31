#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ProCam VMS — Нативное кроссплатформенное приложение видеонаблюдения
Движок: Python 3 + GTK3 + WebKit2 (GNOME Native) + Go Engine
"""

import os
import sys
import time
import signal
import socket
import subprocess
import urllib.request
import urllib.error

APP_NAME = "ProCam VMS"
APP_TITLE = "ProCam VMS — Инженерный комплекс видеонаблюдения"
SERVER_PORT = 8768
SERVER_URL = f"http://127.0.0.1:{SERVER_PORT}"
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
ICON_PATH = os.path.join(SCRIPT_DIR, "dist", "windows", "icon.png")
BACKEND_LINUX = os.path.join(SCRIPT_DIR, "ProCamViewer_Linux_x64")
BACKEND_WIN = os.path.join(SCRIPT_DIR, "ProCamViewer_Windows_x64.exe")

backend_process = None

def is_server_ready(url=SERVER_URL, timeout=0.8):
    try:
        req = urllib.request.Request(f"{url}/api/info", headers={"User-Agent": "ProCamNativeClient"})
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return resp.status == 200
    except Exception:
        return False

def ensure_backend_running():
    global backend_process
    if is_server_ready():
        return True

    # Start Go backend binary
    backend_bin = BACKEND_WIN if sys.platform == "win32" else BACKEND_LINUX
    if not os.path.isfile(backend_bin):
        # Check dist/linux
        alt = os.path.join(SCRIPT_DIR, "dist", "linux", "ProCamViewer_Linux_x64")
        if os.path.isfile(alt):
            backend_bin = alt

    if not os.path.isfile(backend_bin):
        print(f"[!] Ошибка: Серверный бинарник не найден: {backend_bin}")
        return False

    os.chmod(backend_bin, 0o755)
    print(f"[*] Запуск серверного ядра: {backend_bin} -port {SERVER_PORT} -headless")
    try:
        backend_process = subprocess.Popen(
            [backend_bin, "-port", str(SERVER_PORT), "-headless"],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            preexec_fn=os.setsid if sys.platform != "win32" else None
        )
    except Exception as e:
        print(f"[!] Не удалось запустить серверное ядро: {e}")
        return False

    # Wait for readiness
    for _ in range(50):
        time.sleep(0.1)
        if is_server_ready():
            return True

    return is_server_ready()

def cleanup_backend():
    global backend_process
    if backend_process:
        try:
            if sys.platform != "win32":
                os.killpg(os.getpgid(backend_process.pid), signal.SIGTERM)
            else:
                backend_process.terminate()
        except Exception:
            pass
        backend_process = None

def run_gtk_native():
    import gi
    gi.require_version('Gtk', '3.0')
    gi.require_version('WebKit2', '4.1')
    from gi.repository import Gtk, WebKit2, GdkPixbuf, Gdk, GLib

    # Set Application identifiers for GNOME/Wayland/X11 window mapping
    GLib.set_prgname("procam-viewer")
    GLib.set_application_name(APP_NAME)

    # Initialize Window
    win = Gtk.Window(type=Gtk.WindowType.TOPLEVEL)
    win.set_title(APP_TITLE)
    win.set_role("ProCamViewer")
    win.set_default_size(1550, 920)
    win.set_position(Gtk.WindowPosition.CENTER)

    # Set Window and Desktop Icon
    if os.path.isfile(ICON_PATH):
        try:
            pixbuf = GdkPixbuf.Pixbuf.new_from_file(ICON_PATH)
            win.set_icon(pixbuf)
            Gtk.Window.set_default_icon(pixbuf)
            Gtk.Window.set_default_icon_name("procam-viewer")
        except Exception as e:
            print(f"[!] Не удалось загрузить иконку: {e}")

    # Create WebKit WebView
    webview = WebKit2.WebView()
    settings = webview.get_settings()
    settings.set_enable_webgl(True)
    settings.set_enable_media_stream(True)
    settings.set_enable_webrtc(True)
    settings.set_enable_smooth_scrolling(True)
    settings.set_enable_javascript(True)
    settings.set_enable_page_cache(False)
    settings.set_javascript_can_access_clipboard(True)
    settings.set_hardware_acceleration_policy(WebKit2.HardwareAccelerationPolicy.ALWAYS)

    # Handle Fullscreen from web content
    def on_enter_fullscreen(wv):
        win.fullscreen()
        return True

    def on_leave_fullscreen(wv):
        win.unfullscreen()
        return True

    webview.connect("enter-fullscreen", on_enter_fullscreen)
    webview.connect("leave-fullscreen", on_leave_fullscreen)

    # Keyboard shortcut F11 for fullscreen
    def on_key_press(widget, event):
        if event.keyval == Gdk.KEY_F11:
            if win.get_window().get_state() & Gdk.WindowState.FULLSCREEN:
                win.unfullscreen()
            else:
                win.fullscreen()
            return True
        return False

    win.connect("key-press-event", on_key_press)

    # Clean shutdown on window close
    def on_destroy(widget):
        cleanup_backend()
        Gtk.main_quit()

    win.connect("destroy", on_destroy)

    # Load URL
    webview.load_uri(SERVER_URL)
    win.add(webview)
    win.show_all()

    # Enter GTK main event loop
    Gtk.main()

def main():
    print("================================================================")
    print(f"  {APP_NAME} — Нативное кроссплатформенное приложение (Python/GTK)")
    print("================================================================")

    if not ensure_backend_running():
        print(f"[!] Ошибка запуска ядра ProCam на порту {SERVER_PORT}")
        sys.exit(1)

    print(f"[*] Ядро активно на {SERVER_URL}")
    print("[*] Открытие нативного графического окна приложения...")

    try:
        run_gtk_native()
    except Exception as e:
        print(f"[!] Ошибка GTK GUI: {e}")
        # Fallback to webview or browser if GTK fails
        try:
            import webbrowser
            webbrowser.open(SERVER_URL)
        except Exception:
            pass

if __name__ == "__main__":
    main()
