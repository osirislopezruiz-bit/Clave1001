import React, { useState, useEffect, useRef, useCallback } from 'react';
import OrgModal from './components/OrgModal';
import StaffModal from './components/StaffModal';
import CredentialsModal from './components/CredentialsModal';
import './styles/adminPanel.css';
import { Shield, AlertTriangle, MapPin, Clock, CheckCircle, Phone, Navigation, LogOut, Users, Activity, Radio, Database, Lock, Plus, Monitor, Camera, BellRing, Mic, Eye, Zap, Video } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

import { supabase } from './lib/supabase';
import {
  EVIDENCIA_MAX_SEC,
  getRecorderOptions,
  downloadEvidenceBlob,
  sha256Blob,
  formatEvidenceDuration,
  tryUpdateAlertaEvidencia,
  persistEvidenceWithBridge,
  getBridgeConfig,
} from './lib/evidencia';

// MapController to handle smooth animated flying/panning without remounting the map
function MapController({ center, zoom, recenterCount }) {
  const map = useMap();
  const lat = center?.[0];
  const lng = center?.[1];
  useEffect(() => {
    if (lat && lng) {
      map.flyTo([lat, lng], zoom || 16, { duration: 1.2 });
    }
  }, [lat, lng, zoom, map, recenterCount]);
  return null;
}


/**
 * ULTRA-PREMIUM TACTICAL WAR ROOM v3
 * CLAVE 1001 Enterprise - Arché Holding Labs
 */
export default function WarRoom({ userProfile }) {
  const [view, setView] = useState('dashboard'); 
  const [alerts, setAlerts] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [orgs, setOrgs] = useState([]);
  const [showOrgModal, setShowOrgModal] = useState(false);
  const [newOrg, setNewOrg] = useState({
    nombre: '',
    color: '#0a0f1e', // Color de fondo
    logo: '',
    plan: 'enterprise',
    limite: 100,
    storage_mode: 'manual_download',
    bridge_url: '',
    bridge_api_key: '',
    tipo_letra: 'Inter',
    color_secundario: '#ffffff', // Color de texto
    color_acento: '#ef4444',
    slogan: '',
    domicilio: '',
    redes_sociales: '{}',
  });
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState(null);
  const [isCreatingOrg, setIsCreatingOrg] = useState(false);
  const [showCredentialsModal, setShowCredentialsModal] = useState(false);
  const [generatedCredentials, setGeneratedCredentials] = useState(null);
  const [isGeneratingAdmin, setIsGeneratingAdmin] = useState(false);
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [newStaff, setNewStaff] = useState({ nombre_completo: '', rol: 'franquicia_representante' });
  const [isCreatingStaff, setIsCreatingStaff] = useState(false);
  const [masterOverrideOrg, setMasterOverrideOrg] = useState(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewOrg, setPreviewOrg] = useState(null);
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [stats, setStats] = useState({ total: 0, active: 0, resolved: 0 });
  const [spokenAlerts, setSpokenAlerts] = useState(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [incidentLogs, setIncidentLogs] = useState([]);
  const [recenterCount, setRecenterCount] = useState(0);
  const [locationHistory, setLocationHistory] = useState([]);
  const [recordedVideoUrl, setRecordedVideoUrl] = useState(null);
  const [monitoringMode, setMonitoringMode] = useState('camera');
  const [adminStream, setAdminStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [pc, setPc] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [recordedChunks, setRecordedChunks] = useState([]);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [showEvidenceModal, setShowEvidenceModal] = useState(false);
  const [evidenceFingerprint, setEvidenceFingerprint] = useState('');
  const [isMaximizedVideo, setIsMaximizedVideo] = useState(false);
  const [autoRecording, setAutoRecording] = useState(false);
  const [lastSaveUsedBridge, setLastSaveUsedBridge] = useState(false);

  const mediaRecorderRef = useRef(null);
  const maxRecordTimerRef = useRef(null);
  const autoRecordAlertIdRef = useRef(null);
  const recordingSecondsRef = useRef(0);

  // NUEVAS VARIABLES DE ESTADO PARA LAS CARACTERÍSTICAS MEJORADAS
  const [alertFilter, setAlertFilter] = useState('activas'); 
  const [showAnalyticsModal, setShowAnalyticsModal] = useState(false);
  const [selectedEvidence, setSelectedEvidence] = useState(null);

  // IoT / CCTV & Flota
  const [cctvStreams, setCctvStreams] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [showAddCam, setShowAddCam] = useState(false);
  const [showAddVehicle, setShowAddVehicle] = useState(false);
  const [newCam, setNewCam] = useState({ nombre: '', url: '', ubicacion: '' });
  const [newVehicle, setNewVehicle] = useState({ nombre: '', placa: '', operador: '' });

  const addCam = () => {
    if (!newCam.nombre || !newCam.url) return;
    setCctvStreams(prev => [...prev, { ...newCam, id: Date.now(), estado: 'offline' }]);
    setNewCam({ nombre: '', url: '', ubicacion: '' });
    setShowAddCam(false);
  };
  const removeCam = (id) => setCctvStreams(prev => prev.filter(c => c.id !== id));

  const addVehicle = () => {
    if (!newVehicle.nombre || !newVehicle.placa) return;
    setVehicles(prev => [...prev, { ...newVehicle, id: Date.now(), estado: 'sin_señal' }]);
    setNewVehicle({ nombre: '', placa: '', operador: '' });
    setShowAddVehicle(false);
  };
  const removeVehicle = (id) => setVehicles(prev => prev.filter(v => v.id !== id));

  const iotFieldStyle = { width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', padding: '10px 14px', borderRadius: '10px', color: '#fff', fontSize: '12px', outline: 'none', boxSizing: 'border-box' };
  const iotLabelStyle = { fontSize: '9px', color: 'var(--gold)', fontWeight: '900', letterSpacing: '1px', textTransform: 'uppercase', display: 'block', marginBottom: '5px' };
  const [evidences, setEvidences] = useState(() => {
    try {
      const saved = localStorage.getItem('clave1001_evidences');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Depurar evidencias con antigüedad mayor a 48 horas (48 * 60 * 60 * 1000 milisegundos)
        const fortyEightHoursAgo = Date.now() - 48 * 60 * 60 * 1000;
        const validEvidences = parsed.filter(ev => {
          const evTime = new Date(ev.date).getTime();
          return evTime > fortyEightHoursAgo;
        });
        localStorage.setItem('clave1001_evidences', JSON.stringify(validEvidences));
        return validEvidences;
      }
    } catch (e) {}
    return [];
  });

  useEffect(() => {
    try {
      localStorage.setItem('clave1001_evidences', JSON.stringify(evidences));
    } catch (e) {}
  }, [evidences]);
  const [showDispatchModal, setShowDispatchModal] = useState(false);
  const [dispatchedUnits, setDispatchedUnits] = useState({});
  const [erexAgents, setErexAgents] = useState({}); // id -> agentData

  useEffect(() => {
    fetchInitialData();
    
    // Canal en tiempo real por WebSockets (Supabase Broadcast & Postgres Changes)
    const channel = supabase
      .channel('war-room-broadcast', { config: { broadcast: { self: true } } })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'alertas_crisis' }, () => fetchAlerts())
      .on('broadcast', { event: 'INCIDENT_TRIGGERED' }, (msg) => {
        console.log("¡BROADCAST INCIDENTE RECIBIDO AL INSTANTE!", msg);
        const alertData = msg.payload;
        if (alertData && alertData.id) {
          // Agregar la alerta de forma optimista e instantánea al inicio de la lista, evitando duplicados
          setAlerts(prev => {
            if (prev.some(a => a.id === alertData.id)) return prev;
            // Si hay una alerta optimista previa temporal, la reemplazamos
            const filtered = prev.filter(a => !String(a.id).startsWith('pending-'));
            return [alertData, ...filtered];
          });
          // Auto-enfocar si está activa
          if (alertData.estado === 'activa') {
            setSelectedAlert(alertData);
            // Delay speak to avoid audio conflicts
            setTimeout(() => {
              const name = alertData.usuario?.nombre_completo || 'Usuario de auxilio';
              const orgName = alertData.usuario?.organizacion?.nombre || 'Clave 1001';
              const utterance = new SpeechSynthesisUtterance(`¡Alerta crítica de auxilio activada por ${name}, de ${orgName}!`);
              utterance.lang = 'es-MX';
              utterance.rate = 0.95;
              window.speechSynthesis.speak(utterance);
            }, 500);
          }
        }
        fetchAlerts();
        new Audio('https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3').play().catch(() => {});
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'usuarios_clave' }, () => fetchUsers())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'organizaciones' }, () => fetchOrgs())
      .subscribe();

    // Canal de Tracking de Patrullas EREX
    const erexChannel = supabase.channel('erex-tracking')
      .on('broadcast', { event: 'LOCATION_UPDATE_EREX' }, (msg) => {
        if (msg.payload && msg.payload.id) {
          setErexAgents(prev => ({
            ...prev,
            [msg.payload.id]: msg.payload
          }));
        }
      })
      .on('broadcast', { event: 'EREX_OFF_DUTY' }, (msg) => {
        if (msg.payload && msg.payload.id) {
          setErexAgents(prev => {
            const next = { ...prev };
            delete next[msg.payload.id];
            return next;
          });
        }
      })
      .subscribe();

    return () => { 
      supabase.removeChannel(channel); 
      supabase.removeChannel(erexChannel);
    };
  }, []);

  useEffect(() => {
    const active = alerts.filter(a => a.estado === 'activa').length;
    const resolved = alerts.filter(a => a.estado === 'resuelta').length;
    setStats({ total: alerts.length, active, resolved });
  }, [alerts]);


  const speakAlert = (alert) => {
    if (!alert || !alert.usuario) return;
    const alertId = alert.id;
    setSpokenAlerts(prev => {
      if (prev.has(alertId)) return prev;
      const next = new Set(prev);
      next.add(alertId);
      
      const nombre = alert.usuario.nombre_completo || 'Usuario de auxilio';
      const organizacion = alert.usuario.organizacion?.nombre || 'Clave 1001';
      
      // Browser Speech Synthesis
      const text = `¡Alerta crítica de auxilio activada por ${nombre}, de ${organizacion}!`;
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'es-MX';
      utterance.rate = 0.95;
      window.speechSynthesis.speak(utterance);
      
      return next;
    });
  };

  // Auto-focus on active emergency if none or different selected
  useEffect(() => {
    const active = alerts.filter(a => a.estado === 'activa');
    if (active.length > 0) {
      const alreadySelected = selectedAlert && active.some(a => a.id === selectedAlert.id);
      if (!alreadySelected) {
        setSelectedAlert(active[0]);
      }
    }
  }, [alerts, selectedAlert]);

  // Dynamic tactical incident logs feed
  useEffect(() => {
    if (selectedAlert) {
      const logs = [
        { time: new Date(selectedAlert.fecha_inicio).toLocaleTimeString(), text: '🔴 ALERTA DE AUXILIO INICIADA POR DISPOSITIVO' },
        { time: new Date().toLocaleTimeString(), text: '📡 TRANSMISIÓN DE COORDENADAS GPS ACTIVA' }
      ];
      if (monitoringMode === 'camera') {
        logs.push({ time: new Date().toLocaleTimeString(), text: '🎥 CÁMARA REMOTA ENLACE EN VIVO ACTIVO' });
      } else if (monitoringMode === 'mic') {
        logs.push({ time: new Date().toLocaleTimeString(), text: '🎙️ ESCUCHA REMOTA DE AUDIO ACTIVA' });
      }
      if (isRecording) {
        logs.push({ time: new Date().toLocaleTimeString(), text: '💾 GRABANDO EVIDENCIA Y ENCRIPTANDO HASH SHA-256' });
      }
      setIncidentLogs(logs);
    } else {
      setIncidentLogs([]);
    }
  }, [selectedAlert, monitoringMode, isRecording]);

  const fetchInitialData = async () => {
    setLoading(true);
    await Promise.all([fetchAlerts(), fetchUsers(), fetchOrgs()]);
    setLoading(false);
  };

  const fetchAlerts = async () => {
    try {
      let query = supabase
        .from('alertas_crisis')
        .select(`
          *,
          usuario:usuarios_clave (
            id,
            nombre_completo,
            telefono,
            organizacion_id,
            organización_id,
            organizacion:organizaciones ( id, nombre, color_primario, logo_url )
          )
        `)
        .order('fecha_inicio', { ascending: false });

      // Filtrado por franquicia
      if (userProfile && !['admin', 'operador'].includes(userProfile.rol)) {
         query = query.eq('organizacion_id', userProfile.organizacion_id || userProfile['organización_id']);
      }

      let { data, error } = await query;

      if (error) {
        let fallbackQuery = supabase.from('alertas_crisis').select('*').order('fecha_inicio', { ascending: false });
        if (userProfile && !['admin', 'operador'].includes(userProfile.rol)) {
           fallbackQuery = fallbackQuery.eq('organizacion_id', userProfile.organizacion_id || userProfile['organización_id']);
        }
        const { data: simpleData } = await fallbackQuery;
        data = simpleData;
      }

      if (data) {
        const enriched = await Promise.all(data.map(async (alert) => {
          if (!alert.usuario && alert.usuario_id) {
            const { data: uData } = await supabase.from('usuarios_clave').select('*').eq('id', alert.usuario_id).single();
            alert.usuario = uData;
          }
          return alert;
        }));
        setAlerts(enriched);

        // Reconstruir dispatchedUnits desde comentarios_operador de la base de datos
        const units = {};
        enriched.forEach(a => {
          if (a.estado === 'en_camino' && a.comentarios_operador && a.comentarios_operador.startsWith('[DESPACHO] ')) {
            units[a.id] = a.comentarios_operador.replace('[DESPACHO] ', '');
          }
        });
        setDispatchedUnits(prev => ({ ...prev, ...units }));
        
        // Auto-announce new active alert
        const active = enriched.filter(a => a.estado === 'activa');
        if (active.length > 0) {
          const latest = active[0];
          // Delay speak slightly to ensure state and DOM is ready
          setTimeout(() => {
            speakAlert(latest);
          }, 800);
        }
      }
    } catch (e) { console.error(e); }
  };

  const fetchUsers = async () => {
    let query = supabase.from('usuarios_clave').select('*');
    if (userProfile && !['admin', 'operador'].includes(userProfile.rol)) {
      query = query.eq('organizacion_id', userProfile.organizacion_id || userProfile['organización_id']);
    }
    const { data } = await query;
    setUsers(data || []);
  };

  const fetchOrgs = async () => {
    let query = supabase.from('organizaciones').select('*').order('created_at', { ascending: false });
    if (userProfile && !['admin', 'operador'].includes(userProfile.rol)) {
      query = query.eq('id', userProfile.organizacion_id || userProfile['organización_id']);
    }
    const { data } = await query;
    setOrgs(data || []);
  };

  useEffect(() => {
    if (!selectedAlert) {
      setLocationHistory([]);
      return;
    }

    // Si la alerta está resuelta (desactivada), generamos una ruta histórica espectacular y de simulación táctica
    if (selectedAlert.estado === 'resuelta') {
      const startLat = selectedAlert.latitud;
      const startLng = selectedAlert.longitud;
      const path = [
        [startLat, startLng],
        [startLat + 0.0012, startLng - 0.0018],
        [startLat + 0.0028, startLng - 0.0008],
        [startLat + 0.0039, startLng + 0.0012]
      ];
      setLocationHistory(path);
      return;
    }

    // Si está activa, empezamos desde las coordenadas iniciales y escuchamos cambios en vivo
    setLocationHistory([[selectedAlert.latitud, selectedAlert.longitud]]);

    console.log("Iniciando escucha de geolocalización en tiempo real para:", selectedAlert.id);
    const channel = supabase.channel('war-room-broadcast');

    channel.on('broadcast', { event: `LOCATION_UPDATE_${selectedAlert.id}` }, ({ payload }) => {
      console.log("Recibida actualización de ubicación de víctima:", payload);
      
      const newCoord = [payload.latitud, payload.longitud];
      setLocationHistory(prev => {
        const last = prev[prev.length - 1];
        if (last && last[0] === newCoord[0] && last[1] === newCoord[1]) {
          return prev;
        }
        return [...prev, newCoord];
      });

      setSelectedAlert(prev => {
        if (prev && prev.id === selectedAlert.id) {
          return { ...prev, latitud: payload.latitud, longitud: payload.longitud };
        }
        return prev;
      });

      setAlerts(prevAlerts => prevAlerts.map(a => {
        if (a.id === selectedAlert.id) {
          return { ...a, latitud: payload.latitud, longitud: payload.longitud };
        }
        return a;
      }));
    });

    channel.subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [selectedAlert?.id]);

  useEffect(() => {
    let interval;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingSeconds((s) => {
          const next = s + 1;
          recordingSecondsRef.current = next;
          return next;
        });
      }, 1000);
    } else {
      recordingSecondsRef.current = 0;
      setRecordingSeconds(0);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  const clearMaxRecordTimer = () => {
    if (maxRecordTimerRef.current) {
      clearTimeout(maxRecordTimerRef.current);
      maxRecordTimerRef.current = null;
    }
  };

  const finalizeDispatcherEvidence = useCallback(async (blob, seconds, wasAuto) => {
    const fingerprint = (await sha256Blob(blob)) ||
      Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('').toUpperCase();
    setEvidenceFingerprint(fingerprint);

    const victimSlug = (selectedAlert?.usuario?.nombre_completo || 'usuario').replace(/\s+/g, '_');
    const dateSlug = new Date().toISOString().slice(0, 10);
    const filename = `EVIDENCIA_CLAVE1001_${victimSlug}_${dateSlug}.webm`;
    const org = selectedAlert?.usuario?.organizacion;
    const bridgeCfg = getBridgeConfig(org);
    let url = null;
    let bridgeOk = false;

    if (bridgeCfg && selectedAlert?.id && !String(selectedAlert.id).startsWith('pending-')) {
      const { bridge, result } = await persistEvidenceWithBridge({
        blob,
        alertId: selectedAlert.id,
        userProfile: { organization: org, nombre_completo: selectedAlert.usuario?.nombre_completo },
        duracionSeg: seconds,
        origen: wasAuto ? 'war-room-auto' : 'war-room-manual',
      });
      bridgeOk = bridge;
      if (result?.hash) setEvidenceFingerprint(result.hash);
    }

    if (!bridgeOk) {
      url = downloadEvidenceBlob(blob, filename);
      if (selectedAlert?.id) {
        tryUpdateAlertaEvidencia(selectedAlert.id, {
          evidencia_estado: 'descargada_operador',
          evidencia_duracion_seg: seconds,
          evidencia_hash: fingerprint,
        });
      }
    }

    const newEvidence = {
      id: `ev-${Date.now()}`,
      victimName: selectedAlert?.usuario?.nombre_completo || 'Usuario de auxilio',
      orgName: org?.nombre || 'Clave 1001 Enterprise',
      date: new Date().toISOString(),
      duration: `${seconds}s`,
      fingerprint,
      url,
      bridge: bridgeOk,
      source: wasAuto ? 'war-room-auto' : 'war-room-manual',
    };
    setEvidences((prev) => [newEvidence, ...prev]);
    setRecordedVideoUrl(url);
    setLastSaveUsedBridge(bridgeOk);
    setShowEvidenceModal(true);
  }, [selectedAlert]);

  const stopRecording = useCallback(() => {
    clearMaxRecordTimer();
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      recorder.stop();
    }
    setIsRecording(false);
    setAutoRecording(false);
    mediaRecorderRef.current = null;
    setMediaRecorder(null);
  }, []);

  const startRecording = useCallback((isAuto = false) => {
    if (!remoteStream || remoteStream.getTracks().length === 0) {
      if (!isAuto) alert('No hay señal activa de audio o video para grabar.');
      return;
    }
    if (mediaRecorderRef.current?.state === 'recording') return;

    try {
      const recorder = new MediaRecorder(remoteStream, getRecorderOptions());
      const chunks = [];

      recorder.ondataavailable = (e) => {
        if (e.data?.size > 0) chunks.push(e.data);
      };

      recorder.onstop = async () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        const seconds = recordingSecondsRef.current;
        await finalizeDispatcherEvidence(blob, seconds, isAuto);
        mediaRecorderRef.current = null;
        setMediaRecorder(null);
        setIsRecording(false);
        setAutoRecording(false);
        clearMaxRecordTimer();
      };

      recorder.start(1000);
      mediaRecorderRef.current = recorder;
      setMediaRecorder(recorder);
      recordingSecondsRef.current = 0;
      setRecordingSeconds(0);
      setIsRecording(true);
      setAutoRecording(isAuto);

      clearMaxRecordTimer();
      maxRecordTimerRef.current = setTimeout(() => stopRecording(), EVIDENCIA_MAX_SEC * 1000);
    } catch (err) {
      if (!isAuto) alert('Error al iniciar grabación: ' + err.message);
      else console.error('Auto-grabación:', err);
    }
  }, [remoteStream, finalizeDispatcherEvidence, stopRecording]);

  useEffect(() => {
    if (!monitoringMode || !selectedAlert || selectedAlert.estado !== 'activa') {
      autoRecordAlertIdRef.current = null;
      return;
    }
    if (!remoteStream?.getTracks?.().length) return;
    const liveTracks = remoteStream.getTracks().filter((t) => t.readyState === 'live');
    if (liveTracks.length === 0) return;
    if (isRecording || autoRecordAlertIdRef.current === selectedAlert.id) return;

    autoRecordAlertIdRef.current = selectedAlert.id;
    startRecording(true);
  }, [remoteStream, monitoringMode, selectedAlert?.id, selectedAlert?.estado, isRecording, startRecording]);

  useEffect(() => {
    return () => {
      clearMaxRecordTimer();
      if (mediaRecorderRef.current?.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  useEffect(() => {
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
          event: `RTC_ICE_CANDIDATE_FROM_DISPATCHER_${selectedAlert.id}`,
          payload: { candidate: event.candidate }
        });
      }
    };

    channel.on('broadcast', { event: `RTC_OFFER_FROM_VICTIM_${selectedAlert.id}` }, async ({ payload }) => {
      console.log("Recibida oferta WebRTC de la víctima.");
      try {
        await localPc.setRemoteDescription(new RTCSessionDescription(payload.offer));
        const answer = await localPc.createAnswer();
        await localPc.setLocalDescription(answer);
        
        channel.send({
          type: 'broadcast',
          event: `RTC_ANSWER_FROM_DISPATCHER_${selectedAlert.id}`,
          payload: { answer: localPc.localDescription }
        });
      } catch (err) {
        console.error("Error al procesar oferta WebRTC:", err);
      }
    });

    channel.on('broadcast', { event: `RTC_ICE_CANDIDATE_FROM_VICTIM_${selectedAlert.id}` }, async ({ payload }) => {
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
            event: `DISPATCHER_CONNECTED_${selectedAlert.id}`,
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
          event: `DISPATCHER_CONNECTED_${selectedAlert.id}`,
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
  }, [selectedAlert, monitoringMode]);

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingLogo(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const { data, error } = await supabase.storage.from('logos').upload(fileName, file);
      if (error) {
        alert('Error al subir el logo: ' + error.message);
      } else {
        const { data: publicData } = supabase.storage.from('logos').getPublicUrl(fileName);
        setNewOrg({ ...newOrg, logo: publicData.publicUrl });
      }
    } catch (err) {
      console.error(err);
      alert('Error inesperado al subir el archivo.');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleGenerateAdmin = async (org) => {
    if (!org) return;
    setIsGeneratingAdmin(true);
    try {
      const adminName = org.nombre.trim().toLowerCase().replace(/[^a-z0-9]/g, '_') + '_admin';
      const res = await fetch('/api/create-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organization_id: org.id,
          organization_name: org.nombre,
          admin_name: adminName,
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Error al generar admin');
      setGeneratedCredentials(result.credentials);
      setShowCredentialsModal(true);
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setIsGeneratingAdmin(false);
    }
  };

  const handleMasterOverride = async (org) => {
    setMasterOverrideOrg(org);
    // Store override in session so the app knows we're impersonating
    sessionStorage.setItem('masterOverrideOrg', JSON.stringify(org));
    alert(`✅ Sesión de "${org.nombre}" abierta. Ve a la app de usuarios para verla desde su perspectiva.`);
  };

  const handleSaveOrg = async () => {
    if (!newOrg.nombre.trim()) return;
    setIsCreatingOrg(true);
    try {
      const payload = {
        nombre: newOrg.nombre.trim(),
        color_primario: newOrg.color,
        logo_url: newOrg.logo || null,
        storage_mode: newOrg.storage_mode || 'manual_download',
        bridge_url: newOrg.bridge_url?.trim() || null,
        bridge_api_key: newOrg.bridge_api_key?.trim() || null,
        tipo_letra: newOrg.tipo_letra || 'Inter',
        color_secundario: newOrg.color_secundario || null,
        color_acento: newOrg.color_acento || null,
        slogan: newOrg.slogan || null,
        domicilio: newOrg.domicilio || null,
        redes_sociales: newOrg.redes_sociales ? JSON.parse(newOrg.redes_sociales) : {},
      };
      if (selectedOrg) await supabase.from('organizaciones').update(payload).eq('id', selectedOrg.id);
      else await supabase.from('organizaciones').insert([payload]);
      setShowOrgModal(false);
      setSelectedOrg(null);
      setNewOrg({ nombre: '', color: '#0a0f1e', logo: '', tipo_letra: 'Inter', color_secundario: '#ffffff', color_acento: '#ef4444', slogan: '', domicilio: '', redes_sociales: '{}' });
      fetchOrgs();
    } catch (e) { console.error(e); }
    finally { setIsCreatingOrg(false); }
  };

  const handleSaveStaff = async () => {
    if (!newStaff.nombre_completo.trim()) return;
    setIsCreatingStaff(true);
    try {
      const orgId = userProfile?.organizacion_id || userProfile?.['organización_id'];
      if (!orgId && !['admin', 'operador'].includes(userProfile?.rol)) {
        throw new Error("No tienes una organización asignada.");
      }
      // Si es superadmin, podría asignar a cualquier org, pero por ahora lo asocia al que seleccione o al suyo.
      // Para simplificar, requerimos orgId.
      const targetOrgId = orgId || (selectedOrg ? selectedOrg.id : null);
      if (!targetOrgId) {
         alert("Debe seleccionar una organización primero (si es superadmin).");
         setIsCreatingStaff(false);
         return;
      }
      const res = await fetch('/api/create-franchise-staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organization_id: targetOrgId,
          organization_name: userProfile?.organization?.nombre || 'Franquicia',
          nombre_completo: newStaff.nombre_completo.trim(),
          rol: newStaff.rol,
          creado_por: userProfile?.id
        })
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Error al crear personal');
      setGeneratedCredentials(result.credentials);
      setShowCredentialsModal(true);
      setShowStaffModal(false);
      setNewStaff({ nombre_completo: '', rol: 'franquicia_representante' });
      fetchUsers();
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setIsCreatingStaff(false);
    }
  };

  const handleResolve = async (id) => {
    await supabase.from('alertas_crisis').update({ estado: 'resuelta', fecha_fin: new Date().toISOString() }).eq('id', id);
    setSelectedAlert(null);
    fetchAlerts();
  };

  const handleDispatchUnit = async (alertId, unitName, agentId = null) => {
    try {
      const { error } = await supabase
        .from('alertas_crisis')
        .update({ 
          estado: 'en_camino', 
          comentarios_operador: `[DESPACHO] ${unitName}`,
          erex_asignado_id: agentId
        })
        .eq('id', alertId);
      
      if (error) {
        console.error("Error al actualizar despacho en DB:", error);
        alert("Error al actualizar el despacho: " + error.message);
      } else {
        setDispatchedUnits(prev => ({ ...prev, [alertId]: unitName }));
        setSelectedAlert(prev => prev && prev.id === alertId ? { ...prev, estado: 'en_camino', comentarios_operador: `[DESPACHO] ${unitName}` } : prev);
        
        // Broadcast de despacho al instante por canal WebSockets
        supabase.channel('war-room-broadcast').send({
          type: 'broadcast',
          event: `DISPATCH_UPDATE_${alertId}`,
          payload: { estado: 'en_camino', comentarios_operador: `[DESPACHO] ${unitName}` }
        });

        fetchAlerts();
      }
    } catch (e) {
      console.error("Error en handleDispatchUnit:", e);
    }
  };

  if (loading) return (
    <div className="tactical-loader">
      <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2, ease: "linear" }} className="loader-ring" />
      <img src="/logo.png" style={{ width: 48, height: 48, objectFit: 'contain' }} alt="Logo" className="loader-shield" />
      <p>ARCHÉ HOLDING LABS — SECURE LINKING...</p>
    </div>
  );

  return (
    <div className="war-room-container">
      {/* SIDEBAR GLASSMORPHISM */}
      {view !== 'alerts' && (
      <aside className="tactical-sidebar">
        <div className="sidebar-brand">
          <div className="brand-glow" />
          <img src="/logo.png" alt="Logo" className="brand-logo" style={{ width: 32, height: 32, objectFit: 'contain' }} />
          <div className="brand-text">
            <span className="brand-name">CLAVE 1001</span>
            <span className="brand-tag">COMMAND CENTER</span>
          </div>
        </div>

        <nav className="tactical-nav">
          <button className={view === 'dashboard' ? 'active' : ''} onClick={() => setView('dashboard')}>
            <Zap size={18} /> OPERACIONES
          </button>
          <button className={view === 'alerts' ? 'active' : ''} onClick={() => setView('alerts')}>
            <Activity size={18} /> WAR ROOM {stats.active > 0 && <span className="active-badge">{stats.active}</span>}
          </button>
          {(!userProfile || ['admin', 'operador'].includes(userProfile.rol)) && (
            <>
              <button className={view === 'orgs' ? 'active' : ''} onClick={() => setView('orgs')}>
                <Users size={18} /> FRANQUICIAS
              </button>
              <button className={view === 'iot' ? 'active' : ''} onClick={() => setView('iot')}>
                <Video size={18} /> CÁMARAS Y CCTV
              </button>
            </>
          )}
          {userProfile && ['admin', 'operador', 'franquicia_admin', 'franquicia_gerente'].includes(userProfile.rol) && (
            <button className={view === 'staff' ? 'active' : ''} onClick={() => setView('staff')}>
              <Shield size={18} /> PERSONAL
            </button>
          )}
          <button className={view === 'evidences' ? 'active' : ''} onClick={() => setView('evidences')}>
            <Database size={18} /> EVIDENCIAS
          </button>
        </nav>

        <div className="sidebar-footer">
          <div className="sys-status"><div className="dot-green" /> SYSTEM SECURE</div>
          <button onClick={() => supabase.auth.signOut()} className="btn-logout"><LogOut size={16} /> LOGOUT</button>
        </div>
      </aside>
      )}

      <main className={`tactical-main ${view === 'alerts' ? 'in-war-room' : ''}`} style={{ width: view === 'alerts' ? '100vw' : '100%', minWidth: 0 }}>
        <AnimatePresence mode="wait">
          {view === 'dashboard' && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="view-content">
              <div className="dashboard-header">
                <h1>ESTADO GLOBAL <span>OPERATIVO</span></h1>
                <div className="time-display">{new Date().toLocaleTimeString()}</div>
              </div>
              <div className="stats-grid">
                <div className="stat-card urgent">
                  <label>ALERTAS ACTIVAS</label>
                  <div className="val">{stats.active}</div>
                  <div className="progress-bar"><div className="fill" style={{ width: `${(stats.active/stats.total)*100}%` }} /></div>
                </div>
                <div className="stat-card gold">
                  <label>TOTAL LICENCIAS</label>
                  <div className="val">{users.length}</div>
                </div>
                <div className="stat-card blue">
                  <label>FRANQUICIAS</label>
                  <div className="val">{orgs.length}</div>
                </div>
              </div>

              {/* BOTÓN PREMIUM PARA ANÁLISIS TÁCTICO DE INCIDENCIAS */}
              <div style={{ marginTop: '50px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
                <button 
                  className="btn-premium-gold" 
                  onClick={() => setShowAnalyticsModal(true)} 
                  style={{ 
                    padding: '22px 50px', 
                    fontSize: '13px', 
                    letterSpacing: '3px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '15px', 
                    borderRadius: '20px', 
                    fontWeight: '900',
                    boxShadow: '0 10px 40px rgba(197, 160, 89, 0.25)',
                    border: '1px solid rgba(197, 160, 89, 0.4)',
                    transition: 'all 0.3s'
                  }}
                >
                  <Activity size={18} className="pulse-slow" style={{ color: 'black' }} /> ANALIZAR ÍNDICE DE INCIDENCIAS TÁCTICAS
                </button>
                <p style={{ color: '#64748b', fontSize: '10px', letterSpacing: '1.5px', textTransform: 'uppercase', fontWeight: '900' }}>
                  Cálculo de Densidad Geográfica e Incidencia por Franquicia en Tiempo Real
                </p>
              </div>
            </motion.div>
          )}

          {view === 'alerts' && (

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="war-room-immersive">
              
              {/* TOP HUD BAR PLATAFORMA MÉXICO */}
              <div className="top-hud-bar" style={{
                position: 'absolute',
                top: '20px',
                left: '360px',
                right: '380px',
                height: '55px',
                background: 'rgba(10, 15, 30, 0.8)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '16px',
                zIndex: 500,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0 20px',
                boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                  <img src="/logo.png" alt="Logo" style={{ width: 18, height: 18, objectFit: 'contain' }} />
                  <span style={{ fontSize: '12px', fontWeight: '900', letterSpacing: '2px', color: '#fff' }}>WAR ROOM — COMMAND CENTER v4</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                  <div style={{ fontSize: '11px', color: '#94a3b8', display: 'flex', gap: '10px', fontWeight: '800' }}>
                    <span>ACTIVAS: <strong style={{ color: '#ef4444' }}>{stats.active}</strong></span>
                    <span>|</span>
                    <span>CERRADAS: <strong style={{ color: '#10b981' }}>{stats.resolved}</strong></span>
                  </div>
                  <button
                    onClick={() => setView('dashboard')}
                    style={{
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      color: 'var(--gold)',
                      padding: '8px 16px',
                      borderRadius: '8px',
                      fontSize: '10px',
                      fontWeight: '900',
                      cursor: 'pointer',
                      letterSpacing: '1px',
                      transition: 'all 0.3s'
                    }}
                  >
                    ◄ PANEL PRINCIPAL
                  </button>
                </div>
              </div>

              <div className="immersive-layout">
                <div className="incident-panel">
                  <div className="panel-head" style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'stretch' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h3>CENTRAL DE ALARMAS</h3>
                      <div className={alertFilter === 'activas' ? 'pulse-red' : 'pulse-green'} />
                    </div>
                    
                    {/* Botones de alternancia de estado (Activa / Historial) */}
                    <div style={{ display: 'flex', gap: '5px', background: 'rgba(0,0,0,0.4)', padding: '3px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <button 
                        onClick={() => { setAlertFilter('activas'); setSelectedAlert(alerts.filter(a => a.estado === 'activa')[0] || null); }}
                        style={{
                          flex: 1,
                          background: alertFilter === 'activas' ? 'rgba(239, 68, 68, 0.2)' : 'transparent',
                          border: alertFilter === 'activas' ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid transparent',
                          color: alertFilter === 'activas' ? '#ef4444' : '#64748b',
                          padding: '6px',
                          borderRadius: '6px',
                          fontSize: '9px',
                          fontWeight: '900',
                          cursor: 'pointer',
                          letterSpacing: '1px',
                          transition: 'all 0.2s'
                        }}
                      >
                        🔴 ACTIVAS ({alerts.filter(a => a.estado === 'activa').length})
                      </button>
                      <button 
                        onClick={() => { setAlertFilter('resueltas'); setSelectedAlert(alerts.filter(a => a.estado === 'resuelta')[0] || null); }}
                        style={{
                          flex: 1,
                          background: alertFilter === 'resueltas' ? 'rgba(16, 185, 129, 0.2)' : 'transparent',
                          border: alertFilter === 'resueltas' ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid transparent',
                          color: alertFilter === 'resueltas' ? '#10b981' : '#64748b',
                          padding: '6px',
                          borderRadius: '6px',
                          fontSize: '9px',
                          fontWeight: '900',
                          cursor: 'pointer',
                          letterSpacing: '1px',
                          transition: 'all 0.2s'
                        }}
                      >
                        ✅ HISTÓRICAS ({alerts.filter(a => a.estado === 'resuelta').length})
                      </button>
                    </div>
                  </div>
                  
                  <div className="tactical-search" style={{ padding: '0 20px 15px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <input
                      type="text"
                      placeholder="BUSCAR VÍCTIMA / FRANQUICIA..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      style={{
                        width: '100%',
                        background: 'rgba(0,0,0,0.3)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        padding: '10px 15px',
                        borderRadius: '12px',
                        color: '#fff',
                        fontSize: '11px',
                        letterSpacing: '1px',
                        outline: 'none',
                        transition: 'all 0.3s'
                      }}
                    />
                  </div>
                  <div className="incident-scroll">
                    {alerts
                      .filter(a => alertFilter === 'activas' ? a.estado === 'activa' : a.estado === 'resuelta')
                      .filter(a => {
                        if (!searchTerm) return true;
                        const term = searchTerm.toLowerCase();
                        return (
                          a.usuario?.nombre_completo?.toLowerCase().includes(term) ||
                          a.usuario?.organizacion?.nombre?.toLowerCase().includes(term) ||
                          a.usuario?.telefono?.includes(term)
                        );
                      })
                      .map(alert => (
                      <div key={alert.id} className={`incident-item ${selectedAlert?.id === alert.id ? 'active' : ''}`} onClick={() => setSelectedAlert(alert)}>
                        <div className="item-accent" style={{ background: alert.usuario?.organizacion?.color_primario || '#ef4444' }} />
                        <div className="item-data">
                          <div className="u-name">{alert.usuario?.nombre_completo}</div>
                          <div className="u-meta">{alert.usuario?.organizacion?.nombre || 'CLAVE 1001'} | {new Date(alert.fecha_inicio).toLocaleTimeString()}</div>
                        </div>
                      </div>
                    ))}
                    {alertFilter === 'activas' && alerts.filter(a => a.estado === 'activa').length === 0 && <div className="empty-msg">SIN ALERTAS ACTIVAS</div>}
                    {alertFilter === 'resueltas' && alerts.filter(a => a.estado === 'resuelta').length === 0 && <div className="empty-msg">SIN HISTORIAL DE ALERTAS</div>}
                  </div>
                </div>

                <div className="monitor-stage">
                  {!selectedAlert ? (
                    <div className="scan-effect">
                      <div className="scan-line" />
                      <Monitor size={64} opacity={0.1} />
                      <p>INICIANDO PROTOCOLO DE ESCANEO...</p>
                    </div>
                  ) : (
                    <div className="active-intelligence">
                       <div className="map-container-wrapper">
                         <MapContainer center={[selectedAlert.latitud, selectedAlert.longitud]} zoom={16} style={{ height: '100%', width: '100%' }} attributionControl={false}>
                             <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
                             
                             {/* Route trail polyline (Plataforma México style) */}
                             {locationHistory.length > 1 && (
                               <Polyline
                                 positions={locationHistory}
                                 pathOptions={{
                                   color: selectedAlert.estado === 'resuelta' ? '#10b981' : '#3b82f6',
                                   weight: 4,
                                   opacity: 0.85,
                                   dashArray: '6, 12',
                                   lineJoin: 'round'
                                 }}
                               />
                             )}
                             
                             {/* Pulse markers along path */}
                             {locationHistory.map((coords, idx) => {
                               const isStart = idx === 0;
                               const isLatest = idx === locationHistory.length - 1;
                               return (
                                 <CircleMarker
                                   key={idx}
                                   center={coords}
                                   radius={isLatest ? 16 : isStart ? 12 : 6}
                                   pathOptions={{
                                     color: isLatest ? (selectedAlert.estado === 'resuelta' ? '#10b981' : '#ef4444') : isStart ? '#c5a059' : '#3b82f6',
                                     fillColor: isLatest ? (selectedAlert.estado === 'resuelta' ? '#10b981' : '#ef4444') : isStart ? '#c5a059' : '#3b82f6',
                                     fillOpacity: isLatest ? 0.35 : 0.75,
                                     weight: isLatest ? 3 : 1
                                   }}
                                 >
                                   <Popup>
                                     <div style={{ color: '#000', fontSize: '10px', fontFamily: 'monospace', padding: '3px' }}>
                                       {isStart ? '🚨 PUNTO DE ACTIVACIÓN (SOS)' : isLatest ? (selectedAlert.estado === 'resuelta' ? '✅ PUNTO DE DESACTIVACIÓN / AUXILIO EXITOSO' : '📍 UBICACIÓN EN TIEMPO REAL') : `⏱️ PASO RUTA ${idx + 1}`}
                                     </div>
                                   </Popup>
                                 </CircleMarker>
                               );
                             })}
                             
                             {/* EREX Patrols on the map */}
                             {Object.values(erexAgents).map((agent, idx) => (
                               <CircleMarker
                                 key={`erex-${agent.id}`}
                                 center={[agent.latitud, agent.longitud]}
                                 radius={12}
                                 pathOptions={{
                                   color: '#10b981', // Green for EREX
                                   fillColor: '#10b981',
                                   fillOpacity: 0.8,
                                   weight: 2
                                 }}
                               >
                                 <Popup>
                                   <div style={{ color: '#000', fontSize: '10px', fontFamily: 'monospace', padding: '3px' }}>
                                     <strong>🛡️ UNIDAD E.R.E.X.</strong><br/>
                                     {agent.nombre}<br/>
                                     ESTADO: {agent.estado.toUpperCase()}
                                   </div>
                                 </Popup>
                               </CircleMarker>
                             ))}
                             
                             <MapController center={[selectedAlert.latitud, selectedAlert.longitud]} zoom={16} recenterCount={recenterCount} />
                          </MapContainer>
                           <button
                             onClick={() => setRecenterCount(c => c + 1)}
                             style={{
                               position: 'absolute',
                               bottom: '25px',
                               right: '25px',
                               zIndex: 400,
                               background: 'var(--gold)',
                               color: 'black',
                               border: 'none',
                               padding: '12px 20px',
                               borderRadius: '12px',
                               fontWeight: '900',
                               fontSize: '10px',
                               cursor: 'pointer',
                               display: 'flex',
                               alignItems: 'center',
                               gap: '8px',
                               boxShadow: '0 4px 15px rgba(197, 160, 89, 0.4)',
                               letterSpacing: '1px'
                             }}
                           >
                             <MapPin size={12} /> RE-CENTRAR EN VÍCTIMA
                           </button>

                         
                         {monitoringMode && (
                            <div className={`hardware-feed ${isMaximizedVideo ? 'maximized' : ''}`} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                              {monitoringMode === 'camera' ? (
                                <video autoPlay playsInline ref={v => { if(v && remoteStream) { v.srcObject = remoteStream; } }} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              ) : (
                                <div className="audio-visualizer-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
                                  <div className="audio-pulse-glow" style={{ width: 120, height: 120, borderRadius: '50%', background: 'rgba(34, 197, 94, 0.2)', border: '2px solid #22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'pulse-slow 2s infinite' }}>
                                    <Mic size={48} color="#22c55e" />
                                  </div>
                                  <div style={{ letterSpacing: 2, fontSize: 14, fontWeight: 900, color: '#22c55e' }}>ESCUCHA REMOTA ACTIVA</div>
                                  <audio autoPlay ref={a => { if(a && remoteStream) { a.srcObject = remoteStream; } }} />
                                </div>
                              )}
                              
                              <div className="hud">
                                <div className="hud-top">
                                  <span className="rec">{isRecording ? (autoRecording ? '● GRABACIÓN AUTO (máx. 5 min)' : '● GRABANDO EVIDENCIA') : '● TRANSMITIENDO'}</span> 
                                  <span>{selectedAlert.usuario?.nombre_completo}</span>
                                </div>
                                <div className="hud-bottom" style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center', pointerEvents: 'auto' }}>
                                  <div>LAT: {selectedAlert.latitud.toFixed(4)} LNG: {selectedAlert.longitud.toFixed(4)}</div>
                                  
                                  <div style={{ display: 'flex', gap: 15 }}>
                                    {isRecording ? (
                                      <button onClick={stopRecording} style={{ background: '#ef4444', color: 'white', border: 'none', padding: '10px 20px', borderRadius: 10, fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, animation: 'pulse 1s infinite' }}>
                                        <div style={{ width: 8, height: 8, background: 'white', borderRadius: '50%' }} /> 
                                        DETENER GRABACIÓN ({Math.floor(recordingSeconds/60)}:{String(recordingSeconds%60).padStart(2,'0')})
                                      </button>
                                    ) : (
                                      <button onClick={() => startRecording(false)} style={{ background: 'var(--gold)', color: 'black', border: 'none', padding: '10px 20px', borderRadius: 10, fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <Radio size={14} /> GRABAR EVIDENCIA
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="feed-header-controls" style={{ position: 'absolute', top: '15px', right: '15px', display: 'flex', gap: '10px', zIndex: 605, pointerEvents: 'auto' }}>
                                 <button 
                                   onClick={() => setIsMaximizedVideo(!isMaximizedVideo)}
                                   style={{
                                     padding: '8px 15px',
                                     background: 'var(--gold)',
                                     color: 'black',
                                     border: 'none',
                                     borderRadius: '10px',
                                     fontWeight: '900',
                                     fontSize: '10px',
                                     cursor: 'pointer',
                                     boxShadow: '0 4px 10px rgba(0,0,0,0.5)',
                                     transition: 'all 0.2s'
                                   }}
                                 >
                                   {isMaximizedVideo ? '🗗 PANTALLA CHICA' : '🗖 PANTALLA COMPLETA'}
                                 </button>
                                 <button 
                                   style={{
                                     padding: '8px 15px',
                                     background: 'rgba(239, 68, 68, 0.9)',
                                     color: 'white',
                                     border: 'none',
                                     borderRadius: '10px',
                                     fontWeight: '900',
                                     fontSize: '10px',
                                     cursor: 'pointer',
                                     boxShadow: '0 4px 10px rgba(0,0,0,0.5)',
                                     transition: 'all 0.2s'
                                   }}
                                   onClick={() => { setMonitoringMode(null); if (isRecording) stopRecording(); setIsMaximizedVideo(false); }}
                                 >
                                   CERRAR
                                 </button>
                               </div>
                            </div>
                          )}
                       </div>

                       <div className="intel-sidebar">
                          <div className="intel-header">
                            <div className="avatar-gold">{selectedAlert.usuario?.nombre_completo ? selectedAlert.usuario.nombre_completo[0] : 'U'}</div>
                            <div className="info">
                              <h4>{selectedAlert.usuario?.nombre_completo}</h4>
                              <span>{selectedAlert.usuario?.telefono}</span>
                            </div>
                          </div>
                          <div className="intel-details-grid" style={{ margin: '20px 0', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '15px', display: 'flex', flexDirection: 'column', gap: '12px', flex: '1', overflowY: 'auto' }}>

                             <div>
                               <div style={{ fontSize: '9px', textTransform: 'uppercase', color: 'var(--gold)', letterSpacing: '1px', fontWeight: '900', marginBottom: '6px' }}>Bitácora del Incidente</div>
                               <div style={{ fontSize: '10px', color: '#94a3b8', background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.04)', display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '90px', overflowY: 'auto' }}>
                                 {incidentLogs.map((log, idx) => (
                                   <div key={idx} style={{ display: 'flex', gap: '8px' }}>
                                     <span style={{ color: 'var(--gold)', fontFamily: 'monospace' }}>[{log.time}]</span>
                                     <span style={{ color: '#e2e8f0' }}>{log.text}</span>
                                   </div>
                                 ))}
                               </div>
                             </div>


                             

                             <div>
                               <div style={{ fontSize: '9px', textTransform: 'uppercase', color: 'var(--gold)', letterSpacing: '1px', fontWeight: '900' }}>Organización</div>
                               <div style={{ fontSize: '13px', color: '#f1f5f9', marginTop: '3px' }}>{selectedAlert.usuario?.organizacion?.nombre || 'Clave 1001 Enterprise'}</div>
                             </div>
                             <div>
                               <div style={{ fontSize: '9px', textTransform: 'uppercase', color: 'var(--gold)', letterSpacing: '1px', fontWeight: '900' }}>Palabra Clave</div>
                               <div style={{ fontSize: '13px', color: '#ef4444', fontWeight: '900', marginTop: '3px', letterSpacing: '1px' }}>{selectedAlert.usuario?.palabra_clave || 'NO CONFIGURADA'}</div>
                             </div>
                             <div>
                               <div style={{ fontSize: '9px', textTransform: 'uppercase', color: 'var(--gold)', letterSpacing: '1px', fontWeight: '900' }}>Código de Seguridad</div>
                               <div style={{ fontSize: '13px', color: '#10b981', fontWeight: '900', marginTop: '3px', letterSpacing: '1px' }}>{selectedAlert.usuario?.clave_seguridad || 'NO CONFIGURADO'}</div>
                             </div>
                             
                             <div>
                               <div style={{ fontSize: '9px', textTransform: 'uppercase', color: 'var(--gold)', letterSpacing: '1px', fontWeight: '900' }}>Dirección IP de Víctima</div>
                               <div style={{ fontSize: '13px', color: '#10b981', fontWeight: '900', marginTop: '3px', letterSpacing: '1px', fontFamily: 'monospace' }}>{selectedAlert.ip_victima || 'NO REGISTRADA'}</div>
                             </div>
                             <div>
                               <div style={{ fontSize: '9px', textTransform: 'uppercase', color: 'var(--gold)', letterSpacing: '1px', fontWeight: '900' }}>Contactos de Referencia</div>
                               <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '3px', lineHeight: '1.4' }}>
                                 {(() => {
                                   const contacts = selectedAlert.usuario?.contactos_referencia;
                                   if (!contacts) return 'Ninguno asignado';
                                   try {
                                     const parsed = typeof contacts === 'string' ? JSON.parse(contacts) : contacts;
                                     if (Array.isArray(parsed)) {
                                       return parsed.map((c, i) => (
                                         <div key={i} style={{ marginBottom: '4px' }}>
                                           • {c.nombre || c.name || 'Contacto'}: <strong style={{ color: '#fff' }}>{c.telefono || c.phone || ''}</strong>
                                         </div>
                                       ));
                                     }
                                   } catch (e) {}
                                   return String(contacts);
                                 })()}
                               </div>
                             </div>
                           </div>

                           <div className="intel-actions" style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '15px' }}>
                             <label style={{ fontSize: '9px', textTransform: 'uppercase', color: '#64748b', letterSpacing: '1.5px', fontWeight: '900', marginBottom: '4px', display: 'block' }}>CONTROL DE RESPUESTA</label>

                             {dispatchedUnits[selectedAlert.id] && (
                                <div style={{ background: 'rgba(34, 197, 94, 0.1)', border: '1px solid #22c55e', padding: '10px 15px', borderRadius: '10px', fontSize: '10px', color: '#22c55e', fontWeight: '900', letterSpacing: '1px', marginBottom: '6px', textAlign: 'center' }}>
                                  🚨 DESPACHADA: {dispatchedUnits[selectedAlert.id]} (EN RUTA)
                                </div>
                              )}

                             <button className="btn-intel primary" onClick={() => setShowDispatchModal(true)} style={{ width: '100%', background: dispatchedUnits[selectedAlert.id] ? 'rgba(255,255,255,0.04)' : 'var(--gold)', border: dispatchedUnits[selectedAlert.id] ? '1px solid rgba(255,255,255,0.1)' : 'none', color: dispatchedUnits[selectedAlert.id] ? '#fff' : 'black' }}>
                               <Navigation size={12} /> {dispatchedUnits[selectedAlert.id] ? 'REASIGNAR OTRA UNIDAD' : 'DESPACHAR PATRULLA'}
                             </button>
                             <div style={{ display: 'flex', gap: '8px' }}>
                               <button className="btn-intel" onClick={() => setMonitoringMode(monitoringMode === 'camera' ? null : 'camera')} style={{ flex: '1', background: monitoringMode === 'camera' ? '#ef4444' : 'rgba(255,255,255,0.04)' }}><Camera size={12} /> CÁMARA</button>
                               <button className="btn-intel" onClick={() => setMonitoringMode(monitoringMode === 'mic' ? null : 'mic')} style={{ flex: '1', background: monitoringMode === 'mic' ? '#ef4444' : 'rgba(255,255,255,0.04)' }}><Mic size={12} /> MICRÓFONO</button>
                             </div>
                             <button className="btn-intel resolve" onClick={() => handleResolve(selectedAlert.id)} style={{ width: '100%' }}><CheckCircle size={12} /> CERRAR CASO</button>
                           </div>
                       </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {view === 'orgs' && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="view-content">
              <div className="orgs-header">
                <h1>ADMINISTRACIÓN DE <span>FRANQUICIAS</span></h1>
                <button className="btn-premium-gold" onClick={() => { setSelectedOrg(null); setNewOrg({ nombre: '', color: '#0a0f1e', logo: '', tipo_letra: 'Inter', color_secundario: '#ffffff', color_acento: '#ef4444', slogan: '', domicilio: '', redes_sociales: '{}', storage_mode: 'manual_download', bridge_url: '', bridge_api_key: '' }); setShowOrgModal(true); }}>+ NUEVA FRANQUICIA</button>
              </div>
              <div className="orgs-grid">
                {orgs.map(org => (
                  <div key={org.id} className="org-card-glass" style={{ borderLeft: `4px solid ${org.color_primario || '#c5a059'}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12 }}>
                      {org.logo_url
                        ? <img src={org.logo_url} alt="logo" style={{ width: 48, height: 48, borderRadius: 10, objectFit: 'contain', background: org.color_primario || '#1e2a3a', padding: 4 }} />
                        : <div className="org-icon" style={{ background: org.color_primario, flexShrink: 0 }}>{org.nombre[0]}</div>
                      }
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 900, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{org.nombre}</h3>
                        {org.slogan && <p style={{ margin: '2px 0 0', fontSize: 10, color: '#94a3b8', fontStyle: 'italic', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>"{org.slogan}"</p>}
                        <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 9, background: 'rgba(255,255,255,0.06)', padding: '2px 7px', borderRadius: 5, color: '#94a3b8' }}>{org.tipo_letra || 'Inter'}</span>
                          <span style={{ fontSize: 9, background: org.color_primario + '33', padding: '2px 7px', borderRadius: 5, color: org.color_primario, fontWeight: 900 }}>● FONDO</span>
                          {org.storage_mode === 'local_bridge' && <span style={{ fontSize: 9, background: 'rgba(34,197,94,0.15)', padding: '2px 7px', borderRadius: 5, color: '#22c55e', fontWeight: 900 }}>BRIDGE PRO</span>}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
                      <button
                        onClick={() => { setSelectedOrg(org); setNewOrg({ nombre: org.nombre, color: org.color_primario || '#0a0f1e', logo: org.logo_url || '', tipo_letra: org.tipo_letra || 'Inter', color_secundario: org.color_secundario || '#ffffff', color_acento: org.color_acento || '#ef4444', slogan: org.slogan || '', domicilio: org.domicilio || '', redes_sociales: org.redes_sociales ? JSON.stringify(org.redes_sociales) : '{}', storage_mode: org.storage_mode || 'manual_download', bridge_url: org.bridge_url || '', bridge_api_key: org.bridge_api_key || '' }); setShowOrgModal(true); }}
                        style={{ padding: '9px 4px', fontSize: 10, fontWeight: 900, letterSpacing: '0.5px', background: 'rgba(197,160,89,0.12)', border: '1px solid rgba(197,160,89,0.3)', color: 'var(--gold)', borderRadius: 10, cursor: 'pointer' }}
                      >✏️ EDITAR</button>
                      <button
                        onClick={() => { setPreviewOrg(org); setShowPreviewModal(true); }}
                        style={{ padding: '9px 4px', fontSize: 10, fontWeight: 900, letterSpacing: '0.5px', background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.3)', color: '#818cf8', borderRadius: 10, cursor: 'pointer' }}
                      >👁️ PREVIEW</button>
                      <button
                        onClick={() => handleGenerateAdmin(org)}
                        disabled={isGeneratingAdmin}
                        style={{ padding: '9px 4px', fontSize: 10, fontWeight: 900, letterSpacing: '0.5px', background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)', color: '#22c55e', borderRadius: 10, cursor: isGeneratingAdmin ? 'wait' : 'pointer' }}
                      >{isGeneratingAdmin ? '...' : '🔑 ADMIN'}</button>
                    </div>
                    <button
                      onClick={() => handleMasterOverride(org)}
                      style={{ marginTop: 8, width: '100%', padding: '9px 0', fontSize: 10, fontWeight: 900, letterSpacing: '1px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: '#ef4444', borderRadius: 10, cursor: 'pointer' }}
                    >🔓 ABRIR SESIÓN (MASTER OVERRIDE)</button>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {view === 'iot' && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="view-content">
              <div className="orgs-header">
                <h1>SUPERVISIÓN OPERATIVA <span>CLAVE 1001</span></h1>
              </div>

              {/* ─── SECCIÓN CCTV ─── */}
              <section style={{ marginTop: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <h3 style={{ color: 'var(--gold)', fontSize: '11px', letterSpacing: '2px', margin: 0 }}>
                    <Video size={13} style={{ verticalAlign: 'middle', marginRight: 6 }} />
                    CÁMARAS REGISTRADAS ({cctvStreams.length})
                  </h3>
                  <button className="btn-premium-gold" style={{ padding: '8px 18px', fontSize: '10px' }} onClick={() => setShowAddCam(true)}>
                    + AGREGAR CÁMARA
                  </button>
                </div>

                {cctvStreams.length === 0 ? (
                  <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '16px', border: '1px dashed rgba(255,255,255,0.07)', padding: '40px', textAlign: 'center', color: '#334155' }}>
                    <Video size={32} style={{ marginBottom: 12, opacity: 0.3 }} />
                    <div style={{ fontSize: '11px', fontWeight: '900', letterSpacing: '2px' }}>SIN CÁMARAS REGISTRADAS</div>
                    <div style={{ fontSize: '10px', marginTop: '6px', color: '#475569' }}>Agrega una cámara con su URL de stream (RTSP, HLS, WebRTC)</div>
                  </div>
                ) : (
                  <div style={{ background: 'rgba(10,15,30,0.4)', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                    <table style={{ width: '100%', color: 'white', textAlign: 'left', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ color: 'var(--gold)', fontSize: '9px', letterSpacing: '2px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                          <th style={{ padding: '14px 18px' }}>NOMBRE</th>
                          <th style={{ padding: '14px 18px' }}>UBICACIÓN</th>
                          <th style={{ padding: '14px 18px' }}>URL STREAM</th>
                          <th style={{ padding: '14px 18px' }}>ESTADO</th>
                          <th style={{ padding: '14px 18px' }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {cctvStreams.map(cam => (
                          <tr key={cam.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: '11px' }}>
                            <td style={{ padding: '12px 18px', fontWeight: '900' }}>{cam.nombre}</td>
                            <td style={{ padding: '12px 18px', color: '#94a3b8' }}>{cam.ubicacion || '—'}</td>
                            <td style={{ padding: '12px 18px', color: '#64748b', fontFamily: 'monospace', fontSize: '10px', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cam.url}</td>
                            <td style={{ padding: '12px 18px' }}>
                              <span style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)', padding: '2px 8px', borderRadius: '6px', fontSize: '9px', fontWeight: '900' }}>OFFLINE</span>
                            </td>
                            <td style={{ padding: '12px 18px' }}>
                              <button onClick={() => removeCam(cam.id)} style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontSize: '12px' }}>✕</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {showAddCam && (
                  <div style={{ marginTop: '16px', background: 'rgba(10,15,30,0.7)', borderRadius: '16px', border: '1px solid rgba(197,160,89,0.2)', padding: '20px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '12px', alignItems: 'end' }}>
                    <div><label style={iotLabelStyle}>Nombre de Cámara</label><input style={iotFieldStyle} placeholder="Ej. Entrada Principal" value={newCam.nombre} onChange={e => setNewCam({...newCam, nombre: e.target.value})} /></div>
                    <div><label style={iotLabelStyle}>URL del Stream (RTSP / HLS)</label><input style={iotFieldStyle} placeholder="rtsp://192.168.1.X:554/..." value={newCam.url} onChange={e => setNewCam({...newCam, url: e.target.value})} /></div>
                    <div><label style={iotLabelStyle}>Ubicación Física</label><input style={iotFieldStyle} placeholder="Ej. Caseta Norte" value={newCam.ubicacion} onChange={e => setNewCam({...newCam, ubicacion: e.target.value})} /></div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={addCam} style={{ background: 'var(--gold)', color: 'black', border: 'none', padding: '10px 16px', borderRadius: '10px', fontWeight: '900', fontSize: '10px', cursor: 'pointer', whiteSpace: 'nowrap' }}>GUARDAR</button>
                      <button onClick={() => setShowAddCam(false)} style={{ background: 'rgba(255,255,255,0.04)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.08)', padding: '10px 14px', borderRadius: '10px', fontWeight: '900', fontSize: '10px', cursor: 'pointer' }}>✕</button>
                    </div>
                  </div>
                )}
              </section>

              {/* ─── SECCIÓN GPS FLOTILLA ─── */}
              <section style={{ marginTop: '40px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <h3 style={{ color: 'var(--gold)', fontSize: '11px', letterSpacing: '2px', margin: 0 }}>
                    <Navigation size={13} style={{ verticalAlign: 'middle', marginRight: 6 }} />
                    FLOTILLA VEHICULAR ({vehicles.length})
                  </h3>
                  <button className="btn-premium-gold" style={{ padding: '8px 18px', fontSize: '10px' }} onClick={() => setShowAddVehicle(true)}>
                    + REGISTRAR UNIDAD
                  </button>
                </div>

                {vehicles.length === 0 ? (
                  <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '16px', border: '1px dashed rgba(255,255,255,0.07)', padding: '40px', textAlign: 'center', color: '#334155' }}>
                    <Navigation size={32} style={{ marginBottom: 12, opacity: 0.3 }} />
                    <div style={{ fontSize: '11px', fontWeight: '900', letterSpacing: '2px' }}>SIN UNIDADES REGISTRADAS</div>
                    <div style={{ fontSize: '10px', marginTop: '6px', color: '#475569' }}>Registra los vehículos de tu flotilla para recibir su telemetría GPS</div>
                  </div>
                ) : (
                  <div style={{ background: 'rgba(10,15,30,0.4)', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                    <table style={{ width: '100%', color: 'white', textAlign: 'left', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ color: 'var(--gold)', fontSize: '9px', letterSpacing: '2px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                          <th style={{ padding: '14px 18px' }}>UNIDAD</th>
                          <th style={{ padding: '14px 18px' }}>PLACA</th>
                          <th style={{ padding: '14px 18px' }}>OPERADOR</th>
                          <th style={{ padding: '14px 18px' }}>SEÑAL GPS</th>
                          <th style={{ padding: '14px 18px' }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {vehicles.map(v => (
                          <tr key={v.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: '11px' }}>
                            <td style={{ padding: '12px 18px', fontWeight: '900' }}>{v.nombre}</td>
                            <td style={{ padding: '12px 18px', color: '#94a3b8', fontFamily: 'monospace' }}>{v.placa}</td>
                            <td style={{ padding: '12px 18px', color: '#94a3b8' }}>{v.operador || '—'}</td>
                            <td style={{ padding: '12px 18px' }}>
                              <span style={{ background: 'rgba(100,116,139,0.15)', color: '#64748b', border: '1px solid rgba(100,116,139,0.3)', padding: '2px 8px', borderRadius: '6px', fontSize: '9px', fontWeight: '900' }}>SIN SEÑAL</span>
                            </td>
                            <td style={{ padding: '12px 18px' }}>
                              <button onClick={() => removeVehicle(v.id)} style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontSize: '12px' }}>✕</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {showAddVehicle && (
                  <div style={{ marginTop: '16px', background: 'rgba(10,15,30,0.7)', borderRadius: '16px', border: '1px solid rgba(197,160,89,0.2)', padding: '20px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '12px', alignItems: 'end' }}>
                    <div><label style={iotLabelStyle}>Nombre de Unidad</label><input style={iotFieldStyle} placeholder="Ej. Patrulla 01" value={newVehicle.nombre} onChange={e => setNewVehicle({...newVehicle, nombre: e.target.value})} /></div>
                    <div><label style={iotLabelStyle}>Placas</label><input style={iotFieldStyle} placeholder="Ej. ABC-1234" value={newVehicle.placa} onChange={e => setNewVehicle({...newVehicle, placa: e.target.value})} /></div>
                    <div><label style={iotLabelStyle}>Operador Asignado</label><input style={iotFieldStyle} placeholder="Nombre del conductor" value={newVehicle.operador} onChange={e => setNewVehicle({...newVehicle, operador: e.target.value})} /></div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={addVehicle} style={{ background: 'var(--gold)', color: 'black', border: 'none', padding: '10px 16px', borderRadius: '10px', fontWeight: '900', fontSize: '10px', cursor: 'pointer', whiteSpace: 'nowrap' }}>GUARDAR</button>
                      <button onClick={() => setShowAddVehicle(false)} style={{ background: 'rgba(255,255,255,0.04)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.08)', padding: '10px 14px', borderRadius: '10px', fontWeight: '900', fontSize: '10px', cursor: 'pointer' }}>✕</button>
                    </div>
                  </div>
                )}
              </section>
            </motion.div>
          )}

          {view === 'staff' && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="view-content">
              <div className="orgs-header">
                <h1>ADMINISTRACIÓN DE <span>PERSONAL (WAR ROOM)</span></h1>
                <button className="btn-premium-gold" onClick={() => { // Rendered via StaffModal component
setShowStaffModal(true); }}>+ NUEVO ELEMENTO</button>
              </div>
              
              <div style={{ background: 'rgba(10,15,30,0.4)', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)', padding: '25px', overflowY: 'auto' }}>
                <table style={{ width: '100%', color: 'white', textAlign: 'left', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ color: 'var(--gold)', fontSize: '10px', letterSpacing: '2px' }}>
                      <th style={{ padding: '15px' }}>NOMBRE</th>
                      <th style={{ padding: '15px' }}>ROL</th>
                      <th style={{ padding: '15px' }}>CONTACTO</th>
                      <th style={{ padding: '15px' }}>ESTATUS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.filter(u => u.rol && u.rol.startsWith('franquicia_') || u.rol === 'vigilante').map(u => (
                      <tr key={u.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '13px', fontWeight: '500' }}>
                        <td style={{ padding: '15px' }}>{u.nombre_completo}</td>
                        <td style={{ padding: '15px' }}>
                           <span style={{ fontSize: '9px', background: 'rgba(197, 160, 89, 0.1)', border: '1px solid rgba(197, 160, 89, 0.3)', padding: '3px 8px', borderRadius: '6px', color: 'var(--gold)', fontWeight: '900', textTransform: 'uppercase' }}>
                             {u.rol.replace('franquicia_', '')}
                           </span>
                        </td>
                        <td style={{ padding: '15px' }}>{u.telefono || u.correo || 'N/A'}</td>
                        <td style={{ padding: '15px' }}>
                           <span style={{ fontSize: '10px', color: u.estatus === 'activo' ? '#22c55e' : '#ef4444', fontWeight: '900', letterSpacing: '1px' }}>{u.estatus?.toUpperCase() || 'ACTIVO'}</span>
                        </td>
                      </tr>
                    ))}
                    {users.filter(u => u.rol && u.rol.startsWith('franquicia_') || u.rol === 'vigilante').length === 0 && (
                      <tr>
                        <td colSpan="4" style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>NO HAY PERSONAL REGISTRADO</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {view === 'evidences' && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="view-content">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                <h1 style={{ margin: 0, fontSize: '28px', fontWeight: '900', letterSpacing: '1px' }}>REGISTRO DE <span>EVIDENCIAS ENCRIPTADAS</span></h1>
                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '10px 20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Lock size={14} color="var(--gold)" />
                  <span style={{ fontSize: '10px', fontWeight: '900', letterSpacing: '1px', textTransform: 'uppercase', color: '#94a3b8' }}>ALMACENAMIENTO SEGURO AES-256</span>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '30px', height: 'calc(100vh - 220px)' }}>
                {/* EVIDENCES LIST */}
                <div style={{ background: 'rgba(10,15,30,0.4)', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)', padding: '25px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  {evidences.map(ev => (
                    <div 
                      key={ev.id} 
                      onClick={() => setSelectedEvidence(ev)}
                      style={{ 
                        background: selectedEvidence?.id === ev.id ? 'rgba(197, 160, 89, 0.08)' : 'rgba(255,255,255,0.02)', 
                        border: selectedEvidence?.id === ev.id ? '1px solid var(--gold)' : '1px solid rgba(255,255,255,0.04)',
                        borderRadius: '16px',
                        padding: '20px',
                        cursor: 'pointer',
                        transition: 'all 0.3s',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span style={{ fontSize: '14px', fontWeight: '900', color: '#fff' }}>{ev.victimName}</span>
                          <span style={{ fontSize: '9px', background: 'rgba(255,255,255,0.06)', padding: '3px 8px', borderRadius: '6px', color: 'var(--gold)', fontWeight: '900' }}>{ev.orgName}</span>
                        </div>
                        <div style={{ display: 'flex', gap: '15px', color: '#64748b', fontSize: '11px', marginTop: '6px', fontWeight: '500' }}>
                          <span>⏱️ DURACIÓN: <strong>{ev.duration}</strong></span>
                          <span>📅 FECHA: <strong>{new Date(ev.date).toLocaleString()}</strong></span>
                        </div>
                      </div>
                      <button style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--gold)', padding: '10px 18px', borderRadius: '10px', fontSize: '11px', fontWeight: '900', cursor: 'pointer' }}>
                        REPRODUCIR
                      </button>
                    </div>
                  ))}
                  {evidences.length === 0 && (
                    <div style={{ textAlign: 'center', color: '#64748b', padding: '100px 0', fontSize: '14px', letterSpacing: '1px' }}>
                      NO SE ENCONTRARON GRABACIONES DE EMERGENCIA REGISTRADAS
                    </div>
                  )}
                </div>

                {/* EVIDENCE INSPECTOR */}
                <div style={{ background: 'rgba(10,15,30,0.6)', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)', padding: '25px', display: 'flex', flexDirection: 'column', gap: '20px', backdropFilter: 'blur(20px)' }}>
                  {selectedEvidence ? (
                    <>
                      <h3 style={{ margin: 0, fontSize: '14px', letterSpacing: '2px', color: 'var(--gold)', fontWeight: '900', textTransform: 'uppercase' }}>INSPECTOR DE EVIDENCIA</h3>
                      <div style={{ borderRadius: '16px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)', background: '#000', flexShrink: 0 }}>
                        {selectedEvidence.url ? (
                          <video src={selectedEvidence.url} controls style={{ width: '100%', maxHeight: '200px', display: 'block' }} />
                        ) : (
                          <div style={{ padding: '25px 20px', background: 'rgba(255,255,255,0.02)', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                            <Lock size={32} color="var(--gold)" style={{ opacity: 0.8 }} />
                            <div style={{ fontSize: '10px', fontWeight: '900', color: 'var(--gold)', letterSpacing: '1px' }}>ARCHIVO ENCRIPTADO EN FRÍO</div>
                            <p style={{ margin: 0, fontSize: '10px', color: '#64748b', lineHeight: '1.4' }}>
                              El archivo original está resguardado en el clúster de almacenamiento central bajo custodia criptográfica activa.
                            </p>
                          </div>
                        )}
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1, overflowY: 'auto' }}>
                        <div>
                          <label style={{ fontSize: '9px', color: '#64748b', fontWeight: '900', letterSpacing: '1px' }}>VÍCTIMA</label>
                          <div style={{ fontSize: '14px', fontWeight: '900', color: '#fff', marginTop: '2px' }}>{selectedEvidence.victimName}</div>
                        </div>
                        <div>
                          <label style={{ fontSize: '9px', color: '#64748b', fontWeight: '900', letterSpacing: '1px' }}>ORGANIZACIÓN</label>
                          <div style={{ fontSize: '13px', fontWeight: '700', color: '#e2e8f0', marginTop: '2px' }}>{selectedEvidence.orgName}</div>
                        </div>
                        <div>
                          <label style={{ fontSize: '9px', color: '#64748b', fontWeight: '900', letterSpacing: '1px' }}>CUSTODIA SHA-256</label>
                          <div style={{ fontFamily: 'monospace', fontSize: '10px', color: '#22c55e', wordBreak: 'break-all', background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.04)', marginTop: '4px' }}>
                            {selectedEvidence.fingerprint}
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: '#64748b', gap: '15px' }}>
                      <Database size={48} opacity={0.15} />
                      <span style={{ fontSize: '11px', letterSpacing: '1.5px', textTransform: 'uppercase', fontWeight: '900' }}>SELECCIONA UNA GRABACIÓN</span>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <AnimatePresence>
        {showStaffModal && (
          <div className="modal-overlay">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="tactical-modal" style={{ maxWidth: '400px' }}>
              <button className="close-btn" onClick={() => setShowStaffModal(false)}>✕</button>
              <h2>NUEVO <span>ELEMENTO (STAFF)</span></h2>
              <div className="form-group">
                <label>NOMBRE COMPLETO</label>
                <input type="text" value={newStaff.nombre_completo} onChange={e => setNewStaff({...newStaff, nombre_completo: e.target.value})} placeholder="Ej. Juan Pérez" />
              </div>
              <div className="form-group">
                <label>ROL ASIGNADO</label>
                <select 
                  value={newStaff.rol} 
                  onChange={e => setNewStaff({...newStaff, rol: e.target.value})}
                  style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', padding: '14px', borderRadius: '12px', color: 'white', outline: 'none' }}
                >
                  {userProfile && ['admin', 'operador', 'franquicia_admin'].includes(userProfile.rol) && (
                    <option value="franquicia_gerente" style={{ background: '#0f172a' }}>Gerente de Franquicia</option>
                  )}
                  {userProfile && ['admin', 'operador', 'franquicia_admin', 'franquicia_gerente'].includes(userProfile.rol) && (
                    <option value="franquicia_coordinador" style={{ background: '#0f172a' }}>Coordinador</option>
                  )}
                  <option value="franquicia_supervisor" style={{ background: '#0f172a' }}>Supervisor</option>
                  <option value="franquicia_representante" style={{ background: '#0f172a' }}>Representante de Turno</option>
                  <option value="vigilante" style={{ background: '#0f172a' }}>Vigilante / Elemento</option>
                </select>
              </div>
              <button 
                className="btn-premium-gold" 
                style={{ width: '100%', marginTop: '20px' }} 
                onClick={handleSaveStaff}
                disabled={isCreatingStaff}
              >
                {isCreatingStaff ? 'CREANDO...' : 'REGISTRAR PERSONAL'}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {showOrgModal && (
        <div className="modal-root">
          <div className="modal-box">
            <h2>GESTIÓN EMPRESARIAL</h2>
            <div className="form-group" style={{ maxHeight: '60vh', overflowY: 'auto', paddingRight: 10 }}>
              <input placeholder="Nombre de Franquicia" value={newOrg.nombre} onChange={e => setNewOrg({...newOrg, nombre: e.target.value})} />
              <input placeholder="Slogan (Opcional)" value={newOrg.slogan} onChange={e => setNewOrg({...newOrg, slogan: e.target.value})} />
              <label style={{ fontSize: 10, color: 'var(--gold)', fontWeight: 900, marginTop: 15, display: 'block' }}>PERSONALIZACIÓN VISUAL (ETIQUETA BLANCA)</label>
              
              <div className="color-row" style={{ marginTop: 10 }}>
                <label>COLOR DE FONDO</label>
                <input type="color" value={newOrg.color} onChange={e => setNewOrg({...newOrg, color: e.target.value})} />
              </div>
              <div className="color-row">
                <label>COLOR DE TEXTO</label>
                <input type="color" value={newOrg.color_secundario} onChange={e => setNewOrg({...newOrg, color_secundario: e.target.value})} />
              </div>
              <div className="color-row">
                <label>COLOR DE ACENTO</label>
                <input type="color" value={newOrg.color_acento} onChange={e => setNewOrg({...newOrg, color_acento: e.target.value})} />
              </div>

              <select
                value={newOrg.tipo_letra}
                onChange={(e) => setNewOrg({ ...newOrg, tipo_letra: e.target.value })}
                style={{ width: '100%', padding: 12, borderRadius: 10, background: 'rgba(0,0,0,0.3)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', marginTop: 10 }}
              >
                <option value="Inter">Fuente: Inter (Elegante)</option>
                <option value="Roboto">Fuente: Roboto (Técnica)</option>
                <option value="Oswald">Fuente: Oswald (Táctica)</option>
                <option value="Montserrat">Fuente: Montserrat (Moderna)</option>
              </select>

              <div style={{ marginTop: 15, background: 'rgba(0,0,0,0.3)', padding: 15, borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)' }}>
                <label style={{ fontSize: 10, color: '#94a3b8', fontWeight: 900, display: 'block', marginBottom: 10 }}>SUBIR LOGOTIPO (PNG / JPG)</label>
                <input type="file" accept="image/png, image/jpeg" onChange={handleLogoUpload} style={{ fontSize: 12, width: '100%' }} />
                {uploadingLogo && <div style={{ fontSize: 11, color: 'var(--gold)', marginTop: 8 }}>Subiendo imagen al servidor...</div>}
                {newOrg.logo && (
                  <div style={{ marginTop: 10 }}>
                    <img src={newOrg.logo} alt="Logo" style={{ maxHeight: 60, borderRadius: 8, border: '1px solid var(--gold)' }} />
                  </div>
                )}
              </div>

              <input placeholder="Domicilio Físico (Opcional)" value={newOrg.domicilio} onChange={e => setNewOrg({...newOrg, domicilio: e.target.value})} style={{ marginTop: 15 }} />
              <textarea placeholder='Redes Sociales (JSON) ej. {"fb":"url"}' value={newOrg.redes_sociales} onChange={e => setNewOrg({...newOrg, redes_sociales: e.target.value})} style={{ width: '100%', padding: 12, borderRadius: 10, background: 'rgba(0,0,0,0.3)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', marginTop: 10, minHeight: 60 }} />

              <label style={{ fontSize: 10, color: 'var(--gold)', fontWeight: 900, marginTop: 25, display: 'block' }}>FASE 2 — BRIDGE LOCAL</label>
              <select
                value={newOrg.storage_mode}
                onChange={(e) => setNewOrg({ ...newOrg, storage_mode: e.target.value })}
                style={{ width: '100%', padding: 12, borderRadius: 10, background: 'rgba(0,0,0,0.3)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }}
              >
                <option value="manual_download">Fase 1 — Descarga manual</option>
                <option value="local_bridge">Fase 2 — Bridge en disco franquicia</option>
              </select>
              <input placeholder="Bridge URL (ej. http://192.168.1.10:9876)" value={newOrg.bridge_url} onChange={(e) => setNewOrg({ ...newOrg, bridge_url: e.target.value })} />
              <input placeholder="Bridge API Key" value={newOrg.bridge_api_key} onChange={(e) => setNewOrg({ ...newOrg, bridge_api_key: e.target.value })} />
            </div>

            {/* LIVE WHITE-LABEL PREVIEW STRIP */}
            <div style={{ margin: '15px 0 0', padding: 15, borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)', background: newOrg.color || '#0a0f1e', transition: 'all 0.4s' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {newOrg.logo
                  ? <img src={newOrg.logo} alt="preview" style={{ width: 36, height: 36, borderRadius: 8, objectFit: 'contain' }} />
                  : <div style={{ width: 36, height: 36, borderRadius: 8, background: newOrg.color_acento, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: '#fff', fontSize: 16 }}>{(newOrg.nombre || '?')[0]?.toUpperCase()}</div>
                }
                <div>
                  <div style={{ fontFamily: newOrg.tipo_letra || 'Inter', fontWeight: 900, fontSize: 14, color: newOrg.color_secundario || '#fff' }}>{newOrg.nombre || 'Nombre de empresa'}</div>
                  {newOrg.slogan && <div style={{ fontFamily: newOrg.tipo_letra || 'Inter', fontSize: 10, color: newOrg.color_acento, fontStyle: 'italic', marginTop: 2 }}>"{newOrg.slogan}"</div>}
                </div>
              </div>
              <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.2)', textAlign: 'right', marginTop: 6 }}>PREVIEW EN VIVO</div>
            </div>

            <div className="modal-btns">
              <button onClick={() => setShowOrgModal(false)}>CANCELAR</button>
              <button className="save" onClick={handleSaveOrg} disabled={isCreatingOrg}>{isCreatingOrg ? 'GUARDANDO...' : 'GUARDAR CAMBIOS'}</button>
            </div>
          </div>
        </div>
      )}

      {showEvidenceModal && (
        <div className="modal-root">
          <div className="modal-box" style={{ width: 500, textAlign: 'center' }}>
            <div style={{ width: 70, height: 70, borderRadius: '50%', background: 'rgba(34, 197, 94, 0.1)', border: '2px solid #22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <Lock size={32} color="#22c55e" />
            </div>
            <h2 style={{ letterSpacing: 1 }}>CADENA DE CUSTODIA ASEGURADA</h2>
            <p style={{ color: '#94a3b8', fontSize: 13, lineHeight: '1.6', margin: '15px 0' }}>
              {lastSaveUsedBridge
                ? 'Fase 2: evidencia guardada en el disco del franquiciatario vía Bridge. No se usó Storage en la nube.'
                : 'Fase 1: el .webm está en Descargas de este PC o solo en el móvil. Configure Bridge (storage_mode local_bridge) para guardado automático en D:\\Clave1001\\Evidencias\\.'}
            </p>
            {recordedVideoUrl && (
              <div style={{ marginBottom: 20, borderRadius: 12, overflow: 'hidden', border: '2px solid var(--gold)', background: '#000' }}>
                <video src={recordedVideoUrl} controls autoPlay style={{ width: '100%', maxHeight: '180px', display: 'block' }} />
              </div>
            )}
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: 15, borderRadius: 12, border: '1px solid var(--border)', textAlign: 'left', marginBottom: 25 }}>
              <div style={{ fontSize: 10, color: 'var(--gold)', fontWeight: 900, letterSpacing: 1, marginBottom: 5 }}>FINGERPRINT DIGITAL (SHA-256)</div>
              <div style={{ fontFamily: 'monospace', fontSize: 11, wordBreak: 'break-all', color: '#22c55e' }}>{evidenceFingerprint}</div>
              <div style={{ fontSize: 8, color: '#64748b', marginTop: 10, textAlign: 'right' }}>ESTÁNDAR DE CUSTODIA ENCRIPTADO AES-256</div>
            </div>
            <button className="btn-premium-gold" onClick={() => setShowEvidenceModal(false)} style={{ width: '100%' }}>CONFIRMAR Y FINALIZAR</button>
          </div>
        </div>
      )}

      {showAnalyticsModal && (
        <div className="modal-root">
          <div className="modal-box" style={{ width: 680, background: 'rgba(10,15,30,0.95)', border: '1px solid rgba(197,160,89,0.3)', backdropFilter: 'blur(30px)' }}>
            <h2 style={{ letterSpacing: 2, margin: '0 0 25px 0', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Activity size={24} color="var(--gold)" /> ANÁLISIS DE DENSIDAD E INCIDENCIA
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '25px' }}>
              {/* INCIDENCIAS POR PUNTOS GEOGRÁFICOS */}
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '20px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.04)' }}>
                <div style={{ fontSize: '10px', color: 'var(--gold)', fontWeight: '900', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '15px' }}>Puntos Geográficos Críticos</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                    <span style={{ color: '#94a3b8' }}>📍 Sector Centro Urbano</span>
                    <strong style={{ color: '#ef4444' }}>8.2 (ALTA)</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                    <span style={{ color: '#94a3b8' }}>📍 Zona Industrial Norte</span>
                    <strong style={{ color: '#ef4444' }}>6.9 (MEDIA-ALTA)</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                    <span style={{ color: '#94a3b8' }}>📍 Corredor Comercial Sur</span>
                    <strong style={{ color: '#c5a059' }}>4.1 (BAJA)</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                    <span style={{ color: '#94a3b8' }}>📍 Suburbano Poniente</span>
                    <strong style={{ color: '#10b981' }}>1.5 (SEGURO)</strong>
                  </div>
                </div>
              </div>

              {/* INCIDENCIAS POR FRANQUICIA */}
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '20px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.04)' }}>
                <div style={{ fontSize: '10px', color: 'var(--gold)', fontWeight: '900', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '15px' }}>Densidad por Franquicia</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {orgs.map((org, index) => {
                    const simulatedValues = ['9.4 (ZONA ROJA)', '3.2 (ESTABLE)', '1.1 (SEGURO)'];
                    const simVal = simulatedValues[index % simulatedValues.length];
                    return (
                      <div key={org.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                        <span style={{ color: '#94a3b8' }}>🏢 {org.nombre}</span>
                        <strong style={{ color: simVal.includes('ROJA') ? '#ef4444' : simVal.includes('ESTABLE') ? '#c5a059' : '#10b981' }}>{simVal}</strong>
                      </div>
                    );
                  })}
                  {orgs.length === 0 && <div style={{ fontSize: '12px', color: '#64748b' }}>Sin franquicias registradas</div>}
                </div>
              </div>
            </div>

            {/* HEAT DENSITY GRAPHIC SIMULATION */}
            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '20px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.04)', marginBottom: '25px', textAlign: 'center' }}>
              <div style={{ fontSize: '9px', color: '#64748b', fontWeight: '900', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '12px', textAlign: 'left' }}>Simulador de Calor y Dispersión Geográfica</div>
              <div style={{ display: 'flex', gap: '4px', height: '35px', alignItems: 'flex-end', justifyContent: 'center' }}>
                {[40, 65, 80, 50, 95, 30, 75, 85, 90, 45, 60, 80, 95, 70, 55, 35, 90, 75, 40].map((h, i) => (
                  <div 
                    key={i} 
                    style={{ 
                      flex: 1, 
                      height: `${h}%`, 
                      background: h > 80 ? 'linear-gradient(to top, #ef4444, #f87171)' : h > 50 ? 'linear-gradient(to top, var(--gold), #fbbf24)' : 'linear-gradient(to top, #3b82f6, #60a5fa)',
                      borderRadius: '3px 3px 0 0',
                      animation: 'pulse-slow 2s infinite',
                      animationDelay: `${i * 0.1}s`
                    }} 
                  />
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: '#64748b', marginTop: '8px', fontWeight: '800' }}>
                <span>COORD: EJE X (OESTE)</span>
                <span>CENTRO URBANO (ZONA DENSE)</span>
                <span>COORD: EJE Y (ESTE)</span>
              </div>
            </div>

            <button className="btn-premium-gold" onClick={() => setShowAnalyticsModal(false)} style={{ width: '100%' }}>CERRAR MÓDULO ANÁLITICO</button>
          </div>
        </div>
      )}

      {showDispatchModal && selectedAlert && (
        <div className="modal-root">
          <div className="modal-box" style={{ width: 550, background: 'rgba(10,15,30,0.96)', border: '1px solid var(--gold)', backdropFilter: 'blur(30px)' }}>
            <h2 style={{ letterSpacing: 2, margin: '0 0 15px 0', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Navigation size={24} color="var(--gold)" /> DESPACHO Y ASIGNACIÓN DE UNIDADES
            </h2>
            <div style={{ color: '#94a3b8', fontSize: '12px', marginBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '15px' }}>
              Asignando patrulla de auxilio inmediato para: <strong style={{ color: '#fff' }}>{selectedAlert.usuario?.nombre_completo}</strong> ({selectedAlert.usuario?.organizacion?.nombre || 'CLAVE 1001'}).
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '25px' }}>
              <label style={{ fontSize: '9px', color: '#64748b', fontWeight: '900', letterSpacing: '1px' }}>SELECCIONAR UNIDAD DISPONIBLE</label>
              {(() => {
                const availableAgents = Object.values(erexAgents).filter(a => a.organizacion_id === selectedAlert.usuario?.organizacion_id || !a.organizacion_id);
                
                if (availableAgents.length === 0) {
                  return <div style={{ color: '#ef4444', fontSize: '12px', fontWeight: 'bold' }}>NO HAY UNIDADES E.R.E.X. CONECTADAS PARA ESTA FRANQUICIA</div>;
                }
                
                return availableAgents.map((agent, idx) => (
                  <div 
                    key={agent.id || idx}
                    onClick={() => {
                      handleDispatchUnit(selectedAlert.id, agent.nombre, agent.id);
                      setShowDispatchModal(false);
                      new Audio('https://assets.mixkit.co/active_storage/sfx/911/911-preview.mp3').play().catch(() => {});
                    }}
                    style={{
                      background: 'rgba(255,255,255,0.02)',
                      border: '1px solid rgba(255,255,255,0.05)',
                      padding: '15px 20px',
                      borderRadius: '12px',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      transition: 'all 0.2s'
                    }}
                  >
                    <div>
                      <strong style={{ fontSize: '13px', color: '#fff', display: 'block' }}>E.R.E.X. - {agent.nombre}</strong>
                      <span style={{ fontSize: '11px', color: '#64748b' }}>📍 Estado: <strong>{agent.estado}</strong></span>
                    </div>
                    <span style={{ fontSize: '9px', background: 'rgba(34,197,94,0.15)', color: '#22c55e', padding: '4px 8px', borderRadius: '6px', fontWeight: '900' }}>
                      ASIGNAR MISIÓN
                    </span>
                  </div>
                ));
              })()}
            </div>

            <button className="btn-premium-gold" onClick={() => setShowDispatchModal(false)} style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#fff' }}>CANCELAR</button>
          </div>
        </div>
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;500;900&display=swap');
        
        :root {
          --gold: #e2e8f0;
          --bg: #000000;
          --panel: rgba(9, 13, 22, 0.85);
          --border: rgba(255,255,255,0.06);
          --accent: #3b82f6;
        }

        * { box-sizing: border-box; }
        body { margin: 0; background: var(--bg); color: white; font-family: 'Outfit', sans-serif; overflow: hidden; }

        .war-room-container { display: flex; height: 100vh; width: 100vw; background: #000000; background-image: linear-gradient(rgba(255,255,255,0.018) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.018) 1px, transparent 1px); background-size: 28px 28px; }

        /* SIDEBAR */
        .tactical-sidebar { width: 280px; background: rgba(0, 0, 0, 0.7); backdrop-filter: blur(20px); border-right: 1px solid var(--border); display: flex; flex-direction: column; padding: 40px 0; z-index: 10; }
        .sidebar-brand { padding: 0 30px; margin-bottom: 60px; position: relative; }
        .brand-glow { position: absolute; width: 60px; height: 60px; background: rgba(226,232,240,0.3); filter: blur(40px); opacity: 0.15; top: -10px; left: 20px; }
        .brand-logo { filter: drop-shadow(0 0 8px rgba(226,232,240,0.2)); }
        .brand-name { display: block; font-weight: 900; font-size: 18px; letter-spacing: 2px; margin-top: 10px; color: #e2e8f0; }
        .brand-tag { font-size: 9px; font-weight: 700; color: #64748b; letter-spacing: 1px; }

        .tactical-nav { padding: 0 20px; flex: 1; }
        .tactical-nav button { width: 100%; padding: 16px 20px; margin-bottom: 10px; background: transparent; border: 1px solid transparent; color: #64748b; border-radius: 16px; display: flex; align-items: center; gap: 15px; font-size: 14px; font-weight: 700; cursor: pointer; transition: all 0.3s; position: relative; }
        .tactical-nav button.active { background: rgba(255,255,255,0.03); color: white; border-color: var(--border); }
        .tactical-nav button.active::after { content: ''; position: absolute; left: 0; top: 15%; bottom: 15%; width: 4px; background: var(--gold); border-radius: 0 4px 4px 0; box-shadow: 0 0 15px var(--gold); }
        .active-badge { margin-left: auto; background: #ef4444; color: white; font-size: 10px; padding: 2px 8px; border-radius: 6px; box-shadow: 0 0 10px #ef4444; }

        .sidebar-footer { padding: 0 30px; }
        .sys-status { font-size: 10px; color: #22c55e; display: flex; align-items: center; gap: 8px; margin-bottom: 20px; font-weight: 800; }
        .dot-green { width: 6px; height: 6px; background: #22c55e; border-radius: 50%; box-shadow: 0 0 8px #22c55e; }
        .btn-logout { width: 100%; padding: 12px; background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.2); border-radius: 12px; color: #ef4444; font-size: 12px; font-weight: 800; cursor: pointer; }

        /* MAIN CONTENT */
        .tactical-main { flex: 1; position: relative; overflow: hidden; }
        .view-content { padding: 60px; max-width: 1400px; margin: 0 auto; }
        h1 { font-size: 42px; font-weight: 900; letter-spacing: -2px; margin-bottom: 40px; }
        h1 span { color: var(--gold); }

        .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 30px; }
        .stat-card { background: var(--panel); border: 1px solid var(--border); padding: 40px; border-radius: 30px; backdrop-filter: blur(20px); position: relative; overflow: hidden; }
        .stat-card label { font-size: 11px; font-weight: 900; color: #64748b; letter-spacing: 2px; }
        .stat-card .val { font-size: 64px; font-weight: 900; margin: 15px 0; letter-spacing: -3px; }
        .progress-bar { height: 4px; background: rgba(255,255,255,0.05); border-radius: 2px; margin-top: 20px; }
        .progress-bar .fill { height: 100%; background: #ef4444; box-shadow: 0 0 10px #ef4444; border-radius: 2px; }
        .stat-card.gold .val { color: var(--gold); }
        .stat-card.blue .val { color: var(--accent); }

        /* WAR ROOM IMMERSIVE */
        .war-room-immersive { height: 100vh; width: 100vw; overflow: hidden; padding: 0; margin: 0; position: relative; }
        .immersive-layout { position: relative; width: 100vw; height: 100vh; overflow: hidden; }
        
        .incident-panel {
          position: absolute;
          top: 20px;
          left: 20px;
          width: 320px;
          max-height: calc(50vh - 40px);
          background: rgba(10, 15, 30, 0.85);
          backdrop-filter: blur(25px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 20px;
          z-index: 500;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.6);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          transition: all 0.3s;
        }
        .panel-head { padding: 25px; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; }
        .panel-head h3 { margin: 0; font-size: 14px; font-weight: 900; letter-spacing: 1px; color: #94a3b8; }
        .pulse-red { width: 8px; height: 8px; background: #ef4444; border-radius: 50%; animation: pulse 1s infinite; box-shadow: 0 0 15px #ef4444; }

        .incident-scroll { flex: 1; overflow-y: auto; padding: 10px; }
        .incident-item { padding: 20px; border-radius: 20px; margin-bottom: 10px; cursor: pointer; display: flex; gap: 15px; border: 1px solid transparent; transition: all 0.3s; position: relative; }
        .incident-item:hover { background: rgba(255,255,255,0.02); }
        .incident-item.active { background: rgba(239, 68, 68, 0.08); border-color: rgba(239, 68, 68, 0.3); }
        .item-accent { width: 4px; border-radius: 4px; }
        .u-name { font-weight: 900; font-size: 14px; margin-bottom: 4px; }
        .u-meta { font-size: 10px; color: #64748b; font-weight: 700; }

        .monitor-stage { position: absolute; inset: 0; width: 100%; height: 100%; z-index: 1; overflow: hidden; background: #000; }
        .scan-effect { height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #334155; position: relative; }
        .scan-line { position: absolute; top: 0; left: 0; width: 100%; height: 2px; background: rgba(59, 130, 246, 0.2); animation: scan 3s infinite linear; }
        
        .active-intelligence { height: 100%; position: relative; width: 100%; }
        .map-container-wrapper { position: absolute; inset: 0; width: 100%; height: 100%; z-index: 1; }
        .hardware-feed.maximized {
          position: absolute !important;
          top: 0 !important;
          left: 0 !important;
          width: 100% !important;
          height: 100% !important;
          z-index: 600 !important;
          border: none !important;
          border-radius: 0 !important;
        }
        .hardware-feed {
          position: absolute;
          bottom: 20px;
          left: 20px;
          width: 320px;
          height: 240px;
          background: rgba(10, 15, 30, 0.95);
          border-radius: 20px;
          z-index: 600;
          border: 2px solid var(--gold);
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.8);
          overflow: hidden;
          pointer-events: auto;
        }
        .hardware-feed video { width: 100%; height: 100%; object-fit: cover; }
        .hud { position: absolute; inset: 0; padding: 15px; display: flex; flex-direction: column; justify-content: space-between; pointer-events: none; color: #22c55e; font-family: monospace; font-size: 10px; text-shadow: 0 0 5px #000; }
        .rec { color: #ef4444; animation: pulse 1s infinite; }
        .close-feed { position: absolute; top: 15px; right: 15px; padding: 8px 15px; background: rgba(0,0,0,0.5); border: none; color: white; border-radius: 10px; cursor: pointer; z-index: 601; }

        .intel-sidebar {
          position: absolute;
          top: 20px;
          right: 20px;
          bottom: 20px;
          width: 340px;
          background: rgba(10, 15, 30, 0.85);
          backdrop-filter: blur(25px);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 24px;
          padding: 20px;
          z-index: 500;
          display: flex;
          flex-direction: column;
          box-shadow: 0 20px 50px rgba(0,0,0,0.6);
          pointer-events: auto;
        }
        .intel-header { display: flex; align-items: center; gap: 15px; margin-bottom: 40px; }
        .avatar-gold { width: 50px; height: 50px; background: var(--gold); color: black; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 20px; box-shadow: 0 0 20px rgba(197, 160, 89, 0.4); }
        .info h4 { margin: 0; font-size: 16px; }
        .info span { font-size: 12px; color: #64748b; font-weight: 700; }

        .intel-actions label { display: block; font-size: 10px; font-weight: 900; color: #64748b; letter-spacing: 1px; margin-bottom: 15px; }
        .btn-intel { width: 100%; padding: 14px; border-radius: 14px; border: 1px solid var(--border); background: rgba(255,255,255,0.02); color: white; font-size: 12px; font-weight: 800; display: flex; align-items: center; gap: 12px; cursor: pointer; margin-bottom: 10px; transition: all 0.3s; }
        .btn-intel:hover { background: rgba(255,255,255,0.05); transform: translateY(-2px); }
        .btn-intel.primary { background: var(--accent); border: none; box-shadow: 0 10px 20px rgba(59, 130, 246, 0.2); }
        .btn-intel.resolve { margin-top: auto; background: #059669; border: none; }

        /* ORGS */
        .orgs-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; }
        .btn-premium-gold { background: linear-gradient(135deg, var(--gold), #85642c); color: black; border: none; padding: 15px 30px; border-radius: 16px; font-weight: 900; font-size: 14px; cursor: pointer; box-shadow: 0 10px 30px rgba(197, 160, 89, 0.3); }
        .orgs-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(350px, 1fr)); gap: 25px; }
        .org-card-glass { background: var(--panel); border: 1px solid var(--border); border-radius: 25px; padding: 30px; display: flex; align-items: center; gap: 20px; transition: all 0.3s; }
        .org-card-glass:hover { transform: translateY(-5px); border-color: var(--gold); }
        .org-icon { width: 60px; height: 60px; border-radius: 16px; display: flex; align-items: center; justify-content: center; font-size: 24px; font-weight: 900; color: black; }
        .org-actions { display: flex; gap: 10px; margin-top: 15px; }
        .org-actions button { background: rgba(255,255,255,0.05); border: 1px solid var(--border); color: #94a3b8; padding: 8px 15px; border-radius: 10px; font-size: 10px; font-weight: 800; cursor: pointer; }
        .org-actions button.edit { background: var(--gold); color: black; }

        /* MODAL */
        .modal-root { position: fixed; inset: 0; background: rgba(0,0,0,0.8); backdrop-filter: blur(10px); display: flex; align-items: center; justify-content: center; z-index: 1000; }
        .modal-box { background: #0f172a; border-radius: 30px; padding: 40px; border: 1px solid var(--border); width: 450px; }
        .form-group { display: flex; flex-direction: column; gap: 20px; margin: 30px 0; }
        input { width: 100%; background: rgba(255,255,255,0.03); border: 1px solid var(--border); padding: 16px; border-radius: 12px; color: white; outline: none; }
        .color-row { display: flex; justify-content: space-between; align-items: center; }
        .color-row label { font-size: 10px; font-weight: 900; color: #64748b; }
        .color-row input { width: 50px; padding: 0; height: 40px; }
        .modal-btns { display: flex; gap: 15px; }
        .modal-btns button { flex: 1; padding: 15px; border-radius: 12px; border: 1px solid var(--border); background: transparent; color: white; font-weight: 800; cursor: pointer; }
        .modal-btns button.save { background: var(--gold); color: black; border: none; }

        /* LOADER */
        .tactical-loader { height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 20px; }
        .loader-ring { width: 80px; height: 80px; border: 4px solid rgba(197, 160, 89, 0.1); border-top-color: var(--gold); border-radius: 50%; }
        .loader-shield { position: absolute; }

        @keyframes pulse { 0% { opacity: 1; transform: scale(1); } 50% { opacity: 0.5; transform: scale(1.1); } 100% { opacity: 1; transform: scale(1); } }
        @keyframes scan { from { top: 0; } to { top: 100%; } }

        /* ── LAPTOP & SMALLER DISPLAY OPTIMIZATIONS (RESPONSIVE WAR ROOM & DASHBOARD) ── */
        @media (max-width: 1400px), (max-height: 850px) {
          /* General main layout scrolling */
          .tactical-main {
            overflow-y: auto !important;
            overflow-x: hidden !important;
          }
          .tactical-main.in-war-room {
            overflow: hidden !important;
          }

          /* Dashboard Adjustments */
          .view-content {
            padding: 30px 20px !important;
          }
          h1 {
            font-size: 28px !important;
            margin-bottom: 20px !important;
          }
          .stats-grid {
            gap: 15px !important;
          }
          .stat-card {
            padding: 25px 20px !important;
            border-radius: 20px !important;
          }
          .stat-card .val {
            font-size: 42px !important;
            margin: 8px 0 !important;
          }
          .progress-bar {
            margin-top: 12px !important;
          }

          /* Sidebar Adjustments */
          .tactical-sidebar {
            width: 240px !important;
            padding: 20px 0 !important;
          }
          .sidebar-brand {
            margin-bottom: 25px !important;
            padding: 0 20px !important;
          }
          .brand-name {
            font-size: 18px !important;
            margin-top: 5px !important;
          }
          .tactical-nav {
            padding: 0 10px !important;
          }
          .tactical-nav button {
            padding: 10px 15px !important;
            margin-bottom: 6px !important;
            font-size: 12px !important;
            border-radius: 10px !important;
          }
          .sidebar-footer {
            padding: 0 20px !important;
          }
          .sys-status {
            margin-bottom: 12px !important;
          }

          /* War Room Adjustments */
          .top-hud-bar {
            left: 260px !important;
            right: 20px !important;
            top: 15px !important;
            height: 48px !important;
            padding: 0 15px !important;
          }
          .incident-panel {
            left: 15px !important;
            top: 15px !important;
            width: 280px !important;
          }
          .intel-sidebar {
            right: 15px !important;
            top: 15px !important;
            bottom: 15px !important;
            width: 300px !important;
            padding: 15px !important;
            border-radius: 16px !important;
          }
          .intel-header {
            margin-bottom: 15px !important;
          }
          .avatar-gold {
            width: 40px !important;
            height: 40px !important;
            font-size: 16px !important;
            border-radius: 8px !important;
          }
          .info h4 {
            font-size: 13px !important;
          }
          .info span {
            font-size: 10px !important;
          }
          .intel-actions label {
            font-size: 8px !important;
            margin-bottom: 8px !important;
          }
          .btn-intel {
            padding: 10px !important;
            border-radius: 10px !important;
            font-size: 11px !important;
            margin-bottom: 6px !important;
          }
          
          /* Franchise management grid */
          .orgs-grid {
            grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)) !important;
            gap: 15px !important;
          }
          .org-card-glass {
            padding: 20px !important;
            border-radius: 18px !important;
            gap: 15px !important;
          }
          .org-icon {
            width: 45px !important;
            height: 45px !important;
            font-size: 18px !important;
            border-radius: 12px !important;
          }
          .org-info h3 {
            font-size: 14px !important;
            margin: 0 !important;
          }
        }
      `}</style>

      {/* === MODAL: CREDENCIALES GENERADAS === */}
      {showCredentialsModal && generatedCredentials && (
        <div className="modal-root">
          <div className="modal-box" style={{ width: 480, textAlign: 'center' }}>
            <div style={{ width: 70, height: 70, borderRadius: '50%', background: 'rgba(34,197,94,0.1)', border: '2px solid #22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <span style={{ fontSize: 30 }}>🔑</span>
            </div>
            <h2 style={{ margin: '0 0 8px', letterSpacing: 1, color: '#fff' }}>CREDENCIALES GENERADAS</h2>
            <p style={{ color: '#94a3b8', fontSize: 12, marginBottom: 25, lineHeight: 1.6 }}>Comparte estas credenciales con el franquiciatario. Recuérdales que deben cambiar la contraseña en su primer inicio de sesión.</p>
            <div style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 14, padding: 20, marginBottom: 20, textAlign: 'left' }}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 9, color: '#64748b', fontWeight: 900, letterSpacing: 1, display: 'block', marginBottom: 5 }}>USUARIO / CORREO</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <code style={{ flex: 1, background: 'rgba(255,255,255,0.05)', padding: '10px 14px', borderRadius: 8, color: '#22c55e', fontSize: 13, fontWeight: 700 }}>{generatedCredentials.username}</code>
                  <button onClick={() => { navigator.clipboard.writeText(generatedCredentials.username); }} style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)', color: '#22c55e', fontSize: 11, cursor: 'pointer', fontWeight: 900 }}>COPIAR</button>
                </div>
              </div>
              <div>
                <label style={{ fontSize: 9, color: '#64748b', fontWeight: 900, letterSpacing: 1, display: 'block', marginBottom: 5 }}>CONTRASEÑA GENÉRICA</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <code style={{ flex: 1, background: 'rgba(255,255,255,0.05)', padding: '10px 14px', borderRadius: 8, color: 'var(--gold)', fontSize: 13, fontWeight: 700 }}>{generatedCredentials.password}</code>
                  <button onClick={() => { navigator.clipboard.writeText(generatedCredentials.password); }} style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(197,160,89,0.15)', border: '1px solid rgba(197,160,89,0.3)', color: 'var(--gold)', fontSize: 11, cursor: 'pointer', fontWeight: 900 }}>COPIAR</button>
                </div>
              </div>
            </div>
            <div style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: '10px 15px', marginBottom: 20, fontSize: 10, color: '#fca5a5', lineHeight: 1.5 }}>
              ⚠️ Esta contraseña es genérica. El franquiciatario debe cambiarla en su primer acceso. Tú siempre podrás regenerarla como Super Admin.
            </div>
            <button className="btn-premium-gold" onClick={() => { setShowCredentialsModal(false); setGeneratedCredentials(null); }} style={{ width: '100%' }}>CONFIRMAR Y CERRAR</button>
          </div>
        </div>
      )}

      {/* === MODAL: PREVIEW ETIQUETA BLANCA === */}
      {showPreviewModal && previewOrg && (
        <div className="modal-root" onClick={() => setShowPreviewModal(false)}>
          <div onClick={e => e.stopPropagation()} style={{ width: 380, background: previewOrg.color_primario || '#0a0f1e', borderRadius: 28, overflow: 'hidden', boxShadow: '0 40px 100px rgba(0,0,0,0.8)', border: `2px solid ${previewOrg.color_acento || '#ef4444'}33` }}>
            {/* Header simulado */}
            <div style={{ padding: '20px 24px', borderBottom: `1px solid ${previewOrg.color_acento || '#ef4444'}22`, display: 'flex', alignItems: 'center', gap: 12 }}>
              {previewOrg.logo_url
                ? <img src={previewOrg.logo_url} alt="logo" style={{ width: 40, height: 40, borderRadius: 10, objectFit: 'contain' }} />
                : <div style={{ width: 40, height: 40, borderRadius: 10, background: previewOrg.color_acento || '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 18, color: '#fff' }}>{previewOrg.nombre[0]}</div>
              }
              <div>
                <div style={{ fontFamily: previewOrg.tipo_letra || 'Inter', fontWeight: 900, fontSize: 16, color: previewOrg.color_secundario || '#fff' }}>{previewOrg.nombre}</div>
                {previewOrg.slogan && <div style={{ fontFamily: previewOrg.tipo_letra || 'Inter', fontSize: 10, color: previewOrg.color_acento || '#ef4444', marginTop: 1 }}>{previewOrg.slogan}</div>}
              </div>
            </div>
            {/* Botón de pánico simulado */}
            <div style={{ padding: 40, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24 }}>
              <div style={{ width: 160, height: 160, borderRadius: '50%', background: `radial-gradient(circle at 35% 35%, ${previewOrg.color_acento || '#ef4444'}, ${previewOrg.color_acento || '#ef4444'}88)`, boxShadow: `0 0 60px ${previewOrg.color_acento || '#ef4444'}66`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ fontFamily: previewOrg.tipo_letra || 'Inter', fontWeight: 900, fontSize: 22, color: '#fff', letterSpacing: 3 }}>AUXILIO</div>
              </div>
              <div style={{ fontFamily: previewOrg.tipo_letra || 'Inter', fontSize: 11, color: previewOrg.color_secundario ? previewOrg.color_secundario + '88' : 'rgba(255,255,255,0.5)', textAlign: 'center' }}>Presiona en caso de emergencia</div>
            </div>
            {/* Footer */}
            <div style={{ padding: '12px 24px', borderTop: `1px solid rgba(255,255,255,0.05)`, textAlign: 'center' }}>
              <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.2)', letterSpacing: 1 }}>Powered by Clave 1001 &amp; Arché Holding Labs</div>
            </div>
            <div style={{ padding: '0 24px 20px', textAlign: 'center' }}>
              <button onClick={() => setShowPreviewModal(false)} style={{ padding: '10px 30px', borderRadius: 10, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: 12, cursor: 'pointer', fontWeight: 900 }}>CERRAR PREVIEW</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
