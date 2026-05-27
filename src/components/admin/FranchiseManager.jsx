import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Building2, Edit3, Shield, Key, Share2, X, Plus, ChevronRight } from 'lucide-react';

export default function FranchiseManager({
  orgs,
  setSelectedOrg,
  setNewOrg,
  setShowOrgModal,
  handleGenerateAdmin,
  isGeneratingAdmin,
  handleMasterOverride
}) {
  const [detail, setDetail] = useState(null);

  const openEdit = (org) => {
    setDetail(null);
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

  const copyInvite = (org) => {
    const link = `${window.location.origin}/?org=${org.id}`;
    const msg = `¡Únete a la red de protección de *${org.nombre}*.\n\n${link}`;
    navigator.clipboard.writeText(msg);
    alert('✅ Enlace copiado');
  };

  const newOrgDefaults = () => {
    setSelectedOrg(null);
    setNewOrg({ nombre: '', color: '#0a0f1e', logo: '', tipo_letra: 'Inter', color_secundario: '#ffffff', color_acento: '#ef4444', slogan: '', domicilio: '', redes_sociales: '{}', storage_mode: 'manual_download', bridge_url: '', bridge_api_key: '' });
    setShowOrgModal(true);
  };

  return (
    <div style={{ padding: '32px 24px', maxWidth: '1100px', margin: '0 auto' }}>

      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: '900', color: '#fff', letterSpacing: '1px' }}>
            ADMINISTRACIÓN DE <span style={{ color: '#c5a059' }}>FRANQUICIAS</span>
          </h1>
          <p style={{ margin: '6px 0 0', fontSize: '12px', color: '#64748b', letterSpacing: '1px', textTransform: 'uppercase' }}>
            {orgs.length} nodo{orgs.length !== 1 ? 's' : ''} registrado{orgs.length !== 1 ? 's' : ''}
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={newOrgDefaults}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', background: 'linear-gradient(135deg, #c5a059, #a88241)', color: '#000', border: 'none', borderRadius: '12px', fontWeight: '900', fontSize: '13px', cursor: 'pointer', letterSpacing: '0.5px' }}
        >
          <Plus size={16} /> NUEVA FRANQUICIA
        </motion.button>
      </div>

      {/* EMPTY STATE */}
      {orgs.length === 0 && (
        <div style={{ textAlign: 'center', padding: '80px 20px', color: '#475569' }}>
          <Building2 size={48} style={{ opacity: 0.3, marginBottom: '16px' }} />
          <div style={{ fontSize: '14px', fontWeight: '700', letterSpacing: '1px' }}>SIN FRANQUICIAS REGISTRADAS</div>
          <div style={{ fontSize: '12px', marginTop: '8px', color: '#334155' }}>Crea la primera franquicia para comenzar.</div>
        </div>
      )}

      {/* CARDS GRID */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 300px), 1fr))', gap: '16px' }}>
        {orgs.map((org, i) => {
          const color = org.color_primario || '#c5a059';
          return (
            <motion.div
              key={org.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06, type: 'spring', stiffness: 250, damping: 22 }}
              whileHover={{ y: -4, boxShadow: `0 12px 32px rgba(0,0,0,0.5), 0 0 0 1px ${color}60` }}
              onClick={() => setDetail(org)}
              style={{
                background: 'rgba(12, 18, 34, 0.85)',
                border: `1px solid rgba(255,255,255,0.07)`,
                borderRadius: '16px',
                padding: '20px',
                cursor: 'pointer',
                position: 'relative',
                overflow: 'hidden',
                transition: 'box-shadow 0.3s',
              }}
            >
              {/* Color accent bar top */}
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: color }} />

              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                {/* Logo / Avatar */}
                {org.logo_url ? (
                  <img src={org.logo_url} alt="logo" style={{ width: '48px', height: '48px', borderRadius: '12px', objectFit: 'contain', background: '#0a0f1e', padding: '6px', border: `1px solid ${color}30`, flexShrink: 0 }} />
                ) : (
                  <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: `linear-gradient(135deg, ${color}cc, #0a0f1e)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: '900', color: '#fff', flexShrink: 0, border: `1px solid ${color}40` }}>
                    {org.nombre[0]?.toUpperCase()}
                  </div>
                )}

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '15px', fontWeight: '900', color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{org.nombre}</div>
                  {org.slogan && (
                    <div style={{ fontSize: '11px', color: '#94a3b8', fontStyle: 'italic', marginTop: '3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>"{org.slogan}"</div>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px' }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 6px #10b981', display: 'inline-block', flexShrink: 0 }} />
                    <span style={{ fontSize: '10px', color: '#10b981', fontWeight: '700', letterSpacing: '0.5px' }}>ACTIVA</span>
                  </div>
                </div>

                {/* Arrow */}
                <ChevronRight size={18} color="#334155" style={{ flexShrink: 0 }} />
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* DETAIL MODAL */}
      <AnimatePresence>
        {detail && (
          <div
            onClick={() => setDetail(null)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', backdropFilter: 'blur(8px)' }}
          >
            <motion.div
              onClick={e => e.stopPropagation()}
              initial={{ opacity: 0, scale: 0.92, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 20 }}
              transition={{ type: 'spring', damping: 28, stiffness: 320 }}
              style={{
                background: 'linear-gradient(160deg, #0d1424 0%, #080d18 100%)',
                border: `1px solid ${detail.color_primario || '#c5a059'}40`,
                borderRadius: '20px',
                padding: '28px',
                width: '100%',
                maxWidth: '480px',
                position: 'relative',
                boxShadow: `0 30px 80px rgba(0,0,0,0.8), 0 0 0 1px ${detail.color_primario || '#c5a059'}20`
              }}
            >
              {/* Top accent */}
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', borderRadius: '20px 20px 0 0', background: detail.color_primario || '#c5a059' }} />

              {/* Close */}
              <button
                onClick={() => setDetail(null)}
                style={{ position: 'absolute', top: '16px', right: '16px', width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <X size={16} />
              </button>

              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
                {detail.logo_url ? (
                  <img src={detail.logo_url} alt="logo" style={{ width: '64px', height: '64px', borderRadius: '14px', objectFit: 'contain', background: '#0a0f1e', padding: '8px', border: `1px solid ${detail.color_primario || '#c5a059'}40` }} />
                ) : (
                  <div style={{ width: '64px', height: '64px', borderRadius: '14px', background: `linear-gradient(135deg, ${detail.color_primario || '#c5a059'}, #0a0f1e)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', fontWeight: '900', color: '#fff', flexShrink: 0, border: `1px solid ${detail.color_primario || '#c5a059'}40` }}>
                    {detail.nombre[0]?.toUpperCase()}
                  </div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '900', color: '#fff' }}>{detail.nombre}</h2>
                  {detail.slogan && <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#94a3b8', fontStyle: 'italic' }}>"{detail.slogan}"</p>}
                  <div style={{ marginTop: '8px', fontSize: '10px', fontFamily: 'monospace', color: detail.color_primario || '#c5a059', background: `${detail.color_primario || '#c5a059'}15`, display: 'inline-block', padding: '3px 8px', borderRadius: '6px' }}>
                    ID: {detail.id.split('-')[0].toUpperCase()}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <button
                  onClick={() => openEdit(detail)}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 18px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', color: '#e2e8f0', fontSize: '13px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s' }}
                  onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                  onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
                >
                  <Edit3 size={18} color={detail.color_primario || '#c5a059'} />
                  Editar Franquicia
                </button>

                <button
                  onClick={() => copyInvite(detail)}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 18px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '12px', color: '#4ade80', fontSize: '13px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s' }}
                  onMouseOver={e => e.currentTarget.style.background = 'rgba(16,185,129,0.15)'}
                  onMouseOut={e => e.currentTarget.style.background = 'rgba(16,185,129,0.08)'}
                >
                  <Share2 size={18} />
                  Copiar Enlace de Invitación
                </button>

                <button
                  onClick={() => { handleGenerateAdmin(detail); setTimeout(() => setDetail(null), 500); }}
                  disabled={isGeneratingAdmin}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 18px', background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: '12px', color: '#60a5fa', fontSize: '13px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s' }}
                  onMouseOver={e => e.currentTarget.style.background = 'rgba(59,130,246,0.15)'}
                  onMouseOut={e => e.currentTarget.style.background = 'rgba(59,130,246,0.08)'}
                >
                  <Key size={18} />
                  {isGeneratingAdmin ? 'Procesando...' : 'Generar Acceso Operador'}
                </button>

                <button
                  onClick={() => { handleMasterOverride(detail); setDetail(null); }}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 18px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '12px', color: '#f87171', fontSize: '13px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s', letterSpacing: '0.5px' }}
                  onMouseOver={e => e.currentTarget.style.background = 'rgba(239,68,68,0.15)'}
                  onMouseOut={e => e.currentTarget.style.background = 'rgba(239,68,68,0.08)'}
                >
                  <Shield size={18} />
                  Master Override
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
