
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { WelcomeHeader } from "@/components/ui/welcome-header";
import { useIsMobile } from '@/hooks/use-mobile';

const Help = () => {
  const isMobile = useIsMobile();
  
  return (
    <div className="p-0">
      <WelcomeHeader 
        customTitle="Hilfe & Support"
        customDescription="Durchsuche unsere hilfreichen Artikel und Anleitungen, um mehr über unser Produkt zu erfahren."
      />
      <div className="">
        <Card className="border-0 shadow-none w-full hover:shadow-none hover:border-none focus:shadow-none focus:border-none transition-shadow duration-300 bg-transparent backdrop-blur-none">
          <CardHeader className="pt-2 pb-4 py-0">
            {/* Logo removed from mobile view */}
          </CardHeader>
          <CardContent className="p-0">
            <div className="w-full h-screen overflow-hidden">
              <iframe 
                src="https://ditax.productlift.dev/t/wissensdatenbank?widget_id=870f5612-894a-4267-8d33-4fcbc8bf9bfd" 
                data-productlift-link 
                className="w-full h-full" 
                title="Hilfe & Support" 
                style={{
                  border: 'none'
                }} 
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Help;
