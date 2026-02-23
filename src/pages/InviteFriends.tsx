import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useReferralCode } from '@/hooks/useReferralCode';
import { usePromoCodes } from '@/hooks/usePromoCodes';
import { Copy, Mail, Share2, Gift, Users, CheckCircle, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { SubpageHeader } from '@/components/ui/subpage-header';
import { useI18n } from '@/contexts/I18nContext';

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

  const { promoCodes, isLoading: isLoadingPromos } = usePromoCodes();

  const formatCurrency = (amount: number) => {
    return `CHF ${(amount / 100).toFixed(2)}`;
  };

  return (
    <div className="min-h-screen bg-background">
      <SubpageHeader 
        title={t.inviteFriends.title}
        onBack={() => navigate(-1)}
        showAvatar={false}
      />
      
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Intro Text */}
        <p className="text-center text-muted-foreground">
          {t.inviteFriends.subtitle}
        </p>

        {/* Main Card - Referral Code */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
            <CardHeader className="text-center">
              <CardTitle className="text-lg">{t.inviteFriends.yourCode}</CardTitle>
              <CardDescription>
                {t.inviteFriends.yourCodeDescription}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {isLoadingCode ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : referralCode ? (
                <>
                  {/* Code Display */}
                  <div 
                    className="bg-background border-2 border-dashed border-primary/30 rounded-xl p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
                    onClick={copyToClipboard}
                  >
                    <span className="text-3xl font-mono font-bold tracking-wider text-primary">
                      {referralCode.code}
                    </span>
                    <div className="mt-2 text-sm text-muted-foreground flex items-center justify-center gap-1">
                      <Copy className="h-4 w-4" />
                      {t.inviteFriends.clickToCopy}
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-muted/50 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-primary">
                        {referralCode.successful_referrals}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {t.inviteFriends.successfulInvites}
                      </div>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-primary">
                        {referralCode.max_referrals - referralCode.successful_referrals}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {t.inviteFriends.remaining}
                      </div>
                    </div>
                  </div>

                  {/* Share Buttons */}
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      variant="outline"
                      className="h-12"
                      onClick={shareViaWhatsApp}
                    >
                      <Share2 className="h-4 w-4 mr-2" />
                      {t.inviteFriends.shareViaWhatsApp}
                    </Button>
                    <Button
                      variant="outline"
                      className="h-12"
                      onClick={shareViaEmail}
                    >
                      <Mail className="h-4 w-4 mr-2" />
                      {t.inviteFriends.shareViaEmail}
                    </Button>
                  </div>

                  <Button
                    className="w-full"
                    onClick={copyToClipboard}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    {t.inviteFriends.copyCode}
                  </Button>
                </>
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  {t.inviteFriends.errorLoading}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* How it works */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-5 w-5" />
                {t.inviteFriends.howItWorks}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">
                    1
                  </div>
                  <div>
                    <div className="font-medium">{t.inviteFriends.step1Title}</div>
                    <div className="text-sm text-muted-foreground">
                      {t.inviteFriends.step1Description}
                    </div>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">
                    2
                  </div>
                  <div>
                    <div className="font-medium">{t.inviteFriends.step2Title}</div>
                    <div className="text-sm text-muted-foreground">
                      {t.inviteFriends.step2Description}
                    </div>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">
                    3
                  </div>
                  <div>
                    <div className="font-medium">{t.inviteFriends.step3Title}</div>
                    <div className="text-sm text-muted-foreground">
                      {t.inviteFriends.step3Description}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Your Promo Codes */}
        {promoCodes.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="border-green-500/20 bg-gradient-to-br from-green-500/5 to-transparent">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Gift className="h-5 w-5 text-green-500" />
                  {t.inviteFriends.yourDiscountCodes}
                </CardTitle>
                <CardDescription>
                  {t.inviteFriends.autoApplied}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {promoCodes.map((promo, index) => (
                    <div
                      key={promo.promoId}
                      className="flex items-center justify-between p-3 bg-background rounded-lg border"
                    >
                      <div className="flex items-center gap-3">
                        <CheckCircle className="h-5 w-5 text-green-500" />
                        <div>
                          <div className="font-mono font-medium">{promo.code}</div>
                          <div className="text-xs text-muted-foreground">
                            {promo.type === 'earned' ? t.inviteFriends.earnedByInvite : t.inviteFriends.referralDiscount}
                          </div>
                        </div>
                      </div>
                      <div className="text-lg font-bold text-green-600">
                        -{formatCurrency(promo.amount)}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Recent Referrals */}
        {redemptions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t.inviteFriends.recentInvites}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {redemptions.slice(0, 5).map((redemption) => (
                    <div
                      key={redemption.id}
                      className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                    >
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span className="text-sm">{t.inviteFriends.successfulInvite}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(redemption.referred_at).toLocaleDateString('de-CH')}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default InviteFriends;
