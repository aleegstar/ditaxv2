import React from 'react';
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { WelcomeHeader } from "@/components/ui/welcome-header";

const Roadmap = () => {
  return (
    <div className="p-0">
      <WelcomeHeader 
        customTitle="Roadmap"
        customDescription="Erfahre, was wir als nächstes planen und welche neuen Features in Entwicklung sind."
      />
      <div className="">
        <Card className="border-0 shadow-none w-full hover:shadow-none hover:border-none focus:shadow-none focus:border-none transition-shadow duration-300 bg-transparent backdrop-blur-none">
          <CardHeader className="pt-2 pb-4 py-0">
          </CardHeader>
          <CardContent className="p-0">
            <div className="w-full h-screen overflow-hidden">
              <iframe 
                src="https://ditax.productlift.dev/t/roadmap?widget_id=55eb9e79-4a5c-495f-b78c-622511e4f028" 
                data-productlift-link 
                className="w-full h-full" 
                title="Roadmap" 
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

export default Roadmap;