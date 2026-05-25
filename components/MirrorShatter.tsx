import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface MirrorShatterProps {
  isShattering: boolean;
  impactX: number;
  impactY: number;
  mode: 'calm' | 'rage';
  onComplete: () => void;
}

interface Point {
  x: number;
  y: number;
}

interface CrackBranch {
  segments: Point[];
  maxSegments: number;
  currentProgress: number; // 0 to 1
  speed: number;
}

interface GlassShard {
  points: Point[];
  centerX: number;
  centerY: number;
  vx: number;
  vy: number;
  rotation: number;
  vr: number; // rotation speed
  opacity: number;
}

export const MirrorShatter: React.FC<MirrorShatterProps> = ({
  isShattering,
  impactX,
  impactY,
  mode,
  onComplete,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isCalm = mode === 'calm';
  const [showOverlay, setShowOverlay] = useState(false);

  useEffect(() => {
    if (isShattering) {
      setShowOverlay(true);
    }
  }, [isShattering]);

  useEffect(() => {
    if (!showOverlay || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas dimensions
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Crack generation logic
    const x0 = impactX === 0 ? canvas.width / 2 : impactX;
    const y0 = impactY === 0 ? canvas.height / 2 : impactY;

    const branches: CrackBranch[] = [];
    const numBranches = 12 + Math.floor(Math.random() * 6); // 12 to 18 main cracks

    // Generate radiating cracks
    for (let i = 0; i < numBranches; i++) {
      const angle = (i / numBranches) * Math.PI * 2 + (Math.random() * 0.2 - 0.1);
      const segments: Point[] = [{ x: x0, y: y0 }];
      let curX = x0;
      let curY = y0;
      const length = Math.max(canvas.width, canvas.height) * 1.2;
      const step = 25 + Math.random() * 20;
      const numSteps = Math.ceil(length / step);

      for (let j = 0; j < numSteps; j++) {
        // Add random deviation to the angle to make it jagged
        const devAngle = angle + (Math.random() * 0.4 - 0.2);
        curX += Math.cos(devAngle) * step;
        curY += Math.sin(devAngle) * step;
        segments.push({ x: curX, y: curY });
      }

      branches.push({
        segments,
        maxSegments: segments.length,
        currentProgress: 0,
        speed: 0.04 + Math.random() * 0.03, // Speed of growth
      });
    }

    // Generate circular ring cracks connecting the branches
    const ringCracks: { p1: Point; p2: Point; progress: number; threshold: number }[] = [];
    const numRings = 5;
    for (let r = 1; r <= numRings; r++) {
      const radiusThreshold = r * 80 + Math.random() * 40;
      for (let b = 0; b < branches.length; b++) {
        const nextB = (b + 1) % branches.length;
        // Find segment close to this radius
        const getPointNearRadius = (branch: CrackBranch, rad: number) => {
          for (let s = 0; s < branch.segments.length; s++) {
            const dx = branch.segments[s].x - x0;
            const dy = branch.segments[s].y - y0;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist >= rad) {
              return branch.segments[s];
            }
          }
          return branch.segments[branch.segments.length - 1];
        };

        const p1 = getPointNearRadius(branches[b], radiusThreshold);
        const p2 = getPointNearRadius(branches[nextB], radiusThreshold);

        ringCracks.push({
          p1,
          p2,
          progress: 0,
          threshold: 0.2 + (radiusThreshold / (canvas.width * 0.8)) * 0.4, // Delay rings based on distance from center
        });
      }
    }

    // Glass Shards Generation
    const shards: GlassShard[] = [];
    const generateShards = () => {
      const shardGridSize = 25; // Create a grid of triangles
      const cols = Math.ceil(canvas.width / shardGridSize);
      const rows = Math.ceil(canvas.height / shardGridSize);

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const px = c * shardGridSize;
          const py = r * shardGridSize;

          // Triangle 1
          const t1_p1 = { x: px + Math.random() * 5, y: py + Math.random() * 5 };
          const t1_p2 = { x: px + shardGridSize + Math.random() * 5, y: py + Math.random() * 5 };
          const t1_p3 = { x: px + Math.random() * 5, y: py + shardGridSize + Math.random() * 5 };

          // Triangle 2
          const t2_p1 = { x: px + shardGridSize + Math.random() * 5, y: py + Math.random() * 5 };
          const t2_p2 = { x: px + shardGridSize + Math.random() * 5, y: py + shardGridSize + Math.random() * 5 };
          const t2_p3 = { x: px + Math.random() * 5, y: py + shardGridSize + Math.random() * 5 };

          [t1_p1, t1_p2, t1_p3, t2_p1, t2_p2, t2_p3].forEach((p) => {
            // Keep bounds
            p.x = Math.max(0, Math.min(canvas.width, p.x));
            p.y = Math.max(0, Math.min(canvas.height, p.y));
          });

          const createShard = (p1: Point, p2: Point, p3: Point) => {
            const cx = (p1.x + p2.x + p3.x) / 3;
            const cy = (p1.y + p2.y + p3.y) / 3;

            // Shards closer to impact fly faster
            const dx = cx - x0;
            const dy = cy - y0;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            
            // Explosion force vector
            const force = Math.max(0, 1500 / (dist + 150)) + Math.random() * 2;
            const angle = Math.atan2(dy, dx) + (Math.random() * 0.4 - 0.2);

            const vx = Math.cos(angle) * force * 1.5;
            const vy = Math.sin(angle) * force * 1.5 + (Math.random() * 3 + 2); // Initial downward gravity push

            shards.push({
              points: [
                { x: p1.x - cx, y: p1.y - cy },
                { x: p2.x - cx, y: p2.y - cy },
                { x: p3.x - cx, y: p3.y - cy },
              ],
              centerX: cx,
              centerY: cy,
              vx,
              vy,
              rotation: Math.random() * Math.PI * 2,
              vr: (Math.random() * 0.1 - 0.05) * (force * 0.5),
              opacity: 1,
            });
          };

          createShard(t1_p1, t1_p2, t1_p3);
          createShard(t2_p1, t2_p2, t2_p3);
        }
      }
    };

    // Colors
    const glowColor = isCalm ? 'rgba(56, 189, 248, 1)' : 'rgba(239, 68, 68, 1)'; // Cyan vs Red
    const shadowColor = isCalm ? '#0ea5e9' : '#b91c1c';

    let phase: 'cracking' | 'shattering' | 'done' = 'cracking';
    let animationFrameId: number;
    let transitionProgress = 0; // Blackout screen transition progress
    let startShatterTime = 0;

    const animate = (timestamp: number) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (phase === 'cracking') {
        // Update radiating cracks growth
        let allRadiatingFinished = true;
        branches.forEach((b) => {
          if (b.currentProgress < 1) {
            b.currentProgress = Math.min(1, b.currentProgress + b.speed);
            allRadiatingFinished = false;
          }
        });

        // Update concentric rings growth
        ringCracks.forEach((r) => {
          const avgProgress = branches.reduce((acc, curr) => acc + curr.currentProgress, 0) / branches.length;
          if (avgProgress > r.threshold && r.progress < 1) {
            r.progress = Math.min(1, r.progress + 0.06);
          }
        });

        // Render cracks
        ctx.save();
        
        // Draw glow path
        ctx.beginPath();
        branches.forEach((b) => {
          const numVisible = Math.floor(b.segments.length * b.currentProgress);
          if (numVisible > 1) {
            ctx.moveTo(b.segments[0].x, b.segments[0].y);
            for (let j = 1; j < numVisible; j++) {
              ctx.lineTo(b.segments[j].x, b.segments[j].y);
            }
          }
        });

        ringCracks.forEach((r) => {
          if (r.progress > 0) {
            const x = r.p1.x + (r.p2.x - r.p1.x) * r.progress;
            const y = r.p1.y + (r.p2.y - r.p1.y) * r.progress;
            ctx.moveTo(r.p1.x, r.p1.y);
            ctx.lineTo(x, y);
          }
        });

        ctx.strokeStyle = glowColor;
        ctx.lineWidth = 3;
        ctx.shadowColor = shadowColor;
        ctx.shadowBlur = 12;
        ctx.stroke();

        // Draw hot core path (thinner white center line)
        ctx.beginPath();
        branches.forEach((b) => {
          const numVisible = Math.floor(b.segments.length * b.currentProgress);
          if (numVisible > 1) {
            ctx.moveTo(b.segments[0].x, b.segments[0].y);
            for (let j = 1; j < numVisible; j++) {
              ctx.lineTo(b.segments[j].x, b.segments[j].y);
            }
          }
        });
        ringCracks.forEach((r) => {
          if (r.progress > 0) {
            const x = r.p1.x + (r.p2.x - r.p1.x) * r.progress;
            const y = r.p1.y + (r.p2.y - r.p1.y) * r.progress;
            ctx.moveTo(r.p1.x, r.p1.y);
            ctx.lineTo(x, y);
          }
        });
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.shadowBlur = 0; // Turn off glow for the core
        ctx.stroke();

        ctx.restore();

        // Move to shatter phase after a small delay once cracks are fully grown
        const allRingsFinished = ringCracks.every((r) => r.progress >= 1);
        if (allRadiatingFinished && allRingsFinished) {
          phase = 'shattering';
          startShatterTime = timestamp;
          generateShards();
        }
      } else if (phase === 'shattering') {
        const timeElapsed = timestamp - startShatterTime;
        
        // Progress of the screen fadeout (fades to dark or light matching theme)
        transitionProgress = Math.min(1, timeElapsed / 1000); 

        // Draw the background fade under the shards
        ctx.fillStyle = isCalm 
          ? `rgba(248, 250, 252, ${transitionProgress * 0.95})`  // Slate-50 background for Calm
          : `rgba(3, 0, 5, ${transitionProgress * 0.95})`;       // Nolan-black for Rage

        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Update and draw glass shards
        let activeShards = 0;
        shards.forEach((s) => {
          if (s.opacity <= 0) return;
          activeShards++;

          // Physics updates
          s.centerX += s.vx;
          s.centerY += s.vy;
          s.vy += 0.48; // Gravity
          s.vx *= 0.98; // Friction
          s.rotation += s.vr;

          // Fade out shards gradually
          s.opacity = Math.max(0, s.opacity - 0.012);

          // Draw shard
          ctx.save();
          ctx.translate(s.centerX, s.centerY);
          ctx.rotate(s.rotation);
          ctx.globalAlpha = s.opacity;

          ctx.beginPath();
          ctx.moveTo(s.points[0].x, s.points[0].y);
          ctx.lineTo(s.points[1].x, s.points[1].y);
          ctx.lineTo(s.points[2].x, s.points[2].y);
          ctx.closePath();

          // Glass material gradient
          const grad = ctx.createLinearGradient(-10, -10, 10, 10);
          if (isCalm) {
            grad.addColorStop(0, 'rgba(255, 255, 255, 0.7)');
            grad.addColorStop(1, 'rgba(186, 230, 253, 0.3)'); // Soft sky blue shard
            ctx.fillStyle = grad;
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
          } else {
            grad.addColorStop(0, 'rgba(255, 255, 255, 0.15)');
            grad.addColorStop(1, 'rgba(239, 68, 68, 0.1)');   // Red/gray shadow shard
            ctx.fillStyle = grad;
            ctx.strokeStyle = 'rgba(239, 68, 68, 0.4)';
          }
          
          ctx.lineWidth = 0.5;
          ctx.fill();
          ctx.stroke();
          ctx.restore();
        });

        // If shards are gone and transition fade has peaked, complete the process
        if (activeShards === 0 || timeElapsed > 1800) {
          phase = 'done';
          onComplete();
        }
      }

      if (phase !== 'done') {
        animationFrameId = requestAnimationFrame(animate);
      }
    };

    animationFrameId = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationFrameId);
    };
  }, [showOverlay, canvasRef]);

  return (
    <AnimatePresence>
      {showOverlay && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="fixed inset-0 z-[9999] pointer-events-auto"
        >
          {/* Prevent user clicking on anything while shattering */}
          <div className="absolute inset-0 bg-transparent cursor-wait" />
          
          {/* Canvas for the crack and shard animation */}
          <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full block"
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
};
