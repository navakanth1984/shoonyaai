import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { 
  RotateCcw, 
  ZoomIn, 
  ZoomOut, 
  Play, 
  Pause, 
  Layers, 
  Maximize2, 
  Sparkles, 
  Info, 
  Globe, 
  Boxes, 
  Activity,
  Compass,
  Cpu
} from 'lucide-react';

export type Spatial3DMode = 'topology' | 'cluster_lattice' | 'geospatial';

interface Spatial3DVisualizationProps {
  mode?: Spatial3DMode;
  data?: any[];
  title?: string;
  className?: string;
  onNodeSelect?: (nodeData: any) => void;
}

export const Spatial3DVisualization: React.FC<Spatial3DVisualizationProps> = ({
  mode: initialMode = 'topology',
  data = [],
  title = 'ShoonyaAI 3D Spatial Visualization Engine',
  className = '',
  onNodeSelect,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mode, setMode] = useState<Spatial3DMode>(initialMode);
  const [isRotating, setIsRotating] = useState(true);
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [themeStyle, setThemeStyle] = useState<'cyber' | 'studio' | 'matrix'>('cyber');
  const [particleSpeed, setParticleSpeed] = useState<number>(1);
  const [cameraDistance, setCameraDistance] = useState<number>(45);

  // References for three.js objects
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const animFrameIdRef = useRef<number | null>(null);
  const dynamicGroupRef = useRef<THREE.Group | null>(null);
  const particlesRef = useRef<THREE.Points | null>(null);
  const interactiveMeshesRef = useRef<THREE.Mesh[]>([]);

  // Drag rotation state
  const isDraggingRef = useRef(false);
  const previousMousePositionRef = useRef({ x: 0, y: 0 });
  const rotationEulerRef = useRef({ x: 0.3, y: 0.6 });

  useEffect(() => {
    if (!containerRef.current || !canvasRef.current) return;

    const width = containerRef.current.clientWidth || 600;
    const height = Math.max(380, containerRef.current.clientHeight || 420);

    // 1. Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Background color based on theme
    const bgColor = themeStyle === 'studio' ? 0x0f172a : themeStyle === 'matrix' ? 0x021208 : 0x030712;
    scene.background = new THREE.Color(bgColor);
    scene.fog = new THREE.FogExp2(bgColor, 0.015);

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
    camera.position.set(0, 20, cameraDistance);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // 3. WebGL Renderer
    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: true,
      alpha: true,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    rendererRef.current = renderer;

    // 4. Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0x6366f1, 2.0); // Indigo
    dirLight1.position.set(30, 40, 30);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x06b6d4, 1.8); // Cyan
    dirLight2.position.set(-30, -20, -30);
    scene.add(dirLight2);

    // 5. Dynamic Container Group for Content
    const group = new THREE.Group();
    scene.add(group);
    dynamicGroupRef.current = group;
    interactiveMeshesRef.current = [];

    // Helper: Floor Grid
    const gridHelper = new THREE.GridHelper(60, 30, 0x4f46e5, 0x1e293b);
    gridHelper.position.y = -10;
    group.add(gridHelper);

    // Build Scene based on Active Mode
    buildSpatialScene(group, mode, data, themeStyle, interactiveMeshesRef);

    // 6. Particle Cloud for Ambient Space Atmosphere
    const particleCount = 200;
    const particleGeo = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount * 3; i += 3) {
      particlePositions[i] = (Math.random() - 0.5) * 80;
      particlePositions[i + 1] = (Math.random() - 0.5) * 50;
      particlePositions[i + 2] = (Math.random() - 0.5) * 80;
    }
    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    const particleMat = new THREE.PointsMaterial({
      color: themeStyle === 'matrix' ? 0x10b981 : 0x38bdf8,
      size: 0.6,
      transparent: true,
      opacity: 0.6,
    });
    const particles = new THREE.Points(particleGeo, particleMat);
    group.add(particles);
    particlesRef.current = particles;

    // Animation Loop
    let clock = new THREE.Clock();
    const animate = () => {
      animFrameIdRef.current = requestAnimationFrame(animate);
      const delta = clock.getDelta();

      if (isRotating && group) {
        rotationEulerRef.current.y += 0.35 * delta;
      }

      group.rotation.x = rotationEulerRef.current.x;
      group.rotation.y = rotationEulerRef.current.y;

      // Animate particles
      if (particlesRef.current) {
        particlesRef.current.rotation.y += 0.05 * delta * particleSpeed;
      }

      // Pulse dynamic meshes
      interactiveMeshesRef.current.forEach((m, idx) => {
        if (m.userData.isPulsing) {
          const s = 1 + Math.sin(clock.getElapsedTime() * 3 + idx) * 0.08;
          m.scale.set(s, s, s);
        }
      });

      renderer.render(scene, camera);
    };

    animate();

    // Resize Handler
    const handleResize = () => {
      if (!containerRef.current || !rendererRef.current || !cameraRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = Math.max(380, containerRef.current.clientHeight || 420);
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(containerRef.current);

    // Cleanup
    return () => {
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
      resizeObserver.disconnect();
      renderer.dispose();
      particleGeo.dispose();
      particleMat.dispose();
      // Dispose meshes
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry?.dispose();
          if (Array.isArray(obj.material)) {
            obj.material.forEach(m => m.dispose());
          } else {
            obj.material?.dispose();
          }
        }
      });
    };
  }, [mode, themeStyle, cameraDistance]);

  // Content Builders for different modes
  const buildSpatialScene = (
    group: THREE.Group, 
    activeMode: Spatial3DMode, 
    customData: any[],
    style: 'cyber' | 'studio' | 'matrix',
    interactiveListRef: React.MutableRefObject<THREE.Mesh[]>
  ) => {
    interactiveListRef.current = [];

    if (activeMode === 'topology') {
      // 3D Spatial Pipeline Topology DAG with curved splines and glowing nodes
      const pipelineNodes = [
        { id: 'node-kafka', name: 'Apache Kafka CDC', type: 'source', x: -22, y: 0, z: -8, color: 0xf59e0b, throughput: '128,450 eps' },
        { id: 'node-spark', name: 'Spark Streaming Core', type: 'engine', x: -8, y: 4, z: 2, color: 0x6366f1, throughput: '128,450 eps' },
        { id: 'node-dedup', name: 'Auto-Deduplication & Drift', type: 'transform', x: 6, y: -2, z: -4, color: 0x06b6d4, throughput: '128,420 eps' },
        { id: 'node-enrich', name: 'PII Tokenization & ML Enrich', type: 'enrichment', x: 18, y: 5, z: 5, color: 0x8b5cf6, throughput: '128,420 eps' },
        { id: 'node-warehouse', name: 'Snowflake / Iceberg Lakehouse', type: 'sink', x: 26, y: -3, z: -2, color: 0x10b981, throughput: '128,420 eps' },
      ];

      // Create Nodes
      pipelineNodes.forEach((nd) => {
        const nodeGeo = new THREE.SphereGeometry(2.4, 32, 32);
        const nodeMat = new THREE.MeshStandardMaterial({
          color: nd.color,
          emissive: nd.color,
          emissiveIntensity: 0.45,
          roughness: 0.2,
          metalness: 0.8,
        });
        const mesh = new THREE.Mesh(nodeGeo, nodeMat);
        mesh.position.set(nd.x, nd.y, nd.z);
        mesh.userData = { ...nd, isPulsing: true };
        group.add(mesh);
        interactiveListRef.current.push(mesh);

        // Surrounding orbital wireframe ring
        const ringGeo = new THREE.TorusGeometry(3.5, 0.08, 16, 64);
        const ringMat = new THREE.MeshBasicMaterial({ color: nd.color, wireframe: true, transparent: true, opacity: 0.6 });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.position.set(nd.x, nd.y, nd.z);
        ring.rotation.x = Math.PI / 2;
        group.add(ring);
      });

      // Connect nodes with 3D Bezier Curves and Light Tubes
      for (let i = 0; i < pipelineNodes.length - 1; i++) {
        const p1 = new THREE.Vector3(pipelineNodes[i].x, pipelineNodes[i].y, pipelineNodes[i].z);
        const p2 = new THREE.Vector3(pipelineNodes[i + 1].x, pipelineNodes[i + 1].y, pipelineNodes[i + 1].z);
        const midPoint = new THREE.Vector3(
          (p1.x + p2.x) / 2,
          (p1.y + p2.y) / 2 + (i % 2 === 0 ? 4 : -3),
          (p1.z + p2.z) / 2 + (i % 2 === 0 ? 3 : -3)
        );

        const curve = new THREE.QuadraticBezierCurve3(p1, midPoint, p2);
        const tubeGeo = new THREE.TubeGeometry(curve, 32, 0.25, 8, false);
        const tubeMat = new THREE.MeshStandardMaterial({
          color: 0x38bdf8,
          emissive: 0x0284c7,
          emissiveIntensity: 0.6,
          transparent: true,
          opacity: 0.85,
        });
        const tubeMesh = new THREE.Mesh(tubeGeo, tubeMat);
        group.add(tubeMesh);

        // Animated packets along connector
        const packetGeo = new THREE.SphereGeometry(0.5, 16, 16);
        const packetMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const packet = new THREE.Mesh(packetGeo, packetMat);
        packet.position.copy(p1);
        group.add(packet);
      }
    } else if (activeMode === 'cluster_lattice') {
      // 3D Spatial Performance & Cluster Scatter (X: EPS, Y: Latency, Z: Cost)
      const clusters = [
        { name: 'Snowflake Analytics WH', eps: 145000, latency: 18, cost: 420, cluster: 'XL-Compute', health: '99.99%', x: -12, y: -4, z: 8, color: 0x06b6d4 },
        { name: 'BigQuery CDP Lake', eps: 210000, latency: 24, cost: 680, cluster: 'Multi-Region', health: '100%', x: 14, y: 3, z: 12, color: 0x6366f1 },
        { name: 'Databricks Delta Gold', eps: 98000, latency: 12, cost: 310, cluster: 'GPU-Accelerated', health: '99.95%', x: -5, y: -7, z: -10, color: 0x10b981 },
        { name: 'Redshift Serverless Mart', eps: 122000, latency: 32, cost: 490, cluster: 'Base-64', health: '99.98%', x: 10, y: 7, z: -8, color: 0xf59e0b },
        { name: 'Spark Driver Master-01', eps: 185000, latency: 15, cost: 550, cluster: 'Worker-Group-A', health: '100%', x: 0, y: 10, z: 0, color: 0xec4899 },
      ];

      // Bounding wireframe cube
      const boxGeo = new THREE.BoxGeometry(36, 26, 30);
      const boxEdges = new THREE.EdgesGeometry(boxGeo);
      const boxLine = new THREE.LineSegments(boxEdges, new THREE.LineBasicMaterial({ color: 0x334155, transparent: true, opacity: 0.5 }));
      group.add(boxLine);

      clusters.forEach((cl) => {
        const clusterGeo = new THREE.DodecahedronGeometry(2.2, 0);
        const clusterMat = new THREE.MeshStandardMaterial({
          color: cl.color,
          emissive: cl.color,
          emissiveIntensity: 0.5,
          roughness: 0.2,
          metalness: 0.9,
          wireframe: false,
        });
        const mesh = new THREE.Mesh(clusterGeo, clusterMat);
        mesh.position.set(cl.x, cl.y, cl.z);
        mesh.userData = { ...cl, isPulsing: true };
        group.add(mesh);
        interactiveListRef.current.push(mesh);

        // Guide line to floor
        const lineGeo = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(cl.x, cl.y, cl.z),
          new THREE.Vector3(cl.x, -10, cl.z)
        ]);
        const lineMat = new THREE.LineDashedMaterial({ color: cl.color, dashSize: 1, gapSize: 0.5, opacity: 0.5, transparent: true });
        const dropLine = new THREE.Line(lineGeo, lineMat);
        group.add(dropLine);
      });
    } else {
      // Geospatial 3D Globe with ingestion hubs and orbital arcs
      const globeRadius = 14;
      const globeGeo = new THREE.SphereGeometry(globeRadius, 36, 36);
      const globeMat = new THREE.MeshStandardMaterial({
        color: 0x0f172a,
        emissive: 0x1e1b4b,
        emissiveIntensity: 0.3,
        roughness: 0.7,
        metalness: 0.1,
        wireframe: true,
      });
      const globe = new THREE.Mesh(globeGeo, globeMat);
      group.add(globe);

      // Geo Hubs on Sphere
      const hubs = [
        { name: 'US-East (N. Virginia)', lat: 38.9, lon: -77.0, throughput: '64,200 eps', color: 0x38bdf8 },
        { name: 'US-West (Oregon)', lat: 45.5, lon: -122.6, throughput: '42,100 eps', color: 0x06b6d4 },
        { name: 'EU-Central (Frankfurt)', lat: 50.1, lon: 8.6, throughput: '51,800 eps', color: 0x818cf8 },
        { name: 'AP-South (Mumbai)', lat: 19.0, lon: 72.8, throughput: '38,900 eps', color: 0x34d399 },
        { name: 'AP-Northeast (Tokyo)', lat: 35.6, lon: 139.6, throughput: '44,200 eps', color: 0xf472b6 },
      ];

      const hubPositions: THREE.Vector3[] = [];

      hubs.forEach(h => {
        const phi = (90 - h.lat) * (Math.PI / 180);
        const theta = (h.lon + 180) * (Math.PI / 180);
        const x = - (globeRadius + 0.5) * Math.sin(phi) * Math.cos(theta);
        const z = (globeRadius + 0.5) * Math.sin(phi) * Math.sin(theta);
        const y = (globeRadius + 0.5) * Math.cos(phi);

        const pos = new THREE.Vector3(x, y, z);
        hubPositions.push(pos);

        const beaconGeo = new THREE.CylinderGeometry(0.2, 0.6, 2.8, 8);
        const beaconMat = new THREE.MeshBasicMaterial({ color: h.color });
        const beacon = new THREE.Mesh(beaconGeo, beaconMat);
        beacon.position.copy(pos);
        beacon.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), pos.clone().normalize());
        beacon.userData = { ...h, isPulsing: true };
        group.add(beacon);
        interactiveListRef.current.push(beacon);
      });

      // Connect hubs with high orbital 3D arcs
      for (let i = 0; i < hubPositions.length; i++) {
        const next = (i + 1) % hubPositions.length;
        const p1 = hubPositions[i];
        const p2 = hubPositions[next];
        const mid = p1.clone().add(p2).multiplyScalar(0.5).normalize().multiplyScalar(globeRadius + 6);
        const curve = new THREE.QuadraticBezierCurve3(p1, mid, p2);
        const arcGeo = new THREE.TubeGeometry(curve, 32, 0.15, 6, false);
        const arcMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.75 });
        const arc = new THREE.Mesh(arcGeo, arcMat);
        group.add(arc);
      }
    }
  };

  // Mouse & Touch Orbit handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    isDraggingRef.current = true;
    previousMousePositionRef.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDraggingRef.current) {
      // Raycasting hover check
      checkRaycast(e.clientX, e.clientY);
      return;
    }

    const deltaX = e.clientX - previousMousePositionRef.current.x;
    const deltaY = e.clientY - previousMousePositionRef.current.y;

    rotationEulerRef.current.y += deltaX * 0.008;
    rotationEulerRef.current.x += deltaY * 0.008;

    // Constrain pitch
    rotationEulerRef.current.x = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, rotationEulerRef.current.x));

    previousMousePositionRef.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerUp = () => {
    isDraggingRef.current = false;
  };

  const checkRaycast = (clientX: number, clientY: number) => {
    if (!canvasRef.current || !cameraRef.current || interactiveMeshesRef.current.length === 0) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1
    );

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, cameraRef.current);
    const intersects = raycaster.intersectObjects(interactiveMeshesRef.current);

    if (intersects.length > 0) {
      const hit = intersects[0].object as THREE.Mesh;
      if (hit.userData && hit.userData.name) {
        setSelectedItem(hit.userData);
        if (onNodeSelect) onNodeSelect(hit.userData);
      }
    }
  };

  const handleZoom = (direction: 'in' | 'out') => {
    if (!cameraRef.current) return;
    const delta = direction === 'in' ? -6 : 6;
    const newDist = Math.max(20, Math.min(80, cameraDistance + delta));
    setCameraDistance(newDist);
    cameraRef.current.position.set(0, 20, newDist);
    cameraRef.current.lookAt(0, 0, 0);
  };

  const handleResetCamera = () => {
    rotationEulerRef.current = { x: 0.3, y: 0.6 };
    setCameraDistance(45);
    if (cameraRef.current) {
      cameraRef.current.position.set(0, 20, 45);
      cameraRef.current.lookAt(0, 0, 0);
    }
  };

  return (
    <div className={`relative rounded-2xl overflow-hidden border border-indigo-900/60 bg-slate-950 text-white shadow-2xl ${className}`}>
      {/* 3D Canvas Viewport */}
      <div 
        ref={containerRef} 
        className="w-full h-[400px] sm:h-[460px] relative cursor-grab active:cursor-grabbing touch-none select-none"
      >
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          className="w-full h-full block"
        />

        {/* Top Floating Control Overlay */}
        <div className="absolute top-3 left-3 right-3 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
          {/* Header Title */}
          <div className="flex items-center gap-2 bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-700/60 pointer-events-auto">
            <span className="p-1 rounded-lg bg-cyan-500/20 text-cyan-400">
              <Boxes className="w-4 h-4" />
            </span>
            <div>
              <h4 className="text-xs font-bold text-white tracking-wide">{title}</h4>
              <span className="text-[10px] text-cyan-400 font-mono block">Three.js WebGL Spatial Engine</span>
            </div>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex items-center bg-slate-900/80 backdrop-blur-md p-1 rounded-xl border border-slate-700/60 pointer-events-auto overflow-x-auto max-w-full">
            <button
              onClick={() => setMode('topology')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap min-h-[32px] cursor-pointer ${
                mode === 'topology' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
            >
              <span className="flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5" />
                <span>Spatial Pipeline</span>
              </span>
            </button>
            <button
              onClick={() => setMode('cluster_lattice')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap min-h-[32px] cursor-pointer ${
                mode === 'cluster_lattice' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
            >
              <span className="flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5" />
                <span>3D Scatter Lattice</span>
              </span>
            </button>
            <button
              onClick={() => setMode('geospatial')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap min-h-[32px] cursor-pointer ${
                mode === 'geospatial' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
            >
              <span className="flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5" />
                <span>Global Arcs</span>
              </span>
            </button>
          </div>
        </div>

        {/* Selected Entity HUD Card (Inspector) */}
        {selectedItem && (
          <div className="absolute bottom-3 left-3 bg-slate-900/90 backdrop-blur-md p-3.5 rounded-xl border border-indigo-500/50 shadow-xl max-w-xs text-xs animate-in fade-in z-10 pointer-events-auto">
            <div className="flex items-center justify-between gap-3 mb-1.5">
              <span className="font-bold text-cyan-300 text-xs truncate">{selectedItem.name}</span>
              <button
                onClick={() => setSelectedItem(null)}
                className="text-slate-400 hover:text-white text-xs cursor-pointer"
              >
                &times;
              </button>
            </div>
            <div className="space-y-1 font-mono text-[11px] text-slate-300">
              {selectedItem.throughput && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Throughput:</span>
                  <span className="text-emerald-400 font-bold">{selectedItem.throughput}</span>
                </div>
              )}
              {selectedItem.latency !== undefined && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Latency:</span>
                  <span className="text-indigo-400 font-bold">{selectedItem.latency} ms</span>
                </div>
              )}
              {selectedItem.cost !== undefined && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Monthly Compute:</span>
                  <span className="text-amber-400 font-bold">${selectedItem.cost} USD</span>
                </div>
              )}
              {selectedItem.health && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Cluster SLA:</span>
                  <span className="text-cyan-400">{selectedItem.health}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Bottom Floating Control Dock (Thumb-Friendly) */}
        <div className="absolute bottom-3 right-3 flex items-center gap-1.5 bg-slate-900/80 backdrop-blur-md p-1.5 rounded-xl border border-slate-700/60 pointer-events-auto">
          <button
            onClick={() => setIsRotating(!isRotating)}
            title={isRotating ? 'Pause Rotation' : 'Resume 360 Spin'}
            className="p-2 min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-200 cursor-pointer"
          >
            {isRotating ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 text-cyan-400" />}
          </button>
          <button
            onClick={() => handleZoom('in')}
            title="Zoom In"
            className="p-2 min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-200 cursor-pointer"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => handleZoom('out')}
            title="Zoom Out"
            className="p-2 min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-200 cursor-pointer"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleResetCamera}
            title="Reset Camera Orientation"
            className="p-2 min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-200 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Footer Info & Spatial Legend */}
      <div className="p-3 bg-slate-900/90 border-t border-slate-800 text-[11px] text-slate-400 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Info className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
          <span>Click and drag to orbit in 3D coordinate space. Hover or tap nodes to inspect spatial telemetry.</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 font-mono text-[10px] text-slate-300">
            <span className="w-2 h-2 rounded-full bg-cyan-400"></span> Ingestion Stream
          </span>
          <span className="flex items-center gap-1 font-mono text-[10px] text-slate-300">
            <span className="w-2 h-2 rounded-full bg-indigo-400"></span> Spark Engine
          </span>
          <span className="flex items-center gap-1 font-mono text-[10px] text-slate-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span> Lakehouse Mart
          </span>
        </div>
      </div>
    </div>
  );
};
