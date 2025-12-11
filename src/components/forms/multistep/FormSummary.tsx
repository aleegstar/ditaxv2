import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Edit, ChevronRight } from 'lucide-react';
import { FormSummaryItem } from '@/types/multiStepYesNo';
import { Capacitor } from '@capacitor/core';
import { isAndroidEnvironment } from '@/utils/platform';
import { NativeErrorMonitor } from '@/utils/nativeErrorMonitor';
interface FormSummaryProps {
  title: string;
  summaryItems: FormSummaryItem[];
  onEdit: (questionId: string) => void;
  onConfirm: () => void;
  onBack: () => void;
}
export const FormSummary: React.FC<FormSummaryProps> = ({
  title,
  summaryItems,
  onEdit,
  onConfirm,
  onBack
}) => {
  const isAndroid = isAndroidEnvironment();
  const reduceMotion = Capacitor.getPlatform() === 'android' || isAndroid;
  React.useEffect(() => {
    NativeErrorMonitor.addBreadcrumb('system', 'FormSummary mounted', {
      title,
      itemCount: summaryItems.length,
      isAndroid
    });
  }, [title, summaryItems.length, isAndroid]);
  const yesAnswers = summaryItems.filter(item => item.answer === true);
  const noAnswers = summaryItems.filter(item => item.answer === false);

  // Android-safe rendering without complex effects
  if (isAndroid) {
    return <div className="w-full max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <Card className="bg-card border-border">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold flex items-center justify-center gap-2">
              <Check className="w-6 h-6 text-primary" />
              {title} - Zusammenfassung
            </CardTitle>
            <p className="text-muted-foreground">
              Überprüfen Sie Ihre Angaben bevor Sie fortfahren
            </p>
          </CardHeader>
        </Card>

        {/* Statistics */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-primary">{yesAnswers.length}</div>
              <div className="text-sm text-muted-foreground">Ja-Antworten</div>
            </CardContent>
          </Card>
          <Card className="bg-muted/30">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-muted-foreground">{noAnswers.length}</div>
              <div className="text-sm text-muted-foreground">Nein-Antworten</div>
            </CardContent>
          </Card>
        </div>

        {/* Yes Answers (Relevant Items) */}
        {yesAnswers.length > 0 && <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-lg text-primary">
                Ihre relevanten Angaben (Ja-Antworten)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {yesAnswers.map((item, index) => {
            try {
              return <div key={item.questionId} className="flex items-center justify-between p-4 bg-primary/5 rounded-lg border border-primary/20">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Check className="w-4 h-4 text-primary" />
                          <span className="font-medium">{item.questionText}</span>
                          <Badge variant="secondary" className="bg-primary/10 text-primary">
                            Ja
                          </Badge>
                        </div>
                        {item.repeaterData && Array.isArray(item.repeaterData) && item.repeaterData.length > 0 && <div className="mt-2 text-sm text-muted-foreground">
                            {item.repeaterTitle}: {item.repeaterData.length} Eintrag(e) erfasst
                          </div>}
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => onEdit(item.questionId)} className="hover:bg-primary/10">
                        <Edit className="w-4 h-4" />
                      </Button>
                    </div>;
            } catch (error) {
              console.error('Error rendering yes item:', error);
              return null;
            }
          })}
            </CardContent>
          </Card>}

        {/* No Answers (Not Relevant Items) */}
        {noAnswers.length > 0 && <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-lg text-muted-foreground">
                Nicht zutreffende Angaben (Nein-Antworten)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {noAnswers.map((item, index) => {
            try {
              return <div key={item.questionId} className="flex items-center justify-between p-4 bg-muted/10 rounded-lg border border-muted/30">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <ChevronRight className="w-4 h-4 text-muted-foreground rotate-45" />
                          <span className="font-medium text-muted-foreground">{item.questionText}</span>
                          <Badge variant="outline" className="bg-muted/20 text-muted-foreground">
                            Nein
                          </Badge>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => onEdit(item.questionId)} className="hover:bg-muted/20">
                        <Edit className="w-4 h-4" />
                      </Button>
                    </div>;
            } catch (error) {
              console.error('Error rendering no item:', error);
              return null;
            }
          })}
            </CardContent>
          </Card>}

        {/* Action Buttons */}
        <div className="flex justify-center pt-4 px-4 pb-6">
          <Button onClick={onConfirm} size="lg" className="w-full max-w-sm h-14 text-lg font-medium bg-primary text-primary-foreground hover:bg-primary/90">
            <Check className="w-5 h-5 mr-2" />
            Bestätigen & Weiter
          </Button>
        </div>
      </div>;
  }
  return <motion.div initial={{
    opacity: 0,
    y: 20
  }} animate={{
    opacity: 1,
    y: 0
  }} transition={{
    duration: reduceMotion ? 0.01 : 0.4
  }} className="w-full max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold flex items-center justify-center gap-2">
            <Check className="w-6 h-6 text-primary" />
            {title} - Zusammenfassung
          </CardTitle>
          <p className="text-muted-foreground">Überprüfen deine Angaben bevor du fortfährst</p>
        </CardHeader>
      </Card>

      {/* Statistics */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-primary">{yesAnswers.length}</div>
            <div className="text-sm text-muted-foreground">Ja-Antworten</div>
          </CardContent>
        </Card>
        <Card className="bg-muted/30">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-muted-foreground">{noAnswers.length}</div>
            <div className="text-sm text-muted-foreground">Nein-Antworten</div>
          </CardContent>
        </Card>
      </div>

      {/* Yes Answers (Relevant Items) */}
      {yesAnswers.length > 0 && <Card className="bg-card/30 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-lg text-primary">Deine relevanten Angaben (Ja-Antworten)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {yesAnswers.map((item, index) => <motion.div key={item.questionId} initial={{
          opacity: 0,
          x: -20
        }} animate={{
          opacity: 1,
          x: 0
        }} transition={{
          delay: reduceMotion ? 0 : index * 0.1,
          duration: reduceMotion ? 0.01 : 0.2
        }} className="flex items-center justify-between p-4 bg-primary/5 rounded-lg border border-primary/20">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-primary" />
                    <span className="font-medium">{item.questionText}</span>
                    <Badge variant="secondary" className="bg-primary/10 text-primary">
                      Ja
                    </Badge>
                  </div>
                  {item.repeaterData && item.repeaterData.length > 0 && <div className="mt-2 text-sm text-muted-foreground">
                      {item.repeaterTitle}: {item.repeaterData.length} Eintrag(e) erfasst
                    </div>}
                </div>
                <Button variant="ghost" size="sm" onClick={() => onEdit(item.questionId)} className="hover:bg-primary/10">
                  <Edit className="w-4 h-4" />
                </Button>
              </motion.div>)}
          </CardContent>
        </Card>}

      {/* No Answers (Not Relevant Items) */}
      {noAnswers.length > 0 && <Card className="bg-card/20 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-lg text-muted-foreground">
              Nicht zutreffende Angaben (Nein-Antworten)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {noAnswers.map((item, index) => <motion.div key={item.questionId} initial={{
          opacity: 0,
          x: -20
        }} animate={{
          opacity: 1,
          x: 0
        }} transition={{
          delay: (yesAnswers.length + index) * 0.1
        }} className="flex items-center justify-between p-4 bg-muted/10 rounded-lg border border-muted/30">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <ChevronRight className="w-4 h-4 text-muted-foreground rotate-45" />
                    <span className="font-medium text-muted-foreground">{item.questionText}</span>
                    <Badge variant="outline" className="bg-muted/20 text-muted-foreground">
                      Nein
                    </Badge>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => onEdit(item.questionId)} className="hover:bg-muted/20">
                  <Edit className="w-4 h-4" />
                </Button>
              </motion.div>)}
          </CardContent>
        </Card>}

      {/* Action Buttons */}
      <div className="flex justify-center pt-4 px-4 pb-6">
        <Button onClick={onConfirm} size="lg" className="w-full max-w-sm h-14 text-base font-medium bg-[#1d64ff] hover:bg-[#1d64ff]/90 text-white rounded-full transition-colors duration-200 border-0" style={{
        boxShadow: 'rgba(29, 100, 255, 0.2) 0px 3px 10px 0px'
      }}>
          <Check className="w-5 h-5 mr-2" />
          Bestätigen & Weiter
        </Button>
      </div>
    </motion.div>;
};