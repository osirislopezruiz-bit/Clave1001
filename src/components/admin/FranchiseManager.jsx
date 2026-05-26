import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Building2, Edit3, Shield, Key, Share2 } from 'lucide-react';

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
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="view-content" style={{ padding: '30px', maxWidth: '1400px', margin: '0 auto', position: 'relative' }}>
      
      {/* HEADER LIMPIO */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px', paddingBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '900', margin: 0, color: '#fff' }}>
            FRANQUICIAS <span style={{ color: 'var(--gold-primary)' }}>ACTIVAS</span>
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '12px', marginTop: '4px' }}>Selecciona una franquicia para ver opciones y enlaces de invitación.</p>
        </div>
        <button 
          className="btn-premium-gold" 
          onClick={() => { 
            setSelectedOrg(null); 
            setNewOrg({ nombre: '', color: '#0a0f1e', logo: '', tipo_letra: 'Inter', color_secundario: '#ffffff', color_acento: '#ef4444', slogan: '', domicilio: '', redes_sociales: '{}', storage_mode: 'manual_download', bridge_url: '', bridge_api_key: '' }); 
            setShowOrgModal(true); 
          }}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 20px', borderRadius: '10px' }}
        >
          <Building2 size={16} /> CREAR FRANQUICIA
        </button>
      </div>

      {/* GRID DIRECTO AL GRANO */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
        {orgs.map((org, index) => (
          <motion.div 
            whileHover={{ scale: 1.02, y: -2 }}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05 }}
            key={org.id} 
            onClick={() => setFranchiseDetail(org)}
            style={{ 
              borderLeft: \`4px solid \${org.color_primario || '#c5a059'}\`, 
              background: 'rgba(15, 23, 42, 0.6)',
              borderRadius: '12px',
              padding: '20px',
              border: '1px solid rgba(255,255,255,0.04)',
              boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '15px'
            }} 
          >
            {org.logo_url ? (
              <div style={{ width: '50px', height: '50px', borderRadius: '10px', background: org.color_primario || '#1e2a3a', padding: '5px', flexShrink: 0 }}>
                <img src={org.logo_url} alt="logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              </div>
            ) : (
              <div style={{ width: '50px', height: '50px', borderRadius: '10px', background: org.color_primario || '#c5a059', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: '900', color: '#fff', flexShrink: 0 }}>
                {org.nombre[0]?.toUpperCase()}
              </div>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '900', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{org.nombre}</h3>
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px', fontFamily: 'monospace' }}>ID: {org.id.split('-')[0]}</div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* PANEL DE DETALLE Y EDICIÓN (MODAL OVERLAY) */}
      <AnimatePresence>
        {franchiseDetail && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(5px)' }}>
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              style={{ background: '#0f172a', borderRadius: '20px', padding: '30px', width: '90%', maxWidth: '500px', border: \`1px solid \${franchiseDetail.color_primario || 'var(--gold-primary)'}\`, boxShadow: \`0 10px 40px -10px \${franchiseDetail.color_primario || 'var(--gold-primary)'}40\`, position: 'relative' }}
            >
              <button 
                onClick={() => setFranchiseDetail(null)}
                style={{ position: 'absolute', top: '15px', right: '15px', background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '20px' }}
              >
                ✕
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: 15, marginBottom: 25, borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 20 }}>
                {franchiseDetail.logo_url ? (
                  <div style={{ width: '70px', height: '70px', borderRadius: '14px', background: franchiseDetail.color_primario || '#1e2a3a', padding: '8px' }}>
                    <img src={franchiseDetail.logo_url} alt="logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  </div>
                ) : (
                  <div style={{ width: '70px', height: '70px', borderRadius: '14px', background: franchiseDetail.color_primario || '#c5a059', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', fontWeight: '900' }}>
                    {franchiseDetail.nombre[0]?.toUpperCase()}
                  </div>
                )}
                <div>
                  <h2 style={{ margin: 0, color: '#fff', fontSize: '22px', fontWeight: '900' }}>{franchiseDetail.nombre}</h2>
                  {franchiseDetail.slogan && <div style={{ fontSize: '13px', color: '#94a3b8', fontStyle: 'italic', marginTop: '4px' }}>"{franchiseDetail.slogan}"</div>}
                  <div style={{ fontSize: '12px', color: franchiseDetail.color_primario || 'var(--gold-primary)', marginTop: '6px', fontFamily: 'monospace' }}>ID: {franchiseDetail.id.split('-')[0]}</div>
                </div>
              </div>

              {/* ENLACES Y COMPARTIR */}
              <div style={{ marginBottom: '25px' }}>
                <h4 style={{ fontSize: '11px', color: '#64748b', letterSpacing: '1px', marginBottom: '10px', textTransform: 'uppercase' }}>Invitación para Usuarios</h4>
                <button 
                  onClick={() => copyInviteLink(franchiseDetail)}
                  style={{ width: '100%', background: 'linear-gradient(135deg, #22c55e, #16a34a)', color: '#fff', border: 'none', padding: '12px', borderRadius: '10px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 4px 10px rgba(34, 197, 94, 0.3)', transition: 'transform 0.2s' }}
                  onMouseOver={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                  onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}
                >
                  <Share2 size={18} /> ENLACE PARA UNIRSE AL BOTÓN
                </button>
              </div>

              {/* ACCIONES DEL ADMINISTRADOR */}
              <h4 style={{ fontSize: '11px', color: '#64748b', letterSpacing: '1px', marginBottom: '10px', textTransform: 'uppercase' }}>Gestión de Franquicia</h4>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '15px' }}>
                <button 
                  onClick={() => openEditModal(franchiseDetail)}
                  style={{ background: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', padding: '12px', borderRadius: '10px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', transition: 'all 0.2s' }}
                  onMouseOver={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.borderColor = 'var(--gold-primary)' }}
                  onMouseOut={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)' }}
                >
                  <Edit3 size={18} color="var(--gold-primary)" />
                  Editar Perfil
                </button>

                <button 
                  onClick={() => {
                    handleGenerateAdmin(franchiseDetail);
                    setTimeout(() => copyAdminCredentials(franchiseDetail), 1500);
                  }}
                  disabled={isGeneratingAdmin}
                  style={{ background: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', padding: '12px', borderRadius: '10px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', transition: 'all 0.2s' }}
                  onMouseOver={e => { e.currentTarget.style.background = 'rgba(59, 130, 246, 0.2)'; e.currentTarget.style.borderColor = '#3b82f6' }}
                  onMouseOut={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)' }}
                >
                  <Key size={18} color="#3b82f6" />
                  {isGeneratingAdmin ? 'Procesando...' : 'Operador Web'}
                </button>
              </div>

              <button 
                onClick={() => { handleMasterOverride(franchiseDetail); setFranchiseDetail(null); }}
                style={{ width: '100%', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '12px', borderRadius: '10px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'all 0.2s' }}
                onMouseOver={e => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)' }}
                onMouseOut={e => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)' }}
              >
                <Shield size={16} /> FORZAR INGRESO COMO MASTER
              </button>

            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
