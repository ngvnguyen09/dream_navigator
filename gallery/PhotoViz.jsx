/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import {Canvas, useFrame, useThree} from '@react-three/fiber'
import {OrbitControls} from '@react-three/drei'
import {useRef} from 'react'
import * as THREE from 'three'
import useStore from './store'
import PhotoNode from './PhotoNode'
import {setTargetImage} from './actions'

function SceneContent() {
  const images = useStore.use.images()
  const nodePositions = useStore.use.nodePositions()
  const targetImage = useStore.use.targetImage()
  
  const groupRef = useRef()
  const controlsRef = useRef()
  const { camera, size } = useThree()

  // Compute responsive camera distance: sphere radius is ~200
  // We want the sphere to fill ~75% of the smaller viewport dimension
  const sphereRadius = 200;
  const fovRad = (camera.fov * Math.PI) / 180;
  const idealDist = sphereRadius / Math.sin(fovRad / 2) * 0.85; // 0.85 = fills ~75%
  const responsiveDist = Math.max(350, Math.min(idealDist, 900));
  const responsiveMin = Math.max(250, responsiveDist * 0.55);

  useFrame((state, delta) => {
    if (groupRef.current) {
      if (!targetImage) {
        groupRef.current.rotation.y += 0.05 * delta; // Auto rotate
      }
    }

    if (targetImage && nodePositions[targetImage]) {
      const pos = nodePositions[targetImage];
      const localVec = new THREE.Vector3(
        (pos[0] - 0.5) * 400,
        (pos[1] - 0.5) * 400,
        (pos[2] - 0.5) * 400
      );
      
      const worldVec = localVec.clone().applyMatrix4(groupRef.current.matrixWorld);
      const direction = worldVec.clone().normalize();
      const cameraTargetPos = worldVec.clone().add(direction.multiplyScalar(150)); 
      
      camera.position.lerp(cameraTargetPos, delta * 4);
      if (controlsRef.current) {
        controlsRef.current.target.lerp(worldVec, delta * 4);
        controlsRef.current.update();
      }
    } else {
      const dir = camera.position.clone().normalize();
      const originalCamPos = dir.multiplyScalar(responsiveDist);
      camera.position.lerp(originalCamPos, delta * 3);
      if (controlsRef.current) {
        controlsRef.current.target.lerp(new THREE.Vector3(0, 0, 0), delta * 3);
        controlsRef.current.update();
      }
    }
  })

  return (
    <>
      <ambientLight intensity={2.3} />
      <OrbitControls
        ref={controlsRef}
        enablePan={false}
        enableZoom={!targetImage}
        minDistance={targetImage ? 100 : responsiveMin} 
        maxDistance={1200}
      />
      <group ref={groupRef}>
        {images?.map(image => {
          const pos = nodePositions?.[image.id];
          if (!pos) return null;
          return (
            <PhotoNode
              key={image.id}
              id={image.id}
              url={image.url} // Use clean URL for TextureLoader cache efficiency
              x={pos[0] - 0.5}
              y={pos[1] - 0.5}
              z={pos[2] - 0.5}
              highlight={targetImage === image.id}
              dim={targetImage && targetImage !== image.id}
            />
          )
        })}
      </group>
    </>
  )
}

export default function PhotoViz() {
  return (
    <Canvas
      camera={{position: [0, 0, 300], near: 0.1, far: 10000}}
      onPointerMissed={() => setTargetImage(null)}
      gl={{ 
        powerPreference: 'low-power', 
        antialias: false,
        alpha: false,
        stencil: false,
        depth: true,
      }}
      dpr={[1, 1.5]}
    >
      <SceneContent />
    </Canvas>
  )
}
