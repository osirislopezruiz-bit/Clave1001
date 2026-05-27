import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import '../styles/slidingCard.css';

export default function SlidingCard({ children, isOpen, setIsOpen, title = "MENÚ" }) {
  // Configuración de animación para la tarjeta que sube desde abajo
  const slideVariants = {
    hidden: { y: '100%', transition: { type: 'spring', stiffness: 300, damping: 30 } },
    visible: { y: 0, transition: { type: 'spring', stiffness: 300, damping: 30 } }
  };

  return (
    <>
      {/* Botón flotante para abrir la tarjeta (estilo Find My) */}
      {!isOpen && (
        <motion.button 
          className="sliding-card-toggle"
          onClick={() => setIsOpen(true)}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Menu size={24} color="#fff" />
          <span>{title}</span>
        </motion.button>
      )}

      {/* Overlay oscuro cuando la tarjeta está abierta */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            className="sliding-card-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* La tarjeta en sí */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            className="sliding-card-container"
            variants={slideVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.2}
            onDragEnd={(e, { offset, velocity }) => {
              if (offset.y > 100 || velocity.y > 500) {
                setIsOpen(false);
              }
            }}
          >
            <div className="sliding-card-handle" />
            <div className="sliding-card-header">
              <h3>{title}</h3>
              <button onClick={() => setIsOpen(false)} className="close-card-btn">
                <X size={20} />
              </button>
            </div>
            <div className="sliding-card-content">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
