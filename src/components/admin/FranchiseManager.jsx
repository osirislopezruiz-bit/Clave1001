import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Building2, Edit3, Shield, Key, Share2, Activity, Zap, Users } from 'lucide-react';

export default function FranchiseManager({
  orgs,
  setSelectedOrg,
  setNewOrg,
  setShowOrgModal,
  handleGenerateAdmin,
  isGeneratingAdmin,
  handleMasterOverride
}) {
  const [franchiseDetail, setFranchiseDetail] = useState(null);
  const [hoveredOrg, setHoveredOrg] = useState(null);

  const openEditModal = (org) => {
    setFranchiseDetail(null);
    setSelectedOrg(org);
    setNewOrg({
      nombre: org.nombre || '',
      color: org.color_primario || '#0a0f1e',
      logo: org.logo_url || '',
      tipo_letra: org.tipo_letra || 'Inter',
      color_secundario: org.color_secundario || '#ffffff',
      color_acento: org.color_acento || '#ef4444',
      slogan: org.slogan || '',
      domicilio: org.domicilio || '',
      redes_sociales: org.redes_sociales ? JSON.stringify(org.redes_sociales) : '{}',
      storage_mode: org.storage_mode || 'manual_download',
      bridge_url: org.bridge_url || '',
      bridge_api_key: org.bridge_api_key || ''
    });
    setShowOrgModal(true);
  };

  const copyInviteLink = (org) => {
    const inviteLink = `${window.location.origin}/?org=${org.id}`;
    const msg = `¡Hola! Únete a la red de protección de *${org.nombre}*.\n\nInstala nuestro botón de pánico en tu celular ingresando a este enlace:\n${inviteLink}\n\nProtección activa las 24 horas.`;
    navigator.clipboard.writeText(msg);
    alert("✅ Enlace de invitación para usuarios copiado. ¡Pégalo en WhatsApp o redes sociales!");
  };

  const copyAdminCredentials = (org) => {
    const adminEmail = org.nombre.trim().toLowerCase().replace(/[^a-z0-9]/g, '_') + '_admin@clave1001.com';
    const msg = `¡Bienvenido a CLAVE 1001!\nTu central táctica en vivo: ${window.location.origin}/\n\n*Usuario:* ${adminEmail}\n*Contraseña:* Clave1001_Password!\n\n(Recomendamos iniciar sesión para comenzar a operar su módulo táctico).`;
    navigator.clipboard.writeText(msg);
    alert("✅ Credenciales de operador copiadas. ¡Envíalas al responsable de la franquicia!");
  };

  return (
    <motion.div 
      initial={{ opacity: 0, filter: 'blur(10px)' }} 
      animate={{ opacity: 1, filter: 'blur(0px)' }} 
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="view-content" 
      style={{ padding: '40px', maxWidth: '1400px', margin: '0 auto', position: 'relative' }}
    >
      
      {/* HEADER ULTRA-PREMIUM */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '50px', paddingBottom: '25px', borderBottom: '1px solid rgba(197, 160, 89, 0.2)', position: 'relative' }}>
        <div style={{ position: 'absolute', bottom: -1, left: 0, width: '100px', height: '1px', background: 'var(--gold-primary)', boxShadow: '0 0 10px var(--gold-primary)' }} />
        
        <div>
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ background: 'rgba(197, 160, 89, 0.1)', padding: '10px', borderRadius: '12px', border: '1px solid rgba(197, 160, 89, 0.3)' }}>
                <Users size={24} color="var(--gold-primary)" />
              </div>
              <div>
                <h1 style={{ fontSize: '28px', fontWeight: '900', margin: 0, color: '#fff', letterSpacing: '1px' }}>
                  CENTRO DE <span style={{ color: 'transparent', WebkitTextStroke: '1px var(--gold-primary)', background: 'linear-gradient(90deg, var(--gold-primary), #fff)', WebkitBackgroundClip: 'text' }}>MANDO FRANQUICIAS</span>
                </h1>
                <p style={{ color: '#94a3b8', fontSize: '13px', marginTop: '6px', letterSpacing: '0.5px', textTransform: 'uppercase', fontWeight: 'bold' }}>
                  Gestión Estratégica de Nodos Activos • Sistema CLAVE 1001
                </p>
              </div>
            </div>
          </motion.div>
        </div>
        
        <motion.button 
          whileHover={{ scale: 1.05, boxShadow: '0 0 25px rgba(197, 160, 89, 0.6)' }}
          whileTap={{ scale: 0.95 }}
          className="btn-premium-gold" 
          onClick={() => { 
            setSelectedOrg(null); 
            setNewOrg({ nombre: '', color: '#0a0f1e', logo: '', tipo_letra: 'Inter', color_secundario: '#ffffff', color_acento: '#ef4444', slogan: '', domicilio: '', redes_sociales: '{}', storage_mode: 'manual_download', bridge_url: '', bridge_api_key: '' }); 
            setShowOrgModal(true); 
          }}
          style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 28px', borderRadius: '14px', fontSize: '13px', border: '1px solid rgba(255,255,255,0.2)', background: 'linear-gradient(135deg, #c5a059 0%, #a88241 100%)' }}
        >
          <Building2 size={18} /> DESPLEGAR NUEVA FRANQUICIA
        </motion.button>
      </div>

      {/* GRID DE ALTO IMPACTO TÁCTICO */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '25px' }}>
        {orgs.map((org, index) => {
          const isHovered = hoveredOrg === org.id;
          const orgColor = org.color_primario || 'var(--gold-primary)';
          
          return (
            <motion.div 
              onHoverStart={() => setHoveredOrg(org.id)}
              onHoverEnd={() => setHoveredOrg(null)}
              whileHover={{ y: -8, scale: 1.02 }}
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ delay: index * 0.05, type: 'spring', stiffness: 200, damping: 20 }}
              key={org.id} 
              onClick={() => setFranchiseDetail(org)}
              style={{ 
                background: `linear-gradient(145deg, rgba(15, 23, 42, 0.8) 0%, rgba(10, 15, 30, 0.9) 100%)`,
                borderRadius: '20px',
                padding: '24px',
                border: `1px solid ${isHovered ? orgColor : 'rgba(255,255,255,0.05)'}`,
                boxShadow: isHovered ? `0 15px 35px ${orgColor}30, inset 0 0 20px ${orgColor}10` : '0 8px 25px rgba(0,0,0,0.4)',
                cursor: 'pointer',
                position: 'relative',
                overflow: 'hidden',
                transition: 'all 0.3s ease'
              }} 
            >
              {/* Luz de fondo dinámica */}
              <div style={{ 
                position: 'absolute', 
                top: '-50%', left: '-50%', width: '200%', height: '200%', 
                background: `radial-gradient(circle at center, ${orgColor}15 0%, transparent 70%)`,
                opacity: isHovered ? 1 : 0.3,
                transition: 'opacity 0.5s ease',
                pointerEvents: 'none'
              }} />

              {/* Indicador de estado */}
              <div style={{ position: 'absolute', top: '20px', right: '20px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 10px #10b981', animation: 'pulse 2s infinite' }} />
                <span style={{ fontSize: '9px', color: '#10b981', fontWeight: '900', letterSpacing: '1px' }}>ACTIVA</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '18px', position: 'relative', zIndex: 2 }}>
                {org.logo_url ? (
                  <div style={{ width: '60px', height: '60px', borderRadius: '16px', background: '#0a0f1e', padding: '8px', flexShrink: 0, border: `1px solid ${orgColor}40`, boxShadow: `0 0 15px ${orgColor}20` }}>
                    <img src={org.logo_url} alt="logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  </div>
                ) : (
                  <div style={{ width: '60px', height: '60px', borderRadius: '16px', background: `linear-gradient(135deg, ${orgColor}, #0a0f1e)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: '900', color: '#fff', flexShrink: 0, border: `1px solid ${orgColor}50`, boxShadow: `0 0 15px ${orgColor}40` }}>
                    {org.nombre[0]?.toUpperCase()}
                  </div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '900', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', letterSpacing: '0.5px' }}>{org.nombre}</h3>
                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: '6px', fontFamily: 'monospace', letterSpacing: '1px' }}>
                    NODO ID: {org.id.split('-')[0].toUpperCase()}
                  </div>
                  
                  {/* Micro-stats falsas para diseño táctico */}
                  <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                    <div style={{ fontSize: '10px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Activity size={10} color={orgColor} /> Sistema OK
                    </div>
                    <div style={{ fontSize: '10px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Zap size={10} color={orgColor} /> Enlazado
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Barra inferior decorativa */}
              <div style={{ position: 'absolute', bottom: 0, left: 0, width: isHovered ? '100%' : '30%', height: '3px', background: orgColor, transition: 'width 0.4s ease', boxShadow: `0 0 10px ${orgColor}` }} />
            </motion.div>
          );
        })}
      </div>

      {/* MODAL DE DETALLE - DISEÑO CYBER/TACTICO */}
      <AnimatePresence>
        {franchiseDetail && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(5, 8, 15, 0.85)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(10px)' }}>
            <motion.div 
              initial={{ opacity: 0, scale: 0.8, rotateX: 20 }} 
              animate={{ opacity: 1, scale: 1, rotateX: 0 }} 
              exit={{ opacity: 0, scale: 0.9, y: 30 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              style={{ 
                background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.95) 0%, rgba(10, 15, 30, 0.98) 100%)', 
                borderRadius: '24px', 
                padding: '40px', 
                width: '90%', 
                maxWidth: '550px', 
                border: `1px solid ${franchiseDetail.color_primario || 'var(--gold-primary)'}50`, 
                boxShadow: `0 25px 60px -10px rgba(0,0,0,0.8), 0 0 30px ${franchiseDetail.color_primario || 'var(--gold-primary)'}30`, 
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              {/* Elementos decorativos del modal */}
              <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '4px', background: franchiseDetail.color_primario || 'var(--gold-primary)' }} />
              <div style={{ position: 'absolute', top: -50, right: -50, width: '150px', height: '150px', background: franchiseDetail.color_primario || 'var(--gold-primary)', filter: 'blur(80px)', opacity: 0.2, pointerEvents: 'none' }} />

              <button 
                onClick={() => setFranchiseDetail(null)}
                style={{ position: 'absolute', top: '20px', right: '20px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', cursor: 'pointer', fontSize: '16px', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
                onMouseOver={e => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'; e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.4)'; }}
                onMouseOut={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}
              >
                ✕
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 35, borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: 25 }}>
                {franchiseDetail.logo_url ? (
                  <div style={{ width: '80px', height: '80px', borderRadius: '20px', background: 'rgba(0,0,0,0.5)', padding: '10px', border: `2px solid ${franchiseDetail.color_primario || 'var(--gold-primary)'}50`, boxShadow: `0 0 20px ${franchiseDetail.color_primario || 'var(--gold-primary)'}30` }}>
                    <img src={franchiseDetail.logo_url} alt="logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  </div>
                ) : (
                  <div style={{ width: '80px', height: '80px', borderRadius: '20px', background: `linear-gradient(135deg, ${franchiseDetail.color_primario || 'var(--gold-primary)'}, #0a0f1e)`, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '36px', fontWeight: '900', border: `2px solid ${franchiseDetail.color_primario || 'var(--gold-primary)'}50`, boxShadow: `0 0 20px ${franchiseDetail.color_primario || 'var(--gold-primary)'}30` }}>
                    {franchiseDetail.nombre[0]?.toUpperCase()}
                  </div>
                )}
                <div>
                  <h2 style={{ margin: 0, color: '#fff', fontSize: '26px', fontWeight: '900', letterSpacing: '0.5px' }}>{franchiseDetail.nombre}</h2>
                  {franchiseDetail.slogan && <div style={{ fontSize: '13px', color: '#94a3b8', fontStyle: 'italic', marginTop: '6px' }}>"{franchiseDetail.slogan}"</div>}
                  <div style={{ display: 'inline-block', fontSize: '10px', color: franchiseDetail.color_primario || 'var(--gold-primary)', marginTop: '10px', fontFamily: 'monospace', background: `${franchiseDetail.color_primario || 'var(--gold-primary)'}15`, padding: '4px 10px', borderRadius: '6px', border: `1px solid ${franchiseDetail.color_primario || 'var(--gold-primary)'}30`, letterSpacing: '1px' }}>
                    SYS_ID: {franchiseDetail.id.split('-')[0]}
                  </div>
                </div>
              </div>

              {/* ENLACES Y COMPARTIR */}
              <div style={{ marginBottom: '30px', background: 'rgba(0,0,0,0.2)', padding: '20px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.03)' }}>
                <h4 style={{ fontSize: '11px', color: '#64748b', letterSpacing: '1.5px', margin: '0 0 15px 0', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Share2 size={12} /> Red de Usuarios
                </h4>
                <button 
                  onClick={() => copyInviteLink(franchiseDetail)}
                  style={{ width: '100%', background: 'linear-gradient(90deg, rgba(34, 197, 94, 0.1) 0%, rgba(22, 163, 74, 0.2) 100%)', color: '#4ade80', border: '1px solid rgba(34, 197, 94, 0.3)', padding: '14px', borderRadius: '12px', fontSize: '13px', fontWeight: '900', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', transition: 'all 0.3s ease', letterSpacing: '0.5px' }}
                  onMouseOver={e => { e.currentTarget.style.background = 'linear-gradient(90deg, rgba(34, 197, 94, 0.2) 0%, rgba(22, 163, 74, 0.3) 100%)'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 5px 15px rgba(34, 197, 94, 0.2)'; }}
                  onMouseOut={e => { e.currentTarget.style.background = 'linear-gradient(90deg, rgba(34, 197, 94, 0.1) 0%, rgba(22, 163, 74, 0.2) 100%)'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
                >
                  <Share2 size={16} /> COPIAR ENLACE DE INVITACIÓN SOS
                </button>
              </div>

              {/* ACCIONES DEL ADMINISTRADOR */}
              <div style={{ background: 'rgba(0,0,0,0.2)', padding: '20px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.03)' }}>
                <h4 style={{ fontSize: '11px', color: '#64748b', letterSpacing: '1.5px', margin: '0 0 15px 0', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Shield size={12} /> Panel de Control Operativo
                </h4>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                  <button 
                    onClick={() => openEditModal(franchiseDetail)}
                    style={{ background: 'rgba(255,255,255,0.03)', color: '#e2e8f0', border: '1px solid rgba(255,255,255,0.08)', padding: '16px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', transition: 'all 0.3s ease' }}
                    onMouseOver={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.borderColor = franchiseDetail.color_primario || 'var(--gold-primary)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                    onMouseOut={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.transform = 'translateY(0)'; }}
                  >
                    <Edit3 size={20} color={franchiseDetail.color_primario || 'var(--gold-primary)'} />
                    Editar Identidad
                  </button>

                  <button 
                    onClick={() => {
                      handleGenerateAdmin(franchiseDetail);
                      setTimeout(() => copyAdminCredentials(franchiseDetail), 1500);
                    }}
                    disabled={isGeneratingAdmin}
                    style={{ background: 'rgba(59, 130, 246, 0.05)', color: '#60a5fa', border: '1px solid rgba(59, 130, 246, 0.2)', padding: '16px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', transition: 'all 0.3s ease' }}
                    onMouseOver={e => { e.currentTarget.style.background = 'rgba(59, 130, 246, 0.15)'; e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                    onMouseOut={e => { e.currentTarget.style.background = 'rgba(59, 130, 246, 0.05)'; e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.2)'; e.currentTarget.style.transform = 'translateY(0)'; }}
                  >
                    <Key size={20} color="#3b82f6" />
                    {isGeneratingAdmin ? 'Procesando...' : 'Acceso Operador'}
                  </button>
                </div>

                <button 
                  onClick={() => { handleMasterOverride(franchiseDetail); setFranchiseDetail(null); }}
                  style={{ width: '100%', background: 'linear-gradient(90deg, rgba(239, 68, 68, 0.15) 0%, rgba(220, 38, 38, 0.25) 100%)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.4)', padding: '16px', borderRadius: '12px', fontSize: '12px', fontWeight: '900', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', transition: 'all 0.3s ease', letterSpacing: '1px' }}
                  onMouseOver={e => { e.currentTarget.style.background = 'linear-gradient(90deg, rgba(239, 68, 68, 0.25) 0%, rgba(220, 38, 38, 0.35) 100%)'; e.currentTarget.style.boxShadow = '0 5px 20px rgba(239, 68, 68, 0.2)'; }}
                  onMouseOut={e => { e.currentTarget.style.background = 'linear-gradient(90deg, rgba(239, 68, 68, 0.15) 0%, rgba(220, 38, 38, 0.25) 100%)'; e.currentTarget.style.boxShadow = 'none'; }}
                >
                  <Shield size={18} /> OVERRIDE TÁCTICO (MODO MASTER)
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
