import { useCallback, useEffect, useState } from "react";
import { Particles, initParticlesEngine } from "@tsparticles/react";
import type { Container, Engine } from "@tsparticles/engine";
import { loadSlim } from "@tsparticles/slim";

const BackgroundParticles = () => {
  const [init, setInit] = useState(false);

  useEffect(() => {
    initParticlesEngine(async (engine: Engine) => {
      await loadSlim(engine);
    }).then(() => {
      setInit(true);
    });
  }, []);

  const particlesLoaded = useCallback(async (container?: Container) => {

  }, []);

  if (!init) {
    return null;
  }

  return (
    <Particles
      id="tsparticles"
      className="fixed inset-0 -z-10"
      particlesLoaded={particlesLoaded}
      options={{
        fullScreen: false,
        background: {
          color: {
            value: "transparent",
          },
        },
        fpsLimit: 120,
        particles: {
          color: {
            value: "#9ca3af",
          },
          links: {
            color: "#9ca3af",
            distance: 150,
            enable: true,
            opacity: 0.2,
            width: 1,
          },
          move: {
            enable: true,
            random: true,
            speed: 0.5,
            straight: false,
          },
          number: {
            density: {
              enable: true,
              width: 800,
              height: 800,
            },
            value: 80,
          },
          opacity: {
            value: 0.2,
          },
          shape: {
            type: "circle",
          },
          size: {
            value: { min: 1, max: 3 },
          },
        },
        detectRetina: true,
      }}
    />
  );
};

export default BackgroundParticles;
