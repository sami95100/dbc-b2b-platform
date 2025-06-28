'use client';

import { useState, useEffect } from 'react';
import { ChevronUp } from 'lucide-react';

export default function BackToTopButton() {
  const [isVisible, setIsVisible] = useState(false);

  // Détecter le scroll pour afficher/masquer le bouton
  useEffect(() => {
    const toggleVisibility = () => {
      // Afficher le bouton après avoir scrollé de 300px
      if (window.pageYOffset > 300) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener('scroll', toggleVisibility);

    return () => {
      window.removeEventListener('scroll', toggleVisibility);
    };
  }, []);

  // Fonction pour remonter en haut avec animation smooth
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  if (!isVisible) {
    return null;
  }

  return (
    <button
      onClick={scrollToTop}
      className="fixed bottom-6 right-6 z-50 bg-gradient-to-r from-dbc-bright-green to-emerald-400 hover:from-emerald-300 hover:to-emerald-500 text-dbc-dark-green hover:text-white p-3 rounded-full shadow-lg transition-all duration-300 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-dbc-light-green focus:ring-offset-2"
      aria-label="Retour en haut de page"
      title="Retour en haut"
    >
      <ChevronUp className="w-6 h-6" />
    </button>
  );
} 