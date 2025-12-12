import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import ditaxLogoMain from '@/assets/ditax-logo-main.png';
import { User, Wallet, Shield, Landmark, Send, Check, UploadCloud, FileCheck, ArrowLeft, Menu, Bell, MessageCircle, LucideIcon } from 'lucide-react';
import { useFormContext } from '@/contexts';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useProfile } from '@/hooks/useProfile';
import { supabase } from '@/integrations/supabase/client';
import { AnimatedCircularProgressBar } from '@/components/ui/animated-circular-progress-bar';
import { BorderBeam } from '@/components/ui/border-beam';

// Border beam color configurations for each card
const beamColors: Record<string, { from: string; to: string }> = {
  contact: { from: "#F97316", to: "#FBBF24" }, // Orange to Yellow
  deductions: { from: "#9b87f5", to: "#1EAEDB" }, // Purple to Cyan  
  income: { from: "#FBBF24", to: "#F97316" }, // Yellow to Orange
  assets: { from: "#10B981", to: "#34D399" }, // Green shades
};

interface DashboardSection {
  id: string;
  title: string;
  icon: LucideIcon;
  param: string;
  dependencies?: string[];
}

// Beam animation component
const NexusBeam: React.FC<{
  delay?: number;
  color?: 'orange' | 'green' | 'red';
}> = ({
  delay = 0,
  color = 'orange'
}) => {
  const colorConfig = {
    orange: {
      glow: 'rgba(249,115,22,0.15)',
      beam: '#F97316',
      shadow: 'rgba(249,115,22,0.6)',
      shadowLight: 'rgba(251,191,36,0.3)'
    },
    green: {
      glow: 'rgba(16,185,129,0.15)',
      beam: '#10B981',
      shadow: 'rgba(16,185,129,0.6)',
      shadowLight: 'rgba(52,211,153,0.3)'
    },
    red: {
      glow: 'rgba(239,68,68,0.15)',
      beam: '#EF4444',
      shadow: 'rgba(239,68,68,0.6)',
      shadowLight: 'rgba(248,113,113,0.3)'
    }
  };
  
  const colors = colorConfig[color];
  
  return (
    <div className="relative w-full h-24 flex justify-center items-center z-10 overflow-visible">
      {/* Static Guide Line - Always Visible - Now colored */}
      <div 
        className="w-[2px] h-full absolute z-0" 
        style={{ backgroundColor: colors.beam, opacity: 0.4 }}
      />
      
      {/* Wide Ambient Glow */}
      <div 
        className="absolute w-24 h-full z-0 opacity-50" 
        style={{
          background: `radial-gradient(circle at center, ${colors.glow} 0%, transparent 70%)`
        }}
      />
      
      {/* The Beam Container */}
      <div className="absolute inset-0 flex justify-center overflow-hidden">
        {/* The Traveling High-Energy Pulse */}
        <div 
          className="w-[2px] h-40 absolute blur-[0.5px] z-10" 
          style={{
            background: `linear-gradient(to bottom, transparent, ${colors.beam}, transparent)`,
            animation: 'beam-drop 2.5s cubic-bezier(0.4, 0, 0.2, 1) infinite',
            animationDelay: `${delay}s`,
            boxShadow: `0 0 15px 1px ${colors.shadow}, 0 0 30px 4px ${colors.shadowLight}`
          }} 
        />
        
        {/* Brighter Core - Now colored */}
        <div 
          className="w-[1px] h-32 absolute z-20 opacity-80" 
          style={{
            background: `linear-gradient(to bottom, transparent, ${colors.beam}, transparent)`,
            animation: 'beam-drop 2.5s cubic-bezier(0.4, 0, 0.2, 1) infinite',
            animationDelay: `${delay}s`
          }} 
        />
      </div>
    </div>
  );
};

export const TaxYearDashboard: React.FC = () => {
  const {
    formProgress,
    taxYear
  } = useFormContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const {
    profile
  } = useProfile();
  const [paymentStatus, setPaymentStatus] = useState<string>('pending');
  useEffect(() => {
    const loadPaymentStatus = async () => {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user || !taxYear) return;
      const {
        data
      } = await supabase.from('tax_returns').select('payment_status').eq('user_id', user.id).eq('tax_year', taxYear).maybeSingle();
      if (data?.payment_status) {
        setPaymentStatus(data.payment_status);
      }
    };
    loadPaymentStatus();
  }, [taxYear]);
  const angabenSections: DashboardSection[] = [{
    id: 'contact',
    title: 'Kontaktangaben',
    icon: User,
    param: 'kontakt'
  }, {
    id: 'deductions',
    title: 'Abzüge',
    icon: Shield,
    param: 'abzuege'
  }, {
    id: 'income',
    title: 'Einkommen',
    icon: Wallet,
    param: 'einkommen'
  }, {
    id: 'assets',
    title: 'Vermögen',
    icon: Landmark,
    param: 'vermoegen'
  }];
  const isCompleted = (sectionId: string): boolean => {
    switch (sectionId) {
      case 'contact':
        return formProgress.contactInfo || false;
      case 'income':
        return formProgress.income || false;
      case 'deductions':
        return formProgress.deductions || false;
      case 'assets':
        return formProgress.assets || false;
      case 'documents':
        return formProgress.documents || false;
      case 'submit':
        return formProgress.contactInfo && formProgress.income && formProgress.deductions && formProgress.assets && formProgress.documents && paymentStatus === 'paid' || false;
      default:
        return false;
    }
  };
  const getAngabenProgress = (): {
    completed: number;
    total: number;
    percentage: number;
  } => {
    const completed = angabenSections.filter(s => isCompleted(s.id)).length;
    return {
      completed,
      total: 4,
      percentage: Math.round(completed / 4 * 100)
    };
  };
  const handleSectionClick = (section: DashboardSection) => {
    if (section.id === 'documents') {
      navigate('/documents');
      return;
    }
    setSearchParams({
      section: section.param
    });
  };
  const handleDocumentsClick = () => {
    // Navigate to document checklist within form flow
    setSearchParams({ section: 'unterlagen', year: taxYear });
  };
  const handleSubmitClick = () => {
    const allAngabenComplete = angabenSections.every(s => isCompleted(s.id));
    const documentsComplete = isCompleted('documents');
    if (allAngabenComplete && documentsComplete) {
      navigate('/payment');
    }
  };
  const angabenProgress = getAngabenProgress();
  const isDocumentsComplete = isCompleted('documents');
  const allAngabenComplete = angabenSections.every(s => isCompleted(s.id));
  const canSubmit = allAngabenComplete && isDocumentsComplete;
  return <div className="min-h-screen bg-[#020408] flex flex-col text-zinc-100 antialiased">
      {/* Inject beam animation keyframes */}
      <style>{`
        @keyframes beam-drop {
          0% { transform: translateY(-100%); opacity: 0; }
          20% { opacity: 1; }
          80% { opacity: 1; }
          100% { transform: translateY(100%); opacity: 0; }
        }
      `}</style>

      {/* Mobile Container */}
      <div className="overflow-hidden min-h-screen md:max-w-2xl w-full max-w-[430px] mx-auto relative">
        {/* Header */}
        <header className="flex z-20 p-8 relative items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/')} className="w-10 h-10 border border-white/10 rounded-full flex items-center justify-center bg-gradient-to-b from-white/5 to-transparent hover:from-white/10 hover:to-white/5 transition-all shadow-lg backdrop-blur-sm group">
              <ArrowLeft className="w-5 h-5 text-zinc-400 group-hover:text-white transition-colors" strokeWidth={1.5} />
            </button>
            
          </div>

          {/* Right Icons */}
          
        </header>

        {/* Greeting */}
        <div className="px-8 mb-8 flex justify-between items-center relative z-20">
          <h1 className="text-2xl tracking-tight">
            <span className="text-zinc-500 font-medium font-jakarta text-sm tracking-wider mb-0.5 block">
              Steuerfall
            </span>
            <span className="text-white block font-semibold font-jakarta">
              Steuererklärung {taxYear}
            </span>
          </h1>
          <div className="w-10 h-10 rounded-full overflow-hidden border border-white/10 bg-gradient-to-b from-[#18181b] to-[#0a0a0a] shadow-[0_4px_15px_-4px_rgba(0,0,0,0.8)]">
            {profile?.avatar_url ? <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center">
                <User className="w-5 h-5 text-zinc-400" strokeWidth={1.5} />
              </div>}
          </div>
        </div>

        {/* Main Content Stream */}
        <div className="flex flex-col md:px-8 px-4 relative items-center">
          {/* Card 1: Angaben */}
          <motion.div initial={{
          opacity: 0,
          y: 20
        }} animate={{
          opacity: 1,
          y: 0
        }} transition={{
          duration: 0.5
        }} className="w-full z-20 rounded-[1.5rem] p-4 md:p-6 relative bg-gradient-to-br from-[#18181b] to-[#050505] ring-1 ring-white/5 overflow-hidden"
        style={{
          boxShadow: angabenProgress.completed === 4 
            ? '0 25px 50px -12px rgba(0,0,0,1), 0 0 30px -5px rgba(16,185,129,0.3), inset 0 1px 0 0 rgba(16,185,129,0.1)' 
            : '0 25px 50px -12px rgba(0,0,0,1), 0 0 30px -5px rgba(249,115,22,0.3), inset 0 1px 0 0 rgba(249,115,22,0.1)',
          border: '1px solid transparent',
          backgroundImage: angabenProgress.completed === 4
            ? 'linear-gradient(to bottom right, #18181b, #050505), linear-gradient(135deg, rgba(16,185,129,0.6), rgba(52,211,153,0.3), rgba(16,185,129,0.6))'
            : 'linear-gradient(to bottom right, #18181b, #050505), linear-gradient(135deg, rgba(249,115,22,0.6), rgba(251,191,36,0.3), rgba(249,115,22,0.6))',
          backgroundOrigin: 'border-box',
          backgroundClip: 'padding-box, border-box'
        }}>
            {/* Orange BorderBeam for outer card when in progress */}
            {angabenProgress.completed < 4 && (
              <BorderBeam 
                size={200}
                duration={10}
                borderWidth={1.5}
                colorFrom="#F97316"
                colorTo="#FBBF24"
                delay={0}
              />
            )}
            {/* Card Header */}
            <div className="flex justify-between items-start mb-6">
              <div>
                <span className="block text-[10px] text-[#1D64FF] tracking-widest font-jakarta mb-1 font-medium">
                  Schritt 1
                </span>
                <h2 className="text-xl font-medium text-white tracking-tight font-jakarta">
                  Angaben
                </h2>
                <p className="text-xs font-normal text-zinc-500 tracking-wide font-jakarta mt-1.5">
                  {angabenProgress.completed === 4 ? 'Abgeschlossen' : 'In Bearbeitung'}
                </p>
              </div>
              <AnimatedCircularProgressBar 
                max={100} 
                min={0} 
                value={angabenProgress.percentage} 
                gaugePrimaryColor="#1D64FF" 
                gaugeSecondaryColor="#27272a"
                className="size-14 text-xs"
              />
            </div>

            {/* Grid Options */}
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {angabenSections.map((section, index) => {
              const Icon = section.icon;
              const completed = isCompleted(section.id);
              const colors = beamColors[section.id] || beamColors.contact;
              return <button key={section.id} onClick={() => handleSectionClick(section)} className={`group relative overflow-hidden bg-gradient-to-br from-white/[0.08] to-transparent rounded-xl p-3 md:p-4 h-24 md:h-28 flex flex-col justify-between hover:from-white/[0.12] hover:to-white/[0.02] transition-all cursor-pointer shadow-lg shadow-black/20 text-left ${
                completed 
                  ? 'border border-transparent' 
                  : 'border border-white/5 hover:border-white/20'
              }`}>
                    {/* Only show BorderBeam animation when NOT completed */}
                    {!completed && (
                      <BorderBeam 
                        size={80}
                        duration={6}
                        borderWidth={1.5}
                        colorFrom="#F97316"
                        colorTo="#FBBF24"
                        delay={index * 1.5}
                      />
                    )}
                    <div className="flex justify-between w-full">
                      <Icon className="w-5 h-5 text-zinc-400 group-hover:text-white transition-colors" strokeWidth={1.5} />
                      {completed && <div className="w-5 h-5 rounded-full flex items-center justify-center bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]">
                          <Check className="w-3 h-3 text-white" strokeWidth={2.5} />
                        </div>}
                    </div>
                    <span className="text-xs text-zinc-400 font-light leading-tight group-hover:text-zinc-200 transition-colors font-jakarta">
                      {section.title}
                    </span>
                  </button>;
            })}
            </div>
          </motion.div>

          {/* NEXUS BEAM CONNECTION 1 - matches Unterlagen card border (lower card) */}
          <NexusBeam delay={0} color={!allAngabenComplete ? 'red' : isDocumentsComplete ? 'green' : 'orange'} />

          {/* Card 2: Unterlagen */}
          <motion.div initial={{
          opacity: 0,
          y: 20
        }} animate={{
          opacity: 1,
          y: 0
        }} transition={{
          duration: 0.5,
          delay: 0.1
        }} onClick={() => allAngabenComplete && handleDocumentsClick()} 
        className={`w-full rounded-[1.5rem] p-6 relative z-20 group transition-all bg-gradient-to-br from-[#18181b] to-[#050505] ring-1 ring-white/5 overflow-hidden ${
          !allAngabenComplete ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
        }`}
        style={{
          boxShadow: !allAngabenComplete 
            ? '0 25px 50px -12px rgba(0,0,0,1), 0 0 30px -5px rgba(239,68,68,0.3), inset 0 1px 0 0 rgba(239,68,68,0.1)'
            : isDocumentsComplete 
              ? '0 25px 50px -12px rgba(0,0,0,1), 0 0 30px -5px rgba(16,185,129,0.3), inset 0 1px 0 0 rgba(16,185,129,0.1)' 
              : '0 25px 50px -12px rgba(0,0,0,1), 0 0 30px -5px rgba(249,115,22,0.3), inset 0 1px 0 0 rgba(249,115,22,0.1)',
          border: '1px solid transparent',
          backgroundImage: !allAngabenComplete
            ? 'linear-gradient(to bottom right, #18181b, #050505), linear-gradient(135deg, rgba(239,68,68,0.6), rgba(248,113,113,0.3), rgba(239,68,68,0.6))'
            : isDocumentsComplete
              ? 'linear-gradient(to bottom right, #18181b, #050505), linear-gradient(135deg, rgba(16,185,129,0.6), rgba(52,211,153,0.3), rgba(16,185,129,0.6))'
              : 'linear-gradient(to bottom right, #18181b, #050505), linear-gradient(135deg, rgba(249,115,22,0.6), rgba(251,191,36,0.3), rgba(249,115,22,0.6))',
          backgroundOrigin: 'border-box',
          backgroundClip: 'padding-box, border-box'
        }}>
            {/* Orange BorderBeam for outer card when in progress */}
            {allAngabenComplete && !isDocumentsComplete && (
              <BorderBeam 
                size={200}
                duration={10}
                borderWidth={1.5}
                colorFrom="#F97316"
                colorTo="#FBBF24"
                delay={0.5}
              />
            )}
            <div className="flex justify-between items-start mb-2">
              <div>
                <span className={`block text-[10px] font-semibold tracking-widest font-jakarta mb-1 ${allAngabenComplete ? 'text-[#1D64FF]' : 'text-zinc-600'}`}>
                  Schritt 2
                </span>
                <h2 className={`text-xl font-medium tracking-tight font-jakarta ${allAngabenComplete ? 'text-white' : 'text-zinc-500'}`}>
                  Unterlagen
                </h2>
                <p className="text-zinc-500 text-sm mt-1 font-light leading-relaxed font-jakarta">
                  {allAngabenComplete ? 'Lade deine steuerrelevanten Unterlagen hoch.' : 'Schliesse zuerst alle Angaben ab.'}
                </p>
              </div>
              <div className={`w-8 h-8 rounded-full border border-white/10 flex items-center justify-center ${allAngabenComplete ? 'bg-white/5' : 'bg-white/[0.02]'}`}>
                {isDocumentsComplete ? <Check className="w-4 h-4 text-[#1D64FF]" strokeWidth={1.5} /> : <UploadCloud className={`w-4 h-4 ${allAngabenComplete ? 'text-zinc-400' : 'text-zinc-600'}`} strokeWidth={1.5} />}
              </div>
            </div>

            {/* Small preview/placeholder for upload area */}
            <div className={`mt-4 h-16 w-full border border-dashed rounded-lg flex items-center justify-center gap-2 ${allAngabenComplete ? 'border-white/10 bg-white/[0.01]' : 'border-white/5 bg-transparent'}`}>
              <span className={`text-xs font-jakarta ${allAngabenComplete ? 'text-zinc-600' : 'text-zinc-700'}`}>
                {allAngabenComplete ? 'Drag & Drop oder Auswählen' : 'Gesperrt'}
              </span>
            </div>
          </motion.div>

          {/* NEXUS BEAM CONNECTION 2 - matches Einreichen card border (lower card) */}
          <NexusBeam delay={1.25} color={!isDocumentsComplete ? 'red' : canSubmit ? 'green' : 'orange'} />

          {/* Card 3: Einreichen */}
          <motion.div initial={{
          opacity: 0,
          y: 20
        }} animate={{
          opacity: 1,
          y: 0
        }} transition={{
          duration: 0.5,
          delay: 0.2
        }} 
        className={`w-full rounded-[1.5rem] p-6 relative z-20 group transition-all bg-gradient-to-br from-[#18181b] to-[#050505] ring-1 ring-white/5 overflow-hidden ${
          !isDocumentsComplete ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
        }`}
        style={{
          boxShadow: !isDocumentsComplete 
            ? '0 25px 50px -12px rgba(0,0,0,1), 0 0 30px -5px rgba(239,68,68,0.3), inset 0 1px 0 0 rgba(239,68,68,0.1)'
            : canSubmit 
              ? '0 25px 50px -12px rgba(0,0,0,1), 0 0 30px -5px rgba(16,185,129,0.3), inset 0 1px 0 0 rgba(16,185,129,0.1)' 
              : '0 25px 50px -12px rgba(0,0,0,1), 0 0 30px -5px rgba(249,115,22,0.3), inset 0 1px 0 0 rgba(249,115,22,0.1)',
          border: '1px solid transparent',
          backgroundImage: !isDocumentsComplete
            ? 'linear-gradient(to bottom right, #18181b, #050505), linear-gradient(135deg, rgba(239,68,68,0.6), rgba(248,113,113,0.3), rgba(239,68,68,0.6))'
            : canSubmit
              ? 'linear-gradient(to bottom right, #18181b, #050505), linear-gradient(135deg, rgba(16,185,129,0.6), rgba(52,211,153,0.3), rgba(16,185,129,0.6))'
              : 'linear-gradient(to bottom right, #18181b, #050505), linear-gradient(135deg, rgba(249,115,22,0.6), rgba(251,191,36,0.3), rgba(249,115,22,0.6))',
          backgroundOrigin: 'border-box',
          backgroundClip: 'padding-box, border-box'
        }}>
            {/* Orange BorderBeam for outer card when in progress */}
            {isDocumentsComplete && !canSubmit && (
              <BorderBeam 
                size={200}
                duration={10}
                borderWidth={1.5}
                colorFrom="#F97316"
                colorTo="#FBBF24"
                delay={1}
              />
            )}
            <div className="flex justify-between items-start mb-4">
              <div>
                <span className={`block text-[10px] font-semibold tracking-widest font-jakarta mb-1 ${isDocumentsComplete ? 'text-[#1D64FF]' : 'text-zinc-600'}`}>
                  Schritt 3
                </span>
                <h2 className={`text-xl font-medium tracking-tight font-jakarta ${isDocumentsComplete ? 'text-white' : 'text-zinc-500'}`}>
                  Einreichen
                </h2>
                <p className="text-zinc-500 text-sm mt-1 font-light leading-relaxed font-jakarta">
                  {isDocumentsComplete ? 'Zusammenfassung und Übermittlung.' : 'Schliesse zuerst die Unterlagen ab.'}
                </p>
              </div>
              <div className={`w-8 h-8 rounded-full border border-white/10 flex items-center justify-center ${isDocumentsComplete ? 'bg-white/5' : 'bg-white/[0.02]'}`}>
                <Send className={`w-4 h-4 ${isDocumentsComplete ? 'text-zinc-400' : 'text-zinc-600'}`} strokeWidth={1.5} />
              </div>
            </div>

            {/* Action / Status Area */}
            <div className={`flex items-center justify-between border rounded-xl p-3 transition-colors ${isDocumentsComplete ? 'bg-white/[0.02] border-white/5 group-hover:bg-white/[0.04]' : 'bg-transparent border-white/5'}`}>
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ring-1 ${isDocumentsComplete ? 'bg-[#1D64FF]/10 ring-[#1D64FF]/20' : 'bg-white/[0.02] ring-white/5'}`}>
                  <FileCheck className={`w-4 h-4 ${isDocumentsComplete ? 'text-[#1D64FF]' : 'text-zinc-600'}`} strokeWidth={1.5} />
                </div>
                <div className="flex flex-col">
                  <span className={`text-sm font-medium font-jakarta ${isDocumentsComplete ? 'text-zinc-200' : 'text-zinc-500'}`}>
                    {canSubmit ? 'Entwurf bereit' : 'Nicht verfügbar'}
                  </span>
                  <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-jakarta">
                    {canSubmit ? 'Wartet auf Freigabe' : isDocumentsComplete ? 'Zuerst alle Schritte abschliessen' : 'Gesperrt'}
                  </span>
                </div>
              </div>
              <button onClick={handleSubmitClick} disabled={!canSubmit} className="px-5 py-2 bg-gradient-to-r from-[#1D64FF] to-[#2563eb] text-white text-xs font-medium rounded-lg hover:shadow-[0_0_25px_rgba(29,100,255,0.5)] transition-all shadow-lg shadow-blue-900/30 font-jakarta border border-white/10 tracking-wide disabled:opacity-40 disabled:cursor-not-allowed">
                Senden
              </button>
            </div>
          </motion.div>
        </div>

        {/* Floating Action Button */}
        
      </div>
    </div>;
};