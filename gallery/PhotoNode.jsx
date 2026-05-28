/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { useFrame } from "@react-three/fiber";
import { Billboard } from "@react-three/drei";
import * as THREE from "three";
import { setTargetImage } from "./actions";
import { useRef, useEffect, useState } from "react";

const thumbHeight = 35;

// Reusable vectors to avoid GC pressure on mobile
const _vec2a = new THREE.Vector2();
const _vec2b = new THREE.Vector2();
const _vec3 = new THREE.Vector3();

// Create a proper play triangle geometry once (pointing RIGHT ▶)
const playTriangleGeo = (() => {
  const shape = new THREE.Shape();
  const s = thumbHeight * 0.3;
  shape.moveTo(-s * 0.5, -s * 0.6);
  shape.lineTo(-s * 0.5,  s * 0.6);
  shape.lineTo( s * 0.7,  0);
  shape.closePath();
  return new THREE.ShapeGeometry(shape);
})();

// Global texture cache - one texture per unique URL, downscaled
const textureCache = new Map();
const MAX_TEX_SIZE = 512; // Max texture dimension in pixels

function getOrLoadTexture(url) {
  if (textureCache.has(url)) return textureCache.get(url);
  
  const placeholder = new THREE.Texture();
  textureCache.set(url, placeholder);

  const img = new Image();
  img.crossOrigin = "anonymous";
  img.onload = () => {
    // Downscale to MAX_TEX_SIZE to save VRAM
    const canvas = document.createElement('canvas');
    let w = img.width, h = img.height;
    if (w > MAX_TEX_SIZE || h > MAX_TEX_SIZE) {
      const ratio = Math.min(MAX_TEX_SIZE / w, MAX_TEX_SIZE / h);
      w = Math.round(w * ratio);
      h = Math.round(h * ratio);
    }
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, w, h);

    placeholder.image = canvas;
    placeholder.colorSpace = THREE.SRGBColorSpace;
    placeholder.needsUpdate = true;
    // Store original dimensions for aspect ratio
    placeholder.userData = { width: img.width, height: img.height };
  };
  img.src = url;
  
  return placeholder;
}

function useUVAnimation(texture, highlight, aspectRef, materialRef, opacity) {
  useFrame((state, delta) => {
    if (materialRef.current) {
      materialRef.current.opacity = THREE.MathUtils.lerp(materialRef.current.opacity, opacity, delta * 4);
    }

    if (texture && texture.image) {
       const aspect = aspectRef.current;
       if (isFinite(aspect) && aspect > 0) {
           if (highlight) {
              texture.repeat.lerp(_vec2a.set(1, 1), delta * 5);
              texture.offset.lerp(_vec2b.set(0, 0), delta * 5);
           } else {
              if (aspect > 1) { 
                 const repeatX = 1 / aspect;
                 texture.repeat.lerp(_vec2a.set(repeatX, 1), delta * 5);
                 texture.offset.lerp(_vec2b.set((1 - repeatX) / 2, 0), delta * 5);
              } else { 
                 const repeatY = aspect;
                 texture.repeat.lerp(_vec2a.set(1, repeatY), delta * 5);
                 texture.offset.lerp(_vec2b.set(0, (1 - repeatY) / 2), delta * 5);
              }
           }
       }
    }
  });
}

export default function PhotoNode({
  id,
  url,
  x = 0,
  y = 0,
  z = 0,
  highlight,
  dim,
}) {
  const isVideo = /\.(mp4|webm|mkv|mov)(\?.*)?$/i.test(url || id);
  const cleanUrl = typeof url === 'string' ? url : id.split('?')[0];
  
  const opacity = highlight ? 1 : dim ? 0.3 : 1;
  const aspectRef = useRef(1);
  const meshRef = useRef();
  const materialRef = useRef();
  const [texture, setTexture] = useState(null);

  useEffect(() => {
    if (isVideo) return; // Skip videos for now to save GPU
    const tex = getOrLoadTexture(cleanUrl);
    setTexture(tex);

    // Poll for loaded dimensions
    const check = setInterval(() => {
      if (tex.userData?.width) {
        aspectRef.current = tex.userData.width / tex.userData.height;
        clearInterval(check);
      }
    }, 100);
    return () => clearInterval(check);
  }, [cleanUrl, isVideo]);

  useUVAnimation(texture, highlight, aspectRef, materialRef, opacity);

  useFrame((state, delta) => {
    if (meshRef.current) {
      const aspect = aspectRef.current;
      const targetScaleX = highlight ? thumbHeight * 4 * aspect : thumbHeight;
      const targetScaleY = highlight ? thumbHeight * 4 : thumbHeight;
      meshRef.current.scale.lerp(_vec3.set(targetScaleX, targetScaleY, 1), delta * 5);
    }
  });

  // Skip rendering videos entirely to save GPU - just show a placeholder
  if (isVideo) {
    return (
      <group
        onClick={(e) => { e.stopPropagation(); setTargetImage(id); }}
        position={[x * 400, y * 400, z * 400]}
        renderOrder={highlight ? 10 : 0}
      >
        <Billboard>
          <mesh ref={meshRef} scale={[thumbHeight, thumbHeight, 1]}>
            <planeGeometry />
            <meshBasicMaterial color="#222" transparent opacity={opacity} />
          </mesh>
          <mesh position={[0, 0, 0.2]} geometry={playTriangleGeo}>
            <meshBasicMaterial color="#ffffff" transparent opacity={0.85} side={THREE.DoubleSide} />
          </mesh>
        </Billboard>
      </group>
    );
  }

  return (
    <group
      onClick={(e) => {
        e.stopPropagation();
        setTargetImage(id);
      }}
      position={[x * 400, y * 400, z * 400]}
      renderOrder={highlight ? 10 : 0}
    >
      <Billboard>
        <mesh ref={meshRef} scale={[thumbHeight, thumbHeight, 1]}>
          <planeGeometry />
          <meshBasicMaterial
            ref={materialRef}
            map={texture}
            color="#fff"
            transparent
            opacity={0}
            depthTest={!highlight}
          />
        </mesh>
      </Billboard>
    </group>
  );
}
