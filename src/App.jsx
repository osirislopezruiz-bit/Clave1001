import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Shield, AlertCircle, AlertTriangle, MapPin, Camera, CheckCircle, Monitor, LogOut, QrCode, Mic, MicOff, Car, Navigation, Moon, BellRing, Book } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from './lib/supabase';
import {
  EVIDENCIA_MAX_SEC,
  getRecorderOptions,
  saveEvidenceToIndexedDB,
  savePartialEvidenceToIndexedDB,
  sha256Blob,
  formatEvidenceDuration,
  tryUpdateAlertaEvidencia,
  persistEvidenceWithBridge,
} from './lib/evidencia';
import AdminPanel from './AdminPanel';
import ErexDashboard from './ErexDashboard';

export default function PanicApp() {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [view, setView] = useState('login'); // Cambiado de 'admin' a 'login' para evitar el crash inicial
  const [nfcStatus, setNfcStatus] = useState('idle'); // 'idle', 'scanning', 'paired'
  const [location, setLocation] = useState(null);
  const [status, setStatus] = useState('idle');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('padre');
  const [c1, setC1] = useState('');
  const [c2, setC2] = useState('');
  const [c3, setC3] = useState('');
  const [safetyCode, setSafetyCode] = useState('');
  const [b2bOrg, setB2bOrg] = useState(null);
  const [activeAlert, setActiveAlert] = useState(null);
  const [deactivateInput, setDeactivateInput] = useState('');
  const [activeMode, setActiveMode] = useState(null); // 'plataforma', 'carretera', 'centinela'
  const [timer, setTimer] = useState(0);
  const [showFakeCall, setShowFakeCall] = useState(false);
  const [acceptedPriv, setAcceptedPriv] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedArco, setAcceptedArco] = useState(false);
  const [isSavingTerms, setIsSavingTerms] = useState(false);

  useEffect(() => {
    let interval;
    if (activeMode === 'plataforma' && timer > 0) {
      interval = setInterval(() => {
        setTimer(t => t - 1);
      }, 1000);
    } else if (activeMode === 'plataforma' && timer === 0) {
      handlePanic();
      setActiveMode(null);
    }
    return () => clearInterval(interval);
  }, [activeMode, timer]);

  useEffect(() => {
    // Revisar si viene de un link de invitación B2B
    const params = new URLSearchParams(window.location.search);
    const orgId = params.get('org');
    if (orgId) {
      setIsRegister(true);
      setRole('usuario'); // Forzamos a usuario para B2B
      supabase.from('organizaciones').select('*').eq('id', orgId).single()
        .then(({ data }) => {
          if (data) {
            setB2bOrg(data);
            if (data.color_primario) {
              document.documentElement.style.setProperty('--accent-gold', data.color_primario);
            }
          }
        });
    }
  }, []);

  const [stream, setStream] = useState(null);
  const [pc, setPc] = useState(null);
  const [victimRecordSec, setVictimRecordSec] = useState(0);
  const [victimEvidenceSaved, setVictimEvidenceSaved] = useState(false);
  const [captureStatus, setCaptureStatus] = useState('idle'); // idle | active | paused | interrupted
  const [bridgeUploadStatus, setBridgeUploadStatus] = useState(null); // null | 'uploading' | 'ok' | 'fail'

  const victimRecorderRef = useRef(null);
  const victimRecordTimerRef = useRef(null);
  const victimMaxTimerRef = useRef(null);
  const victimChunksRef = useRef([]);
  const victimRecordSecRef = useRef(0);
  const locationRef = useRef(null);
  const gpsWatchRef = useRef(null);
  const activeAlertRef = useRef(null);
  const panicInFlightRef = useRef(false);
  const victimTimerStartedRef = useRef(false);
  const victimFinalizeOnStopRef = useRef(false);

  useEffect(() => {
    activeAlertRef.current = activeAlert;
  }, [activeAlert]);

  /** Precalienta GPS en pantalla principal para no esperar al pulsar S.O.S. */
  useEffect(() => {
    if (view !== 'button' || !user?.id || !navigator.geolocation) return undefined;

    const savePos = (pos) => {
      const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      locationRef.current = coords;
      setLocation(coords);
    };

    navigator.geolocation.getCurrentPosition(savePos, () => {}, {
      enableHighAccuracy: false,
      maximumAge: 120000,
      timeout: 8000,
    });

    gpsWatchRef.current = navigator.geolocation.watchPosition(savePos, () => {}, {
      enableHighAccuracy: true,
      maximumAge: 10000,
      timeout: 15000,
    });

    return () => {
      if (gpsWatchRef.current != null) {
        navigator.geolocation.clearWatch(gpsWatchRef.current);
        gpsWatchRef.current = null;
      }
    };
  }, [view, user?.id]);

  useEffect(() => {
    let localStream = null;
    if (view === 'alert_active') {
      // ACTIVACIÓN REAL DE HARDWARE EN EMERGENCIA
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia({ video: true, audio: true })
          .then(s => { localStream = s; setStream(s); })
          .catch(e => {
            console.error("Error de hardware:", e);
            if (navigator.mediaDevices.getUserMedia) {
              navigator.mediaDevices.getUserMedia({ audio: true })
                .then(s2 => { localStream = s2; setStream(s2); })
                .catch(e2 => console.error("Error de audio:", e2));
            }
          });
      } else {
        console.warn("El dispositivo o navegador actual no soporta captura de audio/video.");
      }
    }
    return () => {
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
      setStream(prev => {
        if (prev && prev !== localStream) prev.getTracks().forEach(track => track.stop());
        return null;
      });
    };
  }, [view]);

  const stopVictimRecorderOnly = useCallback(() => {
    victimFinalizeOnStopRef.current = false;
    const rec = victimRecorderRef.current;
    if (rec && rec.state !== 'inactive') {
      try {
        rec.stop();
      } catch (e) {
        console.warn('stop recorder:', e);
      }
    }
    victimRecorderRef.current = null;
  }, []);

  const stopVictimRecording = useCallback(() => {
    if (victimMaxTimerRef.current) {
      clearTimeout(victimMaxTimerRef.current);
      victimMaxTimerRef.current = null;
    }
    if (victimRecordTimerRef.current) {
      clearInterval(victimRecordTimerRef.current);
      victimRecordTimerRef.current = null;
    }
    victimTimerStartedRef.current = false;
    victimFinalizeOnStopRef.current = true;
    const rec = victimRecorderRef.current;
    if (rec && rec.state !== 'inactive') {
      try {
        rec.stop();
      } catch (e) {
        console.warn('stop recorder:', e);
      }
    } else {
      victimFinalizeOnStopRef.current = false;
    }
    victimRecorderRef.current = null;
    setCaptureStatus('idle');
  }, []);

  const flushPartialVictimEvidence = useCallback(async () => {
    const alertId = activeAlertRef.current?.id;
    if (!alertId || victimChunksRef.current.length === 0) return;
    const blob = new Blob(victimChunksRef.current, { type: 'video/webm' });
    if (blob.size < 512) return;
    try {
      await savePartialEvidenceToIndexedDB({
        id: `partial-${alertId}`,
        alertId,
        usuarioId: user?.id,
        updatedAt: new Date().toISOString(),
        durationSec: victimRecordSecRef.current,
        sizeBytes: blob.size,
        side: 'victima',
      });
    } catch (e) {
      console.warn('partial evidence flush:', e);
    }
  }, [user?.id]);

  const restartEmergencyMedia = useCallback(async () => {
    if (view !== 'alert_active' || !activeAlertRef.current) return;
    if (!navigator.mediaDevices?.getUserMedia) {
      setCaptureStatus('interrupted');
      return;
    }
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setStream(s);
      setCaptureStatus('active');
    } catch (e) {
      console.error('Reinicio de cámara:', e);
      try {
        const audioOnly = await navigator.mediaDevices.getUserMedia({ audio: true });
        setStream(audioOnly);
        setCaptureStatus('active');
      } catch (e2) {
        setCaptureStatus('interrupted');
      }
    }
  }, [view]);

  const finalizeVictimEvidence = useCallback(async (blob, alertIdFromRecorder, seconds) => {
    const alertId = activeAlertRef.current?.id || alertIdFromRecorder;
    const fingerprint = await sha256Blob(blob);

    if (String(alertId).startsWith('pending-')) {
      await saveEvidenceToIndexedDB({
        id: `victim-${alertId}-${Date.now()}`,
        alertId,
        usuarioId: user?.id,
        createdAt: new Date().toISOString(),
        durationSec: seconds,
        fingerprint,
        sizeBytes: blob.size,
        side: 'victima',
        pendingBridge: true,
      });
      setVictimEvidenceSaved(true);
      return;
    }

    setBridgeUploadStatus('uploading');
    const { bridge, error } = await persistEvidenceWithBridge({
      blob,
      alertId,
      userProfile,
      duracionSeg: seconds,
      origen: 'victima',
      indexedEntry: {
        id: `victim-${alertId}-${Date.now()}`,
        alertId,
        usuarioId: user?.id,
        createdAt: new Date().toISOString(),
        durationSec: seconds,
        fingerprint,
        sizeBytes: blob.size,
        side: 'victima',
      },
    });

    if (!bridge) {
      await tryUpdateAlertaEvidencia(alertId, {
        evidencia_estado: 'respaldo_movil',
        evidencia_duracion_seg: seconds,
        evidencia_hash: fingerprint,
      });
    }
    setBridgeUploadStatus(bridge ? 'ok' : 'fail');
    setVictimEvidenceSaved(true);
  }, [user?.id, userProfile]);

  /** Contador y tope de 5 min (una sola vez por emergencia). */
  useEffect(() => {
    if (view !== 'alert_active' || !activeAlert?.id) {
      if (view !== 'alert_active' && victimTimerStartedRef.current) {
        stopVictimRecording();
      }
      return undefined;
    }

    if (victimTimerStartedRef.current) return undefined;
    victimTimerStartedRef.current = true;
    victimRecordSecRef.current = 0;
    setVictimRecordSec(0);
    setVictimEvidenceSaved(false);
    setCaptureStatus('active');

    victimRecordTimerRef.current = setInterval(() => {
      setVictimRecordSec((s) => {
        const next = s + 1;
        victimRecordSecRef.current = next;
        if (next >= EVIDENCIA_MAX_SEC) stopVictimRecording();
        return next;
      });
    }, 1000);

    victimMaxTimerRef.current = setTimeout(() => stopVictimRecording(), EVIDENCIA_MAX_SEC * 1000);

    return undefined;
  }, [view, activeAlert?.id, stopVictimRecording]);

  /** MediaRecorder ligado al stream actual (se reinicia si vuelve la cámara). */
  useEffect(() => {
    if (view !== 'alert_active' || !stream || !activeAlert?.id) return undefined;
    if (typeof MediaRecorder === 'undefined') {
      console.warn('MediaRecorder no disponible en este dispositivo.');
      return undefined;
    }
    if (victimRecorderRef.current?.state === 'recording') return undefined;

    const alertId = activeAlert.id;
    if (!victimChunksRef.current.length) victimChunksRef.current = [];

    let recorder;
    try {
      recorder = new MediaRecorder(stream, getRecorderOptions());
    } catch (e) {
      console.error('No se pudo iniciar grabación en dispositivo:', e);
      setCaptureStatus('interrupted');
      return undefined;
    }

    recorder.ondataavailable = (e) => {
      if (e.data?.size > 0) victimChunksRef.current.push(e.data);
    };

    recorder.onstop = async () => {
      if (victimRecorderRef.current !== recorder) return;
      victimRecorderRef.current = null;
      if (!victimFinalizeOnStopRef.current) return;
      victimFinalizeOnStopRef.current = false;
      const blob = new Blob(victimChunksRef.current, { type: 'video/webm' });
      victimChunksRef.current = [];
      if (blob.size > 0) {
        await finalizeVictimEvidence(blob, alertId, victimRecordSecRef.current);
      }
    };

    try {
      recorder.start(1000);
      victimRecorderRef.current = recorder;
      setCaptureStatus('active');
    } catch (e) {
      console.error(e);
      return undefined;
    }

    const partialFlush = setInterval(() => {
      if (victimRecorderRef.current?.state === 'recording') {
        try {
          victimRecorderRef.current.requestData();
        } catch (_) {}
        flushPartialVictimEvidence();
      }
    }, 5000);

    stream.getTracks().forEach((track) => {
      track.onended = () => {
        if (activeAlertRef.current && document.visibilityState === 'visible') {
          restartEmergencyMedia();
        } else {
          setCaptureStatus('paused');
          flushPartialVictimEvidence();
        }
      };
    });

    return () => {
      clearInterval(partialFlush);
      stopVictimRecorderOnly();
    };
  }, [
    view,
    stream,
    activeAlert?.id,
    finalizeVictimEvidence,
    stopVictimRecorderOnly,
    flushPartialVictimEvidence,
    restartEmergencyMedia,
  ]);

  /** Bloqueo / segundo plano: guardar fragmentos y reintentar cámara al volver. */
  useEffect(() => {
    if (view !== 'alert_active') return undefined;

    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        setCaptureStatus('paused');
        if (victimRecorderRef.current?.state === 'recording') {
          try {
            victimRecorderRef.current.requestData();
          } catch (_) {}
        }
        flushPartialVictimEvidence();
        return;
      }

      const tracksDead = !stream || stream.getTracks().every((t) => t.readyState === 'ended');
      if (tracksDead) {
        restartEmergencyMedia();
      } else {
        setCaptureStatus('active');
      }
    };

    const onPageHide = () => flushPartialVictimEvidence();

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', onPageHide);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', onPageHide);
    };
  }, [view, stream, flushPartialVictimEvidence, restartEmergencyMedia]);

  // ── PREVENIR QUE EL CELULAR SE BLOQUEE / APAGUE LA PANTALLA DURANTE LA EMERGENCIA ──
  useEffect(() => {
    let wakeLock = null;
    const requestWakeLock = async () => {
      if ('wakeLock' in navigator) {
        try {
          wakeLock = await navigator.wakeLock.request('screen');
          console.log("🔒 Command Center: Wake Lock adquirido. La pantalla permanecerá encendida.");
        } catch (err) {
          console.error("⚠️ Command Center: Error al adquirir Wake Lock:", err.message);
        }
      }
    };

    if (view === 'alert_active') {
      requestWakeLock();

      const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible') {
          requestWakeLock();
        }
      };
      
      document.addEventListener('visibilitychange', handleVisibilityChange);
      return () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        if (wakeLock) {
          wakeLock.release().then(() => {
            wakeLock = null;
            console.log("🔓 Command Center: Wake Lock liberado.");
          });
        }
      };
    }
  }, [view]);

  useEffect(() => {
    if (view !== 'alert_active' || !activeAlert) {
      if (pc) {
        pc.close();
        setPc(null);
      }
      return;
    }

    console.log("Iniciando conexión de señalización WebRTC (Lado Víctima) para Alerta:", activeAlert.id);
    const channel = supabase.channel('war-room-broadcast');
    
    let localPc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });

    if (stream) {
      stream.getTracks().forEach(track => {
        localPc.addTrack(track, stream);
      });
    }

    localPc.onicecandidate = (event) => {
      if (event.candidate) {
        channel.send({
          type: 'broadcast',
          event: `RTC_ICE_CANDIDATE_FROM_VICTIM_${activeAlert.id}`,
          payload: { candidate: event.candidate }
        });
      }
    };

    channel.on('broadcast', { event: `DISPATCHER_CONNECTED_${activeAlert.id}` }, async () => {
      console.log("Dispatcher conectado. Generando oferta WebRTC...");
      const offer = await localPc.createOffer();
      await localPc.setLocalDescription(offer);
      
      channel.send({
        type: 'broadcast',
        event: `RTC_OFFER_FROM_VICTIM_${activeAlert.id}`,
        payload: { offer: localPc.localDescription }
      });
    });

    channel.on('broadcast', { event: `RTC_ANSWER_FROM_DISPATCHER_${activeAlert.id}` }, async ({ payload }) => {
      console.log("Recibida respuesta WebRTC del despachador.");
      await localPc.setRemoteDescription(new RTCSessionDescription(payload.answer));
    });

    channel.on('broadcast', { event: `RTC_ICE_CANDIDATE_FROM_DISPATCHER_${activeAlert.id}` }, async ({ payload }) => {
      console.log("Recibido candidato ICE del despachador.");
      await localPc.addIceCandidate(new RTCIceCandidate(payload.candidate));
    });

    channel.subscribe();
    setPc(localPc);

    return () => {
      channel.unsubscribe();
      localPc.close();
    };
  }, [view, activeAlert, stream]);

  // ── LISTENER EN TIEMPO REAL: DESPACHO DEL OPERADOR ──
  useEffect(() => {
    if (view !== 'alert_active' || !activeAlert?.id) return undefined;
    const alertId = activeAlert.id;
    if (String(alertId).startsWith('pending-')) return undefined;

    const channel = supabase.channel(`dispatch-listen-${alertId}`);
    channel
      .on('broadcast', { event: `DISPATCH_UPDATE_${alertId}` }, ({ payload }) => {
        console.log('🚨 DESPACHO RECIBIDO:', payload);
        setActiveAlert(prev => prev ? { ...prev, ...payload } : prev);
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'alertas_crisis',
        filter: `id=eq.${alertId}`,
      }, ({ new: newRow }) => {
        console.log('📡 CAMBIO DB ALERTA:', newRow);
        if (newRow.estado === 'resuelta') {
          stopVictimRecording();
          setActiveAlert(null);
          setView('button');
        } else {
          setActiveAlert(prev => prev ? { ...prev, ...newRow } : prev);
        }
      })
      .subscribe();

    return () => { channel.unsubscribe(); };
  }, [view, activeAlert?.id, stopVictimRecording]);

  useEffect(() => {
    let watchId = null;
    let fallbackInterval = null;

    if (view === 'alert_active' && activeAlert) {
      const sendPositionUpdate = async (lat, lng) => {
        const alertId = activeAlertRef.current?.id;
        if (!alertId || String(alertId).startsWith('pending-')) return;
        
        console.log(`📡 Ping GPS [Fondo/Activo]: LAT ${lat}, LNG ${lng}`);
        
        const { error } = await supabase
          .from('alertas_crisis')
          .update({ latitud: lat, longitud: lng })
          .eq('id', alertId);
          
        if (error) console.error("Error al actualizar ubicación en DB:", error);

        supabase.channel('war-room-broadcast').send({
          type: 'broadcast',
          event: `LOCATION_UPDATE_${alertId}`,
          payload: { latitud: lat, longitud: lng }
        });
      };

      if (navigator.geolocation) {
        console.log("Iniciando rastreo GPS (Alta Persistencia)...");
        
        // 1. Rastreo nativo (Se pausa cuando se bloquea en iOS/Android)
        watchId = navigator.geolocation.watchPosition((position) => {
          sendPositionUpdate(position.coords.latitude, position.coords.longitude);
        }, (err) => {
          console.warn("⚠️ GPS watchPosition error:", err);
        }, {
          enableHighAccuracy: true,
          maximumAge: 0,
          timeout: 5000
        });

        // 2. Fallback Timer: Intenta forzar lectura si está en background o el watch se congeló
        fallbackInterval = setInterval(() => {
          navigator.geolocation.getCurrentPosition((position) => {
            sendPositionUpdate(position.coords.latitude, position.coords.longitude);
          }, () => {}, { enableHighAccuracy: true, maximumAge: 10000 });
        }, 8000);

        // 3. Recuperación Inmediata al despertar la pantalla
        const handleVisibilityChange = () => {
          if (document.visibilityState === 'visible') {
            console.log("🔓 Pantalla encendida: Forzando actualización GPS de Inmediato");
            navigator.geolocation.getCurrentPosition((position) => {
              sendPositionUpdate(position.coords.latitude, position.coords.longitude);
            }, () => {}, { enableHighAccuracy: true });
          }
        };
        
        document.addEventListener('visibilitychange', handleVisibilityChange);
        
        return () => {
          if (watchId !== null) navigator.geolocation.clearWatch(watchId);
          if (fallbackInterval) clearInterval(fallbackInterval);
          document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
      }
    }
  }, [view, activeAlert]);

  useEffect(() => {
    let recognition = null;
    if (isListening && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.lang = 'es-MX';
      recognition.onresult = (event) => {
        const transcript = event.results[event.results.length - 1][0].transcript.toUpperCase();
        if (transcript.includes('AYUDA 1001')) handlePanic();
      };
      recognition.start();
    }
    return () => { if (recognition) recognition.stop(); };
  }, [isListening]);

  useEffect(() => {
    if (!user) return;
    const interval = setInterval(async () => {
      await supabase.from('dispositivos_nfc')
        .update({ last_heartbeat: new Date().toISOString() })
        .eq('usuario_id', user.id);
      console.log("Heartbeat enviado");
    }, 1000 * 60 * 5); // Cada 5 min para pruebas
    return () => clearInterval(interval);
  }, [user]);

  const handleNFCPairing = async () => {
    if (!('NDEFReader' in window)) {
      alert("Tu dispositivo no soporta lectura NFC nativa. Usando simulador para pruebas.");
      setNfcStatus('scanning');
      setTimeout(async () => {
        const fakeId = 'NFC-' + Math.random().toString(36).substr(2, 9).toUpperCase();
        const { error } = await supabase.from('dispositivos_nfc').insert([{
          usuario_id: user.id,
          nfc_tag_id: fakeId
        }]);
        if (!error) setNfcStatus('paired');
      }, 3000);
      return;
    }
    try {
      const ndef = new window.NDEFReader();
      await ndef.scan();
      setNfcStatus('scanning');
      ndef.onreading = async (event) => {
        const { error } = await supabase.from('dispositivos_nfc').insert([{
          usuario_id: user.id,
          nfc_tag_id: event.serialNumber
        }]);
        if (!error) setNfcStatus('paired');
      };
    } catch (error) { alert("Error NFC: " + error); }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) handleSession(session);
      else setStatus('idle');
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) handleSession(session);
      else { setUser(null); setUserProfile(null); setView('login'); setStatus('idle'); }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSession = async (session) => {
    setUser(session.user);
    try {
      // PRIORIDAD ABSOLUTA PARA EL DUEÑO - Mantenemos esto como seguro
      if (session.user.email === 'osirislopezruiz@gmail.com') {
        setUserProfile({ nombre_completo: 'Osiris Lopez (Super Admin)', rol: 'admin' });
        setView('admin');
        setStatus('idle');
      }

      const { data, error } = await supabase.from('usuarios_clave').select('*').eq('id', session.user.id).single();
      
      if (data && !error) {
        setUserProfile(data);
        
        // CARGAR CONFIGURACIÓN DE MARCA (B2B) - Soporte para ambas columnas (con/sin acento)
        const orgId = data['organizaci\u00f3n_id'] || data['organizacion_id']; 
        if (orgId) {
          const { data: orgData } = await supabase.from('organizaciones').select('*').eq('id', orgId).single();
          if (orgData) {
            // ── INYECCIÓN DINÁMICA DE ETIQUETA BLANCA ──
            // 1. Google Font
            const fontName = orgData.tipo_letra || 'Inter';
            const existingFont = document.querySelector(`link[data-wl-font]`);
            if (!existingFont || existingFont.dataset.wlFont !== fontName) {
              if (existingFont) existingFont.remove();
              const fontLink = document.createElement('link');
              fontLink.rel = 'stylesheet';
              fontLink.href = `https://fonts.googleapis.com/css2?family=${fontName.replace(/ /g, '+')}:wght@400;700;900&display=swap`;
              fontLink.dataset.wlFont = fontName;
              document.head.appendChild(fontLink);
            }
            // 2. Variables CSS
            const root = document.documentElement;
            if (orgData.color_primario) root.style.setProperty('--wl-bg', orgData.color_primario);
            if (orgData.color_secundario) root.style.setProperty('--wl-text', orgData.color_secundario);
            if (orgData.color_acento) {
              root.style.setProperty('--wl-accent', orgData.color_acento);
              root.style.setProperty('--accent-gold', orgData.color_acento);
            }
            if (fontName) root.style.setProperty('--wl-font', `'${fontName}', sans-serif`);
            setUserProfile(prev => ({ ...prev, organization: orgData, organizacion_id: orgId }));
          }
        }

        if (data.acuerdos_aceptados === false) {
          setView('terms_acceptance');
        } else {
          const adminRoles = ['admin', 'operador', 'franquicia_admin', 'franquicia_gerente', 'franquicia_coordinador', 'franquicia_supervisor', 'franquicia_representante'];
          if (adminRoles.includes(data.rol)) {
            setView('admin');
          } else if (data.rol === 'erex' || data.rol === 'vigilante') {
            setView('erex');
          } else {
            // BUSCAR ALERTA ACTIVA DEL USUARIO
            const { data: alertData } = await supabase
              .from('alertas_crisis')
              .select('*')
              .eq('usuario_id', session.user.id)
              .in('estado', ['activa', 'en_camino'])
              .order('fecha_inicio', { ascending: false })
              .limit(1)
              .maybeSingle();
            
            if (alertData) {
              setActiveAlert(alertData);
              setView('alert_active');
            } else {
              setView('button');
            }
          }
        }
      } else if (session.user.email !== 'osirislopezruiz@gmail.com') {
        // Solo enviamos a verificación si no es el dueño y no tiene perfil
        setView('verification');
      }
    } catch (e) {
      console.error("Error en handleSession:", e);
      if (session.user.email !== 'osirislopezruiz@gmail.com') setView('login');
    } finally {
      setStatus('idle');
    }
  };

  const handleAcceptTerms = async () => {
    if (!acceptedPriv || !acceptedTerms || !acceptedArco) {
      alert("Debes aceptar todas las casillas para continuar.");
      return;
    }
    setIsSavingTerms(true);
    try {
      let ip = 'Desconocida';
      try {
        const resIp = await fetch('https://api.ipify.org?format=json');
        const dataIp = await resIp.json();
        ip = dataIp.ip;
      } catch (e) {
        console.warn('No se pudo obtener IP:', e);
      }

      const orgName = userProfile?.organization?.nombre || 'Arché Holding Labs / Clave 1001';
      const fecha = new Date().toISOString();
      const content = `ACUERDO LEGAL Y ACEPTACIÓN DE TÉRMINOS
Organización Responsable: ${orgName}
Usuario: ${userProfile?.nombre_completo || user?.email}
ID de Usuario: ${user?.id}
Fecha de Aceptación: ${fecha}
Dirección IP: ${ip}

El usuario ha leído y aceptado explícitamente:
1. Términos y Condiciones de Uso del Sistema Táctico.
2. Aviso de Privacidad y Manejo de Datos Sensibles (incluyendo geolocalización y multimedia).
3. Derechos ARCO y Políticas de Retención de Evidencias.

Este documento sirve como comprobante legal inmutable de la aceptación de los términos estipulados por ${orgName}.
      `;

      const encoder = new TextEncoder();
      const dataBuffer = encoder.encode(content);
      const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      const fullContent = content + `\nFirma Digital (SHA-256): ${hashHex}\n`;

      const { error } = await supabase.from('usuarios_clave').update({
        acuerdos_aceptados: true,
        acuerdos_hash: hashHex,
        acuerdos_fecha: fecha,
        acuerdos_ip: ip
      }).eq('id', user.id);

      if (error) throw error;

      let bridgeSuccess = false;
      const bridgeUrl = userProfile?.organization?.bridge_url || 'http://127.0.0.1:4005';
      const bridgeKey = userProfile?.organization?.bridge_api_key || 'CLAVE-1001-TEST-KEY';
      
      try {
        const resBridge = await fetch(`${bridgeUrl}/api/v1/acuerdos_legales`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-bridge-api-key': bridgeKey },
          body: JSON.stringify({
            usuario_id: user.id,
            nombre: userProfile?.nombre_completo || user.email,
            organizacionId: userProfile?.organizacion_id,
            content: fullContent
          })
        });
        if (resBridge.ok) {
          bridgeSuccess = true;
          console.log("Acuerdo guardado exitosamente en el disco duro local (Bridge).");
        }
      } catch (e) {
        console.warn("Bridge no disponible, se usará descarga web local.", e);
      }

      if (!bridgeSuccess) {
        const blob = new Blob([fullContent], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Acuerdo_${(userProfile?.nombre_completo || 'Usuario').replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().getTime()}.txt`;
        a.click();
        URL.revokeObjectURL(url);
      }

      setUserProfile(prev => ({...prev, acuerdos_aceptados: true}));
      const adminRoles = ['admin', 'operador', 'franquicia_admin', 'franquicia_gerente', 'franquicia_coordinador', 'franquicia_supervisor', 'franquicia_representante'];
      if (adminRoles.includes(userProfile?.rol)) {
        setView('admin');
      } else if (userProfile?.rol === 'erex' || userProfile?.rol === 'vigilante') {
        setView('erex');
      } else {
        setView('button');
      }

    } catch (e) {
      alert("Error al procesar la aceptación: " + e.message);
    } finally {
      setIsSavingTerms(false);
    }
  };

  const [isRegister, setIsRegister] = useState(false);
  const [installPrompt, setInstallPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Capturar el evento nativo del navegador para instalar como PWA
    const handler = (e) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    // Detectar si ya está instalada
    window.addEventListener('appinstalled', () => setIsInstalled(true));
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) return; // Solo funciona en Android/Chrome
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
      setInstallPrompt(null);
    }
  };

  const pickContact = async (setter) => {
    if ('contacts' in navigator && 'ContactsManager' in window) {
      try {
        const props = ['name', 'tel'];
        const opts = { multiple: false };
        const contacts = await navigator.contacts.select(props, opts);
        if (contacts.length > 0 && contacts[0].tel && contacts[0].tel.length > 0) {
          // Limpiar caracteres no numéricos del teléfono
          let phoneNum = contacts[0].tel[0].replace(/\D/g, '');
          // Si tiene código de país largo, tratar de sacar los últimos 10 dígitos (formato MX)
          if (phoneNum.length > 10) phoneNum = phoneNum.slice(-10);
          setter(phoneNum);
        }
      } catch (ex) {
        console.error("Error al abrir contactos:", ex);
      }
    } else {
      alert("⚠️ Tu navegador no soporta la función de agenda automática. Por favor, escribe el número.");
    }
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setStatus('loading');

    try {
      if (isRegister) {
        const { data: authData, error: authError } = await supabase.auth.signUp({ email, password });
        if (authError) {
          alert("Error al registrar: " + authError.message);
        } else if (authData.user) {
          const { error: profileError } = await supabase.from('usuarios_clave').insert([{
            id: authData.user.id,
            nombre_completo: fullName,
            telefono: phone,
            rol: b2bOrg ? 'usuario' : role,
            'organizacion_id': b2bOrg ? b2bOrg.id : null,
            'organización_id': b2bOrg ? b2bOrg.id : null,
            contactos_referencia: [c1, c2, c3].filter(Boolean),
            clave_seguridad: safetyCode,
            acuerdos_aceptados: true
          }]);
          if (profileError) {
            alert("Error al crear perfil: " + profileError.message);
          } else {
            // Guardar log de términos
            try {
              let ip = 'Desconocida';
              try {
                const resIp = await fetch('https://api.ipify.org?format=json');
                const dataIp = await resIp.json();
                ip = dataIp.ip;
              } catch (e) {}
              const fecha = new Date().toISOString();
              const content = `ACUERDO LEGAL (REGISTRO B2B/PWA)\nUsuario: ${fullName} (${email})\nFecha: ${fecha}\nIP: ${ip}\nAceptó Términos, Privacidad y ARCO.`;
              const encoder = new TextEncoder();
              const dataBuffer = encoder.encode(content);
              const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
              const hashArray = Array.from(new Uint8Array(hashBuffer));
              const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
              await supabase.from('logs_auditoria').insert([{
                usuario_id: authData.user.id,
                accion: 'aceptacion_terminos_registro',
                detalles: { ip, hash: hashHex, fecha, documento_firmado: content }
              }]);
            } catch (e) {
              console.warn("No se pudo guardar el log de auditoría:", e);
            }

            if (authData.session) {
              await handleSession(authData.session);
            } else {
              const { data: signData } = await supabase.auth.signInWithPassword({ email, password });
              if (signData?.session) {
                await handleSession(signData.session);
              } else {
                alert("¡Alta exitosa! Por favor, inicia sesión con tu nueva clave.");
                setIsRegister(false);
              }
            }
          }
        }
      } else {
        // Soporte para login corto: si no lleva @ se añade @clave1001.com automáticamente
        const resolvedEmail = email.includes('@') ? email : `${email.trim().toLowerCase()}@clave1001.com`;
        console.log("Iniciando sesión oficial para:", resolvedEmail);
        const { data, error } = await supabase.auth.signInWithPassword({ email: resolvedEmail, password });
        
        if (error) {
          console.error("Error de Supabase Auth:", error.message);
          alert("ERROR DE ACCESO: " + error.message);
        } else if (data.session) {
          console.log("Sesión obtenida con éxito, ID:", data.session.user.id);
          // LLAMADA MANUAL PARA NO ESPERAR AL LISTENER
          await handleSession(data.session);
        }
      }
    } catch (err) {
      console.error(err);
    }
    setStatus('idle');
  };

  if (status === 'checking') return (
    <div className="panic-container">
      <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
        <img src="/logo.png" style={{ width: 64, height: 64, objectFit: 'contain' }} alt="Logo" />
      </motion.div>
      <p style={{ marginTop: 20, letterSpacing: 2, color: '#e2e8f0' }}>AUTENTICANDO...</p>
    </div>
  );

  if (view === 'login') return (
    <div className="login-wrapper">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }} 
        animate={{ opacity: 1, scale: 1 }} 
        className="login-card-premium"
      >
        <div className="login-header">
          {isRegister && (
            <button className="back-link" onClick={() => setIsRegister(false)}>
              ← REGRESAR
            </button>
          )}
          <div className="brand-badge">CLAVE 1001</div>
          <motion.div 
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            className="logo-container"
          >
            <div className="custom-logo">
              <img 
                src={b2bOrg?.logo_url || "/logo.png"} 
                alt="Logo" 
                style={{ height: 80, width: 80, objectFit: 'contain', zIndex: 2, filter: 'drop-shadow(0 0 18px rgba(226, 232, 240, 0.35))' }} 
              />
              <div className="logo-pulse" />
            </div>
          </motion.div>
          <h1>{b2bOrg ? b2bOrg.nombre.toUpperCase() : 'CENTRO DE MANDO'}</h1>
          <p className="subtitle">{b2bOrg ? 'PROTECCIÓN CORPORATIVA ACTIVA' : (isRegister ? 'REGISTRO DE LICENCIA' : 'ACCESO INSTITUCIONAL')}</p>
        </div>

        <form onSubmit={handleAuth} className="login-form">
          {isRegister && (
            <>
              <div className="input-group-premium">
                <label>NOMBRE COMPLETO</label>
                <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} required placeholder="Nombre Apellido" />
              </div>
              <div className="input-group-premium">
                <label>TELÉFONO DE CONTACTO</label>
                <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} required placeholder="10 dígitos" />
              </div>
              {!b2bOrg && (
                <div className="input-group-premium">
                  <label>TIPO DE LICENCIA</label>
                  <select 
                    className="select-premium" 
                    value={role} 
                    onChange={e => setRole(e.target.value)}
                    style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', padding: '14px', borderRadius: '12px', color: 'white', outline: 'none' }}
                  >
                    <option value="padre" style={{ background: '#0f172a' }}>Padre de Familia</option>
                    <option value="transportista" style={{ background: '#0f172a' }}>Transportista / Flotilla</option>
                  </select>
                </div>
              )}
              {isRegister && (
                <div className="contacts-section">
                  <label style={{ display: 'block', color: 'var(--accent-gold)', fontSize: 10, fontWeight: 800, marginBottom: 8, letterSpacing: 1 }}>3 CONTACTOS DE EMERGENCIA (Opcional)</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
                    <div className="contact-input-wrapper">
                      <input type="tel" value={c1} onChange={e => setC1(e.target.value)} placeholder="Teléfono 1" className="mini-input" />
                      <button type="button" onClick={() => pickContact(setC1)} className="btn-agenda" title="Abrir Agenda"><Book size={16} /></button>
                    </div>
                    <div className="contact-input-wrapper">
                      <input type="tel" value={c2} onChange={e => setC2(e.target.value)} placeholder="Teléfono 2" className="mini-input" />
                      <button type="button" onClick={() => pickContact(setC2)} className="btn-agenda" title="Abrir Agenda"><Book size={16} /></button>
                    </div>
                    <div className="contact-input-wrapper">
                      <input type="tel" value={c3} onChange={e => setC3(e.target.value)} placeholder="Teléfono 3" className="mini-input" />
                      <button type="button" onClick={() => pickContact(setC3)} className="btn-agenda" title="Abrir Agenda"><Book size={16} /></button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
          <div className="input-group-premium">
            <label>CORREO ELECTRÓNICO</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="usuario@correo.com" />
          </div>
          <div className="input-group-premium">
            <label>CLAVE DE ACCESO</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••••" />
          </div>
          {isRegister && (
            <div className="input-group-premium">
              <label>PALABRA CLAVE DE SEGURIDAD</label>
              <input type="text" value={safetyCode} onChange={e => setSafetyCode(e.target.value)} required placeholder="Ej. Mandarina" />
              <p style={{ fontSize: 8, color: 'var(--accent-gold)', marginTop: 4 }}>* Se usará para desactivar alertas</p>
            </div>
          )}

          {isRegister && (
            <div className="terms-section" style={{ marginTop: '15px', marginBottom: '15px', padding: '12px', background: 'rgba(0,0,0,0.4)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <label style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', cursor: 'pointer', marginBottom: '10px' }}>
                <input type="checkbox" required checked={acceptedTerms} onChange={e => setAcceptedTerms(e.target.checked)} style={{ width: '16px', height: '16px', marginTop: '1px', accentColor: 'var(--accent-gold)' }} />
                <span style={{ color: '#cbd5e1', fontSize: '10px', lineHeight: '1.4' }}>Acepto los Términos de Uso y las políticas de la plataforma.</span>
              </label>
              <label style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', cursor: 'pointer', marginBottom: '10px' }}>
                <input type="checkbox" required checked={acceptedPriv} onChange={e => setAcceptedPriv(e.target.checked)} style={{ width: '16px', height: '16px', marginTop: '1px', accentColor: 'var(--accent-gold)' }} />
                <span style={{ color: '#cbd5e1', fontSize: '10px', lineHeight: '1.4' }}>Acepto el Aviso de Privacidad y el uso de mis datos (GPS y multimedia) en emergencias.</span>
              </label>
              <label style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', cursor: 'pointer' }}>
                <input type="checkbox" required checked={acceptedArco} onChange={e => setAcceptedArco(e.target.checked)} style={{ width: '16px', height: '16px', marginTop: '1px', accentColor: 'var(--accent-gold)' }} />
                <span style={{ color: '#cbd5e1', fontSize: '10px', lineHeight: '1.4' }}>Reconozco mis Derechos ARCO sobre el manejo de mi información.</span>
              </label>
            </div>
          )}
          
          <button type="submit" className="login-btn-premium" disabled={status === 'loading'}>
            {status === 'loading' ? (
              <span className="loader-dots">Procesando...</span>
            ) : (
              <>{isRegister ? 'SOLICITAR ALTA' : 'AUTORIZAR ENTRADA'} <CheckCircle size={16} style={{ marginLeft: 8 }} /></>
            )}
          </button>
        </form>

        <div className="login-footer-actions">
          <button onClick={() => setIsRegister(!isRegister)}>
            {isRegister ? '¿Ya tienes cuenta? Iniciar sesión' : '¿Nuevo usuario? Solicitar Licencia'}
          </button>
        </div>

        <div className="holding-brand">
          <div className="divider-line" />
          <p>PROPIEDAD DE <span>ARCHÉ HOLDING LABS</span></p>
          <div className="security-seal">ENCAPSULADO AES-256</div>
        </div>

        {!isInstalled && (
          <button className="btn-install-pwa" onClick={handleInstall}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            DESCARGAR APLICACIÓN
          </button>
        )}
        {isInstalled && (
          <div className="install-success">
            <CheckCircle size={14} color="#22c55e" /> App instalada en tu dispositivo
          </div>
        )}
      </motion.div>

      <style>{`
        :root {
          --bg-dark: #000000;
          --card-dark: #090d16;
          --accent-gold: #e2e8f0;
          --text-gray: #94a3b8;
          --border-color: rgba(226, 232, 240, 0.12);
        }

        .login-wrapper {
          min-height: 100vh;
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #000000;
          background-image:
            linear-gradient(rgba(255,255,255,0.018) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.018) 1px, transparent 1px);
          background-size: 28px 28px;
          font-family: 'Inter', sans-serif;
          padding: 20px;
        }

        .login-card-premium {
          background: var(--card-dark);
          width: 100%;
          max-width: 400px;
          padding: 32px 40px;
          border-radius: 20px;
          border: 1px solid var(--border-color);
          box-shadow: 0 40px 80px -20px rgba(0, 0, 0, 0.9), 0 0 0 1px rgba(255,255,255,0.04);
          position: relative;
          overflow-y: auto;
          max-height: 90vh;
        }

        .login-card-premium::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0; height: 1px;
          background: linear-gradient(90deg, transparent, rgba(226,232,240,0.3), transparent);
        }

        @media (max-height: 800px) {
          .login-card-premium {
            padding: 20px 30px;
            border-radius: 16px;
          }
          .login-header {
            margin-bottom: 20px !important;
          }
          .brand-badge {
            margin-bottom: 12px !important;
            padding: 2px 10px !important;
            font-size: 8px !important;
          }
          .logo-container {
            margin-bottom: 12px !important;
          }
          .custom-logo, .custom-logo img {
            width: 60px !important;
            height: 60px !important;
          }
          .login-header h1 {
            font-size: 16px !important;
          }
          .subtitle {
            font-size: 9px !important;
            margin-top: 4px !important;
          }
          .input-group-premium {
            margin-bottom: 14px !important;
          }
          .input-group-premium label {
            margin-bottom: 4px !important;
            font-size: 8px !important;
          }
          .input-group-premium input {
            padding: 10px 14px !important;
            font-size: 13px !important;
          }
          .login-btn-premium {
            padding: 12px !important;
            font-size: 11px !important;
          }
          .holding-brand {
            margin-top: 24px !important;
          }
          .divider-line {
            margin-bottom: 12px !important;
          }
          .btn-install-pwa {
            margin-top: 10px !important;
            padding: 10px !important;
            font-size: 9px !important;
          }
        }

        .login-header { text-align: center; margin-bottom: 40px; position: relative; }
        
        .back-link {
          position: absolute;
          top: -20px;
          left: 0;
          background: none;
          border: none;
          color: var(--accent-gold);
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 1px;
          cursor: pointer;
          opacity: 0.7;
          transition: opacity 0.3s;
        }
        .back-link:hover { opacity: 1; }

        .brand-badge {
          display: inline-block;
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 3px;
          color: #e2e8f0;
          border: 1px solid rgba(226,232,240,0.2);
          background: rgba(226,232,240,0.04);
          padding: 4px 14px;
          border-radius: 100px;
          margin-bottom: 24px;
          text-transform: uppercase;
        }

        .logo-container { margin-bottom: 24px; }
        
        .custom-logo {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 80px;
          height: 80px;
          margin: 0 auto;
        }

        .logo-shield {
          position: absolute;
          opacity: 0.8;
        }

        .logo-pin {
          position: relative;
          z-index: 2;
          filter: drop-shadow(0 0 10px rgba(255,255,255,0.5));
          animation: pin-bounce 2s infinite ease-in-out;
        }

        @keyframes pin-bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }

        .logo-pulse {
          position: absolute;
          width: 30px;
          height: 30px;
          background: var(--accent-gold);
          border-radius: 50%;
          z-index: 1;
          opacity: 0;
          animation: logo-pulse-anim 3s infinite;
        }

        @keyframes logo-pulse-anim {
          0% { transform: scale(0.5); opacity: 0.8; }
          100% { transform: scale(2.5); opacity: 0; }
        }

        .login-header h1 {
          color: white;
          font-size: 20px;
          font-weight: 800;
          letter-spacing: 2px;
          margin: 0;
        }

        .subtitle {
          color: var(--text-gray);
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 1.5px;
          margin-top: 8px;
          text-transform: uppercase;
        }

        .input-group-premium { margin-bottom: 24px; text-align: left; }
        .input-group-premium label {
          display: block;
          color: var(--text-gray);
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 1px;
          margin-bottom: 8px;
        }

        .input-group-premium input {
          width: 100%;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.1);
          padding: 14px 16px;
          border-radius: 12px;
          color: white;
          font-size: 14px;
          transition: all 0.3s;
          outline: none;
        }

        .input-group-premium input:focus {
          border-color: var(--accent-gold);
          background: rgba(197, 160, 89, 0.05);
        }

        .login-btn-premium {
          width: 100%;
          background: #e2e8f0;
          color: #000000;
          border: none;
          padding: 16px;
          border-radius: 12px;
          font-weight: 900;
          font-size: 12px;
          letter-spacing: 2px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s;
          text-transform: uppercase;
        }

        .login-btn-premium:hover {
          background: #ffffff;
          transform: translateY(-2px);
          box-shadow: 0 12px 30px rgba(226, 232, 240, 0.15);
        }

        .contact-input-wrapper {
          display: flex;
          gap: 8px;
          align-items: center;
        }

        .mini-input {
          flex: 1;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.1);
          padding: 12px;
          border-radius: 8px;
          color: white;
          font-size: 13px;
          outline: none;
        }
        .mini-input:focus { border-color: var(--accent-gold); }

        .btn-agenda {
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          color: var(--accent-gold);
          width: 44px;
          height: 44px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
        }
        .btn-agenda:hover { background: rgba(197, 160, 89, 0.1); border-color: var(--accent-gold); }

        .login-footer-actions { margin-top: 32px; text-align: center; }
        .login-footer-actions button {
          background: none;
          border: none;
          color: var(--text-gray);
          font-size: 11px;
          font-weight: 600;
          cursor: pointer;
          transition: color 0.3s;
        }
        .login-footer-actions button:hover { color: white; }

        .holding-brand { margin-top: 48px; text-align: center; }
        .divider-line {
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent);
          margin-bottom: 24px;
        }
        .holding-brand p {
          color: var(--text-gray);
          font-size: 9px;
          font-weight: 500;
          letter-spacing: 2px;
          margin: 0;
        }
        .holding-brand span { color: white; font-weight: 800; }
        
        .security-seal {
          display: inline-block;
          margin-top: 12px;
          font-size: 8px;
          font-weight: 900;
          color: #22c55e;
          background: rgba(34, 197, 94, 0.1);
          padding: 2px 8px;
          border-radius: 4px;
        }

        .btn-install-pwa {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          width: 100%;
          margin-top: 16px;
          padding: 14px;
          background: rgba(197, 160, 89, 0.08);
          border: 1px solid rgba(197, 160, 89, 0.3);
          border-radius: 12px;
          color: var(--accent-gold);
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 1.5px;
          cursor: pointer;
          transition: all 0.3s;
        }
        .btn-install-pwa:hover {
          background: rgba(197, 160, 89, 0.15);
          border-color: var(--accent-gold);
          transform: translateY(-1px);
          box-shadow: 0 8px 20px rgba(197, 160, 89, 0.15);
        }

        .install-success {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          margin-top: 16px;
          font-size: 11px;
          color: #22c55e;
          font-weight: 600;
        }

        /* ALERT ACTIVE MODE — OBSIDIAN EMERGENCY */
        .alert-mode {
          background: radial-gradient(ellipse at top, #1a0505 0%, #000000 60%) !important;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 30px 20px;
          gap: 0;
        }
        .alert-banner {
          margin-bottom: 24px;
        }
        .alert-banner h2 {
          color: #ef4444;
          font-size: 22px;
          font-weight: 900;
          letter-spacing: 3px;
          margin: 16px 0 8px;
          text-transform: uppercase;
        }
        .alert-banner p {
          color: #94a3b8;
          font-size: 10px;
          letter-spacing: 2px;
          font-weight: 700;
          text-transform: uppercase;
        }

        /* DISPATCH BANNER */
        .tactical-dispatch-banner {
          width: 100%;
          max-width: 360px;
          background: rgba(16, 185, 129, 0.08);
          border: 1px solid rgba(16, 185, 129, 0.4);
          border-radius: 16px;
          padding: 16px 20px;
          display: flex;
          align-items: center;
          gap: 14px;
          margin-bottom: 20px;
          position: relative;
          overflow: hidden;
          animation: dispatch-appear 0.4s ease;
        }
        @keyframes dispatch-appear {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .dispatch-icon { font-size: 24px; }
        .dispatch-text { flex: 1; text-align: left; }
        .dispatch-label {
          font-size: 8px;
          font-weight: 900;
          letter-spacing: 2px;
          color: #10b981;
          text-transform: uppercase;
          margin-bottom: 2px;
        }
        .dispatch-unit {
          font-size: 14px;
          font-weight: 900;
          color: #ffffff;
          letter-spacing: 1px;
        }
        .dispatch-pulse {
          position: absolute;
          inset: 0;
          background: rgba(16, 185, 129, 0.04);
          animation: dispatch-pulse-anim 2s infinite;
        }
        @keyframes dispatch-pulse-anim {
          0%, 100% { opacity: 0; }
          50% { opacity: 1; }
        }

        .safety-box {
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.07);
          padding: 28px;
          border-radius: 20px;
          width: 100%;
          max-width: 320px;
        }
        .safety-box label {
          display: block;
          color: #94a3b8;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 1.5px;
          margin-bottom: 16px;
          text-transform: uppercase;
        }
        .safety-input {
          width: 100%;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.12);
          padding: 16px;
          border-radius: 12px;
          color: white;
          font-size: 18px;
          text-align: center;
          font-weight: 700;
          margin-bottom: 20px;
          outline: none;
          box-sizing: border-box;
          transition: border-color 0.2s;
        }
        .safety-input:focus { border-color: rgba(239, 68, 68, 0.6); background: rgba(239, 68, 68, 0.03); }
        .btn-deactivate {
          width: 100%;
          padding: 16px;
          background: rgba(255,255,255,0.06);
          color: #e2e8f0;
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 12px;
          font-weight: 900;
          font-size: 11px;
          letter-spacing: 2px;
          cursor: pointer;
          transition: all 0.3s;
          text-transform: uppercase;
        }
        .btn-deactivate:hover { background: rgba(239, 68, 68, 0.15); border-color: rgba(239, 68, 68, 0.5); color: white; }
        .alert-footer { margin-top: 24px; color: #475569; font-size: 10px; letter-spacing: 1px; }
      `}</style>
    </div>
  );

  if (view === 'admin') return <AdminPanel userProfile={userProfile} />;
  if (view === 'erex') return <ErexDashboard userProfile={userProfile} />;

  if (view === 'terms_acceptance') {
    const orgName = userProfile?.organization?.nombre || 'Arché Holding Labs / Clave 1001';
    return (
      <div className="login-container">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="login-box" style={{ maxWidth: '600px', padding: '40px', maxHeight: '90vh', overflowY: 'auto', background: 'var(--card-dark)', borderRadius: '20px', border: '1px solid var(--border-color)' }}>
          <h1 style={{ fontSize: '24px', marginBottom: '10px' }}>ACEPTACIÓN <span>LEGAL</span></h1>
          <p style={{ color: '#94a3b8', fontSize: '13px', marginBottom: '30px', lineHeight: '1.6' }}>
            Para garantizar la seguridad de todos los usuarios y cumplir con las normativas internacionales de protección de datos, es estrictamente necesario que aceptes los términos de uso y aviso de privacidad de <strong>{orgName}</strong>.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', textAlign: 'left', marginBottom: '30px' }}>
            
            <label style={{ display: 'flex', gap: '15px', alignItems: 'flex-start', cursor: 'pointer' }}>
              <input type="checkbox" checked={acceptedTerms} onChange={e => setAcceptedTerms(e.target.checked)} style={{ width: '20px', height: '20px', marginTop: '2px', accentColor: 'var(--accent-gold)' }} />
              <div>
                <strong style={{ display: 'block', color: 'white', marginBottom: '5px', fontSize: '14px' }}>Términos y Condiciones de Uso</strong>
                <span style={{ color: '#64748b', fontSize: '12px', lineHeight: '1.4', display: 'block' }}>Acepto el uso del sistema táctico y comprendo que el mal uso de las alertas de emergencia puede incurrir en sanciones.</span>
              </div>
            </label>

            <label style={{ display: 'flex', gap: '15px', alignItems: 'flex-start', cursor: 'pointer' }}>
              <input type="checkbox" checked={acceptedPriv} onChange={e => setAcceptedPriv(e.target.checked)} style={{ width: '20px', height: '20px', marginTop: '2px', accentColor: 'var(--accent-gold)' }} />
              <div>
                <strong style={{ display: 'block', color: 'white', marginBottom: '5px', fontSize: '14px' }}>Aviso de Privacidad y Tratamiento de Datos</strong>
                <span style={{ color: '#64748b', fontSize: '12px', lineHeight: '1.4', display: 'block' }}>Consiento la recolección, transmisión y almacenamiento seguro de mi ubicación GPS, audio y video (evidencias) durante una crisis, gestionados por {orgName}.</span>
              </div>
            </label>

            <label style={{ display: 'flex', gap: '15px', alignItems: 'flex-start', cursor: 'pointer' }}>
              <input type="checkbox" checked={acceptedArco} onChange={e => setAcceptedArco(e.target.checked)} style={{ width: '20px', height: '20px', marginTop: '2px', accentColor: 'var(--accent-gold)' }} />
              <div>
                <strong style={{ display: 'block', color: 'white', marginBottom: '5px', fontSize: '14px' }}>Derechos ARCO y Retención</strong>
                <span style={{ color: '#64748b', fontSize: '12px', lineHeight: '1.4', display: 'block' }}>Reconozco mis derechos de Acceso, Rectificación, Cancelación y Oposición respecto a los datos almacenados en los servidores de la organización.</span>
              </div>
            </label>

          </div>

          <button onClick={handleAcceptTerms} disabled={isSavingTerms || !acceptedTerms || !acceptedPriv || !acceptedArco} className="login-btn btn-premium-gold" style={{ width: '100%' }}>
            {isSavingTerms ? 'FIRMANDO...' : 'FIRMAR ELECTRÓNICAMENTE Y CONTINUAR'}
          </button>
          
          <div style={{ marginTop: '20px', fontSize: '10px', color: '#475569', textAlign: 'center' }}>
            Al firmar, se generará un comprobante digital con tu Dirección IP, ID de Usuario y Sello de Tiempo (Hash SHA-256) que será guardado localmente por la organización responsable para fines de auditoría.
          </div>
        </motion.div>
      </div>
    );
  }

  if (view === 'nfc') return (
    <div className="panic-container">
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="nfc-card">
        <button className="back-btn" onClick={() => setView('button')}>← Volver</button>
        <div className="nfc-icon-wrapper">
          <QrCode size={64} className={nfcStatus === 'scanning' ? 'scanning-anim' : ''} />
        </div>
        <h2>{nfcStatus === 'idle' ? 'Vincular Chip NFC' : nfcStatus === 'scanning' ? 'Acerca el chip...' : '¡Vinculado!'}</h2>
        <p>Acerca tu tarjeta o llavero NFC a la parte trasera de tu celular para registrarlo.</p>
        
        {nfcStatus === 'idle' && (
          <button className="login-btn" onClick={handleNFCPairing}>Iniciar Escaneo</button>
        )}
        {nfcStatus === 'paired' && (
          <div style={{ marginTop: 20 }}>
            <p style={{ color: 'var(--success)', fontWeight: 800 }}>✅ DISPOSITIVO VINCULADO</p>
            <button className="btn-secondary" onClick={() => { setView('button'); setNfcStatus('idle'); }} style={{ color: 'black', borderColor: 'black' }}>Terminar</button>
          </div>
        )}
      </motion.div>
      <style>{`
        .nfc-card { background: white; padding: 40px; border-radius: 24px; text-align: center; max-width: 300px; color: #0f172a; position: relative; }
        .nfc-icon-wrapper { margin: 20px 0; color: #c5a059; }
        .scanning-anim { animation: pulse-nfc 1.5s infinite; }
        @keyframes pulse-nfc { 0% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.2); opacity: 0.5; } 100% { transform: scale(1); opacity: 1; } }
        .back-btn { background: none; border: none; color: #64748b; position: absolute; top: 20px; left: 20px; cursor: pointer; font-weight: 700; }
      `}</style>
    </div>
  );

  const patchAlertCoordinates = async (lat, lng) => {
    setActiveAlert((prev) => (prev ? { ...prev, latitud: lat, longitud: lng } : prev));
    const alertId = activeAlertRef.current?.id;
    if (!alertId || String(alertId).startsWith('pending-')) return;
    const { error } = await supabase
      .from('alertas_crisis')
      .update({ latitud: lat, longitud: lng })
      .eq('id', alertId);
    if (error) console.error('Error al refinar ubicación:', error);
  };

  const broadcastIncident = (alertId, extra = {}) => {
    const cached = locationRef.current;
    const lat = cached?.lat ?? 0;
    const lng = cached?.lng ?? 0;
    supabase.channel('war-room-broadcast').send({
      type: 'broadcast',
      event: 'INCIDENT_TRIGGERED',
      payload: {
        id: alertId,
        latitud: lat,
        longitud: lng,
        estado: 'activa',
        fecha_inicio: new Date().toISOString(),
        usuario_id: user?.id,
        usuario: {
          id: user?.id,
          nombre_completo: userProfile?.nombre_completo || 'Usuario de auxilio',
          telefono: userProfile?.telefono || '',
          organizacion_id: userProfile?.organizacion_id || userProfile?.['organización_id'] || null,
          organizacion: userProfile?.organization || null,
          clave_seguridad: userProfile?.clave_seguridad || '',
          contactos_referencia: userProfile?.contactos_referencia || [],
        },
        ...extra,
      },
    });
  };

  const activateEmergencyUI = (partialAlert) => {
    if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
    setActiveAlert(partialAlert);
    setView('alert_active');
  };

  const persistAlert = async (lat, lng, optimisticId) => {
    let ip = 'Desconocida';
    try {
      const resIp = await fetch('https://api.ipify.org?format=json');
      const dataIp = await resIp.json();
      ip = dataIp.ip;
    } catch (e) {}

    const alertPayload = {
      tipo_activacion: 'boton',
      latitud: lat,
      longitud: lng,
      estado: 'activa',
      usuario_id: user.id,
      ip_victima: ip
    };

    const orgId = userProfile?.organizacion_id || userProfile?.organization?.id;
    if (orgId) alertPayload.organizacion_id = orgId;

    let result = await supabase.from('alertas_crisis').insert([alertPayload]).select().single();

    if (result.error && result.error.message?.includes('column')) {
      if (result.error.message.includes('ip_victima')) delete alertPayload.ip_victima;
      if (result.error.message.includes('organizacion_id')) delete alertPayload.organizacion_id;
      result = await supabase.from('alertas_crisis').insert([alertPayload]).select().single();
    }

    if (result.error) throw result.error;
    return { ...result.data, ip_victima: ip };
  };

  const sendAlertInBackground = async (lat, lng, optimisticId) => {
    try {
      const newAlert = await persistAlert(lat, lng, optimisticId);
      if (newAlert) {
        setActiveAlert(newAlert);
        broadcastIncident(newAlert.id, { confirmed: true, ip_victima: newAlert.ip_victima });
      }
    } catch (err) {
      console.error('Error al registrar alerta:', err);
      alert('No se pudo confirmar la alerta en central. La emergencia sigue activa en su dispositivo. Reintente o llame por teléfono.');
    } finally {
      panicInFlightRef.current = false;
    }
  };

  const handlePanic = () => {
    if (!user?.id || panicInFlightRef.current || view === 'alert_active') return;
    panicInFlightRef.current = true;

    const cached = locationRef.current;
    const lat = cached?.lat ?? 0;
    const lng = cached?.lng ?? 0;
    const optimisticId = `pending-${Date.now()}`;

    activateEmergencyUI({
      id: optimisticId,
      estado: 'activa',
      latitud: lat,
      longitud: lng,
      usuario_id: user.id,
      fecha_inicio: new Date().toISOString(),
      _optimistic: true,
    });

    broadcastIncident(optimisticId, { optimistic: true });

    sendAlertInBackground(lat, lng, optimisticId);

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const refined = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          };
          locationRef.current = refined;
          setLocation(refined);
          patchAlertCoordinates(refined.lat, refined.lng);
        },
        () => {},
        { enableHighAccuracy: true, maximumAge: 0, timeout: 12000 }
      );
    }
  };

  const deactivateAlert = async (code) => {
    if (code.toLowerCase() !== userProfile.clave_seguridad?.toLowerCase()) {
      alert('❌ PALABRA CLAVE INCORRECTA. La alerta sigue activa.');
      return;
    }

    const alertId = activeAlertRef.current?.id;

    if (!alertId || String(alertId).startsWith('pending-')) {
      stopVictimRecording();
      panicInFlightRef.current = false;
      setActiveAlert(null);
      setView('button');
      alert('ALERTA DESACTIVADA EN DISPOSITIVO.');
      return;
    }

    setStatus('loading');
    const { error } = await supabase
      .from('alertas_crisis')
      .update({ estado: 'resuelta', fecha_fin: new Date().toISOString() })
      .eq('id', alertId);

    if (!error) {
      stopVictimRecording();
      panicInFlightRef.current = false;
      setActiveAlert(null);
      setView('button');
      alert('ALERTA DESACTIVADA. Protocolo de seguridad finalizado.');
    } else {
      alert('Error al desactivar: ' + error.message);
    }
    setStatus('idle');
  };

  return (
    <div className="panic-container">
      <AnimatePresence mode="wait">
        {view === 'button' && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="panic-view"
          >
            <div className="brand-header">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                   <img src="/logo.png" alt="Logo" style={{ width: 48, height: 48, objectFit: 'contain' }} />
                   <div style={{ textAlign: 'left' }}>
                      <div style={{ fontSize: 16, fontWeight: 900, color: '#e2e8f0' }}>CLAVE 1001</div>
                      <div style={{ fontSize: 9, color: '#94a3b8', fontWeight: 800, letterSpacing: 1 }}>ARCHÉ HOLDING LABS</div>
                   </div>
                </div>
                <button 
                  onClick={() => supabase.auth.signOut()}
                  className="btn-logout-floating"
                >
                  <LogOut size={16} /> SALIR
                </button>
              </div>
              <div className="main-brand-display" style={{ marginTop: 30 }}>
                <img src={userProfile?.organization?.logo_url || "/logo.png"} alt="Logo" className="active-response-logo" style={{ width: 130, height: 130 }} />
                <h1 style={{ fontSize: 30 }}>{userProfile?.organization?.nombre || b2bOrg?.nombre || 'CLAVE 1001'}</h1>
                <p style={{ fontSize: 12 }}>{userProfile?.organization ? 'PROTECCIÓN CORPORATIVA ACTIVA' : 'SISTEMA DE RESPUESTA INMEDIATA'}</p>
              </div>
            </div>

            <div className="panic-button-wrapper" style={{ height: '45vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <motion.button 
                whileTap={{ scale: 0.85 }}
                className="panic-btn"
                onClick={handlePanic}
                style={{ 
                  width: 240, 
                  height: 240, 
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #ef4444 0%, #991b1b 100%)',
                  boxShadow: '0 0 50px rgba(239, 68, 68, 0.4), inset 0 4px 10px rgba(255, 255, 255, 0.3)',
                  border: '8px solid rgba(255, 255, 255, 0.08)'
                }}
              >
                <div className="pulse-ring" style={{ width: 240, height: 240 }} />
                <div className="btn-content" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <AlertTriangle size={60} color="white" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))' }} />
                  <span style={{ fontSize: 26, fontWeight: 900, marginTop: 14, letterSpacing: 5, textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>AUXILIO</span>
                </div>
              </motion.button>
            </div>

            <footer className="powered-footer">
              <div className="powered-by">Powered by <span>CLAVE 1001</span></div>
              <div className="legal-prop">Propiedad de Arché Holding Labs</div>
            </footer>
          </motion.div>
        )}

        {view === 'verification' && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="verification-portal"
          >
            <div className="v-header">
              <img src="/logo.png" alt="Logo" style={{ width: 48, height: 48, objectFit: 'contain', filter: 'drop-shadow(0 0 12px rgba(226,232,240,0.35))' }} />
              <h1>EXPEDIENTE DIGITAL</h1>
              <p>PROTOCOLO DE SEGURIDAD ARCHÉ HOLDING LABS</p>
            </div>

            <div className="v-steps">
              <div className="v-step active">
                <div className="v-step-num">1</div>
                <div className="v-step-info">
                  <h3>CONTRATO LEGAL</h3>
                  <p>Aceptación de términos y condiciones de servicio.</p>
                </div>
                <CheckCircle size={20} color="#22c55e" />
              </div>

              <div className="v-step">
                <div className="v-step-num">2</div>
                <div className="v-step-info">
                  <h3>IDENTIDAD (INE)</h3>
                  <p>Carga de identificación oficial vigente del titular.</p>
                </div>
                <input type="file" id="ine-upload" hidden />
                <label htmlFor="ine-upload" className="v-upload-btn">SUBIR ARCHIVO</label>
              </div>

              <div className="v-step">
                <div className="v-step-num">3</div>
                <div className="v-step-info">
                  <h3>REQUISITOS ADICIONALES</h3>
                  <p>{userProfile?.rol === 'padre' ? 'Acta de Nacimiento de los hijos.' : 'Constancia de Situación Fiscal.'}</p>
                </div>
                <input type="file" id="extra-upload" hidden />
                <label htmlFor="extra-upload" className="v-upload-btn">SUBIR ARCHIVO</label>
              </div>
            </div>

            <div className="v-footer">
              <button className="v-submit-btn" onClick={() => alert("Expediente enviado a revisión. Arché Holding Labs responderá en menos de 24 horas.")}>
                ENVIAR EXPEDIENTE A VALIDACIÓN
              </button>
              <button className="v-logout-btn" onClick={() => supabase.auth.signOut()}>CERRAR SESIÓN</button>
            </div>
          </motion.div>
        )}
        {view === 'alert_active' && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="panic-view alert-mode"
          >
            {/* BANNER DE UNIDAD DESPACHADA */}
            {activeAlert?.comentarios_operador?.startsWith('[DESPACHO] ') && (
              <div className="tactical-dispatch-banner">
                <div className="dispatch-icon">🚨</div>
                <div className="dispatch-text">
                  <div className="dispatch-label">UNIDAD EN CAMINO</div>
                  <div className="dispatch-unit">{activeAlert.comentarios_operador.replace('[DESPACHO] ', '')}</div>
                </div>
                <div className="dispatch-pulse" />
              </div>
            )}

            <div className="alert-banner">
              <AlertTriangle size={40} className="icon-pulse" />
              <h2>ESTADO DE EMERGENCIA</h2>
              <p>SEÑAL UHF ENVIADA — MONITOREO ACTIVO</p>
            </div>

            <div className="monitoring-indicator">
              <div className="live-pill">🔴 EN VIVO</div>
              <div className="monitoring-status">TRANSMITIENDO AUDIO Y VIDEO A CENTRAL</div>
              <p style={{ fontSize: 11, color: '#94a3b8', margin: '8px 0 0', textAlign: 'center' }}>
                {victimEvidenceSaved
                  ? bridgeUploadStatus === 'ok'
                    ? 'Evidencia enviada al servidor local de su franquicia.'
                    : bridgeUploadStatus === 'fail'
                      ? 'Respaldo en este teléfono. No se pudo conectar al Bridge de la franquicia.'
                      : bridgeUploadStatus === 'uploading'
                        ? 'Enviando evidencia al Bridge de la franquicia...'
                        : 'Respaldo guardado en este dispositivo (max. 5 min).'
                  : `Grabando evidencia local: ${formatEvidenceDuration(victimRecordSec)} / ${formatEvidenceDuration(EVIDENCIA_MAX_SEC)}`}
              </p>
              <p
                style={{
                  fontSize: 10,
                  color: captureStatus === 'interrupted' ? '#f87171' : '#fbbf24',
                  margin: '6px 12px 0',
                  textAlign: 'center',
                  lineHeight: 1.4,
                  fontWeight: 700,
                }}
              >
                {captureStatus === 'paused'
                  ? 'App en segundo plano: guardando fragmentos. Vuelva a la app sin bloquear el teléfono.'
                  : captureStatus === 'interrupted'
                    ? 'Cámara pausada por el sistema. Abra la app de nuevo para reanudar.'
                    : 'Mantenga la app abierta y la pantalla encendida. No bloquee el teléfono.'}
              </p>
              {stream && (
                <div className="mini-video-preview">
                  <video 
                    autoPlay 
                    muted 
                    playsInline 
                    ref={v => { if(v) v.srcObject = stream; }} 
                  />
                </div>
              )}
            </div>

            <div className="alert-actions-tactical">
              <div className="safety-box">
                <label>INGRESAR PALABRA CLAVE PARA DESACTIVAR</label>
                <input 
                  type="text" 
                  placeholder="Palabra Secreta"
                  className="safety-input"
                  value={deactivateInput}
                  onChange={(e) => setDeactivateInput(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') deactivateAlert(deactivateInput);
                  }}
                />
                <button 
                  className="btn-deactivate"
                  onClick={() => deactivateAlert(deactivateInput)}
                >
                  DESACTIVAR SEÑAL
                </button>
              </div>
            </div>

            <div className="alert-footer">
              <p>Tu ubicación está siendo monitoreada en tiempo real.</p>
              <div className="radar-ping" />
            </div>
          </motion.div>
        )}

        {/* MODOS TÁCTICOS ADICIONALES */}
        {activeMode === 'plataforma' && (
          <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} className="mode-overlay platform-view">
            <div className="mode-header">
              <Car size={32} color="#60a5fa" />
              <h3>VIAJE EN PLATAFORMA</h3>
              <button className="close-mode" onClick={() => setActiveMode(null)}>×</button>
            </div>
            
            <div className="countdown-ring">
              <div className="timer-label">PRÓXIMO CHECK-IN</div>
              <div className="timer-val">{Math.floor(timer / 60)}:{(timer % 60).toString().padStart(2, '0')}</div>
            </div>

            <div className="mode-actions">
              <button className="btn-fake-call" onClick={() => setShowFakeCall(true)}>
                <Phone size={20} /> SIMULAR LLAMADA ENTRANTE
              </button>
              <p className="mode-desc">Si el contador llega a cero y no confirmas seguridad, se enviará una alerta automática al War Room.</p>
              <button className="btn-check-in" onClick={() => setTimer(900)}>RENOVAR CHECK-IN (15 MIN)</button>
            </div>
          </motion.div>
        )}

        {activeMode === 'carretera' && (
          <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} className="mode-overlay highway-view">
            <div className="mode-header">
              <Navigation size={32} color="#34d399" />
              <h3>VIAJE FORÁNEO</h3>
              <button className="close-mode" onClick={() => setActiveMode(null)}>×</button>
            </div>
            <div className="highway-intel">
              <div className="intel-row"><span>SEÑAL GPS:</span> <span className="status-on">ALTA INTENSIDAD</span></div>
              <div className="intel-row"><span>AUDIO:</span> <span className="status-on">GRABACIÓN EN BUCLE ACTIVA</span></div>
            </div>
            <div className="highway-map-mini">
              <p>TRACKING TÁCTICO DE CARRETERA</p>
              <Activity size={48} className="pulse-slow" />
            </div>
            <button className="btn-panic-alt" onClick={handlePanic}>DISPARAR ALERTA INMEDIATA</button>
          </motion.div>
        )}

        {activeMode === 'centinela' && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} 
            className="mode-overlay sentinel-view"
            onClick={(e) => {
              if (e.detail === 3) setActiveMode(null); // Triple click para salir
            }}
          >
            <div className="sentinel-indicator" />
            {/* Pantalla casi negra para discreción */}
          </motion.div>
        )}

        {showFakeCall && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fake-call-overlay">
            <div className="caller-info">
              <div className="caller-avatar">P</div>
              <h2>Papá</h2>
              <p>Llamada de voz entrante...</p>
            </div>
            <div className="call-actions">
              <button className="call-decline" onClick={() => setShowFakeCall(false)}><Phone size={24} style={{ transform: 'rotate(135deg)' }} /></button>
              <button className="call-accept"><Phone size={24} /></button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        :root {
          --navy: #000000;
          --gold: #e2e8f0;
          --danger: #ef4444;
          --accent-gold: #e2e8f0;
        }
        body {
          margin: 0;
          background: var(--navy);
          font-family: 'Inter', sans-serif;
          color: white;
          overflow: hidden;
        }
        .panic-container {
          height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #000000;
          background-image: 
            linear-gradient(rgba(255, 255, 255, 0.015) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.015) 1px, transparent 1px);
          background-size: 24px 24px;
        }
        .panic-view {
          text-align: center;
          width: 100%;
          max-width: 400px;
          padding: 20px;
        }
        .brand-header h1 {
          font-size: 32px;
          font-weight: 900;
          margin: 10px 0 0;
          letter-spacing: 2px;
        }
        .brand-header p {
          font-size: 10px;
          letter-spacing: 4px;
          opacity: 0.6;
          margin: 5px 0 40px;
        }
        .main-brand-display {
          margin-top: 10px;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .active-response-logo {
          width: 90px;
          height: 90px;
          object-fit: contain;
          margin-bottom: 15px;
          filter: drop-shadow(0 0 16px rgba(226,232,240,0.25)) brightness(1.1) contrast(1.1);
          animation: logo-pulse 5s infinite ease-in-out;
        }
        @keyframes logo-pulse {
          0%, 100% { transform: scale(1); filter: drop-shadow(0 0 10px rgba(226,232,240,0.2)) brightness(1.1); }
          50% { transform: scale(1.04); filter: drop-shadow(0 0 22px rgba(226,232,240,0.35)) brightness(1.15); }
        }
        .main-brand-display h1 {
          font-size: 26px;
          font-weight: 900;
          letter-spacing: 2px;
          margin: 0;
          text-transform: uppercase;
          color: white;
          text-shadow: 0 0 20px rgba(255,255,255,0.2);
        }
        .main-brand-display p {
          font-size: 10px;
          font-weight: 800;
          color: var(--accent-gold);
          letter-spacing: 3px;
          margin-top: 6px;
          opacity: 0.8;
        }

        .powered-footer {
          margin-top: auto;
          padding: 20px 0;
          text-align: center;
          border-top: 1px solid rgba(255,255,255,0.05);
          width: 100%;
        }
        .powered-by {
          font-size: 10px;
          color: #94a3b8;
          font-weight: 600;
          letter-spacing: 1px;
        }
        .powered-by span {
          color: var(--accent-gold);
          font-weight: 900;
        }
        .legal-prop {
          font-size: 8px;
          color: #64748b;
          margin-top: 4px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .panic-button-wrapper {
          position: relative;
          height: 300px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .monitoring-indicator {
          margin: 20px;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 20px;
          padding: 20px;
          text-align: center;
        }
        .live-pill {
          display: inline-block;
          background: #ef4444;
          color: white;
          font-size: 10px;
          font-weight: 900;
          padding: 4px 12px;
          border-radius: 100px;
          margin-bottom: 10px;
          animation: pulse 1.5s infinite;
        }
        .monitoring-status { font-size: 11px; font-weight: 700; color: #94a3b8; margin-bottom: 15px; }
        .mini-video-preview {
          width: 100%;
          height: 150px;
          background: #000;
          border-radius: 12px;
          overflow: hidden;
          border: 1px solid var(--accent-gold);
        }
        .mini-video-preview video { width: 100%; height: 100%; object-fit: cover; }

        .tactical-modes-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 15px;
          margin: 0 20px 30px;
        }
        .mode-card {
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.05);
          backdrop-filter: blur(10px);
          border-radius: 20px;
          padding: 20px 10px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          cursor: pointer;
          transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        .mode-card.active {
          background: linear-gradient(135deg, rgba(197, 160, 89, 0.2), rgba(0,0,0,0.1));
          border-color: var(--accent-gold);
          box-shadow: 0 10px 25px rgba(197, 160, 89, 0.2);
          transform: translateY(-5px);
        }
        .mode-card.active svg { color: var(--accent-gold); filter: drop-shadow(0 0 8px var(--accent-gold)); }
        .mode-card.active .mode-label { color: var(--accent-gold); text-shadow: 0 0 5px rgba(197, 160, 89, 0.5); }
        .mode-label { font-size: 9px; font-weight: 900; letter-spacing: 1.5px; color: var(--text-gray); }
        .mode-timer { font-size: 11px; font-family: 'Outfit', monospace; color: var(--accent-gold); font-weight: 900; margin-top: 2px; }

        .panic-btn {
          width: 160px;
          height: 160px;
          border-radius: 50%;
          border: 8px solid rgba(239, 68, 68, 0.2);
          background: linear-gradient(145deg, #ef4444, #991b1b);
          color: white;
          cursor: pointer;
          position: relative;
          z-index: 2;
          box-shadow: 
            0 0 40px rgba(239, 68, 68, 0.5),
            inset 0 4px 10px rgba(255,255,255,0.3),
            inset 0 -4px 10px rgba(0,0,0,0.3);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 10px;
          transition: all 0.2s;
        }
        .panic-btn:active {
          transform: scale(0.95);
          box-shadow: 0 0 20px rgba(239, 68, 68, 0.8);
        }
        .panic-btn span {
          font-weight: 900;
          font-size: 16px;
          letter-spacing: 2px;
          text-shadow: 0 2px 4px rgba(0,0,0,0.3);
        }
        .pulse-ring {
          position: absolute;
          width: 160px;
          height: 160px;
          background: rgba(239, 68, 68, 0.4);
          border-radius: 50%;
          animation: pulse-ring-anim 2s infinite;
          z-index: 1;
        }
        @keyframes pulse-ring-anim {
          0% { transform: scale(1); opacity: 0.6; }
          100% { transform: scale(2.5); opacity: 0; }
        }
        .info-footer {
          display: flex;
          justify-content: center;
          gap: 30px;
          margin-top: 50px;
          opacity: 0.5;
        }
        .info-item {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          font-weight: 700;
        }
        .success-view {
          text-align: center;
          padding: 40px;
        }
        .success-view h2 { margin: 20px 0 10px; }
        .success-view p { opacity: 0.7; font-size: 14px; margin-bottom: 30px; }
        .btn-logout-floating {
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          color: #94a3b8;
          padding: 8px 16px;
          border-radius: 8px;
          font-size: 10px;
          font-weight: 800;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          transition: all 0.3s;
        }
        .btn-logout-floating:hover { background: rgba(239, 68, 68, 0.1); border-color: rgba(239, 68, 68, 0.3); color: white; }

        .btn-secondary {
          background: transparent;
          border: 1px solid white;
          color: white;
          padding: 10px 30px;
          border-radius: 20px;
          cursor: pointer;
        }
        .mode-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 12px;
          margin-top: 10px;
          padding: 0 10px;
        }
        .mode-btn {
          display: flex;
          align-items: center;
          gap: 15px;
          padding: 16px 20px;
          border-radius: 16px;
          border: 1px solid rgba(255,255,255,0.1);
          color: white;
          font-weight: 700;
          font-size: 13px;
          cursor: pointer;
          transition: all 0.2s;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        .mode-plataforma { background: rgba(59, 130, 246, 0.1); border-color: rgba(59, 130, 246, 0.3); }
        .mode-plataforma:hover { background: rgba(59, 130, 246, 0.2); }
        .mode-carretera { background: rgba(16, 185, 129, 0.1); border-color: rgba(16, 185, 129, 0.3); }
        .mode-carretera:hover { background: rgba(16, 185, 129, 0.2); }
        .mode-fiesta { background: rgba(139, 92, 246, 0.1); border-color: rgba(139, 92, 246, 0.3); }
        .mode-fiesta:hover { background: rgba(139, 92, 246, 0.2); }

        /* VERIFICATION PORTAL STYLES */
        .verification-portal {
          background: var(--card-dark);
          width: 100%;
          max-width: 500px;
          padding: 40px;
          border-radius: 32px;
          border: 1px solid var(--border-color);
          text-align: center;
          margin: 20px auto;
        }
        .v-header h1 { font-size: 20px; font-weight: 900; letter-spacing: 2px; margin: 15px 0 5px; color: white; }
        .v-header p { font-size: 9px; font-weight: 700; color: var(--accent-gold); letter-spacing: 1px; opacity: 0.8; }

        .v-steps { margin: 40px 0; display: flex; flex-direction: column; gap: 20px; }
        .v-step {
          background: rgba(255,255,255,0.03);
          padding: 20px;
          border-radius: 16px;
          display: flex;
          align-items: center;
          gap: 15px;
          text-align: left;
          border: 1px solid rgba(255,255,255,0.05);
        }
        .v-step.active { border-color: rgba(34, 197, 94, 0.3); background: rgba(34, 197, 94, 0.05); }
        .v-step-num {
          width: 28px; height: 28px;
          border-radius: 50%;
          background: var(--accent-gold);
          color: black;
          display: flex; align-items: center; justify-content: center;
          font-weight: 900; font-size: 14px;
        }
        .v-step-info h3 { font-size: 12px; font-weight: 800; margin: 0; color: white; }
        .v-step-info p { font-size: 10px; color: #94a3b8; margin: 4px 0 0; }

        .v-upload-btn {
          margin-left: auto;
          background: rgba(197, 160, 89, 0.1);
          border: 1px solid var(--accent-gold);
          color: var(--accent-gold);
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 10px;
          font-weight: 800;
          cursor: pointer;
          transition: all 0.3s;
        }
        .v-upload-btn:hover { background: var(--accent-gold); color: black; }

        .v-submit-btn {
          width: 100%;
          background: white;
          color: black;
          border: none;
          padding: 16px;
          border-radius: 12px;
          font-weight: 900;
          font-size: 12px;
          cursor: pointer;
          margin-bottom: 15px;
        }
        .v-logout-btn {
          background: transparent;
          border: none;
          color: #94a3b8;
          font-size: 10px;
          font-weight: 700;
          cursor: pointer;
        }

        /* TACTICAL MODES CSS */
        .mode-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          z-index: 1000;
          background: #020617;
          padding: 30px;
          display: flex;
          flex-direction: column;
        }
        .mode-header {
          display: flex;
          align-items: center;
          gap: 15px;
          margin-bottom: 40px;
        }
        .mode-header h3 {
          font-size: 14px;
          font-weight: 800;
          letter-spacing: 2px;
          color: white;
          margin: 0;
        }
        .close-mode {
          margin-left: auto;
          background: rgba(255,255,255,0.05);
          border: none;
          color: white;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          font-size: 20px;
          cursor: pointer;
        }
        
        /* PLATFORM VIEW */
        .countdown-ring {
          width: 220px;
          height: 220px;
          border-radius: 50%;
          border: 4px solid rgba(59, 130, 246, 0.2);
          border-top-color: #60a5fa;
          margin: 40px auto;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          animation: spin-slow 10s linear infinite;
        }
        .timer-label { font-size: 10px; font-weight: 800; color: #60a5fa; letter-spacing: 1px; }
        .timer-val { font-size: 48px; font-weight: 900; color: white; font-family: 'Courier New', monospace; }
        .mode-actions { margin-top: auto; display: flex; flex-direction: column; gap: 15px; }
        .btn-fake-call {
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          color: white;
          padding: 16px;
          border-radius: 12px;
          font-weight: 700;
          font-size: 12px;
          display: flex; align-items: center; justify-content: center; gap: 10px;
          cursor: pointer;
        }
        .mode-desc { font-size: 11px; color: #94a3b8; text-align: center; line-height: 1.5; padding: 0 20px; }
        .btn-check-in {
          background: #60a5fa;
          color: white;
          border: none;
          padding: 18px;
          border-radius: 12px;
          font-weight: 900;
          font-size: 13px;
          cursor: pointer;
        }

        /* HIGHWAY VIEW */
        .highway-intel {
          background: rgba(255,255,255,0.03);
          padding: 20px;
          border-radius: 16px;
          border: 1px solid rgba(255,255,255,0.05);
        }
        .intel-row { display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 8px; font-weight: 700; }
        .status-on { color: #34d399; }
        .highway-map-mini {
          flex: 1;
          margin: 20px 0;
          background: rgba(0,0,0,0.3);
          border-radius: 20px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 20px;
          border: 1px dashed rgba(52, 211, 153, 0.2);
        }
        .highway-map-mini p { font-size: 10px; font-weight: 800; color: #34d399; letter-spacing: 2px; }
        .btn-panic-alt {
          background: #ef4444;
          color: white;
          border: none;
          padding: 20px;
          border-radius: 16px;
          font-weight: 900;
          font-size: 15px;
          cursor: pointer;
        }

        /* SENTINEL VIEW */
        .sentinel-view { background: #000 !important; cursor: none; }
        .sentinel-indicator {
          position: fixed;
          top: 10px; right: 10px;
          width: 4px; height: 4px;
          background: #ef4444;
          border-radius: 50%;
          opacity: 0.1;
          animation: pulse 2s infinite;
        }

        /* FAKE CALL OVERLAY */
        .fake-call-overlay {
          position: fixed;
          top:0; left:0; right:0; bottom:0;
          background: linear-gradient(180deg, #1e293b 0%, #0f172a 100%);
          z-index: 2000;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding-top: 100px;
        }
        .caller-avatar {
          width: 100px; height: 100px;
          background: #475569;
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 40px; color: white; font-weight: 300;
          margin-bottom: 20px;
        }
        .caller-info h2 { font-size: 32px; font-weight: 400; color: white; margin: 0; }
        .caller-info p { font-size: 16px; color: #94a3b8; margin-top: 8px; }
        .call-actions {
          margin-top: auto;
          margin-bottom: 80px;
          display: flex;
          gap: 60px;
        }
        .call-decline, .call-accept {
          width: 72px; height: 72px;
          border-radius: 50%;
          border: none;
          color: white;
          cursor: pointer;
          display: flex; align-items: center; justify-content: center;
        }
        .call-decline { background: #ef4444; }
        .call-accept { background: #22c55e; animation: pulse-green 2s infinite; }
        
        @keyframes pulse-green {
          0% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.4); }
          70% { box-shadow: 0 0 0 20px rgba(34, 197, 94, 0); }
          100% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0); }
        }
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .pulse-slow { animation: pulse-opacity 3s infinite; }
        @keyframes pulse-opacity {
          0% { opacity: 0.2; }
          50% { opacity: 0.6; }
          100% { opacity: 0.2; }
        }

        /* ── RESPONSIVE MOBILE OPTIMIZATIONS FOR ALL MOBILE DEVICES ── */
        @media (max-width: 480px) {
          body {
            overflow-y: auto !important;
            overflow-x: hidden !important;
          }
          .panic-container {
            min-height: 100vh !important;
            min-height: 100dvh !important;
            height: auto !important;
            padding: 15px 10px !important;
            box-sizing: border-box !important;
            overflow-y: auto !important;
          }
          .panic-view {
            padding: 10px !important;
            max-width: 100% !important;
            margin: auto !important;
          }
          .active-response-logo {
            width: 70px !important;
            height: 70px !important;
            margin-bottom: 10px !important;
          }
          .main-brand-display h1 {
            font-size: 20px !important;
          }
          .brand-header p {
            margin: 5px 0 20px !important;
          }
          .tactical-modes-grid {
            margin: 0 10px 20px !important;
            gap: 10px !important;
          }
          .mode-card {
            padding: 12px 6px !important;
          }
          .mode-label {
            font-size: 8px !important;
          }
          .panic-button-wrapper {
            height: 140px !important;
            margin-bottom: 5px !important;
          }
          .panic-btn {
            width: 125px !important;
            height: 125px !important;
          }
          .panic-btn .btn-content svg {
            width: 32px !important;
            height: 32px !important;
          }
          .panic-btn span {
            font-size: 13px !important;
          }
          .pulse-ring {
            width: 125px !important;
            height: 125px !important;
          }
          .mode-grid {
            margin-top: 5px !important;
            gap: 8px !important;
          }
          .mode-btn {
            padding: 12px 15px !important;
            font-size: 11px !important;
          }
          .info-footer {
            margin-top: 15px !important;
            gap: 20px !important;
          }
          .powered-footer {
            margin-top: 20px !important;
            padding: 15px 0 5px !important;
          }

          .login-wrapper {
            padding: 10px !important;
            min-height: 100vh !important;
            min-height: 100dvh !important;
            align-items: flex-start !important;
            padding-top: 20px !important;
            padding-bottom: 20px !important;
          }
          .login-card-premium {
            padding: 24px 20px !important;
            border-radius: 20px !important;
            max-width: 100% !important;
          }
          .brand-badge {
            margin-bottom: 15px !important;
            padding: 2px 10px !important;
            font-size: 8px !important;
          }
          .logo-container {
            margin-bottom: 15px !important;
          }
          .custom-logo {
            width: 70px !important;
            height: 70px !important;
          }
          .custom-logo img {
            width: 70px !important;
            height: 70px !important;
          }
          .login-header h1 {
            font-size: 18px !important;
          }
          .subtitle {
            font-size: 9px !important;
          }
          .input-group-premium {
            margin-bottom: 16px !important;
          }
          .input-group-premium label {
            font-size: 8px !important;
            margin-bottom: 6px !important;
          }
          .input-group-premium input {
            padding: 12px 14px !important;
            font-size: 13px !important;
          }
          .login-btn-premium {
            padding: 14px !important;
            font-size: 12px !important;
            margin-top: 10px !important;
          }
          .holding-brand {
            margin-top: 20px !important;
          }
          .divider-line {
            margin-bottom: 12px !important;
          }
          
          .contact-input-wrapper {
            gap: 6px !important;
          }
          .mini-input {
            padding: 10px !important;
            font-size: 12px !important;
          }
          .btn-agenda {
            width: 38px !important;
            height: 38px !important;
          }
        }
      `}</style>
    </div>
  );
}
