import { useRef, useEffect, forwardRef, useImperativeHandle } from "react";
import { useGLTF, useAnimations, useTexture } from "@react-three/drei";
import * as THREE from "three";

const FALLBACK_IMAGE = "https://dummyimage.com/512x512/cccccc/ffffff.jpg&text=No+Image"; // Ensure this exists in your public folder

const Polaroid = forwardRef(({ image, ...props }, ref) => {
  const group = useRef();
  const { scene, animations } = useGLTF("/models/polaroid.glb");
  console.log("Animations loaded:", animations);
  const { actions } = useAnimations(animations, scene);
  const texturePath = image || FALLBACK_IMAGE;
  const photoTexture = useTexture(texturePath);

  useEffect(() => {
    if (!scene || !photoTexture) return;

    scene.traverse((child) => {
      if (child.isMesh && child.name === "Plane_1") {
        const material = Array.isArray(child.material)
          ? child.material.find((mat) => mat.name === "Image")
          : child.material;

        if (material && material.name === "Image") {
          material.map = photoTexture;
          material.needsUpdate = true;
        }
      }
    });
  }, [scene, photoTexture]);

  useImperativeHandle(ref, () => ({
  play: (newImage) => {
    console.log("play() called with image:", newImage);
    if (!newImage) {
      console.warn("No image provided to play(). Using fallback.");
      newImage = FALLBACK_IMAGE;
    }

    const photoMesh = scene.children[0];
    console.log("photoMesh found:", photoMesh);
    if (photoMesh) {
      const loader = new THREE.TextureLoader();

      let imageUrl = newImage;
      if (!newImage.startsWith("data:image")) {
        imageUrl = `data:image/png;base64,${newImage}`;
      }

      function loadTexture(url) {
        const image = new Image();
        image.crossOrigin = "anonymous";
        image.onload = () => {
          const canvas = document.createElement("canvas");
          canvas.width = image.width;
          canvas.height = image.height;
          const ctx = canvas.getContext("2d");

          ctx.scale(1, -1);
          ctx.translate(1, -image.height);
          ctx.drawImage(image, 0, 0);

          const flippedUrl = canvas.toDataURL();
          loader.load(
            flippedUrl,
            (loadedTexture) => {
              loadedTexture.encoding = THREE.LinearEncoding;
              loadedTexture.needsUpdate = true;
              loadedTexture.flipY = true;

              scene.traverse((child) => {
                if (child.isMesh && child.name === "Plane_1") {
                  const oldMaterial = Array.isArray(child.material)
                    ? child.material.find((mat) => mat.name === "Image")
                    : child.material;

                  if (oldMaterial && oldMaterial.name === "Image") {
                    const standardMaterial = new THREE.MeshMatcapMaterial({
                      map: loadedTexture,
                      toneMapped: false,
                    });
                    standardMaterial.name = "Image";
                    child.material = standardMaterial;
                    child.material.needsUpdate = true;
                  }
                }
              });

              // Play animation (existing logic)
              const clip = THREE.AnimationClip.findByName(animations, 'PlaneAction');
              if (clip) {
                const mixer = new THREE.AnimationMixer(scene);
                const action = mixer.clipAction(clip);
                action.reset();
                action.setLoop(THREE.LoopOnce);
                action.clampWhenFinished = true;
                action.play();
                const clock = new THREE.Clock();
                function animate() {
                  requestAnimationFrame(animate);
                  const delta = clock.getDelta();
                  mixer.update(delta);
                }
                animate();
              }
            },
            undefined,
            (err) => {
              console.error("Error loading flipped texture", err);
            }
          );
        };
        image.src = url;
      }

      loadTexture(imageUrl);
    }
  }
}), [actions, scene]);

  return (
    <group ref={group} {...props}>
      <primitive object={scene} />
    </group>
  );
});

export default Polaroid;