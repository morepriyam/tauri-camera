import { useState } from "react";
import Onboarding from "./components/Onboarding";
import Camera from "./components/Camera";

export default function App() {
  const [isOnboarded, setIsOnboarded] = useState(false);

  const handleCameraError = (error: string) => {
    console.error("Camera error:", error);
    // Optionally show an error message or reset onboarding
  };

  return isOnboarded ? (
    <Camera onError={handleCameraError} />
  ) : (
    <Onboarding onDone={() => setIsOnboarded(true)} />
  );
}
