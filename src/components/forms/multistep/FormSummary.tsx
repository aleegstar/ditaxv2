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
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold flex items-center justify-center gap-2 text-slate-900">
              <Check className="w-6 h-6 text-[#1d64ff]" />
              {title} - Zusammenfassung
            </CardTitle>
            <p className="text-slate-500">
              Überprüfe deine Angaben bevor du fortfährst
            </p>
          </CardHeader>
        </Card>

        {/* Statistics */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="bg-emerald-50 border-emerald-200">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-emerald-600">{yesAnswers.length}</div>
              <div className="text-sm text-slate-600">Ja-Antworten</div>
            </CardContent>
          </Card>
          <Card className="bg-slate-50 border-slate-200">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-slate-600">{noAnswers.length}</div>
              <div className="text-sm text-slate-500">Nein-Antworten</div>
            </CardContent>
          </Card>
        </div>

        {/* Yes Answers (Relevant Items) */}
        {yesAnswers.length > 0 && <Card className="bg-white border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg text-emerald-600">
                Deine relevanten Angaben (Ja-Antworten)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {yesAnswers.map((item, index) => {
            try {
              return <div key={item.questionId} className="flex items-center justify-between p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Check className="w-4 h-4 text-emerald-600" />
                          <span className="font-medium text-slate-800">{item.questionText}</span>
                          <Badge variant="secondary" className="bg-emerald-100 text-emerald-700">
                            Ja
                          </Badge>
                        </div>
                        {item.repeaterData && Array.isArray(item.repeaterData) && item.repeaterData.length > 0 && <div className="mt-2 text-sm text-slate-500">
                            {item.repeaterTitle}: {item.repeaterData.length} Eintrag(e) erfasst
                          </div>}
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => onEdit(item.questionId)} className="hover:bg-emerald-100 text-slate-600">
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
        {noAnswers.length > 0 && <Card className="bg-white border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg text-slate-500">
                Nicht zutreffende Angaben (Nein-Antworten)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {noAnswers.map((item, index) => {
            try {
              return <div key={item.questionId} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <ChevronRight className="w-4 h-4 text-slate-400 rotate-45" />
                          <span className="font-medium text-slate-600">{item.questionText}</span>
                          <Badge variant="outline" className="bg-slate-100 text-slate-500 border-slate-300">
                            Nein
                          </Badge>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => onEdit(item.questionId)} className="hover:bg-slate-100 text-slate-500">
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
          <Button onClick={onConfirm} size="lg" className="w-full max-w-sm h-14 text-lg font-medium bg-[#1d64ff] text-white hover:bg-[#1d64ff]/90 rounded-full">
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
      <Card className="bg-white border-slate-200 shadow-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold flex items-center justify-center gap-2 text-slate-900">
            <Check className="w-6 h-6 text-[#1d64ff]" />
            {title} - Zusammenfassung
          </CardTitle>
          <p className="text-slate-500">Überprüfe deine Angaben bevor du fortfährst</p>
        </CardHeader>
      </Card>

      {/* Statistics */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="bg-emerald-50 border-emerald-200">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-emerald-600">{yesAnswers.length}</div>
            <div className="text-sm text-slate-600">Ja-Antworten</div>
          </CardContent>
        </Card>
        <Card className="bg-slate-50 border-slate-200">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-slate-600">{noAnswers.length}</div>
            <div className="text-sm text-slate-500">Nein-Antworten</div>
          </CardContent>
        </Card>
      </div>

      {/* Yes Answers (Relevant Items) */}
      {yesAnswers.length > 0 && <Card className="bg-white border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg text-emerald-600">Deine relevanten Angaben (Ja-Antworten)</CardTitle>
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
        }} className="flex items-center justify-between p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span className="font-medium text-slate-800">{item.questionText}</span>
                    <Badge variant="secondary" className="bg-emerald-100 text-emerald-700">
                      Ja
                    </Badge>
                  </div>
                  {item.repeaterData && item.repeaterData.length > 0 && <div className="mt-2 text-sm text-slate-500">
                      {item.repeaterTitle}: {item.repeaterData.length} Eintrag(e) erfasst
                    </div>}
                </div>
                <Button variant="ghost" size="sm" onClick={() => onEdit(item.questionId)} className="hover:bg-emerald-100 text-slate-600">
                  <Edit className="w-4 h-4" />
                </Button>
              </motion.div>)}
          </CardContent>
        </Card>}

      {/* No Answers (Not Relevant Items) */}
      {noAnswers.length > 0 && <Card className="bg-white border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg text-slate-500">
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
        }} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <ChevronRight className="w-4 h-4 text-slate-400 rotate-45" />
                    <span className="font-medium text-slate-600">{item.questionText}</span>
                    <Badge variant="outline" className="bg-slate-100 text-slate-500 border-slate-300">
                      Nein
                    </Badge>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => onEdit(item.questionId)} className="hover:bg-slate-100 text-slate-500">
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