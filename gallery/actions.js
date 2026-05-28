/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import useStore from './store'

const get = useStore.getState
const set = useStore.setState

export const init = async () => {
  if (get().didInit) {
    return
  }

  set(state => {
    state.didInit = true
  })

  // Eagerly load the URLs of all assets in the assets folder
  const assetModules = import.meta.glob('./assets/*.{jpg,jpeg,png,mp4,webm}', { eager: true })
  // Extract URLs and filter out user's manually duplicated files
  const baseAssetPaths = Object.values(assetModules)
    .map(mod => mod?.default || mod)
    .filter(url => !url.toLowerCase().includes(' - copy'));

  const TARGET_NODES = 30;
  let assetPaths = [];
  
  if (baseAssetPaths.length > 0) {
    let lastUrl = null;
    for (let i = 0; i < TARGET_NODES; i++) {
      // Pick a random image that is NOT the same as the previous one
      let pool = baseAssetPaths.length > 1 ? baseAssetPaths.filter(u => u !== lastUrl) : baseAssetPaths;
      const pick = pool[Math.floor(Math.random() * pool.length)];
      assetPaths.push(pick);
      lastUrl = pick;
    }
  }

  const n = assetPaths.length

  // Build a Fibonacci sphere
  const phi = Math.PI * (3 - Math.sqrt(5)) // Golden angle
  const nodePositions = {}
  
  const images = assetPaths.map((url, i) => {
    // Generate normalized Sphere coords
    const y = 1 - (i / (n - 1)) * 2 // y goes from 1 to -1
    const radius = Math.sqrt(1 - y * y)
    const theta = phi * i

    const x = Math.cos(theta) * radius
    const z = Math.sin(theta) * radius

    // Convert from [-1, 1] to [0, 1] which PhotoViz transforms back to [-300, 300]
    const pos = [(x + 1) / 2, (y + 1) / 2, (z + 1) / 2];

    const id = `${url}?index=${i}`; // Make each ID unique in case of repeats
    nodePositions[id] = pos;

    return {
      id,
      url, 
      description: ''
    }
  })

  set(state => {
    state.images = images
    state.nodePositions = nodePositions
  })

  setLayout('sphere')
}

export const setLayout = layout =>
  set(state => {
    state.layout = layout
  })

export const setTargetImage = async targetImage => {
  if (targetImage === get().targetImage) {
    targetImage = null
  }

  set(state => {
    state.targetImage = targetImage
  })
}

// Navigate to next (+1) or previous (-1) image
export const navigateImage = (direction) => {
  const images = get().images
  const current = get().targetImage
  if (!images || images.length === 0) return
  
  const currentIdx = images.findIndex(img => img.id === current)
  const nextIdx = (currentIdx + direction + images.length) % images.length
  set(state => {
    state.targetImage = images[nextIdx].id
  })
}

init()
