import React, { useEffect, useRef, useState } from "react";

function App() {
  const ws = useRef(null);
  const mediaRecorder = useRef(null);
  const audioChunks = useRef([]);
  const [recording, setRecording] = useState(false);

  useEffect(() => {
    ws.current = new WebSocket("ws://127.0.0.1:5000/ws");

    ws.current.onopen = async () => {
      console.log("WebSocket connected");

      // Get microphone
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder.current = new MediaRecorder(stream, { mimeType: "audio/webm" });

      // Handle each chunk
      mediaRecorder.current.addEventListener("dataavailable", event => {
        if (event.data.size > 0) {
          // prepare data for transimission
          const reader = new FileReader();
          reader.onload = () => {
            const base64Data = reader.result.split(",")[1]; // remove data:...;base64, prefix
            const message = { type: "audio", payload: base64Data };
            ws.current.send(JSON.stringify(message));
          };
          reader.readAsDataURL(event.data);

          
          audioChunks.current.push(event.data);
          console.log("Chunk sent:", event.data);
        }
      });

      // Handle recording stop
      mediaRecorder.current.addEventListener("stop", () => {
        console.log("Recording stopped. Total chunks:", audioChunks.current.length);
        // Combine all chunks into one Blob
        const audioBlob = new Blob(audioChunks.current, { type: "audio/webm" });

        // Create a URL for the audio Blob
        const audioUrl = URL.createObjectURL(audioBlob);

        // Play the audio
        const audio = new Audio(audioUrl);
        audio.play();
      });

      // Start recording in 100ms chunks
      mediaRecorder.current.start(100);
      setRecording(true);
    };

    ws.current.onmessage = (event) => {
      console.log("Received:", event.data);
    };

    ws.current.onclose = () => {
      console.log("🔌 WebSocket closed");
      if (mediaRecorder.current && mediaRecorder.current.state !== "inactive") {
        mediaRecorder.current.stop();
      }
    };

    return () => {
      if (ws.current) ws.current.close();
    };
  }, []);

  return (
    <div style={{ padding: 20 }}>
      <h2>Recording Audio in Chunks</h2>
      <p>Recording: {recording ? "yes" : "no"}</p>
    </div>
  );
}

export default App;
