
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { SubpageHeader } from '@/components/ui/subpage-header';
import LegalDocumentPage from '@/components/legal/LegalDocumentPage';

const Cookies = () => {
  const navigate = useNavigate();
  
  const cookieContent = `
<h2>Ditax by Graber Sandro Cookie-Richtlinie</h2>
<p>Wirksamkeitsdatum: 23. November 2023</p>
<p>Wir verwenden Cookies, um Ihre Erfahrung mit unserer Website <a href="https://ditax.ch">https://ditax.ch</a> zu verbessern. Diese Cookie-Richtlinie ist Teil der Datenschutzrichtlinie von Ditax by Graber Sandro. Sie betrifft die Verwendung von Cookies zwischen Ihrem Gerät und unserer Webseite.</p>
<p>Wir stellen auch grundlegende Informationen über die von uns genutzten Dienste Dritter zur Verfügung, die ebenfalls Cookies als Teil ihres Dienstes verwenden können. Diese Richtlinie gilt nicht für deren Cookies.</p>
<p>Wenn Sie keine Cookies von uns akzeptieren möchten, sollten Sie Ihren Browser anweisen, Cookies von <a href="https://ditax.ch">https://ditax.ch</a> abzulehnen. In einem solchen Fall können wir Ihnen möglicherweise einige der von Ihnen gewünschten Inhalte und Dienste nicht zur Verfügung stellen.</p>
<!-- -->
<h3>Was ist ein Cookie?</h3>
<p>Ein Cookie ist eine kleine Datei, die eine Website auf Ihrem Gerät speichert, wenn Sie diese besuchen. Es enthält in der Regel Informationen über die Website selbst, eine eindeutige Kennung, die es der Website ermöglicht, Ihren Webbrowser zu erkennen, wenn Sie wiederkommen, zusätzliche Daten, die dem Zweck des Cookies dienen, und die Lebensdauer des Cookies selbst.</p>
<p>Cookies werden verwendet, um bestimmte Funktionen zu aktivieren (z. B. das Einloggen), die Nutzung der Website zu verfolgen (z. B. Analysen), Ihre Benutzereinstellungen zu speichern (z. B. Zeitzone, Benachrichtigungspräferenzen) und Ihre Inhalte zu personalisieren (z. B. Werbung, Sprache).</p>
<p>Cookies, die von der von Ihnen besuchten Webseite gesetzt werden, werden gewöhnlich als Erstanbieter-Cookies bezeichnet. Sie verfolgen in der Regel nur Ihre Aktivitäten auf dieser bestimmten Website.</p>
<p>Cookies, die von anderen Webseiten und Unternehmen (d. h. Dritten) gesetzt werden, werden als Drittanbieter-Cookies bezeichnet. Sie können dazu verwendet werden, Sie auf anderen Webseiten zu tracken, die denselben Drittanbieter-Dienst nutzen.</p>
<!-- -->
<!-- -->
<h3>Wie können Sie die Verwendung von Cookies auf unserer Website steuern?</h3>
<p>Sie haben das Recht zu entscheiden, ob Sie Cookies auf unserer Website akzeptieren oder ablehnen. Sie können Ihre Cookie-Präferenzen in unserem Cookie Consent Manager verwalten. Der Cookie Consent Manager ermöglicht es Ihnen, auszuwählen, welche Kategorien von Cookies Sie akzeptieren oder ablehnen. Essenzielle Cookies können nicht abgelehnt werden, da sie unbedingt erforderlich sind, um Ihnen die Dienste auf unserer Website bereitzustellen.</p>
<p>Sie können möglicherweise auch Ihre Cookie-Einstellungen festlegen oder ändern, indem Sie die Einstellungen Ihres Webbrowsers verwalten. Da jeder Webbrowser unterschiedlich ist, konsultieren Sie bitte die Anweisungen Ihres Webbrowsers (in der Regel im Abschnitt „Hilfe"). Wenn Sie sich entscheiden, Cookies abzulehnen oder zu deaktivieren, können Sie die Website dennoch nutzen, allerdings steht Ihnen möglicherweise nicht die gesamte Funktionalität der Website zur Verfügung.</p>
<!-- -->
<h3>Wie oft werden wir diese Cookie-Richtlinie aktualisieren?</h3>
<p>Wir können diese Cookie-Richtlinie von Zeit zu Zeit aktualisieren, um Änderungen an den von uns verwendeten Cookies und verwandten Technologien oder aus anderen betrieblichen, rechtlichen oder regulatorischen Gründen widerzuspiegeln.</p>
<p>Jedes Mal, wenn Sie unsere Website nutzen, gilt die aktuelle Version der Cookie-Richtlinie. Wenn Sie unsere Website nutzen, sollten Sie das Datum dieser Cookie-Richtlinie (das oben in diesem Dokument erscheint) überprüfen und alle Änderungen seit der letzten Version durchsehen.</p>
<!-- -->
<h3>Wo können Sie weitere Informationen erhalten?</h3>
<p>Für alle Fragen oder Bedenken bezüglich unserer Cookie-Richtlinie können Sie uns über die folgenden Kontaktdaten erreichen:</p>
<p>Ditax by Graber Sandro<br />
privacy@ditax.ch</p>
<!-- -->
  `;

  return (
    <div className="min-h-screen bg-[#020408]">
      <SubpageHeader 
        title="Cookie-Richtlinie" 
        onBack={() => navigate(-1)} 
      />
      <LegalDocumentPage
        title=""
        staticContent={cookieContent}
        useDarkBackground={true}
      />
    </div>
  );
};

export default Cookies;
