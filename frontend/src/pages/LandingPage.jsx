import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Sparkles } from 'lucide-react';

const LandingPage = () => {
    // 1. Generate data partikel secara random (Posisi, Ukuran, Durasi)
    // Menggunakan useMemo agar tidak re-generate setiap kali komponen render ulang
    const particles = useMemo(() => {
        return Array.from({ length: 30 }).map((_, i) => ({
            id: i,
            x: Math.random() * 100, // Posisi X (0-100%)
            y: Math.random() * 100, // Posisi Y (0-100%)
            size: Math.random() * 3 + 1, // Ukuran 1px - 4px
            duration: Math.random() * 3 + 2, // Durasi 2s - 5s
            delay: Math.random() * 2, // Delay agar tidak muncul serentak
        }));
    }, []);

    // Varian animasi untuk Stagger Effect (muncul berurutan)
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.5,
                delayChildren: 1,
            },
        },
    };

    const itemVariants = {
        hidden: { y: 20, opacity: 0, filter: "blur(10px)" },
        visible: {
            y: 0,
            opacity: 1,
            filter: "blur(0px)",
            transition: {
                duration: 0.8,
                ease: [0.25, 0.4, 0.25, 1],
            },
        },
    };

    return (
        <div className="relative h-screen bg-neutral-950 flex justify-center items-center text-white flex-col overflow-hidden selection:bg-amber-500/30">
            
            {/* Radial Gradient untuk Vignette */}
            <div className="absolute inset-0 bg-radial-gradient from-transparent via-neutral-950/50 to-neutral-950 pointer-events-none z-10"></div>

            {/* --- PARTICLE EFFECT LAYER --- */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {particles.map((particle) => (
                    <motion.div
                        key={particle.id}
                        className="absolute rounded-full bg-amber-400/60 shadow-[0_0_10px_rgba(251,191,36,0.5)]"
                        style={{
                            left: `${particle.x}%`,
                            top: `${particle.y}%`,
                            width: particle.size,
                            height: particle.size,
                        }}
                        animate={{
                            opacity: [0, 0.8, 0], // Muncul, terang, lalu hilang
                            y: [0, -20], // Sedikit bergerak ke atas (floating)
                            scale: [0, 1.2, 0], // Membesar lalu mengecil
                        }}
                        transition={{
                            duration: particle.duration,
                            repeat: Infinity,
                            delay: particle.delay,
                            ease: "easeInOut",
                        }}
                    />
                ))}
            </div>

            {/* Animated Ambient Glow */}
            <motion.div 
                animate={{ 
                    scale: [1, 1.2, 1], 
                    opacity: [0.3, 0.5, 0.3] 
                }}
                transition={{ 
                    duration: 4, 
                    repeat: Infinity, 
                    ease: "easeInOut" 
                }}
                className="absolute top-0 -translate-y-1/2 w-[600px] h-[600px] bg-amber-500/20 blur-[120px] rounded-full pointer-events-none"
            />

            {/* --- MAIN CONTENT --- */}
            <motion.div 
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="relative z-20 max-w-5xl px-6 text-center" // Ubah z-index jadi 20 agar di atas partikel
            >
                {/* Badge Kecil di atas judul */}
                <motion.div variants={itemVariants} className="flex justify-center mb-6">
                    <div className="flex items-center gap-2 px-3 py-1 rounded-full border border-neutral-800 bg-neutral-900/50 backdrop-blur-md text-xs font-medium text-amber-200/80 uppercase tracking-widest">
                        <Sparkles size={12} />
                        <span>TUGAS PROJECT UAS VISKOM</span>
                    </div>
                </motion.div>

                {/* Judul Utama */}
                <motion.h1 
                    variants={itemVariants}
                    className="text-5xl md:text-7xl lg:text-7xl font-bold tracking-tight leading-[1.1]"
                >
                    <span className="bg-linear-to-b from-white via-white to-neutral-500 bg-clip-text text-transparent">
                        Touchless Hand
                    </span>
                    <br />
                    <span className="bg-linear-to-r from-neutral-200 to-neutral-600 bg-clip-text text-transparent">
                        Robot Control.
                    </span>
                </motion.h1>

                {/* Deskripsi */}
                <motion.p 
                    variants={itemVariants}
                    className="text-neutral-400 mt-6 text-lg max-w-lg mx-auto leading-relaxed font-light"
                >
                    Pengendalian Lengan Robot Virtual Menggunakan <span className="text-white font-normal">Hand Gesture Recognition</span>.
                </motion.p>

                {/* Tombol Aksi */}
                <motion.div variants={itemVariants} className="mt-10">
                    <Link to="/dashboard">
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="group relative cursor-pointer inline-flex items-center gap-3 px-8 py-2 bg-white text-black rounded-full font-semibold text-lg overflow-hidden transition-all duration-300 hover:shadow-[0_0_40px_-10px_rgba(255,255,255,0.3)]"
                        >
                            <span>Start Simulation</span>
                            <ArrowRight className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" />
                            
                            {/* Efek Kilat pada Button */}
                            <div className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] bg-linear-to-r from-transparent via-black/10 to-transparent z-10 skew-x-12" />
                        </motion.button>
                    </Link>
                </motion.div>
            </motion.div>

            {/* Footer Text */}
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.5, duration: 1 }}
                className="absolute bottom-8 text-neutral-600 text-sm font-mono z-20"
            >
                Farel, Apep, Jabar, Nadya, Nada
            </motion.div>
        </div>
    );
};

export default LandingPage;