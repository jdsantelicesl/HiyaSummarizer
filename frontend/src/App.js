import React, { useEffect, useRef, useState } from "react";
import "./App.css"

function App() {
  const ws = useRef(null);
  const mediaRecorder = useRef(null);
  const audioChunks = useRef([]);
  const [recording, setRecording] = useState(false);
  const [summary, setSummary] = useState(null)
  const [todo, setToDo] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    ws.current = new WebSocket("ws://127.0.0.1:5000/ws");
    //ws.current = new WebSocket("ws://10.41.61.49:5000/ws");

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
      const data = JSON.parse(event.data);
      console.log("Received:", data.type);

      if (data.type == "Summary") {
        setSummary(data.payload);
        setToDo(data.payload.match(/Todo List:\s*([\s\S]*)/)[1].split("\n"));
        console.log("received summary");
        setLoading(false);
      }

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

  const handleClick = () => {
    if (recording) {
      mediaRecorder.current.stop();
      setRecording(false);
      ws.current.send(JSON.stringify({ type: "Stop" }))
      setLoading(true);
    }
    else {
      window.location.reload();
    }

  }

  return (
    <div className="main" style={{ padding: 20 }}>
      <h2 className="title">Voice AI Summarizer</h2>
      <div className="recording">{recording ? "Call Active" : "Call Ended"}</div>
      <div className="startButton" onClick={handleClick}>{recording ? "Stop" : "Start" }</div>
      {loading && <div>Loading... </div>}
      <div className="content">
        <div className="subHead">Summary:</div>
        <div className="text">{summary ? summary.match(/Summary:\s*(.*?)\s*Todo List:/s)[1] : "Please end the call to see your summary :)"}</div>
        <div className="subHead">To Do:</div>
        <div className="text">{summary ? todo.map((line, i) => (
          <div key={i}>{line}</div>
        )) : "Looks like you have plenty of time to enjoy the day :)"}</div>
      </div>
    </div>
  );
}

export default App;
