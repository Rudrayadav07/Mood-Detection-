
import { useEffect, useRef, useState } from "react";
import * as faceapi from "face-api.js";
import "./FacialExpression.css";
const EXPRESSIONS = [
  "happy",
  "sad",
  "angry",
  "fearful",
  "disgusted",
  "surprised",
  "neutral",
];

const EMOJI = {
  happy: "😊",
  sad: "😢",
  angry: "😠",
  fearful: "😨",
  disgusted: "🤢",
  surprised: "😮",
  neutral: "😐",
};

export default function FacialExpression() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const animationRef = useRef(null);
  const busyRef = useRef(false);

  const [modelReady, setModelReady] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);
  const [status, setStatus] = useState("Loading AI models...");
  const [expressions, setExpressions] = useState({});
  const [faceCount, setFaceCount] = useState(0);
  const [error, setError] = useState("");

  // Load the pretrained AI models once.
  useEffect(() => {
    let cancelled = false;

    async function loadModels() {
      try {
        const MODEL_URL = "/models";

        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
        ]);

        if (!cancelled) {
          setModelReady(true);
          setStatus("Models ready. Start your camera.");
        }
      } catch (err) {
        console.error("Model loading failed:", err);

        if (!cancelled) {
          setError(
            "Could not load AI models. Check your public/models folder."
          );
          setStatus("Model loading failed");
        }
      }
    }

    loadModels();

    return () => {
      cancelled = true;
      cancelAnimationFrame(animationRef.current);

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // Start webcam.
  async function startCamera() {
    try {
      setError("");
      setStatus("Requesting camera permission...");

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false,
      });

      streamRef.current = stream;
      videoRef.current.srcObject = stream;

      await videoRef.current.play();

      const video = videoRef.current;
      const canvas = canvasRef.current;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      setCameraOn(true);
      setStatus("Camera active. Analyzing expressions...");

      detectExpressions();
    } catch (err) {
      console.error("Camera error:", err);
      setError(
        "Camera access failed. Allow camera permission and try again."
      );
      setStatus("Camera unavailable");
    }
  }

  // Detect faces and estimate facial expressions.
  async function detectExpressions() {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas || video.readyState < 2) {
      animationRef.current =
        requestAnimationFrame(detectExpressions);
      return;
    }

    // Prevent overlapping inference calls.
    if (busyRef.current) {
      animationRef.current =
        requestAnimationFrame(detectExpressions);
      return;
    }

    busyRef.current = true;

    try {
      const results = await faceapi
        .detectAllFaces(
          video,
          new faceapi.TinyFaceDetectorOptions({
            inputSize: 320,
            scoreThreshold: 0.5,
          })
        )
        .withFaceExpressions();

      const context = canvas.getContext("2d");
      context.clearRect(0, 0, canvas.width, canvas.height);

      const resizedResults = faceapi.resizeResults(results, {
        width: canvas.width,
        height: canvas.height,
      });

      faceapi.draw.drawDetections(canvas, resizedResults);

      setFaceCount(results.length);

      if (results.length > 0) {
        // Display the expression scores for the largest detected face.
        const largestFace = results.reduce((largest, current) => {
          const area =
            current.detection.box.width *
            current.detection.box.height;

          const largestArea =
            largest.detection.box.width *
            largest.detection.box.height;

          return area > largestArea ? current : largest;
        });

        const scores = largestFace.expressions;

        setExpressions(
          Object.fromEntries(
            EXPRESSIONS.map((name) => [name, scores[name] ?? 0])
          )
        );
      } else {
        setExpressions({});
      }
    } catch (err) {
      console.error("Detection error:", err);
    } finally {
      busyRef.current = false;
    }

    animationRef.current =
      requestAnimationFrame(detectExpressions);
  }

  // Stop webcam and clear the detection overlay.
  function stopCamera() {
    cancelAnimationFrame(animationRef.current);

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    if (canvasRef.current) {
      const context = canvasRef.current.getContext("2d");
      context.clearRect(
        0,
        0,
        canvasRef.current.width,
        canvasRef.current.height
      );
    }

    setCameraOn(false);
    setFaceCount(0);
    setExpressions({});
    setStatus("Camera stopped");
  }

  const dominantExpression = Object.keys(expressions).length
    ? Object.entries(expressions).reduce((best, current) =>
        current[1] > best[1] ? current : best
      )[0]
    : null;

  return (
    <main className="expression-app">
      <header className="expression-header">
        <h1>EmotionLens</h1>
        <p>Real-time facial expression analysis</p>
      </header>

      <div className="expression-status">
        <span
          className={`status-dot ${
            modelReady && cameraOn ? "active" : ""
          }`}
        />
        {status}
      </div>

      {error && <p role="alert" className="error-message">{error}</p>}

      <section className="expression-layout">
        <div className="camera-panel">
          <div className="video-container">
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
            />

            <canvas ref={canvasRef} />

            {!cameraOn && (
              <div className="camera-placeholder">
                <span className="camera-icon">📷</span>
                <p>Your camera preview will appear here</p>
              </div>
            )}
          </div>

          <div className="camera-controls">
            <button
              onClick={startCamera}
              disabled={!modelReady || cameraOn}
            >
              Start Camera
            </button>

            <button
              onClick={stopCamera}
              disabled={!cameraOn}
              className="stop-button"
            >
              Stop Camera
            </button>
          </div>

          <p className="face-count">
            Faces detected: <strong>{faceCount}</strong>
          </p>
        </div>

        <div className="results-panel">
          <h2>Expression Analysis</h2>

          {dominantExpression ? (
            <div className="dominant-expression">
              <span className="expression-emoji">
                {EMOJI[dominantExpression]}
              </span>

              <div>
                <p>Top predicted expression</p>
                <h3>
                  {dominantExpression.charAt(0).toUpperCase() +
                    dominantExpression.slice(1)}
                </h3>
                <strong>
                  {(expressions[dominantExpression] * 100).toFixed(1)}%
                </strong>
              </div>
            </div>
          ) : (
            <p className="empty-state">
              {cameraOn
                ? "No face detected yet."
                : "Start your camera to see predictions."}
            </p>
          )}

          <h3 className="scores-heading">Expression scores</h3>

          {EXPRESSIONS.map((name) => {
            const score = expressions[name] ?? 0;

            return (
              <div className="score-row" key={name}>
                <div className="score-label">
                  <span>
                    {EMOJI[name]}{" "}
                    {name.charAt(0).toUpperCase() + name.slice(1)}
                  </span>
                  <span>{(score * 100).toFixed(1)}%</span>
                </div>

                <div
                  className="score-track"
                  role="progressbar"
                  aria-label={`${name} expression score`}
                  aria-valuenow={Math.round(score * 100)}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <div
                    className="score-fill"
                    style={{ width: `${score * 100}%` }}
                  />
                </div>
              </div>
            );
          })}

          <p className="disclaimer">
            These are model estimates of visible facial expressions,
            not definitive measurements of a person's emotions.
          </p>
        </div>
      </section>
    </main>
  );
}
