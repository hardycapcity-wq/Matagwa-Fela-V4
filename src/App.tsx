/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Menu, 
  Settings, 
  Users, 
  Heart, 
  Zap, 
  ArrowLeft,
  X,
  Plus,
  Play,
  RotateCcw,
  Search,
  History,
  Lock,
  Volume2,
  Trash2,
  Trophy,
  Beer,
  ChevronRight,
  User,
  Star,
  Info,
  LogOut,
  AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  MainTab,
  GameMode, 
  VibeType, 
  Player, 
  ScreenType, 
  Challenge, 
  VIBE_CONFIG,
  GameConfig,
  PlayerStats
} from './types';
import { SQUAD_CARDS, COUPLES_TRUTHS, COUPLES_DARES } from './data';

function PlayerInput({ value, onChange, onAdd }: { value: string, onChange: (val: string) => void, onAdd: () => void }) {
  return (
    <div className="flex gap-4">
      <input 
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            onAdd();
          }
        }}
        placeholder="ADD PLAYER NAME..."
        className="flex-1 bg-surface-container-lowest border-b-2 border-primary/30 focus:border-primary px-6 py-4 rounded-t-2xl text-on-surface outline-none transition-all placeholder:text-on-surface-variant/30 font-bold"
      />
      <button 
        type="button"
        onClick={(e) => { e.preventDefault(); onAdd(); }} 
        className="px-8 bg-primary text-on-primary font-black rounded-2xl shadow-lg active:scale-95 transition-all"
      >
        <Plus className="w-8 h-8" />
      </button>
    </div>
  );
}

export default function App() {
  // --- Core State ---
  const [screen, setScreen] = useState<ScreenType>('TAB_VIEW');
  const [currentTab, setCurrentTab] = useState<MainTab>('SQUAD');
  const [gameMode, setGameMode] = useState<GameMode>('Squad');
  const [vibe, setVibe] = useState<VibeType>('Icebreaker');
  
  // Game Setup
  const [players, setPlayers] = useState<Player[]>([]);
  const [couplesTraps, setCouplesTraps] = useState<{ [id: string]: string }>({});
  
  // Gameplay State
  const [currentPlayerIdx, setCurrentPlayerIdx] = useState(0);
  const [currentChallenge, setCurrentChallenge] = useState<Challenge | null>(null);
  const [turnsLeft, setTurnsLeft] = useState(30);
  const [refusalState, setRefusalState] = useState<'NONE' | 'REPLACEMENT' | 'FINAL'>('NONE');
  const [replacementDare, setReplacementDare] = useState('');
  const [sessionBanks, setSessionBanks] = useState<Record<string, number[]>>({});
  
  // UI State
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isExitDialogOpen, setIsExitDialogOpen] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [couplesStep, setCouplesStep] = useState(1);
  const [couplesSetup, setCouplesSetup] = useState({
    p1Name: '',
    p2Name: '',
    p1Trap: '',
    p2Trap: ''
  });
  
  // Persistence / Stats
  const [stats, setStats] = useState<PlayerStats>({
    gamesPlayed: 0,
    totalSips: 0,
    favouriteMode: 'None',
    wins: 0
  });
  const [vault, setVault] = useState<Challenge[]>([]);
  const [config, setConfig] = useState<GameConfig>({
    totalTurns: 30,
    soundEnabled: true,
    ageVerified: true
  });

  const currentPlayer = players[currentPlayerIdx];

  // --- Handlers ---

  const playSound = (type: 'tap' | 'spin' | 'win' | 'drink') => {
    if (!config.soundEnabled) return;
    console.log(`[Sound] Playing: ${type}`);
    // In a real app, I'd use an Audio object
  };

  const resetToHome = () => {
    setScreen('TAB_VIEW');
    setPlayers([]);
    setCurrentPlayerIdx(0);
    setTurnsLeft(config.totalTurns);
    setCurrentChallenge(null);
    setRefusalState('NONE');
    setReplacementDare('');
    setCouplesTraps({});
    setSessionBanks({});
    setCouplesStep(1);
    setCouplesSetup({
      p1Name: '',
      p2Name: '',
      p1Trap: '',
      p2Trap: ''
    });
  };

  const addPlayer = () => {
    if (!newPlayerName.trim()) return;
    const newPlayer: Player = {
      id: Math.random().toString(36).substr(2, 9),
      name: newPlayerName,
      sips: 0
    };
    setPlayers([...players, newPlayer]);
    setNewPlayerName('');
    playSound('tap');
  };

  const removePlayer = (id: string) => {
    setPlayers(players.filter(p => p.id !== id));
  };

  const startGame = () => {
    if (gameMode === 'Squad' && players.length < 2) return;
    if (gameMode === 'Couples' && players.length !== 2) return;
    
    setCouplesStep(1);
    setSessionBanks({});
    setTurnsLeft(config.totalTurns);
    setCurrentPlayerIdx(0);
    setScreen('GAME_PLAY');
    nextChallenge();
    playSound('tap');

    setStats(prev => ({
      ...prev,
      gamesPlayed: prev.gamesPlayed + 1,
      favouriteMode: gameMode
    }));
  };

  const getCardIndex = (key: string, length: number) => {
    let available = [...(sessionBanks[key] || [])];
    if (available.length === 0) {
      available = Array.from({ length }, (_, i) => i).sort(() => Math.random() - 0.5);
    }
    const index = available.pop() as number;
    setSessionBanks(prev => ({ ...prev, [key]: available }));
    return index;
  };

  const nextChallenge = () => {
    if (turnsLeft <= 0) {
      setScreen('LEADERBOARD');
      return;
    }

    setRefusalState('NONE');
    setReplacementDare('');
    
    if (gameMode === 'Squad') {
      const bank = SQUAD_CARDS[vibe];
      const key = `Squad_${vibe}`;
      const index = getCardIndex(key, bank.length);
      const template = bank[index];
      
      const nextPlayerIdx = (currentPlayerIdx + 1) % players.length;
      const text = template.text
        ?.replace('{player}', players[currentPlayerIdx].name)
        .replace('{player}', players[nextPlayerIdx].name)
        .replace(/{sips}/g, (template.punishment || 2).toString()) || "";
      
      setCurrentChallenge({
        id: Math.random().toString(36).substr(2, 9),
        text,
        punishment: template.punishment || 2,
        type: template.type || 'DARE'
      });
      setCurrentPlayerIdx((currentPlayerIdx + 1) % players.length);
      setTurnsLeft(prev => prev - 1);
    } else {
      // Couples uses wheel, so we just reset state for wheel spin
      setCurrentChallenge(null);
    }
  };

  const saveToVault = (challenge: Challenge) => {
    if (vault.some(c => c.id === challenge.id)) return;
    setVault([...vault, challenge]);
    playSound('win');
  };

  // --- Components ---

  const Drawer = () => (
    <AnimatePresence>
      {isDrawerOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsDrawerOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
          />
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            className="fixed top-0 left-0 bottom-0 w-3/4 max-w-sm bg-surface-container-low border-r border-white/5 z-[101] p-8 flex flex-col"
          >
            <div className="flex justify-between items-center mb-12">
              <h1 className="text-2xl font-display font-black text-primary tracking-widest italic text-glow-primary">MATAGWA</h1>
              <button onClick={() => setIsDrawerOpen(false)} className="text-on-surface-variant"><X /></button>
            </div>
            
            <nav className="space-y-4">
              <button onClick={() => { setIsDrawerOpen(false); alert("Game Rules: Squad Mode is like Picolo, follow the cards. Couples Mode is wheel-based with hidden traps. Drink sips for failures!"); }} className="w-full flex items-center justify-between p-4 glass-card rounded-xl text-left border-none">
                <div className="flex items-center gap-3">
                  <Info className="w-5 h-5 text-primary" />
                  <span className="font-bold text-on-surface">How to Play</span>
                </div>
                <ChevronRight className="w-4 h-4 text-on-surface-variant opacity-30" />
              </button>
              
              <button onClick={() => setConfig({...config, soundEnabled: !config.soundEnabled})} className="w-full flex items-center justify-between p-4 glass-card rounded-xl text-left border-none">
                <div className="flex items-center gap-3">
                  <Volume2 className={`w-5 h-5 ${config.soundEnabled ? 'text-secondary' : 'text-on-surface-variant'}`} />
                  <span className="font-bold text-on-surface">Sound: {config.soundEnabled ? 'ON' : 'OFF'}</span>
                </div>
                <div className={`w-10 h-5 rounded-full relative transition-colors ${config.soundEnabled ? 'bg-secondary/40' : 'bg-surface-container-highest'}`}>
                    <motion.div 
                      animate={{ x: config.soundEnabled ? 20 : 0 }}
                      className="absolute top-1 left-1 w-3 h-3 rounded-full bg-white shadow-sm" 
                    />
                </div>
              </button>

              <button onClick={() => { setIsDrawerOpen(false); resetToHome(); }} className="w-full flex items-center justify-between p-4 glass-card rounded-xl text-left border-none hover:bg-error/10 text-error">
                <div className="flex items-center gap-3">
                  <RotateCcw className="w-5 h-5" />
                  <span className="font-bold">Reset Game</span>
                </div>
              </button>
            </nav>

            <div className="mt-auto pt-8 border-t border-white/5 text-center">
              <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-[0.4em]">Matagwa Fela v1.0.4</p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  const SettingsPanel = () => (
    <AnimatePresence>
      {isSettingsOpen && (
        <div className="fixed inset-0 flex items-center justify-center z-[100] p-6">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSettingsOpen(false)}
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
          />
          <motion.div 
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            className="relative w-full max-w-sm glass-card rounded-[2.5rem] p-8 border-primary/20"
          >
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-display font-bold text-primary">SETTINGS</h2>
              <button onClick={() => setIsSettingsOpen(false)} className="p-2 text-on-surface-variant"><X /></button>
            </div>

            <div className="space-y-6">
               <div className="space-y-2">
                 <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest px-2">Turns Per Session</label>
                 <div className="flex items-center gap-4 bg-surface-container-highest rounded-2xl p-2">
                    {[15, 30, 50].map(v => (
                       <button 
                        key={v}
                        onClick={() => setConfig({...config, totalTurns: v})}
                        className={`flex-1 py-3 rounded-xl font-bold transition-all ${config.totalTurns === v ? 'bg-primary text-on-primary shadow-lg' : 'text-on-surface-variant hover:text-on-surface'}`}
                       >
                         {v}
                       </button>
                    ))}
                 </div>
               </div>

               <button 
                onClick={() => setConfig({...config, ageVerified: !config.ageVerified})}
                className="w-full flex items-center justify-between p-5 bg-surface-container rounded-2xl border border-white/5"
               >
                 <span className="font-bold text-on-surface">Age Verification (18+)</span>
                 <div className={`w-10 h-5 rounded-full relative transition-colors ${config.ageVerified ? 'bg-tertiary/40' : 'bg-surface-container-highest'}`}>
                    <motion.div 
                      animate={{ x: config.ageVerified ? 20 : 0 }}
                      className="absolute top-1 left-1 w-3 h-3 rounded-full bg-white shadow-sm" 
                    />
                 </div>
               </button>

               <button 
                onClick={() => {
                  if(confirm("Are you sure? This will reset all scores, vault, and profile data.")) {
                    setPlayers([]);
                    setStats({ gamesPlayed: 0, totalSips: 0, favouriteMode: 'None', wins: 0 });
                    setVault([]);
                    setIsSettingsOpen(false);
                    alert("All data cleared.");
                  }
                }}
                className="w-full py-4 rounded-2xl bg-error/10 text-error font-bold flex items-center justify-center gap-2 border border-error/20 hover:bg-error/20 transition-all"
               >
                 <Trash2 className="w-5 h-5" />
                 Clear All Player Data
               </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  const ExitDialog = () => (
    <AnimatePresence>
      {isExitDialogOpen && (
        <div className="fixed inset-0 flex items-center justify-center z-[200] p-6">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
          />
          <motion.div 
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0.9 }}
            className="relative w-full max-w-xs glass-card rounded-3xl p-8 text-center border-error/20"
          >
            <AlertTriangle className="w-12 h-12 text-error mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-2 uppercase italic tracking-tighter">QUITTING ALREADY?</h3>
            <p className="text-on-surface-variant text-sm mb-8">Are you sure you want to exit? Your current session progress will be lost.</p>
            <div className="grid grid-cols-2 gap-4">
              <button onClick={() => setIsExitDialogOpen(false)} className="py-3 bg-surface-container rounded-xl font-bold text-on-surface">STAY</button>
              <button 
                onClick={() => {
                  setIsExitDialogOpen(false);
                  resetToHome();
                }} 
                className="py-3 bg-error text-white rounded-xl font-bold shadow-lg shadow-error/20"
              >
                EXIT
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  // --- Tab Views ---

  // --- Gameplay Logic ---

  const SquadGamePlay = () => {
    const color = VIBE_CONFIG[vibe].color;

    return (
      <div className="min-h-[calc(100vh-250px)] flex flex-col items-center justify-center gap-12">
        <AnimatePresence mode="wait">
          {currentChallenge && (
            <motion.div 
              key={currentChallenge.id}
              initial={{ opacity: 0, scale: 0.8, rotate: -5, y: 30 }}
              animate={{ opacity: 1, scale: 1, rotate: 0, y: 0 }}
              exit={{ opacity: 0, scale: 1.1, rotate: 5, y: -30 }}
              className="w-full max-w-sm"
            >
               <div className={`glass-card rounded-[3.5rem] p-10 text-center space-y-8 border-${color}/40 shadow-2xl relative overflow-hidden group neon-glow-${color}`}>
                  <div className="absolute top-4 right-8 flex gap-2">
                     <button onClick={() => saveToVault(currentChallenge)} className={`p-3 bg-${color}/10 rounded-full text-${color} hover:bg-${color} transition-colors hover:text-white shadow-lg`}><Star className="w-5 h-5" /></button>
                  </div>

                  <div className={`inline-flex p-5 bg-${color}/10 rounded-full border border-${color}/20 shadow-glow-${color}`}><Beer className={`w-12 h-12 text-${color}`} /></div>
                  
                  <h2 className="text-3xl md:text-4xl font-display font-bold leading-tight min-h-[160px] flex items-center justify-center text-on-surface px-2">
                    {currentChallenge.text}
                  </h2>

                  <div className="flex flex-col gap-4">
                       {refusalState === 'NONE' ? (
                       <>
                          <button onClick={() => {
                            setStats(s => ({ ...s, totalSips: s.totalSips + currentChallenge.punishment }));
                            nextChallenge();
                            playSound('tap');
                          }} className="w-full py-6 bg-secondary text-on-secondary rounded-2xl font-display font-bold text-2xl shadow-xl hover:brightness-110 active:scale-95 transition-all">DONE</button>
                          <button onClick={() => { setRefusalState('REPLACEMENT'); playSound('drink'); }} className="w-full py-6 bg-transparent border-2 border-error text-error rounded-2xl font-display font-bold text-2xl hover:bg-error/10 active:scale-95 transition-all uppercase italic">REFUSE</button>
                       </>
                     ) : refusalState === 'REPLACEMENT' ? (
                       <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
                          <div className="space-y-2">
                            <p className="text-[10px] font-bold text-error uppercase tracking-[0.4em]">SQUAD DARE</p>
                            <p className="text-sm font-bold text-on-surface leading-relaxed uppercase italic">SAY YOUR REPLACEMENT DARE OUT LOUD!</p>
                            <p className="text-xs text-on-surface-variant leading-relaxed">The group must set a custom replacement dare for {currentPlayer.name}.</p>
                          </div>
                          <div className="flex gap-4">
                            <button onClick={() => {
                              setPlayers(players.map(p => p.id === currentPlayer.id ? {...p, sips: p.sips + 1} : p));
                              nextChallenge();
                              playSound('tap');
                            }} className="flex-1 py-5 bg-secondary text-on-secondary rounded-xl font-bold shadow-lg">ACCEPTED</button>
                            <button onClick={() => { setRefusalState('FINAL'); playSound('drink'); }} className="flex-1 py-5 bg-error text-white rounded-xl font-bold shadow-lg">REJECTED</button>
                          </div>
                       </div>
                     ) : (
                       <div className="space-y-8 animate-in fade-in zoom-in-95 duration-300">
                          <div className="p-8 bg-error/10 rounded-3xl border border-error/20">
                            <p className="text-4xl font-display font-black text-error mb-2 tracking-tighter">DRINK {currentChallenge.punishment * 2}</p>
                            <p className="text-[10px] font-bold text-error uppercase tracking-widest">Sips Punishment</p>
                          </div>
                          <button onClick={() => {
                            setPlayers(players.map(p => p.id === currentPlayer.id ? {...p, sips: p.sips + (currentChallenge.punishment * 2)} : p));
                            setStats(s => ({ ...s, totalSips: s.totalSips + (currentChallenge.punishment * 2) }));
                            nextChallenge();
                          }} className="w-full py-6 bg-error text-white rounded-2xl font-display font-black text-2xl shadow-xl shadow-error/30">DONE. NEXT CARD</button>
                       </div>
                     )}
                  </div>
               </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  const CouplesGamePlay = () => {
    const [isSpinning, setIsSpinning] = useState(false);
    const [rotation, setRotation] = useState(0);

    const spin = () => {
       if (isSpinning) return;
       setIsSpinning(true);
       setCurrentChallenge(null);
       setRefusalState('NONE');
       const extra = 1800 + Math.random() * 360;
       const newRotation = rotation + extra;
       setRotation(newRotation);
       playSound('spin');

       setTimeout(() => {
          setIsSpinning(false);
          // Fixed Pointer at TOP (270deg)
          const angle = (360 - (newRotation % 360)) % 360;
          const segmentIdx = Math.floor(angle / 90);
          const types: Challenge['type'][] = ['TRUTH', 'DARE', 'SWAP', 'DOUBLE_SIPS'];
          const type = types[segmentIdx];

          if (type === 'SWAP') {
             setTimeout(() => {
               setCurrentPlayerIdx((currentPlayerIdx + 1) % players.length);
               setTurnsLeft(prev => prev - 1);
               if (turnsLeft <= 1) setScreen('LEADERBOARD');
             }, 1000);
          } else {
             let text = "";
             if (type === 'DARE' && Math.random() < 0.2) {
                // Trap trigger logic
                text = couplesTraps[currentPlayerIdx === 0 ? 'p2' : 'p1'] || "Tell your partner 3 things you love about them.";
             } else {
                const bank = type === 'TRUTH' ? COUPLES_TRUTHS : COUPLES_DARES;
                const key = `Couples_${type}`;
                const index = getCardIndex(key, bank.length);
                text = bank[index];
             }

             setCurrentChallenge({
                id: Math.random().toString(36).substr(2, 9),
                text,
                punishment: type === 'DOUBLE_SIPS' ? 6 : 3,
                type
             });
          }
       }, 3100);
    };

    return (
      <div className="min-h-[calc(100vh-250px)] flex flex-col items-center justify-center gap-12 text-center">
        {!currentChallenge && (
           <div className="space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-700">
             <div className="space-y-4">
                <p className="text-tertiary font-display font-black tracking-[0.4em] uppercase text-xl italic">{currentPlayer.name}'S TURN</p>
                <div className="h-1.5 w-32 bg-tertiary/20 mx-auto rounded-full shadow-glow-tertiary"></div>
             </div>
             
             <div className="relative w-80 h-80 flex items-center justify-center">
                {/* Pointer fixed at top */}
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 z-20 drop-shadow-[0_0_15px_rgba(255,255,255,0.8)]">
                  <ArrowLeft className="w-12 h-12 text-white fill-white -rotate-90" />
                </div>
                
                <motion.div 
                  animate={{ rotate: rotation }}
                  transition={{ duration: 3, ease: [0.1, 0.7, 0.3, 1] }}
                  className="w-full h-full rounded-full border-[10px] border-surface-container-highest shadow-[0_0_80px_rgba(0,0,0,0.8)] overflow-hidden relative"
                >
                   <svg viewBox="0 0 100 100" className="w-full h-full">
                      {/* TRUTH: Top Right (270 to 360/0) */}
                      <path d="M 50 50 L 50 0 A 50 50 0 0 1 100 50 Z" className="fill-tertiary/80" />
                      <text x="75" y="30" className="fill-white text-[5px] font-black uppercase" transform="rotate(45, 75, 30)">TRUTH</text>
                      
                      {/* DARE: Bottom Right (0 to 90) */}
                      <path d="M 50 50 L 100 50 A 50 50 0 0 1 50 100 Z" className="fill-secondary/80" />
                      <text x="75" y="75" className="fill-white text-[5px] font-black uppercase" transform="rotate(135, 75, 75)">DARE</text>
                      
                      {/* SWAP: Bottom Left (90 to 180) */}
                      <path d="M 50 50 L 50 100 A 50 50 0 0 1 0 50 Z" className="fill-primary/80" />
                      <text x="25" y="75" className="fill-white text-[5px] font-black uppercase" transform="rotate(-135, 25, 75)">SWAP</text>
                      
                      {/* DOUBLE SIPS: Top Left (180 to 270) */}
                      <path d="M 50 50 L 0 50 A 50 50 0 0 1 50 0 Z" className="fill-surface-container-lowest" />
                      <text x="25" y="30" className="fill-primary text-[4px] font-black uppercase" transform="rotate(-45, 25, 30)">DOUBLE SIPS</text>

                      {/* Center circle line */}
                      <circle cx="50" cy="50" r="1" className="fill-white/10" />
                   </svg>
                </motion.div>

                <button 
                  onClick={spin}
                  disabled={isSpinning}
                  className="absolute z-30 w-24 h-24 bg-surface-container-low border-4 border-white/10 rounded-full shadow-[0_0_50px_rgba(255,255,255,0.15)] font-display font-black text-xl italic flex items-center justify-center active:scale-90 transition-all text-tertiary"
                >
                  {isSpinning ? '...' : 'SPIN'}
                </button>
             </div>
           </div>
        )}

        <AnimatePresence>
          {currentChallenge && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.8, y: 50 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              className="w-full max-w-sm glass-card rounded-[3.5rem] p-10 space-y-8 border-tertiary/30 neon-glow-tertiary shadow-2xl"
            >
               <div className="inline-flex px-6 py-1.5 rounded-full bg-tertiary/10 text-tertiary border border-tertiary/20 text-[10px] font-bold tracking-[0.4em] uppercase">{currentChallenge.type}</div>
               <h2 className="text-3xl font-display font-bold leading-relaxed px-2">{currentChallenge.text}</h2>
               <div className="flex flex-col gap-4">
                 {refusalState === 'NONE' ? (
                   <>
                      <button onClick={() => { 
                        setStats(s => ({ ...s, totalSips: s.totalSips + currentChallenge.punishment }));
                        setCurrentPlayerIdx((currentPlayerIdx + 1) % players.length); 
                        setTurnsLeft(prev => prev - 1); 
                        setCurrentChallenge(null); 
                        playSound('tap');
                        if (turnsLeft <= 1) setScreen('LEADERBOARD'); 
                      }} className="w-full py-6 bg-secondary text-on-secondary rounded-2xl font-display font-bold text-2xl shadow-xl hover:brightness-110 active:scale-95 transition-all">COMPLETED</button>
                      <button onClick={() => { setRefusalState('REPLACEMENT'); playSound('drink'); }} className="w-full py-6 bg-transparent border-2 border-error text-error rounded-2xl font-display font-bold text-2xl hover:bg-error/10 active:scale-95 transition-all text-glow-error italic">REFUSE</button>
                   </>
                 ) : refusalState === 'REPLACEMENT' ? (
                   <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
                      <p className="text-[10px] font-bold text-error uppercase tracking-[0.4em]">PARTNER RITUAL</p>
                      <p className="text-lg font-bold text-on-surface leading-relaxed uppercase italic">SAY YOUR NEW DARE OUT LOUD!</p>
                      <div className="grid grid-cols-2 gap-4">
                        <button onClick={() => { 
                          setCurrentPlayerIdx((currentPlayerIdx + 1) % players.length); 
                          setTurnsLeft(prev => prev - 1); 
                          setCurrentChallenge(null); 
                          playSound('tap');
                          if (turnsLeft <= 1) setScreen('LEADERBOARD'); 
                        }} className="py-5 bg-secondary text-on-secondary rounded-xl font-bold shadow-lg">ACCEPTED</button>
                        <button onClick={() => { setRefusalState('FINAL'); playSound('drink'); }} className="py-5 bg-error text-white rounded-xl font-bold shadow-lg">REJECTED</button>
                      </div>
                   </div>
                 ) : (
                   <div className="space-y-8 animate-in fade-in zoom-in-95 duration-300">
                      <div className="p-8 bg-error/10 rounded-3xl border border-error/20">
                        <p className="text-4xl font-display font-black text-error mb-2 tracking-tighter">DRINK {currentChallenge.punishment * 2}</p>
                        <p className="text-[10px] font-bold text-error uppercase tracking-widest">Sips Double Penalty</p>
                      </div>
                      <button onClick={() => {
                        setPlayers(players.map(p => p.id === currentPlayer.id ? {...p, sips: p.sips + (currentChallenge.punishment * 2)} : p));
                        setStats(s => ({ ...s, totalSips: s.totalSips + (currentChallenge.punishment * 2) }));
                        setCurrentPlayerIdx((currentPlayerIdx + 1) % players.length); 
                        setTurnsLeft(prev => prev - 1); 
                        setCurrentChallenge(null);
                        if (turnsLeft <= 1) setScreen('LEADERBOARD');
                      }} className="w-full py-6 bg-error text-white rounded-2xl font-display font-black text-2xl shadow-xl shadow-error/30">DONE. NEXT ROUND</button>
                   </div>
                 )}
               </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  const LeaderboardView = () => (
    <div className="max-w-md mx-auto space-y-12 py-12 animate-in fade-in slide-in-from-bottom-12 duration-1000">
       <div className="text-center space-y-6">
          <div className="inline-flex p-8 bg-secondary/10 rounded-full border-4 border-secondary shadow-glow-secondary animate-bounce"><Trophy className="w-20 h-20 text-secondary" /></div>
          <h2 className="text-6xl font-display font-black text-glow-secondary italic uppercase tracking-tighter leading-none">PARTY LEGEND</h2>
          <p className="text-on-surface-variant text-xs tracking-[0.5em] uppercase">The session has been completed</p>
       </div>

       <div className="space-y-4">
          {[...players].sort((a,b) => b.sips - a.sips).map((p, i) => (
             <motion.div 
              key={p.id} 
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: i * 0.1 }}
              className={`glass-card p-8 rounded-[2.5rem] flex items-center justify-between border-white/5 ${i === 0 ? 'bg-secondary/10 border-secondary/30 scale-105' : ''}`}
             >
                <div className="flex items-center gap-8">
                   <span className={`text-4xl font-display font-black ${i === 0 ? 'text-secondary' : 'opacity-20'}`}>{i + 1}</span>
                   <span className="text-2xl font-bold tracking-tight">{p.name}</span>
                </div>
                <div className="text-right">
                   <p className={`text-4xl font-display font-black ${i === 0 ? 'text-secondary' : 'text-on-surface'}`}>{p.sips}</p>
                   <p className="text-[8px] font-bold text-on-surface-variant uppercase tracking-widest">Grand Total Sips</p>
                </div>
             </motion.div>
          ))}
       </div>

       <div className="flex flex-col gap-4 pt-8">
          <button onClick={resetToHome} className="w-full py-6 bg-secondary text-on-secondary rounded-[2.5rem] font-display font-bold text-2xl shadow-xl shadow-secondary/20 hover:brightness-110 active:scale-95 transition-all">TRY AGAIN</button>
          <button onClick={() => { resetToHome(); setCurrentTab('PROFILE'); }} className="w-full py-5 bg-transparent border-2 border-white/10 text-on-surface-variant rounded-[2.5rem] font-bold">VIEW CAREER STATS</button>
       </div>
    </div>
  );

  // --- Main Layout ---

  return (
    <div className="min-h-screen bg-background text-on-background font-sans overflow-x-hidden pb-32 transition-colors duration-700">
      <Drawer />
      <SettingsPanel />
      <ExitDialog />

      {/* Modern Header */}
      <header className="fixed top-0 w-full z-50 h-24 px-6 flex items-center justify-between backdrop-blur-3xl bg-background/60 border-b border-white/5">
        <div className="flex items-center gap-6">
          <button onClick={() => { playSound('tap'); setIsDrawerOpen(true); }} className="p-3.5 bg-surface-container rounded-2xl hover:bg-surface-container-high transition-all shadow-lg active:scale-90">
            <Menu className="w-7 h-7 text-primary" />
          </button>
          <AnimatePresence>
            {screen === 'GAME_PLAY' && (
                <motion.div 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="hidden md:flex items-center gap-2 px-4 py-2 bg-secondary/10 rounded-full border border-secondary/20 shadow-glow-secondary/20"
                >
                  <RotateCcw className="w-4 h-4 text-secondary" />
                  <span className="text-[12px] font-black text-secondary uppercase tracking-[0.2em]">{turnsLeft} ROUNDS LEFT</span>
                </motion.div>
            )}
          </AnimatePresence>
        </div>
        
        <div className="flex flex-col items-center">
          <h1 className="text-2xl md:text-3xl font-display font-black text-primary tracking-[0.2em] italic text-glow-primary uppercase transition-all">MATAGWA FELA</h1>
          {screen === 'GAME_PLAY' && <p className="text-[8px] font-bold text-on-surface-variant tracking-[0.5em] uppercase md:hidden opacity-50 mt-1">{turnsLeft} ROUNDS REMAINING</p>}
        </div>

        {screen === 'GAME_PLAY' ? (
           <button onClick={() => { playSound('tap'); setIsExitDialogOpen(true); }} className="p-3.5 bg-error/10 text-error rounded-2xl hover:bg-error transition-all hover:text-white shadow-lg active:scale-90">
             <LogOut className="w-7 h-7" />
           </button>
        ) : (
           <button onClick={() => { playSound('tap'); setIsSettingsOpen(true); }} className="p-3.5 bg-surface-container rounded-2xl hover:bg-surface-container-high transition-all shadow-lg active:scale-90">
             <Settings className="w-7 h-7 text-primary" />
           </button>
        )}
      </header>

      {/* Adaptive Main Shell */}
      <main className="pt-32 px-6 max-w-4xl mx-auto min-h-[90vh]">
        <AnimatePresence mode="wait">
          <motion.div
            key={screen === 'TAB_VIEW' ? currentTab : screen}
            initial={{ opacity: 0, scale: 0.98, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 1.02, y: -10 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          >
            {screen === 'TAB_VIEW' && (
               <>
                {currentTab === 'SQUAD' && (
                  <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="text-center space-y-4">
                      <h2 className="text-4xl md:text-6xl font-display font-black text-glow-primary italic uppercase tracking-tighter">SQUAD MODE</h2>
                      <p className="text-on-surface-variant text-xs md:text-sm tracking-[0.3em] uppercase">Select your vibe & add the gang</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {(Object.entries(VIBE_CONFIG) as [VibeType, typeof VIBE_CONFIG.Icebreaker][]).map(([key, cfg]) => {
                       return (
                        <motion.button
                          key={key}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => {
                            setVibe(key);
                            playSound('tap');
                          }}
                          className={`relative glass-card p-8 rounded-[2rem] border-2 transition-all text-left overflow-hidden group ${vibe === key ? `border-${cfg.color} neon-glow-${cfg.color}` : 'border-white/5 opacity-60'}`}
                        >
                          <div className="flex justify-between items-start mb-6">
                            <span className={`px-3 py-1 rounded-full bg-${cfg.color}/10 border border-${cfg.color}/30 text-${cfg.color} text-[10px] font-bold tracking-widest`}>
                              {cfg.subtitle}
                            </span>
                          </div>
                            <h3 className={`text-2xl font-display font-bold mb-2 group-hover:text-${cfg.color} transition-colors`}>{cfg.title}</h3>
                            <p className="text-on-surface-variant text-xs leading-relaxed">{cfg.description}</p>
                          </motion.button>
                         );
                      })}
                    </div>

                    <div className="glass-card p-8 rounded-[2.5rem] space-y-6 border-white/5">
                      <PlayerInput 
                        value={newPlayerName}
                        onChange={setNewPlayerName}
                        onAdd={addPlayer}
                      />

                      <div className="flex flex-wrap gap-4 min-h-[100px] content-start">
                        {players.map(p => (
                          <motion.div 
                            key={p.id} 
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="group relative flex items-center gap-3 bg-surface-container-highest/50 px-6 py-3 rounded-full border border-white/5"
                          >
                            <span className="font-bold text-on-surface">{p.name}</span>
                            <button onClick={() => removePlayer(p.id)} className="text-on-surface-variant/40 hover:text-error transition-colors"><X className="w-4 h-4" /></button>
                          </motion.div>
                        ))}
                        {players.length === 0 && <p className="text-on-surface-variant/30 italic text-sm py-8 w-full text-center">Squad session is empty. Add at least 2 players.</p>}
                      </div>
                    </div>

                    <button 
                      disabled={players.length < 2}
                      onClick={() => { setGameMode('Squad'); startGame(); }}
                      className={`w-full py-6 rounded-[2rem] font-display font-black text-3xl transition-all ${players.length >= 2 ? 'bg-secondary text-on-secondary shadow-[0_0_40px_rgba(255,200,80,0.4)] hover:brightness-110 active:scale-95' : 'bg-surface-container opacity-20 grayscale cursor-not-allowed'}`}
                    >
                      LFG! START GAME
                    </button>
                  </div>
                )}
                {currentTab === 'COUPLES' && (
                  <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="text-center space-y-4">
                      <h2 className="text-4xl md:text-6xl font-display font-black text-tertiary text-glow-tertiary italic uppercase tracking-tighter">COUPLES MODE</h2>
                      <p className="text-on-surface-variant text-xs md:text-sm tracking-[0.3em] uppercase">Two hearts, one spicy ritual</p>
                    </div>

                    <div className="flex flex-col items-center">
                       <AnimatePresence mode="wait">
                         {couplesStep === 1 ? (
                           <motion.div 
                            key="p1"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="w-full max-w-md glass-card p-10 rounded-[2.5rem] border-tertiary/20 text-center space-y-8"
                           >
                              <div className="inline-flex p-5 bg-tertiary/10 rounded-full mb-2"><Heart className="w-10 h-10 text-tertiary fill-tertiary" /></div>
                              <h3 className="text-xl font-bold uppercase tracking-widest text-tertiary">Partner 1 Setup</h3>
                              
                              <input 
                                value={couplesSetup.p1Name} 
                                onChange={e => setCouplesSetup(prev => ({ ...prev, p1Name: e.target.value }))} 
                                placeholder="YOUR NAME" 
                                className="w-full bg-transparent border-b-2 border-tertiary/30 text-center py-4 text-3xl font-black outline-none focus:border-tertiary placeholder:opacity-20" 
                              />
                              
                              <div className="space-y-4">
                                <p className="text-[10px] font-bold text-tertiary uppercase tracking-[0.3em]">Your Secret Trap (20% chance)</p>
                                <textarea 
                                  value={couplesSetup.p1Trap} 
                                  onChange={e => setCouplesSetup(prev => ({ ...prev, p1Trap: e.target.value }))} 
                                  placeholder="SET A DARE FOR YOUR PARTNER..." 
                                  className="w-full bg-surface-container/50 rounded-3xl p-6 text-sm outline-none border border-white/5 h-32 focus:border-tertiary/40 transition-all resize-none font-medium" 
                                />
                              </div>

                              <button 
                                onClick={() => { if(couplesSetup.p1Name) { setCouplesStep(2); playSound('tap'); } }}
                                className="w-full py-5 bg-tertiary text-white rounded-2xl font-bold text-xl shadow-lg active:scale-95 transition-all"
                              >
                                NEXT PARTNER
                              </button>
                           </motion.div>
                         ) : (
                           <motion.div 
                            key="p2"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="w-full max-w-md glass-card p-10 rounded-[2.5rem] border-primary/20 text-center space-y-8"
                           >
                              <div className="inline-flex p-5 bg-primary/10 rounded-full mb-2"><Heart className="w-10 h-10 text-primary fill-primary" /></div>
                              <h3 className="text-xl font-bold uppercase tracking-widest text-primary">Partner 2 Setup</h3>
                              
                              <input 
                                value={couplesSetup.p2Name} 
                                onChange={e => setCouplesSetup(prev => ({ ...prev, p2Name: e.target.value }))} 
                                placeholder="YOUR NAME" 
                                className="w-full bg-transparent border-b-2 border-primary/30 text-center py-4 text-3xl font-black outline-none focus:border-primary placeholder:opacity-20" 
                              />
                              
                              <div className="space-y-4">
                                <p className="text-[10px] font-bold text-primary uppercase tracking-[0.3em]">Your Secret Trap (20% chance)</p>
                                <textarea 
                                  value={couplesSetup.p2Trap} 
                                  onChange={e => setCouplesSetup(prev => ({ ...prev, p2Trap: e.target.value }))} 
                                  placeholder="SET A DARE FOR YOUR PARTNER..." 
                                  className="w-full bg-surface-container/50 rounded-3xl p-6 text-sm outline-none border border-white/5 h-32 focus:border-primary/40 transition-all resize-none font-medium" 
                                />
                              </div>

                              <div className="flex gap-4">
                                <button 
                                  onClick={() => setCouplesStep(1)}
                                  className="px-6 bg-surface-container rounded-2xl font-bold text-on-surface-variant hover:text-on-surface"
                                >
                                  BACK
                                </button>
                                <button 
                                  onClick={() => {
                                    if (!couplesSetup.p2Name) return;
                                    setPlayers([
                                      { id: 'p1', name: couplesSetup.p1Name, sips: 0 },
                                      { id: 'p2', name: couplesSetup.p2Name, sips: 0 }
                                    ]);
                                    setCouplesTraps({ p1: couplesSetup.p1Trap, p2: couplesSetup.p2Trap });
                                    setGameMode('Couples');
                                    startGame();
                                  }} 
                                  className="flex-1 py-5 bg-tertiary text-white rounded-2xl font-bold text-xl shadow-lg active:scale-95 transition-all"
                                >
                                  START RITUAL
                                </button>
                              </div>
                           </motion.div>
                         )}
                       </AnimatePresence>
                    </div>
                  </div>
                )}
                {currentTab === 'VAULT' && (
                  <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="text-center space-y-4">
                      <h2 className="text-4xl font-display font-bold italic uppercase tracking-tighter">THE VAULT</h2>
                      <p className="text-on-surface-variant text-xs tracking-[0.3em] uppercase">Saved cards for later rituals</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {vault.map(c => (
                        <motion.div layout key={c.id} className="glass-card p-8 rounded-3xl border-primary/10 flex flex-col gap-6 relative group">
                          <div className="flex justify-between items-center">
                            <span className={`px-2 py-0.5 rounded bg-primary/10 text-primary text-[8px] font-bold tracking-widest`}>{c.type}</span>
                            <div className="flex items-center gap-1 opacity-40">
                              <Beer className="w-3 h-3" />
                              <span className="text-[10px] font-bold">{c.punishment}</span>
                            </div>
                          </div>
                          <p className="font-bold text-xl leading-relaxed text-on-surface">{c.text}</p>
                          <button onClick={() => { setVault(vault.filter(v => v.id !== c.id)); playSound('drink'); }} className="self-end text-[10px] font-bold text-error flex items-center gap-2 hover:bg-error/10 px-3 py-1.5 rounded-lg transition-all opacity-0 group-hover:opacity-100">
                             <Trash2 className="w-3 h-3" /> DELETE
                          </button>
                        </motion.div>
                      ))}
                      {vault.length === 0 && (
                        <div className="col-span-full py-32 text-center opacity-20">
                          <Search className="w-20 h-20 mx-auto mb-6" />
                          <p className="font-display font-bold text-2xl tracking-widest">VAULT EMPTY</p>
                          <p className="text-xs uppercase tracking-widest mt-2">Star cards during gameplay to save them</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {currentTab === 'PROFILE' && (
                  <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex items-center gap-8 glass-card p-8 rounded-[3rem] border-white/5">
                      <div className="w-28 h-28 rounded-full bg-primary/20 flex items-center justify-center border-4 border-primary shadow-glow-primary">
                         <User className="w-12 h-12 text-primary" />
                      </div>
                      <div>
                         <h2 className="text-4xl font-display font-black italic tracking-tighter text-glow-primary">PLAYER PROFILE</h2>
                         <p className="text-xs font-bold text-on-surface-variant uppercase tracking-[0.4em] mt-1">Status: Party Legend</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                      <div className="glass-card p-8 rounded-[2.5rem] text-center space-y-2 border-white/5">
                         <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-2 text-primary"><History className="w-6 h-6" /></div>
                         <p className="text-4xl font-display font-bold">{stats.gamesPlayed}</p>
                         <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Sessions Played</p>
                      </div>
                      <div className="glass-card p-8 rounded-[2.5rem] text-center space-y-2 border-white/5">
                         <div className="w-12 h-12 bg-secondary/10 rounded-2xl flex items-center justify-center mx-auto mb-2 text-secondary"><Beer className="w-6 h-6" /></div>
                         <p className="text-4xl font-display font-bold">{stats.totalSips}</p>
                         <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Total Sips</p>
                      </div>
                      <div className="glass-card p-8 rounded-[2.5rem] text-center space-y-2 border-white/5">
                         <div className="w-12 h-12 bg-tertiary/10 rounded-2xl flex items-center justify-center mx-auto mb-2 text-tertiary"><Heart className="w-6 h-6" /></div>
                         <p className="text-3xl font-display font-bold overflow-hidden text-ellipsis px-2">{stats.favouriteMode}</p>
                         <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Favourite Mode</p>
                      </div>
                      <div className="glass-card p-8 rounded-[2.5rem] text-center space-y-2 border-white/5">
                         <div className="w-12 h-12 bg-yellow-500/10 rounded-2xl flex items-center justify-center mx-auto mb-2 text-yellow-500"><Trophy className="w-6 h-6" /></div>
                         <p className="text-4xl font-display font-bold">{stats.wins}</p>
                         <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Victories</p>
                      </div>
                    </div>
                  </div>
                )}
               </>
            )}
            
            {screen === 'GAME_PLAY' && (
              gameMode === 'Squad' ? <SquadGamePlay /> : <CouplesGamePlay />
            )}

            {screen === 'LEADERBOARD' && <LeaderboardView />}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Futuristic Nav Bar */}
      {screen === 'TAB_VIEW' && (
        <nav className="fixed bottom-0 w-full z-50 p-6 md:p-8 pointer-events-none">
          <div className="max-w-xl mx-auto bg-surface-container/85 backdrop-blur-3xl border border-white/10 rounded-[3rem] h-24 shadow-[0_-30px_60px_rgba(0,0,0,0.6)] pointer-events-auto flex justify-between items-center px-6 overflow-hidden relative">
             {(['SQUAD', 'COUPLES', 'VAULT', 'PROFILE'] as MainTab[]).map(tab => (
                <button
                  key={tab}
                  onClick={() => { setCurrentTab(tab); playSound('tap'); }}
                  className={`flex-1 flex flex-col items-center justify-center gap-2 h-full transition-all relative group h-full z-10 ${currentTab === tab ? 'text-primary' : 'text-on-surface-variant/30 hover:text-on-surface-variant/60'}`}
                >
                  <div className="relative">
                    {tab === 'SQUAD' && <Users className={`w-7 h-7 transition-transform ${currentTab === tab ? 'scale-110' : ''}`} />}
                    {tab === 'COUPLES' && <Heart className={`w-7 h-7 transition-transform ${currentTab === tab ? 'scale-110 fill-tertiary text-tertiary' : ''}`} />}
                    {tab === 'VAULT' && <Search className={`w-7 h-7 transition-transform ${currentTab === tab ? 'scale-110' : ''}`} />}
                    {tab === 'PROFILE' && <User className={`w-7 h-7 transition-transform ${currentTab === tab ? 'scale-110' : ''}`} />}
                    
                    {currentTab === tab && (
                      <motion.div layoutId="glow" className="absolute -inset-4 bg-primary/10 blur-xl rounded-full -z-10" />
                    )}
                  </div>
                  <span className={`text-[9px] font-black uppercase tracking-[0.25em] transition-all ${currentTab === tab ? 'opacity-100' : 'opacity-40 group-hover:opacity-100'}`}>{tab}</span>
                  
                  {currentTab === tab && (
                    <motion.div layoutId="navMarker" className="absolute bottom-1 w-10 h-1.5 bg-primary rounded-t-full shadow-glow-primary" />
                  )}
                </button>
             ))}
          </div>
        </nav>
      )}
    </div>
  );
}
