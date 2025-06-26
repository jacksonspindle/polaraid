import { useState, useEffect, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import Polaroid from "./components/Polaroid";
import { PerspectiveCamera } from "@react-three/drei";
import { Environment } from "@react-three/drei";
import { motion } from "framer-motion";

export default function App() {

  const ejectorRef = useRef();
  const audioRef = useRef(null);
  const [showCamera, setShowCamera] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [isCameraLoading, setIsCameraLoading] = useState(false);
  const [isFrontCamera, setIsFrontCamera] = useState(true); 

  useEffect(() => {
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  if (isMobile) {
    setIsFrontCamera(false); // Ensure front camera is default on mobile
  }
}, []);

  const handleTakePhoto = async () => {
  setShowCamera(true);
  setIsCameraLoading(true);

  const constraints = {
    video: {
      facingMode: isFrontCamera ? "user" : "environment"
    }
  };

  if (navigator.mediaDevices?.getUserMedia) {
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      videoRef.current.onloadeddata = () => {
        setIsCameraLoading(false);
        videoRef.current.play();
      };
    }
  }
};

  const handleCapture = () => {
  const video = videoRef.current;
  const canvas = canvasRef.current;
  if (video && canvas) {
    const width = video.videoWidth;
    const height = video.videoHeight;

    // Create a square canvas
    const squareSize = Math.max(width, height);
    canvas.width = squareSize;
    canvas.height = squareSize;

    const ctx = canvas.getContext("2d");

    // Fill background (white or transparent)
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, squareSize, squareSize);

    // Center the video frame on the square canvas
    const dx = (squareSize - width) / 2;
    const dy = (squareSize - height) / 2;
    ctx.drawImage(video, dx, dy, width, height);

    const imageDataUrl = canvas.toDataURL("image/png");
    setShowCamera(false);

  
    // 🔊 Play shutter sound
    audioRef.current?.play();

    // Stop webcam
    const stream = video.srcObject;
    const tracks = stream?.getTracks();
    tracks?.forEach((track) => track.stop());

    // Download the square version for debugging
    // const link = document.createElement("a");
    // link.href = imageDataUrl;
    // link.download = "captured-square-image.png";
    // document.body.appendChild(link);
    // link.click();
    // document.body.removeChild(link);

    // Trigger animation
    ejectorRef.current?.play(imageDataUrl);
  }
};

const handleFlipCamera = async () => {
  if (isCameraLoading) return; // Prevent multiple triggers

  setIsCameraLoading(true);
  setIsFrontCamera((prev) => !prev);

  const video = videoRef.current;
  const stream = video?.srcObject;
  stream?.getTracks()?.forEach((track) => track.stop());

  setTimeout(async () => {
    await handleTakePhoto(); // Ensure async resolution
  }, 300);
};

  return (
    <div className="w-screen h-screen bg-gradient-to-b from-gray-900 to-gray-700 text-white relative overflow-hidden">
      <img
        src="/polaraid.png"
        alt="Polaraid Logo"
        className="h-24 mx-auto mt-10 z-10 relative"
      />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="w-full h-full"
      >
        <Canvas shadows>
          <Environment preset="sunset" />
          <PerspectiveCamera
            makeDefault
            fov={50}
            position={[0, 6, 10]}
            rotation={[-0.7, 0, 0]}
          />
          <Polaroid ref={ejectorRef} position={[0, .7, 0]} image={capturedImage} />
        </Canvas>

        {!showCamera && (
          <button
            type="button"
            onClick={handleTakePhoto}
            className="absolute bottom-25 left-1/2 transform -translate-x-1/2 bg-white/20 backdrop-blur-lg text-white px-8 py-3 rounded-full shadow-xl text-xl z-10 hover:scale-105 transition border border-white/30"
          >
            🎞️ Take Photo
          </button>
        )}
      </motion.div>

      {showCamera ? (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="absolute bottom-24 left-1/2 transform -translate-x-1/2 z-20 bg-white/20 backdrop-blur-lg border border-white/30 text-white text-center w-[320px] h-[400px] flex flex-col items-center justify-between p-4 rounded-2xl shadow-2xl"
        >
          {isCameraLoading && (
            <div className="w-full flex-1 flex items-center justify-center">
              <div className="w-12 h-12 border-4 border-gray-300 border-t-black rounded-full animate-spin"></div>
            </div>
          )}
          <div className="relative" style={{ width: "300px", height: "300px" }}>
            <video
              ref={videoRef}
              playsInline 
              autoPlay 
              muted
              className="rounded-xl object-cover border border-gray-400 shadow-md w-full h-full"
              style={{ display: isCameraLoading ? "none" : "block" }}
            />
            {!isCameraLoading && (
              <button
                onClick={handleFlipCamera}
                className="absolute top-2 right-2 text-white text-xs bg-black/40 backdrop-blur-md px-2 py-1 rounded shadow"
              >
                🔄 Flip Camera
              </button>
            )}
          </div>
          <button
          type="button"
            onClick={handleCapture}
            className="bg-white/20 backdrop-blur-lg text-white px-8 py-3 rounded-full shadow-xl text-xl hover:scale-105 transition border border-white/30"
          >
            📸 Capture Photo
          </button>
          <canvas ref={canvasRef} style={{ display: "none" }} />
        </motion.div>
      ) : null}

      <audio ref={audioRef} src="/sounds/shutter.mp3" preload="auto" />
    </div>
  );
}