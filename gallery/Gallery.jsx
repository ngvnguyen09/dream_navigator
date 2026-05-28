/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import PhotoViz from "./PhotoViz";
import useStore from "./store";
import { setTargetImage, navigateImage } from "./actions";
import { Link } from "react-router-dom";
import { useState, useEffect } from "react";

const btnStyle = {
  padding: '12px 24px',
  fontSize: '1.1rem',
  backgroundColor: 'rgba(255, 255, 255, 0.12)',
  color: 'white',
  border: '1px solid rgba(255,255,255,0.3)',
  borderRadius: '30px',
  cursor: 'pointer',
  backdropFilter: 'blur(10px)',
  pointerEvents: 'auto',
  zIndex: 10,
  transition: 'all 0.4s ease',
};

const arrowBtn = {
  ...btnStyle,
  width: '50px',
  height: '50px',
  padding: 0,
  borderRadius: '50%',
  fontSize: '1.6rem',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

function LoadingScreen({ onReady }) {
  const images = useStore.use.images();
  const [progress, setProgress] = useState(0);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    if (!images || images.length === 0) return;

    // Get unique URLs only
    const uniqueUrls = [...new Set(images.map(img => img.url))];
    const isVideoUrl = (url) => /\.(mp4|webm|mkv|mov)(\?.*)?$/i.test(url);
    const imageUrls = uniqueUrls.filter(u => !isVideoUrl(u));
    
    if (imageUrls.length === 0) {
      setProgress(100);
      return;
    }

    let loaded = 0;
    imageUrls.forEach(url => {
      const img = new Image();
      img.onload = img.onerror = () => {
        loaded++;
        setProgress(Math.round((loaded / imageUrls.length) * 100));
      };
      img.src = url;
    });
  }, [images]);

  useEffect(() => {
    if (progress >= 100) {
      const timer = setTimeout(() => setFadeOut(true), 400);
      const done = setTimeout(() => onReady(), 1200);
      return () => { clearTimeout(timer); clearTimeout(done); };
    }
  }, [progress, onReady]);

  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      zIndex: 100,
      background: '#0a0a0a',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '30px',
      opacity: fadeOut ? 0 : 1,
      transition: 'opacity 0.8s ease',
      pointerEvents: fadeOut ? 'none' : 'all',
    }}>
      {/* Spinning ring */}
      <div style={{
        width: '80px',
        height: '80px',
        borderRadius: '50%',
        border: '3px solid rgba(255,255,255,0.1)',
        borderTopColor: '#3b82f6',
        animation: 'spin 1s linear infinite',
      }} />
      
      <div style={{ textAlign: 'center' }}>
        <p style={{
          fontFamily: '"Dancing Script", cursive',
          fontSize: 'clamp(1.5rem, 4vw, 2.5rem)',
          color: 'white',
          marginBottom: '16px',
        }}>
          Dự án Trạm lịch sử 4.0
        </p>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.9rem', marginBottom: '20px' }}>
          Đang tải hình ảnh...
        </p>
      </div>

      {/* Progress bar */}
      <div style={{
        width: '220px',
        height: '4px',
        borderRadius: '4px',
        background: 'rgba(255,255,255,0.08)',
        overflow: 'hidden',
      }}>
        <div style={{
          height: '100%',
          width: `${progress}%`,
          background: 'linear-gradient(90deg, #3b82f6, #60a5fa)',
          borderRadius: '4px',
          transition: 'width 0.3s ease',
        }} />
      </div>
      <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.75rem' }}>{progress}%</p>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export default function Gallery() {
  const targetImage = useStore.use.targetImage();
  const images = useStore.use.images();
  const [loaded, setLoaded] = useState(false);

  // Open first image when "Xem ảnh" is clicked
  const handleViewPhotos = () => {
    if (images && images.length > 0) {
      setTargetImage(images[0].id);
    }
  };

  return (
    <main style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden', background: '#0a0a0a' }}>
      <PhotoViz />
      
      {/* Loading Screen */}
      {!loaded && <LoadingScreen onReady={() => setLoaded(true)} />}

      {/* Back button to Home */}
      <Link 
        to="/"
        style={{
          ...arrowBtn,
          position: 'absolute',
          top: '20px',
          left: '20px',
          textDecoration: 'none',
          fontSize: '1.2rem',
          width: '45px',
          height: '45px',
          opacity: loaded ? 1 : 0,
          transition: 'opacity 0.5s ease',
        }}
      >
        ✕
      </Link>

      {/* Title - centered on screen */}
      <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: targetImage 
            ? 'translate(-50%, -50%) scale(0.6)' 
            : 'translate(-50%, -50%)',
          opacity: (targetImage || !loaded) ? 0 : 1,
          textAlign: 'center',
          pointerEvents: 'none',
          transition: 'all 0.8s cubic-bezier(0.25, 1, 0.5, 1)',
          fontFamily: '"Dancing Script", cursive',
          fontSize: 'clamp(2rem, 6vw, 4.5rem)',
          color: 'white',
          textShadow: '0 4px 20px rgba(0,0,0,0.9)',
          whiteSpace: 'nowrap',
        }}>
          Dự án Trạm lịch sử 4.0
      </div>

      {/* "Xem ảnh" button - normal view */}
      <button
        onClick={handleViewPhotos}
        style={{
          ...btnStyle,
          position: 'absolute',
          bottom: '40px',
          left: '50%',
          transform: !targetImage ? 'translateX(-50%) translateY(0)' : 'translateX(-50%) translateY(80px)',
          opacity: (!targetImage && loaded) ? 1 : 0,
        }}
      >
        📷 Xem ảnh
      </button>

      {/* Previous arrow */}
      <button
        onClick={() => navigateImage(-1)}
        style={{
          ...arrowBtn,
          position: 'absolute',
          left: '20px',
          top: '50%',
          transform: targetImage ? 'translateY(-50%) scale(1)' : 'translateY(-50%) scale(0)',
          opacity: targetImage ? 1 : 0,
        }}
      >
        ‹
      </button>

      {/* Next arrow */}
      <button
        onClick={() => navigateImage(1)}
        style={{
          ...arrowBtn,
          position: 'absolute',
          right: '20px',
          top: '50%',
          transform: targetImage ? 'translateY(-50%) scale(1)' : 'translateY(-50%) scale(0)',
          opacity: targetImage ? 1 : 0,
        }}
      >
        ›
      </button>

      {/* Back to sphere button */}
      <button
        onClick={() => setTargetImage(null)}
        style={{
          ...btnStyle,
          position: 'absolute',
          bottom: '40px',
          right: '40px',
          transform: targetImage ? 'translateY(0) scale(1)' : 'translateY(100px) scale(0.8)',
          opacity: targetImage ? 1 : 0,
        }}
      >
        Trở lại khối cầu
      </button>
    </main>
  );
}
