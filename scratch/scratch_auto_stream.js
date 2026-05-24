import fs from 'fs';

const filePath = 'c:\\Users\\Usuario\\Desktop\\rasep-slp\\clave-1001-standalone\\src\\AdminPanel.jsx';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Change monitoringMode default state from null to 'camera'
content = content.replace(
  `  const [monitoringMode, setMonitoringMode] = useState(null);`,
  `  const [monitoringMode, setMonitoringMode] = useState('camera');`
);

// 2. Locate and replace the signaling useEffect with the 3-sec retry loop
const targetBlock = `  useEffect(() => {
    if (!selectedAlert || !monitoringMode) {
      if (pc) {
        pc.close();
        setPc(null);
      }
      setRemoteStream(null);
      return;
    }

    console.log("Iniciando conexión de señalización WebRTC para Alerta:", selectedAlert.id);
    const channel = supabase.channel('war-room-broadcast');
    
    let localPc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });

    let localRemoteStream = new MediaStream();
    setRemoteStream(localRemoteStream);

    localPc.ontrack = (event) => {
      console.log("Recibido track remoto de la víctima:", event.track);
      localRemoteStream.addTrack(event.track);
    };

    localPc.onicecandidate = (event) => {
      if (event.candidate) {
        channel.send({
          type: 'broadcast',
          event: \`RTC_ICE_CANDIDATE_FROM_DISPATCHER_\${selectedAlert.id}\`,
          payload: { candidate: event.candidate }
        });
      }
    };

    channel.on('broadcast', { event: \`RTC_OFFER_FROM_VICTIM_\${selectedAlert.id}\` }, async ({ payload }) => {
      console.log("Recibida oferta WebRTC de la víctima.");
      await localPc.setRemoteDescription(new RTCSessionDescription(payload.offer));
      const answer = await localPc.createAnswer();
      await localPc.setLocalDescription(answer);
      
      channel.send({
        type: 'broadcast',
        event: \`RTC_ANSWER_FROM_DISPATCHER_\${selectedAlert.id}\`,
        payload: { answer: localPc.localDescription }
      });
    });

    channel.on('broadcast', { event: \`RTC_ICE_CANDIDATE_FROM_VICTIM_\${selectedAlert.id}\` }, async ({ payload }) => {
      console.log("Recibido candidato ICE de la víctima.");
      await localPc.addIceCandidate(new RTCIceCandidate(payload.candidate));
    });

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log("Suscrito a canal de señalización. Notificando a la víctima...");
        setTimeout(() => {
          channel.send({
            type: 'broadcast',
            event: \`DISPATCHER_CONNECTED_\${selectedAlert.id}\`,
            payload: {}
          });
        }, 500);
      }
    });

    setPc(localPc);

    return () => {
      channel.unsubscribe();
      localPc.close();
    };
  }, [selectedAlert, monitoringMode]);`;

const replacementBlock = `  useEffect(() => {
    if (!selectedAlert || !monitoringMode) {
      if (pc) {
        pc.close();
        setPc(null);
      }
      setRemoteStream(null);
      return;
    }

    console.log("Iniciando conexión de señalización WebRTC para Alerta:", selectedAlert.id);
    const channel = supabase.channel('war-room-broadcast');
    
    let localPc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    });

    let localRemoteStream = new MediaStream();
    setRemoteStream(localRemoteStream);

    localPc.ontrack = (event) => {
      console.log("Recibido track remoto de la víctima:", event.track);
      localRemoteStream.addTrack(event.track);
      // Forzar que el stream actualice la referencia del DOM de video/audio
      setRemoteStream(new MediaStream(localRemoteStream.getTracks()));
    };

    localPc.onicecandidate = (event) => {
      if (event.candidate) {
        channel.send({
          type: 'broadcast',
          event: \`RTC_ICE_CANDIDATE_FROM_DISPATCHER_\${selectedAlert.id}\`,
          payload: { candidate: event.candidate }
        });
      }
    };

    channel.on('broadcast', { event: \`RTC_OFFER_FROM_VICTIM_\${selectedAlert.id}\` }, async ({ payload }) => {
      console.log("Recibida oferta WebRTC de la víctima.");
      try {
        await localPc.setRemoteDescription(new RTCSessionDescription(payload.offer));
        const answer = await localPc.createAnswer();
        await localPc.setLocalDescription(answer);
        
        channel.send({
          type: 'broadcast',
          event: \`RTC_ANSWER_FROM_DISPATCHER_\${selectedAlert.id}\`,
          payload: { answer: localPc.localDescription }
        });
      } catch (err) {
        console.error("Error al procesar oferta WebRTC:", err);
      }
    });

    channel.on('broadcast', { event: \`RTC_ICE_CANDIDATE_FROM_VICTIM_\${selectedAlert.id}\` }, async ({ payload }) => {
      console.log("Recibido candidato ICE de la víctima.");
      try {
        await localPc.addIceCandidate(new RTCIceCandidate(payload.candidate));
      } catch (err) {
        console.error("Error al agregar candidato ICE de la víctima:", err);
      }
    });

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log("Suscrito a canal de señalización. Notificando a la víctima...");
        setTimeout(() => {
          channel.send({
            type: 'broadcast',
            event: \`DISPATCHER_CONNECTED_\${selectedAlert.id}\`,
            payload: {}
          });
        }, 500);
      }
    });

    // PING DE RE-INTENTO CADA 3 SEGUNDOS (Garantiza handshake WebRTC en redes inestables o móviles)
    const retryInterval = setInterval(() => {
      if (localPc && localPc.iceConnectionState !== 'connected' && localPc.iceConnectionState !== 'completed') {
        console.log("Enviando ping de re-intento de señalización a la víctima...");
        channel.send({
          type: 'broadcast',
          event: \`DISPATCHER_CONNECTED_\${selectedAlert.id}\`,
          payload: {}
        });
      }
    }, 3000);

    setPc(localPc);

    return () => {
      clearInterval(retryInterval);
      channel.unsubscribe();
      localPc.close();
    };
  }, [selectedAlert, monitoringMode]);`;

content = content.replace(targetBlock, replacementBlock);

fs.writeFileSync(filePath, content, 'utf8');
console.log("¡Handshake WebRTC optimizado con reconexión automática de 3 segundos aplicado exitosamente!");
