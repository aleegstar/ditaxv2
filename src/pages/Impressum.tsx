
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { SubpageHeader } from '@/components/ui/subpage-header';
import LegalDocumentPage from '@/components/legal/LegalDocumentPage';

const Impressum = () => {
  const navigate = useNavigate();
  
  const impressumContent = `<h2>Impressum</h2>
<h3>Angaben gemäss Art. 3 DSG (Schweiz)</h3>
<p><strong>Ditax by Graber Sandro</strong><br/>
Sandro Graber<br/>
Lerchenweg 49<br/>
4552 Derendingen<br/>
Schweiz</p>

<h3>Kontakt</h3>
<p>E-Mail: info@ditax.ch<br/>
Website: <a href="https://ditax.ch">https://ditax.ch</a></p>

<h3>Verantwortlich für den Inhalt</h3>
<p>Sandro Graber<br/>
Lerchenweg 49<br/>
4552 Derendingen<br/>
Schweiz</p>

<h3>Haftungsausschluss</h3>
<p>Der Autor übernimmt keinerlei Gewähr hinsichtlich der inhaltlichen Richtigkeit, Genauigkeit, Aktualität, Zuverlässigkeit und Vollständigkeit der Informationen.</p>
<p>Haftungsansprüche gegen den Autor wegen Schäden materieller oder immaterieller Art, welche aus dem Zugriff oder der Nutzung bzw. Nichtnutzung der veröffentlichten Informationen, durch Missbrauch der Verbindung oder durch technische Störungen entstanden sind, werden ausgeschlossen.</p>
<p>Alle Angebote sind unverbindlich. Der Autor behält es sich ausdrücklich vor, Teile der Seiten oder das gesamte Angebot ohne gesonderte Ankündigung zu verändern, zu ergänzen, zu löschen oder die Veröffentlichung zeitweise oder endgültig einzustellen.</p>

<h3>Haftung für Links</h3>
<p>Verweise und Links auf Webseiten Dritter liegen ausserhalb unseres Verantwortungsbereichs. Es wird jegliche Verantwortung für solche Webseiten abgelehnt. Der Zugriff und die Nutzung solcher Webseiten erfolgen auf eigene Gefahr des Nutzers oder der Nutzerin.</p>

<h3>Urheberrechte</h3>
<p>Die Urheber- und alle anderen Rechte an Inhalten, Bildern, Fotos oder anderen Dateien auf der Website gehören ausschliesslich Ditax by Graber Sandro oder den speziell genannten Rechtsinhabern. Für die Reproduktion jeglicher Elemente ist die schriftliche Zustimmung der Urheberrechtsträger im Voraus einzuholen.</p>

<p><em>Stand: Januar 2025</em></p>`;

  return (
    <div className="min-h-screen bg-transparent">
      <SubpageHeader 
        title="Impressum" 
        onBack={() => navigate(-1)} 
      />
      <LegalDocumentPage
        title=""
        staticContent={impressumContent}
        useWhiteBackground={true}
      />
    </div>
  );
};

export default Impressum;
