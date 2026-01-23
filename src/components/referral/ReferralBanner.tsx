import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Gift, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';

interface ReferralBannerProps {
  variant?: 'default' | 'compact';
}

export const ReferralBanner: React.FC<ReferralBannerProps> = ({ variant = 'default' }) => {
  if (variant === 'compact') {
    return (
      <Link to="/invite-friends">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          whileHover={{ scale: 1.02 }}
          className="bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 rounded-lg p-3 flex items-center justify-between cursor-pointer hover:border-primary/40 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-full">
              <Gift className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium">Freunde einladen</p>
              <p className="text-xs text-muted-foreground">CHF 20.- für dich & deinen Freund</p>
            </div>
          </div>
          <ChevronRight className="h-5 w-5 text-muted-foreground" />
        </motion.div>
      </Link>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/5 via-transparent to-primary/10">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-primary/10 rounded-xl">
                <Gift className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Freunde einladen & sparen</h3>
                <p className="text-muted-foreground text-sm mt-1">
                  Teile deinen persönlichen Code und erhalte CHF 20.- Rabatt 
                  für jede erfolgreiche Einladung. Dein Freund spart ebenfalls!
                </p>
              </div>
            </div>
            <Link to="/invite-friends">
              <Button className="whitespace-nowrap">
                <Gift className="h-4 w-4 mr-2" />
                Jetzt einladen
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};
