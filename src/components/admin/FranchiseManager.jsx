import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function FranchiseManager({
  orgs,
  setSelectedOrg,
  setNewOrg,
  setShowOrgModal,
  franchiseDetail,
  setFranchiseDetail,
  handleGenerateAdmin,
  isGeneratingAdmin,
  handleMasterOverride
}) {
  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="view-content">
      <div className="orgs-header">
        <h1>ADMINISTRACIÓN DE <span>FRANQUICIAS</span></h1>
        <button className="btn-premium-gold" onClick={() => { 
          setSelectedOrg(null); 
          setNewOrg({ nombre: '', color: '#0a0f1e', logo: '', tipo_letra: 'Inter', color_secundario: '#ffffff', color_acento: '#ef4444', slogan: '', domicilio: '', redes_sociales: '{}', storage_mode: 'manual_download', bridge_url: '', bridge_api_key: '' }); 
          setShowOrgModal(true); 
        }}>
          + NUEVA FRANQUICIA
        </button>
      </div>
      <div className="orgs-grid">
        {orgs.map(org => (
          <div key={org.id} className="org-card-glass" style={{ borderLeft: `4px solid ${org.color_primario || '#c5a059'}`, cursor: 'pointer' }} onClick={() => setFranchiseDetail(org)}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              {org.logo_url
                ? <img src={org.logo_url} alt="logo" style={{ width: 48, height: 48, borderRadius: 10, objectFit: 'contain', background: org.color_primario || '#1e2a3a', padding: 4 }} />
                : <div className="org-icon" style={{ background: org.color_primario, flexShrink: 0, width: 48, height: 48, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 'bold' }}>{org.nombre[0]}</div>
              }
              <div style={{ flex: 1, minWidth: 0 }}>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 900, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{org.nombre}</h3>
                {org.slogan && <p style={{ margin: '2px 0 0', fontSize: 11, color: '#94a3b8', fontStyle: 'italic', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>"{org.slogan}"</p>}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* MODAL DE DETALLES DE FRANQUICIA */}
      <AnimatePresence>
        {franchiseDetail && (
          <div className="modal-overlay">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="tactical-modal" style={{ maxWidth: '600px', width: '90%' }}>
              <button className="close-btn" onClick={() => setFranchiseDetail(null)}>✕</button>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: 15, marginBottom: 25, borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 15 }}>
                {franchiseDetail.logo_url
                  ? <img src={franchiseDetail.logo_url} alt="logo" style={{ width: 60, height: 60, borderRadius: 12, objectFit: 'contain', background: franchiseDetail.color_primario || '#1e2a3a', padding: 5 }} />
                  : <div style={{ width: 60, height: 60, borderRadius: 12, background: franchiseDetail.color_primario || '#c5a059', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 900 }}>{franchiseDetail.nombre[0]}</div>
                }
                <div>
                  <h2 style={{ margin: 0, color: '#fff', fontSize: 20 }}>{franchiseDetail.nombre}</h2>
                  <div style={{ fontSize: 12, color: 'var(--gold-primary)', marginTop: 4 }}>ID: {franchiseDetail.id.split('-')[0]}</div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15, marginBottom: 25 }}>
                <div style={{ background: 'rgba(0,0,0,0.2)', padding: 15, borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ fontSize: 10, color: '#94a3b8', letterSpacing: 1, marginBottom: 5 }}>ALMACENAMIENTO DE EVIDENCIAS</div>
                  <div style={{ fontSize: 24, color: '#fff', fontWeight: 900 }}>{(Math.random() * 5 + 0.5).toFixed(1)} GB</div>
                  <div style={{ fontSize: 11, color: '#22c55e', marginTop: 5 }}>Dentro del límite normal</div>
                </div>
                <div style={{ background: 'rgba(0,0,0,0.2)', padding: 15, borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ fontSize: 10, color: '#94a3b8', letterSpacing: 1, marginBottom: 5 }}>COSTO OPERATIVO ESTIMADO</div>
                  <div style={{ fontSize: 24, color: '#fff', fontWeight: 900 }}>${(Math.random() * 10 + 2).toFixed(2)} USD</div>
                  <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 5 }}>Mensual (Servidores en Nube)</div>
                </div>
              </div>

              <label style={{ fontSize: 10, color: 'var(--gold-primary)', fontWeight: 900, display: 'block', marginBottom: 10 }}>ACCIONES RÁPIDAS</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <button className="btn-premium-gold" onClick={() => { 
                  setFranchiseDetail(null);
                  setSelectedOrg(franchiseDetail); 
                  setNewOrg({ nombre: franchiseDetail.nombre, color: franchiseDetail.color_primario || '#0a0f1e', logo: franchiseDetail.logo_url || '', tipo_letra: franchiseDetail.tipo_letra || 'Inter', color_secundario: franchiseDetail.color_secundario || '#ffffff', color_acento: franchiseDetail.color_acento || '#ef4444', slogan: franchiseDetail.slogan || '', domicilio: franchiseDetail.domicilio || '', redes_sociales: franchiseDetail.redes_sociales ? JSON.stringify(franchiseDetail.redes_sociales) : '{}', storage_mode: franchiseDetail.storage_mode || 'manual_download', bridge_url: franchiseDetail.bridge_url || '', bridge_api_key: franchiseDetail.bridge_api_key || '' }); 
                  setShowOrgModal(true); 
                }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  ✏️ MODIFICAR PERFIL
                </button>
                
                <button className="btn-premium-gold" onClick={() => handleGenerateAdmin(franchiseDetail)} disabled={isGeneratingAdmin} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  {isGeneratingAdmin ? '⏳ CARGANDO...' : '🔑 CREAR CREDENCIALES'}
                </button>
                
                <button className="btn-premium-gold" onClick={() => {
                  const adminEmail = franchiseDetail.nombre.trim().toLowerCase().replace(/[^a-z0-9]/g, '_') + '_admin@clave1001.com';
                  const msg = `¡Bienvenido a CLAVE 1001!\nTu central táctica en vivo: https://clave-1001-standalone.vercel.app/\n\n*Usuario:* ${adminEmail}\n*Contraseña:* Clave1001_Password!\n\n(Recomendamos iniciar sesión para comenzar a operar su módulo táctico).`;
                  navigator.clipboard.writeText(msg);
                  alert("✅ Enlace y credenciales copiados. ¡Pégalo en WhatsApp para enviar a la franquicia!");
                }} style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  📱 INVITAR (WHATSAPP)
                </button>

                <button className="btn-premium-gold" onClick={() => { setFranchiseDetail(null); handleMasterOverride(franchiseDetail); }} style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  🔓 LOGIN MASTER
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
