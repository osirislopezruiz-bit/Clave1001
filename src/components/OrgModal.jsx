import React from 'react';

export default function OrgModal({
  isOpen,
  onClose,
  newOrg,
  setNewOrg,
  handleLogoUpload,
  uploadingLogo,
  handleSaveOrg,
  isCreatingOrg,
}) {
  if (!isOpen) return null;
  return (
    <div className="modal-root">
      <div className="modal-box">
        <h2>GESTIÓN EMPRESARIAL</h2>
        <div className="form-group" style={{ maxHeight: '60vh', overflowY: 'auto', paddingRight: 10 }}>
          <input placeholder="Nombre de Franquicia" value={newOrg.nombre} onChange={e => setNewOrg({ ...newOrg, nombre: e.target.value })} />
          <input placeholder="Slogan (Opcional)" value={newOrg.slogan} onChange={e => setNewOrg({ ...newOrg, slogan: e.target.value })} />
          <label style={{ fontSize: 10, color: 'var(--gold)', fontWeight: 900, marginTop: 15, display: 'block' }}>
            PERSONALIZACIÓN VISUAL (ETIQUETA BLANCA)
          </label>
          <div className="color-row" style={{ marginTop: 10 }}>
            <label>COLOR DE FONDO</label>
            <input type="color" value={newOrg.color} onChange={e => setNewOrg({ ...newOrg, color: e.target.value })} />
          </div>
          <div className="color-row">
            <label>COLOR DE TEXTO</label>
            <input type="color" value={newOrg.color_secundario} onChange={e => setNewOrg({ ...newOrg, color_secundario: e.target.value })} />
          </div>
          <div className="color-row">
            <label>COLOR DE ACENTO</label>
            <input type="color" value={newOrg.color_acento} onChange={e => setNewOrg({ ...newOrg, color_acento: e.target.value })} />
          </div>
          <select
            value={newOrg.tipo_letra}
            onChange={e => setNewOrg({ ...newOrg, tipo_letra: e.target.value })}
            style={{ width: '100%', padding: 12, borderRadius: 10, background: 'rgba(0,0,0,0.3)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', marginTop: 10 }}
          >
            <option value="Inter">Fuente: Inter (Elegante)</option>
            <option value="Roboto">Fuente: Roboto (Técnica)</option>
            <option value="Oswald">Fuente: Oswald (Táctica)</option>
            <option value="Montserrat">Fuente: Montserrat (Moderna)</option>
          </select>
          <div style={{ marginTop: 15, background: 'rgba(0,0,0,0.3)', padding: 15, borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)' }}>
            <label style={{ fontSize: 10, color: '#94a3b8', fontWeight: 900, display: 'block', marginBottom: 10 }}>
              SUBIR LOGOTIPO (PNG / JPG)
            </label>
            <input type="file" accept="image/png, image/jpeg" onChange={handleLogoUpload} style={{ fontSize: 12, width: '100%' }} />
            {uploadingLogo && <div style={{ fontSize: 11, color: 'var(--gold)', marginTop: 8 }}>Subiendo imagen al servidor...</div>}
            {newOrg.logo && (
              <div style={{ marginTop: 10 }}>
                <img src={newOrg.logo} alt="Logo" style={{ maxHeight: 60, borderRadius: 8, border: '1px solid var(--gold)' }} />
              </div>
            )}
          </div>
          <input placeholder="Domicilio Físico (Opcional)" value={newOrg.domicilio} onChange={e => setNewOrg({ ...newOrg, domicilio: e.target.value })} style={{ marginTop: 15 }} />
          <textarea
            placeholder='Redes Sociales (JSON) ej. {"fb":"url"}'
            value={newOrg.redes_sociales}
            onChange={e => setNewOrg({ ...newOrg, redes_sociales: e.target.value })}
            style={{ width: '100%', padding: 12, borderRadius: 10, background: 'rgba(0,0,0,0.3)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', marginTop: 10, minHeight: 60 }}
          />
          <label style={{ fontSize: 10, color: 'var(--gold)', fontWeight: '900', marginTop: 25, display: 'block' }}>
            FASE 2 — BRIDGE LOCAL
          </label>
          <select
            value={newOrg.storage_mode}
            onChange={e => setNewOrg({ ...newOrg, storage_mode: e.target.value })}
            style={{ width: '100%', padding: 12, borderRadius: 10, background: 'rgba(0,0,0,0.3)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            <option value="manual_download">Fase 1 — Descarga manual</option>
            <option value="local_bridge">Fase 2 — Bridge en disco franquicia</option>
          </select>
          <input placeholder="Bridge URL (ej. http://192.168.1.10:9876)" value={newOrg.bridge_url} onChange={e => setNewOrg({ ...newOrg, bridge_url: e.target.value })} />
          <input placeholder="Bridge API Key" value={newOrg.bridge_api_key} onChange={e => setNewOrg({ ...newOrg, bridge_api_key: e.target.value })} />
        </div>
        {/* LIVE WHITE-LABEL PREVIEW STRIP */}
        <div style={{ margin: '15px 0 0', padding: 15, borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)', background: newOrg.color || '#0a0f1e', transition: 'all 0.4s' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {newOrg.logo ? (
              <img src={newOrg.logo} alt="preview" style={{ width: 36, height: 36, borderRadius: 8, objectFit: 'contain' }} />
            ) : (
              <div style={{ width: 36, height: 36, borderRadius: 8, background: newOrg.color_acento, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: '#fff', fontSize: 16 }}>
                {(newOrg.nombre || '?')[0]?.toUpperCase()}
              </div>
            )}
            <div>
              <div style={{ fontFamily: newOrg.tipo_letra || 'Inter', fontWeight: 900, fontSize: 14, color: newOrg.color_secundario || '#fff' }}>
                {newOrg.nombre || 'Nombre de empresa'}
              </div>
              {newOrg.slogan && (
                <div style={{ fontFamily: newOrg.tipo_letra || 'Inter', fontSize: 10, color: newOrg.color_acento, fontStyle: 'italic', marginTop: 2 }}>
                  "{newOrg.slogan}"
                </div>
              )}
            </div>
          </div>
          <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.2)', textAlign: 'right', marginTop: 6 }}>PREVIEW EN VIVO</div>
        </div>
        <div className="modal-btns">
          <button onClick={onClose}>CANCELAR</button>
          <button className="save" onClick={handleSaveOrg} disabled={isCreatingOrg}>
            {isCreatingOrg ? 'GUARDANDO...' : 'GUARDAR CAMBIOS'}
          </button>
        </div>
      </div>
    </div>
  );
}
