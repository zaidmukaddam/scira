'use client';

import React from 'react';

const Footer = () => {
  return (
    <footer className="fixed bottom-0 left-0 right-0 z-10 bg-background/95 backdrop-blur-sm border-t border-border">
      {/* Medical disclaimer */}
      <div className="border-b border-border/50">
        <div className="container mx-auto px-4 py-2">
          <p className="text-xs text-muted-foreground text-center">
            ⚠️ Atlas is not a replacement for professional medical care. Always consult healthcare professionals for medical advice, diagnosis, or treatment.
          </p>
        </div>
      </div>
      <div className="container mx-auto px-4 py-3">
        <div className="flex flex-wrap justify-center items-center gap-6 text-xs text-muted-foreground">
          <a 
            href="https://famasi.me" 
            target="_blank" 
            rel="noopener noreferrer"
            className="hover:text-foreground transition-colors"
          >
            Learn more
          </a>
          <a 
            href="https://famasi.me/legal" 
            target="_blank" 
            rel="noopener noreferrer"
            className="hover:text-foreground transition-colors"
          >
            Legal
          </a>
          <a 
            href="https://twitter.com/FamasiAfrica" 
            target="_blank" 
            rel="noopener noreferrer"
            className="hover:text-foreground transition-colors"
          >
            Twitter
          </a>
          <a 
            href="https://instagram.com/FamasiAfrica" 
            target="_blank" 
            rel="noopener noreferrer"
            className="hover:text-foreground transition-colors"
          >
            Instagram
          </a>
          <a 
            href="https://linkedin.com/company/FamasiAfrica" 
            target="_blank" 
            rel="noopener noreferrer"
            className="hover:text-foreground transition-colors"
          >
            LinkedIn
          </a>
          <a 
            href="https://facebook.com/FamasiAfrica" 
            target="_blank" 
            rel="noopener noreferrer"
            className="hover:text-foreground transition-colors"
          >
            Facebook
          </a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
