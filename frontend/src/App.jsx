import './App.css';
import { useEffect, useRef, useState } from 'react';

function App() {
  const walls = [
  { x: 200, y: 150, width: 150, height: 15 },
  { x: 450, y: 250, width: 15, height: 120 },
  { x: 550, y: 100, width: 120, height: 15 }
];
  const canvasRef = useRef(null);
  const  socketRef = useRef(null);
  const positionRef = useRef({ x: 100, y: 100 });
  const avatarIdRef = useRef(null);

  const [avatars, setAvatars] = useState({});
  const [connected, setConnected] = useState(false);
  const [micEnabled, setMicEnabled] = useState(false);
const localStreamRef = useRef(null);

  // Connect to WebSocket server
  useEffect(() => {
    const socket = new WebSocket('ws://localhost:3001');
    socketRef.current = socket;

    socket.onopen = () => {
      setConnected(true);
      console.log('Connected to ProxiSpeak server');
    };

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === 'init') {
        avatarIdRef.current = data.id;

        if (data.avatars[data.id]) {
          positionRef.current = {
            x: data.avatars[data.id].x,
            y: data.avatars[data.id].y
          };
        }

        setAvatars(data.avatars);
      }

      if (data.type === 'movement') {
        setAvatars((previous) => ({
          ...previous,
          [data.id]: { x: data.x, y: data.y }
        }));

        if (data.id === avatarIdRef.current) {
          positionRef.current = { x: data.x, y: data.y };
        }
      }

      if (data.type === 'leave') {
        setAvatars((previous) => {
          const updated = { ...previous };
          delete updated[data.id];
          return updated;
        });
      }
    };

    socket.onclose = () => {
      setConnected(false);
    };

    socket.onerror = () => {
      console.log('WebSocket connection error');
    };

    return () => {
      socket.close();
    };
  }, []);

  // Move avatar using keyboard
  // Move avatar using keyboard and prevent walking through walls
  useEffect(() => {
    const handleKeyDown = (event) => {
      const key = event.key.toLowerCase();

      const allowedKeys = [
        'arrowup', 'arrowdown', 'arrowleft', 'arrowright',
        'w', 'a', 's', 'd'
      ];

      if (!allowedKeys.includes(key)) return;
      event.preventDefault();

      const step = 3;
      const nextPosition = { ...positionRef.current };

      if (key === 'arrowup' || key === 'w') nextPosition.y -= step;
      if (key === 'arrowdown' || key === 's') nextPosition.y += step;
      if (key === 'arrowleft' || key === 'a') nextPosition.x -= step;
      if (key === 'arrowright' || key === 'd') nextPosition.x += step;

      nextPosition.x = Math.max(15, Math.min(785, nextPosition.x));
      nextPosition.y = Math.max(15, Math.min(485, nextPosition.y));

      const radius = 12;

      const hitWall = walls.some((wall) => {
        const closestX = Math.max(
          wall.x,
          Math.min(nextPosition.x, wall.x + wall.width)
        );
        const closestY = Math.max(
          wall.y,
          Math.min(nextPosition.y, wall.y + wall.height)
        );

        const dx = nextPosition.x - closestX;
        const dy = nextPosition.y - closestY;

        return dx * dx + dy * dy < radius * radius;
      });

      if (hitWall) return;

      positionRef.current = nextPosition;

      const id = avatarIdRef.current;

      if (id) {
        setAvatars((previous) => ({
          ...previous,
          [id]: { ...nextPosition }
        }));
      }

      const socket = socketRef.current;

      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
          type: 'move',
          x: nextPosition.x,
          y: nextPosition.y
        }));
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Draw canvas world and avatars
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext('2d');

    context.clearRect(0, 0, canvas.width, canvas.height);

    context.fillStyle = '#f3f6fb';
    context.fillRect(0, 0, canvas.width, canvas.height);

    // Draw grid
    context.strokeStyle = '#dce3ed';
    context.lineWidth = 1;

    for (let x = 0; x <= canvas.width; x += 40) {
      context.beginPath();
      context.moveTo(x, 0);
      context.lineTo(x, canvas.height);
      context.stroke();
    }

    for (let y = 0; y <= canvas.height; y += 40) {
      context.beginPath();
      context.moveTo(0, y);
      context.lineTo(canvas.width, y);
      context.stroke();
    }
     // Draw walls
    context.fillStyle = '#64748b';

    // Wall 1
    context.fillRect(200, 150, 150, 15);

    // Wall 2
    context.fillRect(450, 250, 15, 120);

    // Wall 3
    context.fillRect(550, 100, 120, 15);
    // Draw 100px earshot circle around your avatar
const myAvatar = avatars[avatarIdRef.current];

if (myAvatar) {
  context.beginPath();
  context.arc(myAvatar.x, myAvatar.y, 100, 0, Math.PI * 2);
  context.strokeStyle = 'rgba(22, 163, 74, 0.5)';
  context.lineWidth = 2;
  context.stroke();
}
    // Draw avatars
    // Draw avatars


Object.entries(avatars).forEach(([id, avatar]) => {
  const isMine = id === avatarIdRef.current;

  const distance = myAvatar
    ? Math.sqrt(
        (avatar.x - myAvatar.x) ** 2 +
        (avatar.y - myAvatar.y) ** 2
      )
    : Infinity;

  const isNearby = !isMine && distance <= 100;
// Speaking indicator ring
if (isMine && micEnabled) {
  context.beginPath();
  context.arc(avatar.x, avatar.y, 17, 0, Math.PI * 2);
  context.strokeStyle = '#f59e0b';
  context.lineWidth = 3;
  context.stroke();
}

  context.beginPath();
  context.arc(avatar.x, avatar.y, 12, 0, Math.PI * 2);

  context.fillStyle = isMine
    ? '#16a34a'
    : isNearby
      ? '#16a34a'
      : '#2563eb';

  context.fill();

  context.fillStyle = '#111827';
  context.font = '12px Arial';
  context.textAlign = 'center';

  context.fillText(
    isMine ? 'You' : 'Avatar',
    avatar.x,
    avatar.y + 27
  );
});
 }, [avatars, micEnabled]);

  const myPosition = avatars[avatarIdRef.current] || positionRef.current;
  const nearbyUsers = Object.entries(avatars)
  .filter(([id, avatar]) => {
    if (id === avatarIdRef.current) return false;

    const distance = Math.sqrt(
      (avatar.x - myPosition.x) ** 2 +
      (avatar.y - myPosition.y) ** 2
    );

    return distance <= 100;
  });
  const toggleMic = async () => {
  if (micEnabled) {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((track) => {
        track.stop();
      });
      localStreamRef.current = null;
    }
    setMicEnabled(false);
    return;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true
    });

    localStreamRef.current = stream;
    setMicEnabled(true);
  } catch (error) {
    alert('Microphone permission denied or unavailable.');
  }
};

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>ProxiSpeak</h1>
      <button onClick={toggleMic}>
  {micEnabled ? 'Mute Microphone' : 'Enable Microphone'}
</button>

      <p>
        Server status:{' '}
        <strong style={{ color: connected ? 'green' : 'red' }}>
          {connected ? 'Connected' : 'Connecting...'}
        </strong>
      </p>

      <p>
        X: {myPosition.x} | Y: {myPosition.y}
      </p>
      <h3>Users in Earshot (100px)</h3>

{nearbyUsers.length === 0 ? (
  <p>No users nearby</p>
) : (
  <ul>
    {nearbyUsers.map(([id]) => (
      <li key={id}>Avatar {id}</li>
    ))}
  </ul>
)}

      <p>Use Arrow Keys or W, A, S, D to move your avatar.</p>

      <canvas
        ref={canvasRef}
        width={800}
        height={500}
        tabIndex={0}
        style={{
          maxWidth: '100%',
          border: '2px solid #334155',
          borderRadius: '8px',
          display: 'block'
        }}
      />
    </div>
  );
}

export default App;