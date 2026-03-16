 import { useEffect, useState, useRef } from "react";
 import { Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Capacitor } from "@capacitor/core";
import { isDespiaEnvironment, isAndroidEnvironment } from "@/utils/platform";
import { isDespiaNative, DEEPLINK_SCHEME } from "@/lib/despia";
import { supabase } from "@/integrations/supabase/client";
import despia from "despia-native";
 import { motion, AnimatePresence } from "framer-motion";
import type { Easing } from "framer-motion";

const GoogleAuth = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>("");
   const [isSuccess, setIsSuccess] = useState(false);
   const isLoadingRef = useRef(true);

  useEffect(() => {
    const initGoogleAuth = async () => {
      try {
        const isDespia = isDespiaNative() || isDespiaEnvironment();
        const isNative = Capacitor.isNativePlatform() || isAndroidEnvironment();
        
        console.log('🔐 GoogleAuth: Starting authentication', { isDespia, isNative });
        console.log('🔐 GoogleAuth: Debug info:', {
          userAgent: navigator.userAgent,
          despiaPackageType: typeof despia,
        });
        
        if (isDespia) {
          // Use Despia Easy OAuth via auth-start Edge Function
          console.log('🔗 GoogleAuth: Using Despia Easy OAuth via auth-start Edge Function');
          
          const { data, error: fnError } = await supabase.functions.invoke('auth-start', {
            body: {
              provider: 'google',
              deeplink_scheme: DEEPLINK_SCHEME
            }
          });
          
          console.log('🔗 GoogleAuth: auth-start response:', { data, error: fnError });
          
          if (fnError || !data?.url) {
            throw new Error(fnError?.message || 'Failed to get OAuth URL from auth-start');
          }
          
          // Trigger Despia Easy OAuth using the despia-native NPM package
          const oauthCommand = `oauth://?url=${encodeURIComponent(data.url)}`;
          console.log('🔗 GoogleAuth: Executing despia command:', oauthCommand);
          
          despia(oauthCommand);
          
          // Timeout: Show error if OAuth doesn't proceed within 5 seconds
          setTimeout(() => {
             if (isLoadingRef.current) {
              console.warn('⚠️ GoogleAuth: OAuth timeout - browser may not have opened');
              setError("OAuth konnte nicht gestartet werden. Bitte versuche es erneut.");
              setIsLoading(false);
               isLoadingRef.current = false;
            }
          }, 5000);
          
          return;
        }
        
        if (isNative) {
          // Use standard OAuth for Capacitor
          const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
              redirectTo: 'https://app.ditax.ch/auth-success'
            }
          });
          
          if (error) {
            throw error;
          }
        } else {
          // Use standard OAuth for web browsers
          const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
              redirectTo: 'https://app.ditax.ch/auth-success'
            }
          });
          
          if (error) {
            throw error;
          }
        }
      } catch (error: any) {
        console.error('Google auth failed:', error);
        setError(error.message || "Fehler bei der Google-Anmeldung");
        setIsLoading(false);
         isLoadingRef.current = false;
      }
    };

    // Small delay to show loading state
    const timer = setTimeout(() => {
      initGoogleAuth();
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  const handleRetry = () => {
    setIsLoading(true);
     isLoadingRef.current = true;
    setError("");
    window.location.reload();
  };

  const handleBackToMain = () => {
    window.location.href = "/auth";
  };

   
  return (
     <div className="min-h-screen flex items-center justify-center overflow-hidden">
       <motion.div 
         className="w-full max-w-md space-y-8 text-center px-6"
         initial={{ opacity: 0 }}
         animate={{ opacity: 1 }}
         transition={{ duration: 0.4 }}
       >
         {/* Logo */}
         <motion.div 
           className="flex justify-center"
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ duration: 0.5 }}
         >
           <img 
             src="/lovable-uploads/8eb6c82b-7b0b-4d51-a64f-6d3e8b5366fd.png" 
             alt="Ditax Logo" 
             className="h-10 w-auto" 
           />
         </motion.div>
         
         <AnimatePresence mode="wait">
           {isLoading && !isSuccess ? (
             <motion.div 
               key="loading"
               className="space-y-8"
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               exit={{ opacity: 0, y: -20 }}
               transition={{ duration: 0.4 }}
             >
               {/* Animated Icon Container */}
               <div className="flex justify-center">
                 <div className="relative">
                   {/* Outer pulse ring */}
                   <motion.div 
                     className="absolute inset-0 w-28 h-28 rounded-full bg-primary/10"
                     animate={{ 
                       scale: [1, 1.05, 1],
                       opacity: [0.7, 1, 0.7],
                     }}
                     transition={{
                       duration: 2,
                       repeat: Infinity,
                       ease: "easeInOut" as Easing
                     }}
                   />
                   {/* Inner circle with icon */}
                   <div className="relative w-28 h-28 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                     <div className="w-16 h-16 rounded-full bg-white shadow-lg flex items-center justify-center">
                       <svg width="28" height="28" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                         <path fillRule="evenodd" clipRule="evenodd" d="M17.64 9.20456C17.64 8.56637 17.5827 7.95274 17.4764 7.36365H9V10.845H13.8436C13.635 11.97 13.0009 12.9232 12.0477 13.5614V15.8195H14.9564C16.6582 14.2527 17.64 11.9455 17.64 9.20456Z" fill="#4285F4" />
                         <path fillRule="evenodd" clipRule="evenodd" d="M9 18C11.43 18 13.4673 17.1941 14.9564 15.8195L12.0477 13.5614C11.2418 14.1014 10.2109 14.4205 9 14.4205C6.65591 14.4205 4.67182 12.8373 3.96409 10.71H0.957275V13.0418C2.43818 15.9832 5.48182 18 9 18Z" fill="#34A853" />
                         <path fillRule="evenodd" clipRule="evenodd" d="M3.96409 10.71C3.78409 10.17 3.68182 9.59318 3.68182 9C3.68182 8.40682 3.78409 7.83 3.96409 7.29V4.95818H0.957273C0.347727 6.17318 0 7.54773 0 9C0 10.4523 0.347727 11.8268 0.957273 13.0418L3.96409 10.71Z" fill="#FBBC04" />
                         <path fillRule="evenodd" clipRule="evenodd" d="M9 3.57955C10.3214 3.57955 11.5077 4.03364 12.4405 4.92545L15.0218 2.34409C13.4632 0.891818 11.4259 0 9 0C5.48182 0 2.43818 2.01682 0.957275 4.95818L3.96409 7.29C4.67182 5.16273 6.65591 3.57955 9 3.57955Z" fill="#EA4335" />
                       </svg>
                     </div>
                   </div>
                 </div>
               </div>
 
               {/* Text Content */}
               <div className="space-y-3">
                 <h1 className="font-semibold leading-tight tracking-tight text-foreground text-2xl">
                   Google Anmeldung
                 </h1>
                 <p className="text-muted-foreground font-normal text-base">
                   Du wirst zu Google weitergeleitet...
                 </p>
               </div>
 
               {/* Loading indicator */}
               <div className="flex justify-center">
                 <motion.div
                   className="flex items-center gap-2 text-muted-foreground text-sm"
                   initial={{ opacity: 0 }}
                   animate={{ opacity: 1 }}
                   transition={{ delay: 0.5 }}
                 >
                   <Loader2 className="w-4 h-4 animate-spin" />
                   <span>Verbindung wird hergestellt</span>
                 </motion.div>
               </div>
             </motion.div>
           ) : isSuccess ? (
             <motion.div 
               key="success"
               className="space-y-8"
               initial={{ opacity: 0, scale: 0.9 }}
               animate={{ opacity: 1, scale: 1 }}
               transition={{ duration: 0.4 }}
             >
               {/* Success Icon */}
               <div className="flex justify-center">
                 <div className="relative">
                   <motion.div 
                     className="absolute inset-0 w-28 h-28 rounded-full bg-primary/10"
                     initial={{ scale: 0 }}
                     animate={{ scale: 1 }}
                     transition={{ delay: 0.2, duration: 0.4 }}
                   />
                   <div className="relative w-28 h-28 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                     <motion.div 
                       className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center"
                       initial={{ scale: 0, opacity: 0 }}
                       animate={{ scale: 1, opacity: 1 }}
                       transition={{
                         type: "spring",
                         stiffness: 200,
                         damping: 15
                       }}
                     >
                       <CheckCircle2 className="w-10 h-10 text-primary" strokeWidth={1.5} />
                     </motion.div>
                   </div>
                 </div>
               </div>
 
               <div className="space-y-3">
                 <h1 className="font-semibold leading-tight tracking-tight text-foreground text-2xl">
                   Erfolgreich angemeldet!
                 </h1>
                 <p className="text-muted-foreground font-normal text-base">
                   Du wirst weitergeleitet...
                 </p>
               </div>
             </motion.div>
           ) : (
             <motion.div 
               key="error"
               className="space-y-6"
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               exit={{ opacity: 0, y: -20 }}
               transition={{ duration: 0.4 }}
             >
               {/* Error Icon */}
               <div className="flex justify-center">
                 <div className="relative">
                   <div className="w-28 h-28 rounded-full bg-gradient-to-br from-destructive/20 to-destructive/5 flex items-center justify-center">
                     <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
                       <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-destructive">
                         <circle cx="12" cy="12" r="10"/>
                         <line x1="15" y1="9" x2="9" y2="15"/>
                         <line x1="9" y1="9" x2="15" y2="15"/>
                       </svg>
                     </div>
                   </div>
                 </div>
               </div>
 
               <div className="space-y-3">
                 <h1 className="font-semibold leading-tight tracking-tight text-foreground text-2xl">
                   Anmeldung fehlgeschlagen
                 </h1>
                 <p className="text-muted-foreground font-normal text-base">
                   Es ist ein Fehler aufgetreten
                 </p>
               </div>
               
               <motion.div 
                 className="bg-destructive/5 border border-destructive/10 rounded-2xl p-4"
                 initial={{ opacity: 0, y: 10 }}
                 animate={{ opacity: 1, y: 0 }}
                 transition={{ delay: 0.2 }}
               >
                 <p className="text-destructive text-sm">{error}</p>
               </motion.div>
               
               <div className="space-y-3 pt-2">
                 <Button 
                   onClick={handleRetry}
                   className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium px-6 py-4 min-h-[56px] text-base rounded-2xl shadow-sm"
                 >
                   Erneut versuchen
                 </Button>
                 
                 <Button 
                   onClick={handleBackToMain}
                   variant="ghost"
                   className="w-full text-muted-foreground hover:text-foreground hover:bg-muted/50 font-medium px-6 py-4 min-h-[56px] text-base rounded-2xl"
                 >
                   Zurück zur Anmeldung
                 </Button>
               </div>
             </motion.div>
           )}
         </AnimatePresence>
         
         <motion.p 
           className="text-xs pt-6 text-muted-foreground/50"
           initial={{ opacity: 0, y: 10 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ delay: 0.6, duration: 0.4 }}
         >
           Diese Seite öffnet sich automatisch im Standard-Browser
         </motion.p>
       </motion.div>
     </div>
  );
};

export default GoogleAuth;
