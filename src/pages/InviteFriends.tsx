import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useReferralCode } from '@/hooks/useReferralCode';
import { usePromoCodes } from '@/hooks/usePromoCodes';
import { Copy, Mail, Share2, Gift, CheckCircle, Loader2, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { SubpageHeader } from '@/components/ui/subpage-header';
import { useI18n } from '@/contexts/I18nContext';
import inviteHero from '@/assets/invite-friends-hero.webp';

const InviteFriends: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useI18n();
  const {
    referralCode,
    redemptions,
    isLoading: isLoadingCode,
    copyToClipboard,
    shareViaWhatsApp,
    shareViaEmail,
  } = useReferralCode();

  const { promoCodes } = usePromoCodes();

  const formatCurrency = (amount: number) => `CHF ${(amount / 100).toFixed(2)}`;

  const successful = referralCode?.successful_referrals ?? 0;
  const remaining = referralCode
    ? referralCode.max_referrals - referralCode.successful_referrals
    : 0;

  return (
    <div className="min-h-screen bg-background">
      <SubpageHeader
        title={t.inviteFriends.title}
        onBack={() => navigate(-1)}
        showAvatar={false}
      />

      <div className="max-w-[760px] mx-auto px-5 md:px-8 py-6 space-y-5">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="rounded-2xl border border-border bg-card overflow-hidden shadow-[0_2px_12px_-4px_rgba(15,27,61,0.06)]"
        >
          <div className="relative h-44 sm:h-56 w-full overflow-hidden">
            <img
              src={inviteHero}
              alt="Freunde einladen"
              className="w-full h-full object-cover"
              loading="lazy"
            />
            <div className="absolute top-3 left-3 inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full bg-white/95 backdrop-blur-sm text-[11px] font-medium text-foreground shadow-sm">
              <Sparkles className="w-3 h-3" strokeWidth={2.25} />
              20 CHF für euch beide
            </div>
          </div>
          <div className="p-5 sm:p-6">
            <h1 className="text-[20px] sm:text-[22px] font-semibold text-foreground tracking-[-0.022em] leading-[1.2] mb-1.5">
              Lade Freunde ein – verdient gemeinsam
            </h1>
            <p className="text-[13px] sm:text-[14px] text-muted-foreground leading-[1.55]">
              Teile deinen persönlichen Code. Sobald ein Freund seine Steuererklärung bezahlt, erhaltet ihr beide 20 CHF Guthaben.
            </p>
          </div>
        </motion.div>

        {/* Referral code card */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
          className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-[0_2px_12px_-4px_rgba(15,27,61,0.06)]"
        >
          {isLoadingCode ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : referralCode ? (
            <>
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground/70 mb-2">
                Dein Code
              </div>
              <button
                onClick={copyToClipboard}
                className="w-full group rounded-xl border border-dashed border-border bg-[#F7F7F5] hover:bg-[#F2F2EF] transition-colors p-5 text-center"
              >
                <div className="text-[26px] sm:text-[30px] font-mono font-semibold tracking-[0.15em] text-foreground">
                  {referralCode.code}
                </div>
                <div className="mt-1.5 inline-flex items-center gap-1.5 text-[12px] text-muted-foreground">
                  <Copy className="h-3.5 w-3.5" strokeWidth={2} />
                  Tippen zum Kopieren
                </div>
              </button>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-3 mt-4">
                <div className="rounded-xl border border-border bg-card p-3.5">
                  <div className="text-[20px] font-semibold text-foreground tabular-nums leading-none">
                    {successful}
                  </div>
                  <div className="text-[12px] text-muted-foreground mt-1.5">
                    Erfolgreiche Einladungen
                  </div>
                </div>
                <div className="rounded-xl border border-border bg-card p-3.5">
                  <div className="text-[20px] font-semibold text-foreground tabular-nums leading-none">
                    {remaining}
                  </div>
                  <div className="text-[12px] text-muted-foreground mt-1.5">
                    Verbleibend
                  </div>
                </div>
              </div>

              {/* Share */}
              <div className="grid grid-cols-2 gap-3 mt-4">
                <Button variant="outline" className="h-11 rounded-xl" onClick={shareViaWhatsApp}>
                  <Share2 className="h-4 w-4 mr-2" strokeWidth={2} />
                  WhatsApp
                </Button>
                <Button variant="outline" className="h-11 rounded-xl" onClick={shareViaEmail}>
                  <Mail className="h-4 w-4 mr-2" strokeWidth={2} />
                  E-Mail
                </Button>
              </div>
              <Button className="w-full mt-3" onClick={copyToClipboard}>
                Code kopieren
              </Button>
            </>
          ) : (
            <div className="text-center py-4 text-muted-foreground text-[13px]">
              {t.inviteFriends.errorLoading}
            </div>
          )}
        </motion.div>

        {/* How it works */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-[0_2px_12px_-4px_rgba(15,27,61,0.06)]"
        >
          <h2 className="text-[15px] font-semibold text-foreground tracking-[-0.012em] mb-4">
            So funktioniert's
          </h2>
          <div className="space-y-4">
            {[
              { title: t.inviteFriends.step1Title, desc: t.inviteFriends.step1Description },
              { title: t.inviteFriends.step2Title, desc: t.inviteFriends.step2Description },
              { title: t.inviteFriends.step3Title, desc: t.inviteFriends.step3Description },
            ].map((s, i) => (
              <div key={i} className="flex gap-3.5">
                <div className="flex-shrink-0 w-7 h-7 rounded-full border border-border bg-[#F7F7F5] flex items-center justify-center text-[12px] font-semibold text-foreground tabular-nums">
                  {i + 1}
                </div>
                <div className="min-w-0">
                  <div className="text-[13px] font-medium text-foreground">{s.title}</div>
                  <div className="text-[12.5px] text-muted-foreground leading-[1.5] mt-0.5">
                    {s.desc}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Promo codes */}
        {promoCodes.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.15 }}
            className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-[0_2px_12px_-4px_rgba(15,27,61,0.06)]"
          >
            <div className="flex items-center gap-2 mb-1">
              <Gift className="h-4 w-4 text-foreground" strokeWidth={2} />
              <h2 className="text-[15px] font-semibold text-foreground tracking-[-0.012em]">
                Dein Guthaben
              </h2>
            </div>
            <p className="text-[12.5px] text-muted-foreground mb-4">
              Wird beim Bezahlen automatisch angerechnet.
            </p>
            <div className="space-y-2">
              {promoCodes.map((promo) => (
                <div
                  key={promo.promoId}
                  className="flex items-center justify-between p-3 rounded-xl border border-border bg-[#F7F7F5]"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <CheckCircle className="h-4 w-4 text-emerald-600 flex-shrink-0" strokeWidth={2} />
                    <div className="min-w-0">
                      <div className="font-mono text-[13px] font-medium text-foreground truncate">
                        {promo.code}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {promo.type === 'earned'
                          ? t.inviteFriends.earnedByInvite
                          : t.inviteFriends.referralDiscount}
                      </div>
                    </div>
                  </div>
                  <div className="text-[15px] font-semibold text-emerald-700 tabular-nums">
                    −{formatCurrency(promo.amount)}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Recent referrals */}
        {redemptions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
            className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-[0_2px_12px_-4px_rgba(15,27,61,0.06)]"
          >
            <h2 className="text-[15px] font-semibold text-foreground tracking-[-0.012em] mb-4">
              {t.inviteFriends.recentInvites}
            </h2>
            <div className="space-y-2">
              {redemptions.slice(0, 5).map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between p-3 rounded-xl border border-border bg-card"
                >
                  <div className="flex items-center gap-2.5">
                    <CheckCircle className="h-4 w-4 text-emerald-600" strokeWidth={2} />
                    <span className="text-[13px] text-foreground">
                      {t.inviteFriends.successfulInvite}
                    </span>
                  </div>
                  <span className="text-[12px] text-muted-foreground tabular-nums">
                    {new Date(r.referred_at).toLocaleDateString('de-CH')}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default InviteFriends;
