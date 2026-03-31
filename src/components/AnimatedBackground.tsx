import { motion } from 'framer-motion'

export function AnimatedBackground({ mixActive = false }: { mixActive?: boolean }) {
  const opacity = mixActive ? 0.2 : 0.7
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/* Base gradient wash - theme-aware with enhanced layers; subtle when mix gradient is showing */}
      <div
        className="absolute inset-0"
        style={{
          opacity,
          background:
            'radial-gradient(1400px 900px at 80% 10%, hsl(var(--primary) / 0.18), transparent 65%), radial-gradient(1200px 800px at 20% 80%, hsl(var(--ring) / 0.15), transparent 60%), radial-gradient(1000px 600px at 50% 100%, hsl(var(--primary) / 0.12), transparent 55%), linear-gradient(180deg, transparent 0%, hsl(var(--primary) / 0.05) 50%, transparent 100%)',
        }}
      />

      {/* Animated mesh gradient overlay */}
      <motion.div
        className="absolute inset-0"
        style={{
          opacity: mixActive ? 0.1 : 0.3,
          background: `conic-gradient(from 0deg at 50% 50%, hsl(var(--primary) / 0.1) 0deg, transparent 60deg, hsl(var(--ring) / 0.08) 120deg, transparent 180deg, hsl(var(--primary) / 0.1) 240deg, transparent 300deg, hsl(var(--ring) / 0.08) 360deg)`,
        }}
        animate={{ rotate: 360 }}
        transition={{
          duration: 60,
          repeat: Infinity,
          ease: 'linear',
        }}
      />

      {/* Large animated blobs with enhanced movement */}
      <motion.div
        className="absolute -left-32 top-10 h-[500px] w-[500px] rounded-full blur-3xl"
        style={{
          opacity: mixActive ? 0.15 : 0.45,
          background: 'hsl(var(--primary))',
        }}
        animate={{
          x: [0, 150, 50, 0],
          y: [0, 80, 30, 0],
          scale: [1, 1.2, 1.1, 1],
        }}
        transition={{
          duration: 25,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
      <motion.div
        className="absolute right-[-150px] top-32 h-[600px] w-[600px] rounded-full blur-3xl"
        style={{
          opacity: mixActive ? 0.12 : 0.4,
          background: 'hsl(var(--ring))',
        }}
        animate={{
          x: [0, -150, -80, 0],
          y: [0, 100, 50, 0],
          scale: [1, 1.15, 1.05, 1],
        }}
        transition={{
          duration: 30,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
      <motion.div
        className="absolute left-[40%] bottom-[-250px] h-[550px] w-[550px] rounded-full blur-3xl"
        style={{
          opacity: mixActive ? 0.1 : 0.35,
          background: 'hsl(var(--primary))',
        }}
        animate={{
          x: [0, 120, 60, 0],
          y: [0, -80, -40, 0],
          scale: [1, 1.18, 1.08, 1],
        }}
        transition={{
          duration: 28,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
      
      {/* Additional medium blobs for depth */}
      <motion.div
        className="absolute left-[60%] top-[20%] h-[400px] w-[400px] rounded-full blur-3xl"
        style={{
          opacity: mixActive ? 0.08 : 0.25,
          background: 'hsl(var(--ring))',
        }}
        animate={{
          x: [0, 80, 0],
          y: [0, 60, 0],
          scale: [1, 1.1, 1],
        }}
        transition={{
          duration: 18,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
      <motion.div
        className="absolute right-[20%] bottom-[30%] h-[350px] w-[350px] rounded-full blur-3xl"
        style={{
          opacity: mixActive ? 0.1 : 0.3,
          background: 'hsl(var(--primary))',
        }}
        animate={{
          x: [0, -70, 0],
          y: [0, 50, 0],
          scale: [1, 1.12, 1],
        }}
        transition={{
          duration: 22,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* Enhanced floating particles with more variety */}
      {Array.from({ length: 12 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            opacity: mixActive ? 0.08 : 0.25,
            background: i % 3 === 0 ? 'hsl(var(--primary))' : i % 3 === 1 ? 'hsl(var(--ring))' : 'hsl(var(--accent))',
            width: `${4 + (i % 3) * 2}px`,
            height: `${4 + (i % 3) * 2}px`,
            left: `${10 + (i % 5) * 18}%`,
            top: `${15 + Math.floor(i / 5) * 25}%`,
          }}
          animate={{
            y: [0, -40, 0],
            x: [0, (i % 2 === 0 ? 1 : -1) * 20, 0],
            opacity: [0.2, 0.5, 0.2],
            scale: [1, 1.8, 1],
          }}
          transition={{
            duration: 4 + i * 0.3,
            repeat: Infinity,
            delay: i * 0.2,
            ease: 'easeInOut',
          }}
        />
      ))}

      {/* Animated grid pattern overlay */}
      <div
        className="absolute inset-0"
        style={{
          opacity: mixActive ? 0.01 : 0.03,
          backgroundImage: `
            linear-gradient(hsl(var(--primary)) 1px, transparent 1px),
            linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px',
        }}
      />
      <motion.div
        className="absolute inset-0"
        style={{
          opacity: mixActive ? 0.01 : 0.02,
          backgroundImage: `
            linear-gradient(hsl(var(--ring)) 1px, transparent 1px),
            linear-gradient(90deg, hsl(var(--ring)) 1px, transparent 1px)
          `,
          backgroundSize: '100px 100px',
        }}
        animate={{
          x: [0, 50, 0],
          y: [0, 50, 0],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: 'linear',
        }}
      />

      {/* Shimmer effect */}
      <motion.div
        className="absolute inset-0"
        style={{
          opacity: mixActive ? 0.06 : 0.2,
          background: 'linear-gradient(110deg, transparent 30%, hsl(var(--primary) / 0.3) 50%, transparent 70%)',
        }}
        animate={{
          x: ['-100%', '200%'],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: 'linear',
        }}
      />
    </div>
  )
}
