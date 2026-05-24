import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Shield, Navigation, AlertTriangle, CheckCircle, Crosshair, MapPin, Radio, Activity, LogOut } from 'lucide-react';
import { supabase } from './lib/supabase';

export default function ErexDashboard({ userProfile }) {
  const [isOnDuty, setIsOnDuty] = useState(false);
  const [location, setLocation] = useState(null);
  const [activeMission, setActiveMission] = useState(null);
  const [missionStatus, setMissionStatus] = useState('idle'); // idle | en_camino | arribo

  const activeMissionRef = React.useRef(activeMission);
  useEffect(() => {
    activeMissionRef.current = activeMission;
  }, [activeMission]);

  useEffect(() => {
    let watchId;
    if (isOnDuty && navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          setLocation({ lat, lng });
          supabase.channel('erex-tracking').send({
            type: 'broadcast',
            event: 'LOCATION_UPDATE_EREX',
            payload: {
              id: userProfile.id,
              nombre: userProfile.nombre_completo,
              organizacion_id: userProfile.organizacion_id,
              latitud: lat,
              longitud: lng,
              estado: activeMissionRef.current ? 'ocupado' : 'disponible'
            }
          });
        },
        (err) => {
          alert("Error de GPS: " + err.message + ". Asegúrate de dar permisos de ubicación.");
          setIsOnDuty(false);
        },
        { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 }
      );
    } else if (isOnDuty) {
      alert("GPS no soportado en este dispositivo.");
      setIsOnDuty(false);
    }
    return () => {
      if (watchId) navigator.geolocation.clearWatch(watchId);
    };
  }, [isOnDuty, userProfile.id, userProfile.nombre_completo, userProfile.organizacion_id]);

  useEffect(() => {
    // Si la misión es resuelta por la central, limpiar
    if (activeMission) {
      const channel = supabase.channel(`dispatch-listen-${activeMission.id}`)
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'alertas_crisis',
          filter: `id=eq.${activeMission.id}`
        }, (payload) => {
          if (payload.new.estado === 'resuelta') {
            setActiveMission(null);
            setMissionStatus('idle');
            alert("Misión cancelada o resuelta por la Central.");
          }
        }).subscribe();
      return () => { supabase.removeChannel(channel); };
    }
  }, [activeMission]);

  // Escuchar misiones asignadas a la franquicia, pero idealmente filtramos por nuestra unidad
  useEffect(() => {
    if (!isOnDuty) return;

    // Escuchar el broadcast del war-room general para despachos
    const missionChannel = supabase.channel('war-room-broadcast')
      .on('broadcast', { event: 'INCIDENT_TRIGGERED' }, (msg) => {
         // Si se activa una nueva emergencia en nuestra franquicia, podríamos mostrar un aviso
         // pero por ahora solo respondemos al despacho directo
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'alertas_crisis',
        filter: `erex_asignado_id=eq.${userProfile.id}`
      }, (payload) => {
         const alertData = payload.new;
         if (alertData.estado === 'en_camino' && (!activeMission || activeMission.id !== alertData.id)) {
           setActiveMission(alertData);
           setMissionStatus('en_camino');
           // Reproducir alarma táctica
           new Audio('https://assets.mixkit.co/active_storage/sfx/995/995-preview.mp3').play().catch(()=>{});
         }
      })
      .subscribe();

    return () => { supabase.removeChannel(missionChannel); };
  }, [isOnDuty, userProfile.id, activeMission]);

  const toggleDuty = () => {
    if (isOnDuty) {
      supabase.channel('erex-tracking').send({
        type: 'broadcast',
        event: 'EREX_OFF_DUTY',
        payload: { id: userProfile.id }
      });
      setLocation(null);
    }
    setIsOnDuty(!isOnDuty);
  };

  const handleArrive = async () => {
    if (!activeMission) return;
    
    // Notificar arribo
    setMissionStatus('arribo');
    await supabase.from('alertas_crisis').update({
      comentarios_operador: `[ARRIBO] Agente E.R.E.X. ${userProfile.nombre_completo} ha llegado al punto de extracción.`
    }).eq('id', activeMission.id);

    supabase.channel('war-room-broadcast').send({
      type: 'broadcast',
      event: `DISPATCH_UPDATE_${activeMission.id}`,
      payload: { comentarios_operador: `[ARRIBO] E.R.E.X. en el punto.` }
    });

    alert("Arribo confirmado. Asegurando perímetro.");
  };

  const handleComplete = async () => {
    if (!activeMission) return;
    // Opcional: El EREX podría cerrar el caso o esperar a que Central lo cierre.
    // Dejaremos que Central lo cierre para mantener control, pero limpiamos localmente.
    setActiveMission(null);
    setMissionStatus('idle');
  };

  return (
    <div className="erex-container">
      <div className="erex-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src="/logo.png" alt="Logo" style={{ width: 40, height: 40, filter: 'drop-shadow(0 0 10px rgba(255,255,255,0.2))' }} />
          <div>
            <div className="erex-brand">E.R.E.X.</div>
            <div className="erex-sub">UNIDAD DE REACCIÓN</div>
          </div>
        </div>
        <button onClick={() => supabase.auth.signOut()} className="btn-logout-erex">
          <LogOut size={16} />
        </button>
      </div>

      <div className="agent-info">
        <h3>AGENTE: {userProfile.nombre_completo.toUpperCase()}</h3>
        <p>FRANQUICIA ID: {userProfile.organizacion?.nombre || userProfile.organizacion_id}</p>
        <div className="status-badge" style={{ background: isOnDuty ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)', color: isOnDuty ? '#22c55e' : '#ef4444' }}>
          {isOnDuty ? '● EN SERVICIO ACTIVO' : '○ FUERA DE TURNO'}
        </div>
      </div>

      {!activeMission ? (
        <div className="duty-control">
          <motion.button 
            whileTap={{ scale: 0.95 }}
            onClick={toggleDuty}
            className={`btn-duty ${isOnDuty ? 'active' : ''}`}
          >
            <div className="pulse-ring-duty" style={{ opacity: isOnDuty ? 1 : 0 }} />
            <Radio size={48} />
            <span>{isOnDuty ? 'FINALIZAR TURNO' : 'INICIAR TURNO E.R.E.X.'}</span>
          </motion.button>

          {isOnDuty && location && (
            <div className="gps-status">
              <MapPin size={16} /> GPS TRANSMITIENDO A CENTRAL (LAT: {location.lat.toFixed(4)}, LNG: {location.lng.toFixed(4)})
            </div>
          )}
          {isOnDuty && !location && (
            <div className="gps-status loading">
              <Activity size={16} className="pulse-slow" /> ADQUIRIENDO SEÑAL SATELITAL...
            </div>
          )}
        </div>
      ) : (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mission-card">
          <div className="mission-header">
            <AlertTriangle size={32} className="pulse-fast" />
            <h2>MISIÓN DE EXTRACCIÓN</h2>
          </div>
          
          <div className="mission-details">
            <div className="detail-row">
              <label>VÍCTIMA</label>
              <div className="val">{activeMission.usuario?.nombre_completo || 'Usuario de auxilio'}</div>
            </div>
            <div className="detail-row">
              <label>TELÉFONO</label>
              <div className="val">{activeMission.usuario?.telefono || 'No disponible'}</div>
            </div>
            <div className="detail-row">
              <label>COORDENADAS OBJETIVO</label>
              <div className="val mono">{activeMission.latitud?.toFixed(5)}, {activeMission.longitud?.toFixed(5)}</div>
            </div>
          </div>

          <div className="mission-actions">
            {missionStatus === 'en_camino' && (
              <button className="btn-tactical arrive" onClick={handleArrive}>
                <Crosshair size={20} /> CONFIRMAR ARRIBO AL PUNTO
              </button>
            )}
            {missionStatus === 'arribo' && (
              <div className="arrive-success">
                <CheckCircle size={24} /> PERÍMETRO ASEGURADO. ESPERANDO CIERRE DE CENTRAL.
              </div>
            )}
          </div>
        </motion.div>
      )}

      <style>{`
        .erex-container {
          min-height: 100vh;
          background: #000;
          color: white;
          font-family: 'Outfit', sans-serif;
          background-image: radial-gradient(circle at center, #111827 0%, #000000 100%);
          display: flex;
          flex-direction: column;
        }
        
        .erex-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px;
          background: rgba(10, 15, 30, 0.9);
          border-bottom: 1px solid rgba(255,255,255,0.05);
        }
        .erex-brand { font-size: 20px; font-weight: 900; letter-spacing: 3px; color: #e2e8f0; }
        .erex-sub { font-size: 9px; font-weight: 800; color: #64748b; letter-spacing: 2px; }
        
        .btn-logout-erex {
          background: rgba(239, 68, 68, 0.1);
          color: #ef4444;
          border: 1px solid rgba(239, 68, 68, 0.2);
          padding: 10px;
          border-radius: 10px;
          cursor: pointer;
        }

        .agent-info {
          padding: 20px;
          text-align: center;
          border-bottom: 1px solid rgba(255,255,255,0.05);
        }
        .agent-info h3 { margin: 0 0 5px 0; font-size: 16px; letter-spacing: 1px; color: #e2e8f0; }
        .agent-info p { margin: 0 0 15px 0; font-size: 11px; color: #64748b; font-weight: 600; text-transform: uppercase; }
        .status-badge {
          display: inline-block;
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 1px;
        }

        .duty-control {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 40px 20px;
        }

        .btn-duty {
          width: 250px;
          height: 250px;
          border-radius: 50%;
          background: rgba(255,255,255,0.02);
          border: 2px solid rgba(255,255,255,0.1);
          color: #94a3b8;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 15px;
          cursor: pointer;
          position: relative;
          transition: all 0.3s;
        }
        .btn-duty span { font-size: 14px; font-weight: 900; letter-spacing: 2px; }
        .btn-duty.active {
          background: rgba(34, 197, 94, 0.1);
          border-color: #22c55e;
          color: #22c55e;
          box-shadow: 0 0 40px rgba(34, 197, 94, 0.2);
        }
        .pulse-ring-duty {
          position: absolute;
          inset: -20px;
          border-radius: 50%;
          border: 1px solid #22c55e;
          animation: pulse-ring-anim 2s infinite;
        }
        @keyframes pulse-ring-anim {
          0% { transform: scale(0.9); opacity: 1; }
          100% { transform: scale(1.2); opacity: 0; }
        }

        .gps-status {
          margin-top: 40px;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 1px;
          color: #3b82f6;
          display: flex;
          align-items: center;
          gap: 8px;
          background: rgba(59, 130, 246, 0.1);
          padding: 10px 20px;
          border-radius: 12px;
          border: 1px solid rgba(59, 130, 246, 0.2);
        }
        .gps-status.loading { color: #f59e0b; background: rgba(245, 158, 11, 0.1); border-color: rgba(245, 158, 11, 0.2); }

        .mission-card {
          margin: 20px;
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.4);
          border-radius: 20px;
          overflow: hidden;
          animation: flash-red 2s infinite;
        }
        @keyframes flash-red {
          0%, 100% { box-shadow: 0 0 20px rgba(239, 68, 68, 0.1); }
          50% { box-shadow: 0 0 40px rgba(239, 68, 68, 0.4); }
        }
        .mission-header {
          background: #ef4444;
          padding: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 15px;
          color: white;
        }
        .mission-header h2 { margin: 0; font-size: 18px; font-weight: 900; letter-spacing: 2px; }
        
        .mission-details { padding: 25px; display: flex; flex-direction: column; gap: 20px; }
        .detail-row label { display: block; font-size: 10px; font-weight: 900; color: #fca5a5; letter-spacing: 1.5px; margin-bottom: 5px; }
        .detail-row .val { font-size: 16px; font-weight: 800; color: white; }
        .detail-row .mono { font-family: monospace; font-size: 18px; color: #fbbf24; }

        .mission-actions { padding: 0 25px 25px 25px; }
        .btn-tactical {
          width: 100%;
          padding: 18px;
          border-radius: 14px;
          font-weight: 900;
          font-size: 13px;
          letter-spacing: 2px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          cursor: pointer;
          border: none;
          transition: all 0.3s;
        }
        .btn-tactical.arrive {
          background: #10b981;
          color: white;
          box-shadow: 0 10px 20px rgba(16, 185, 129, 0.3);
        }
        .btn-tactical.arrive:active { transform: scale(0.98); }

        .arrive-success {
          background: rgba(16, 185, 129, 0.15);
          border: 1px solid #10b981;
          color: #10b981;
          padding: 20px;
          border-radius: 14px;
          text-align: center;
          font-weight: 900;
          font-size: 12px;
          letter-spacing: 1px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
        }
      `}</style>
    </div>
  );
}
