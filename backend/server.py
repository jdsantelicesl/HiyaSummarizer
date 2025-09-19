from flask import Flask
from flask_sockets import Sockets
from gevent import pywsgi
from geventwebsocket.handler import WebSocketHandler

app = Flask(__name__)
sockets = Sockets(app)

clients = set()
full_transcript = ""


@sockets.route('/ws')
def audio_relay(ws):
    global full_transcript
    clients.add(ws)

    while not ws.closed:
        audio_chunk = ws.receive()
        if audio_chunk:
            
            # relay audio to other end of the call
            for c in clients:
                if c != ws:
                    c.send(audio_chunk)


if __name__ == "__main__":
    server = pywsgi.WSGIServer(('0.0.0.0', 5000), app, handler_class=WebSocketHandler)
    server.serve_forever()
