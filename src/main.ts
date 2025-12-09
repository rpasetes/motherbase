import './style.css';
import { VideoToASCII } from './ocean/video-to-ascii';

// Initialize when video is ready
const video = document.querySelector('#source-video') as HTMLVideoElement;
const canvas = document.querySelector('#ascii-ocean') as HTMLCanvasElement;

if (!video || !canvas) {
  throw new Error('Required elements not found');
}

// Wait for video metadata to load
video.addEventListener('loadedmetadata', () => {
  const asciiRenderer = new VideoToASCII(video, canvas);
  asciiRenderer.start();
});

// Start loading video
video.load();
