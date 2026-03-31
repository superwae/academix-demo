import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/cn';
import { Button } from './button';
import { X, Wand2 } from 'lucide-react';

const FIREWORK_PARTICLES = 14;
const PARTICLE_ANGLES = Array.from({ length: FIREWORK_PARTICLES }, (_, i) => (i * 360) / FIREWORK_PARTICLES);

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  onClose?: () => void;
  /** When 'top', popover opens above the button (e.g. for bottom-fixed panels). Default 'bottom'. */
  placement?: 'top' | 'bottom';
}

export function ColorPicker({ value, onChange, onClose, placement = 'bottom' }: ColorPickerProps) {
  const [hue, setHue] = React.useState(0);
  const [saturation, setSaturation] = React.useState(100);
  const [lightness, setLightness] = React.useState(50);
  const [isOpen, setIsOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Parse HSL from value or initialize
  React.useEffect(() => {
    if (value) {
      const hsl = parseHsl(value);
      if (hsl) {
        setHue(hsl.h);
        setSaturation(hsl.s);
        setLightness(hsl.l);
      }
    }
  }, [value]);

  // Close on outside click
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        onClose?.();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, onClose]);

  const currentColor = `hsl(${hue}, ${saturation}%, ${lightness}%)`;

  const handleHueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newHue = parseInt(e.target.value);
    setHue(newHue);
    onChange(`hsl(${newHue}, ${saturation}%, ${lightness}%)`);
  };

  const handleSaturationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newSaturation = parseInt(e.target.value);
    setSaturation(newSaturation);
    onChange(`hsl(${hue}, ${newSaturation}%, ${lightness}%)`);
  };

  const handleLightnessChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newLightness = parseInt(e.target.value);
    setLightness(newLightness);
    onChange(`hsl(${hue}, ${saturation}%, ${newLightness}%)`);
  };

  const handleColorWheelClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    const dx = x - centerX;
    const dy = y - centerY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const radius = Math.min(centerX, centerY) - 10;
    
    if (distance <= radius) {
      // Calculate hue from angle
      let angle = Math.atan2(dy, dx) * (180 / Math.PI);
      angle = (angle + 90 + 360) % 360; // Normalize to 0-360
      const newHue = Math.round(angle);
      
      // Calculate saturation from distance (0 at center, 100 at edge)
      const newSaturation = Math.min(100, Math.round((distance / radius) * 100));
      
      setHue(newHue);
      setSaturation(newSaturation);
      onChange(`hsl(${newHue}, ${newSaturation}%, ${lightness}%)`);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <motion.div
        className="relative"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <Button
          type="button"
          variant="outline"
          onClick={() => setIsOpen(!isOpen)}
          className="h-11 gap-2 border-2 rounded-xl bg-gradient-to-r from-primary/10 to-primary/5 border-primary/30 shadow-sm"
        >
          <Wand2 className="h-4 w-4 text-primary shrink-0" />
          <span
            className="h-3.5 w-3.5 rounded-full border-2 border-primary/50 shadow-sm shrink-0"
            style={{ background: currentColor }}
          />
          <span className="hidden sm:inline font-medium">Custom Theme</span>
          <span className="sm:hidden">Theme</span>
        </Button>
      </motion.div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{
              type: 'spring',
              stiffness: 380,
              damping: 22,
              mass: 0.5,
            }}
            style={{
              transformOrigin: placement === 'top' ? 'right bottom' : 'right top',
            }}
            className={cn(
              'absolute right-0 w-72 glass-strong rounded-xl border border-border/60 shadow-xl z-[100] p-3 overflow-visible',
              placement === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'
            )}
          >
            {/* Firework burst — particles from the magic stick (corner nearest button) */}
            <div
              className="absolute pointer-events-none w-0 h-0"
              style={
                placement === 'top'
                  ? { bottom: -2, right: 0 }
                  : { top: -2, right: 0 }
              }
            >
              {PARTICLE_ANGLES.map((angleDeg, i) => {
                const rad = (angleDeg * Math.PI) / 180;
                const dist = 80;
                const x = Math.cos(rad) * dist;
                const y = Math.sin(rad) * dist * (placement === 'top' ? -1 : 1);
                return (
                  <motion.span
                    key={i}
                    className="absolute w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_6px_hsl(var(--primary))]"
                    initial={{ x: 0, y: 0, opacity: 0.9, scale: 1 }}
                    animate={{
                      x,
                      y,
                      opacity: 0,
                      scale: 0.3,
                    }}
                    exit={{ opacity: 0 }}
                    transition={{
                      duration: 0.55,
                      delay: i * 0.02,
                      ease: [0.25, 0.46, 0.45, 0.94],
                    }}
                    style={{ left: 0, top: 0 }}
                  />
                );
              })}
            </div>

            {/* Content fades in after burst */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.12, duration: 0.2 }}
              className="relative"
            >
            {onClose && (
              <button
                onClick={() => {
                  setIsOpen(false);
                  onClose();
                }}
                className="absolute right-2 top-2 text-muted-foreground hover:text-foreground transition-colors z-10"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            )}

            <div className="space-y-3">
              <div>
                <h3 className="font-semibold text-sm mb-2 pr-6">Choose Custom Color</h3>
                
                {/* Color Wheel — fixed size so no scroll */}
                <div className="relative mx-auto mb-3 w-44 h-44 shrink-0">
                  <div
                    className="w-full h-full rounded-full cursor-crosshair relative overflow-hidden border-2 border-border"
                    style={{
                      background: `conic-gradient(
                        from 0deg,
                        hsl(0, 100%, 50%),
                        hsl(60, 100%, 50%),
                        hsl(120, 100%, 50%),
                        hsl(180, 100%, 50%),
                        hsl(240, 100%, 50%),
                        hsl(300, 100%, 50%),
                        hsl(360, 100%, 50%)
                      )`,
                    }}
                    onClick={handleColorWheelClick}
                  >
                    {/* White center (0% saturation) */}
                    <div
                      className="absolute inset-[20%] rounded-full bg-white"
                    />
                    {/* Black overlay for lightness */}
                    <div
                      className="absolute inset-0 rounded-full"
                      style={{
                        background: `radial-gradient(circle, transparent 0%, hsl(0, 0%, ${100 - lightness}%) 100%)`,
                        mixBlendMode: 'multiply',
                      }}
                    />
                    {/* Indicator */}
                    <div
                      className="absolute w-3 h-3 rounded-full border-2 border-white shadow-md pointer-events-none z-10"
                      style={{
                        left: `calc(50% + ${Math.cos(((hue - 90) * Math.PI) / 180) * (saturation / 100) * 44}% - 6px)`,
                        top: `calc(50% + ${Math.sin(((hue - 90) * Math.PI) / 180) * (saturation / 100) * 44}% - 6px)`,
                        background: currentColor,
                      }}
                    />
                  </div>
                </div>

                {/* Current Color Preview — compact */}
                <div className="flex items-center gap-2 mb-2">
                  <div
                    className="w-10 h-10 rounded-lg border border-border shrink-0"
                    style={{ background: currentColor }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium">Selected Color</div>
                    <div className="text-[10px] text-muted-foreground font-mono truncate">
                      {currentColor}
                    </div>
                  </div>
                </div>

                {/* HSL Sliders — compact */}
                <div className="space-y-2">
                  <div>
                    <label className="text-[10px] font-medium text-muted-foreground mb-0.5 block">
                      Hue: {hue}°
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="360"
                      value={hue}
                      onChange={handleHueChange}
                      className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                      style={{
                        background: `linear-gradient(to right, 
                          hsl(0, ${saturation}%, ${lightness}%),
                          hsl(60, ${saturation}%, ${lightness}%),
                          hsl(120, ${saturation}%, ${lightness}%),
                          hsl(180, ${saturation}%, ${lightness}%),
                          hsl(240, ${saturation}%, ${lightness}%),
                          hsl(300, ${saturation}%, ${lightness}%),
                          hsl(360, ${saturation}%, ${lightness}%)
                        )`,
                      }}
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-medium text-muted-foreground mb-0.5 block">
                      Saturation: {saturation}%
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={saturation}
                      onChange={handleSaturationChange}
                      className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-medium text-muted-foreground mb-0.5 block">
                      Lightness: {lightness}%
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={lightness}
                      onChange={handleLightnessChange}
                      className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                    />
                  </div>
                </div>

                {/* Preset Colors — compact */}
                <div>
                  <label className="text-[10px] font-medium text-muted-foreground mb-1 block">
                    Quick Presets
                  </label>
                  <div className="grid grid-cols-8 gap-1">
                    {[
                      'hsl(222, 84%, 60%)', // Light blue
                      'hsl(217, 91%, 60%)', // Dark blue
                      'hsl(270, 85%, 65%)', // Purple
                      'hsl(199, 89%, 55%)', // Sky blue
                      'hsl(0, 84%, 60%)',   // Red
                      'hsl(142, 71%, 45%)', // Green
                      'hsl(38, 92%, 50%)',  // Orange
                      'hsl(280, 100%, 70%)', // Pink
                    ].map((preset) => {
                      const parsed = parseHsl(preset);
                      return (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => {
                            if (parsed) {
                              setHue(parsed.h);
                              setSaturation(parsed.s);
                              setLightness(parsed.l);
                              onChange(preset);
                            }
                          }}
                          className="w-6 h-6 rounded-md border border-border hover:scale-110 transition-transform"
                          style={{ background: preset }}
                          aria-label={`Select ${preset}`}
                        />
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function parseHsl(hslString: string): { h: number; s: number; l: number } | null {
  const match = hslString.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
  if (match) {
    return {
      h: parseInt(match[1]),
      s: parseInt(match[2]),
      l: parseInt(match[3]),
    };
  }
  return null;
}

