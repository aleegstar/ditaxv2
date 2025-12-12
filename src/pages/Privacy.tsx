
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { SubpageHeader } from '@/components/ui/subpage-header';
import LegalDocumentPage from '@/components/legal/LegalDocumentPage';

const Privacy = () => {
  const navigate = useNavigate();
  
  const privacyContent = `
<h1>Ditax by Graber Sandro Datenschutzrichtlinie</h1>
<p>Ihre Privatsphäre ist uns wichtig. Es ist die Richtlinie von Ditax by Graber Sandro, Ihre Privatsphäre zu respektieren und alle geltenden Gesetze und Vorschriften in Bezug auf personenbezogene Daten, die wir über Sie erfassen, einzuhalten, auch über unsere App, Ditax und die damit verbundenen Dienste. </p>
<p>Personenbezogene Daten sind alle Informationen über Sie, die dazu verwendet werden können, Sie zu identifizieren. Dazu gehören Informationen über Sie als Person (wie Name, Adresse und Geburtsdatum), Ihre Geräte, Zahlungsdaten und sogar Informationen darüber, wie Sie eine App oder einen Online-Dienst nutzen. </p>
<p>Falls unsere App Links zu Websites und Diensten Dritter enthält, beachten Sie bitte, dass diese Websites und Dienste ihre eigenen Datenschutzrichtlinien haben. Nachdem Sie einem Link zu Inhalten Dritter gefolgt sind, sollten Sie deren veröffentlichte Datenschutzrichtlinien lesen, um zu erfahren, wie sie personenbezogene Daten erfassen und verwenden. Diese Datenschutzrichtlinie gilt nicht für Ihre Aktivitäten, nachdem Sie unsere App verlassen haben. </p>
<p>Diese Richtlinien sind ab dem 23. November 2023 gültig</p>
<p>Letzte Aktualisierung: 7. Juli 2025</p>
<h2>Daten, die wir erheben</h2>
<p>Die von uns erhobenen Daten fallen in eine von zwei Kategorien: „freiwillig zur Verfügung gestellte" und „automatisch erfasste" Informationen.</p>
<p>„Freiwillig bereitgestellte" Informationen beziehen sich auf alle Informationen, die Sie uns wissentlich und aktiv zur Verfügung stellen, wenn Sie unsere App und die damit verbundenen Dienste nutzen.</p>
<p>„Automatisch erfasste" Informationen sind alle Informationen, die Ihr Gerät beim Zugriff auf unsere App und die damit verbundenen Dienste automatisch sendet.</p>
<h3>Log-Dateien</h3>
<p>Wenn Sie über unsere App auf unsere Server zugreifen, können wir die von Ihrem Gerät bereitgestellten Standarddaten automatisch protokollieren. Dazu können die Internetprotokoll-Adresse (IP-Adresse) Ihres Geräts, Ihr Gerätetyp und Ihre Geräteversion, Ihre Aktivitäten innerhalb der App, Uhrzeit und Datum sowie weitere Details zu Ihrer Nutzung gehören. </p>
<p>Wenn bei der Nutzung der App bestimmte Fehler auftreten, erfassen wir außerdem automatisch Daten über den Fehler und die Umstände seines Auftretens. Diese Daten können technische Details zu Ihrem Gerät, zu dem, was Sie gerade tun wollten, als der Fehler auftrat, und andere technische Informationen im Zusammenhang mit dem Problem enthalten. Sie können eine Benachrichtigung über solche Fehler erhalten oder auch nicht, selbst wenn sie auftreten, dass sie aufgetreten sind oder um welche Art von Fehler es sich handelt. </p>
<p>Bitte beachten Sie, dass diese Informationen zwar für sich genommen nicht persönlich identifizierbar sind, dass es aber möglich sein kann, sie mit anderen Daten zu kombinieren, um einzelne Personen zu identifizieren.</p>
<h3>Personal Information</h3>
<p>Wir können nach persönlichen Informationen fragen - zum Beispiel, wenn Sie uns Inhalte übermitteln, wenn Sie ein Konto registrieren oder wenn Sie uns kontaktieren - die eine oder mehrere der folgenden Informationen enthalten können: </p>
<ul>
   <li>Name</li>
   <li>Email</li>
   <li>Geburtsdatum</li>
   <li>Wohn-/Zustelladresse</li>
   <li>Steuerrelevanten Angaben</li>
   <li>Personalien</li>
</ul>
<h3>Sensible Informationen</h3>
<p>"Sensible Informationen" oder "besondere Datenkategorien" sind eine Untergruppe personenbezogener Daten, denen ein höheres Schutzniveau eingeräumt wird. Zu den sensiblen Daten gehören beispielsweise Informationen über Ihre Rasse oder ethnische Herkunft, politische Meinungen, Religion, Gewerkschaften oder andere Berufsverbände oder Mitgliedschaften, philosophische Überzeugungen, sexuelle Orientierung, Sexualpraktiken oder Sexualleben, Strafregisterauszüge, medizinische oder biometrische Daten.</p>
<p>Zu den Arten von sensiblen Informationen, die wir über Sie sammeln können,</p>
<ul>
   <li>Religion</li>
   <li>Steuerrelevanten Angaben</li>
</ul>
<p>Wir werden keine sensiblen Daten über Sie sammeln, ohne vorher Ihre Zustimmung einzuholen, und wir werden Ihre sensiblen Daten nur in dem Maße verwenden oder offenlegen, wie es gesetzlich erlaubt, erforderlich oder genehmigt ist.</p>
<h2>Berechtigte Gründe für die Verarbeitung personenbezogener Daten</h2>
<p>Wir sammeln und verwenden Ihre persönlichen Daten nur, wenn wir einen berechtigten Grund dazu haben. In diesem Fall erheben wir nur personenbezogene Daten, die vernünftigerweise notwendig sind, um Ihnen unsere Leistungen zu erbringen.</p>
<h2>Erhebung und Verwendung von Daten</h2>
<p>Wir können personenbezogene Daten von Ihnen erfassen, wenn Sie eine der folgenden Aktionen in unserer App ausführen:</p>
<ul>
   <li>Einen Account anmelden</li>
   <li>Mit Mobilgerät oder Web-Browser auf unseren Content zugreifen</li>
   <li>Kontaktieren Sie uns per E-Mail, über Social Media oder ähnliche Technologien</li>
   <li>Wenn Sie uns auf Social Media erwähnen</li>
</ul>
<p>Wir sind berechtigt, Daten für die folgenden Zwecke zu erheben, zu speichern, zu verwenden und offenzulegen, wobei personenbezogene Daten nicht in einer Weise weiterverarbeitet werden, die mit diesen Zwecken unvereinbar ist:</p>
<ul>
   <li>um Ihnen die Kernfunktionen und -dienste unserer App und Plattform zur Verfügung zu stellen</li>
   <li>um Ihnen den Zugriff auf und die Nutzung unserer App, zugehöriger Plattformen und zugehöriger Social-Media-Plattformen zu ermöglichen </li>
</ul>
<p>Wir können freiwillig bereitgestellte und automatisch erfasste personenbezogene Daten mit allgemeinen Informationen oder Forschungsdaten kombinieren, die wir von anderen vertrauenswürdigen Quellen erhalten. Wenn Sie uns beispielsweise Ihre Zustimmung zum Zugriff auf Ihre Social-Media-Profile erteilen, können wir Informationen aus diesen Profilen mit Informationen kombinieren, die wir direkt von Ihnen erhalten haben, um Ihnen eine verbesserte Erfahrung mit unserer App und unseren Diensten zu bieten.</p>
<h2>Sicherheit Ihrer persönlichen Daten</h2>
<p>Wenn wir persönliche Daten erfassen und verarbeiten und solange wir diese Daten speichern, schützen wir sie mit wirtschaftlich vertretbaren Mitteln, um Verlust und Diebstahl sowie unbefugten Zugriff, Offenlegung, Kopieren, Verwendung oder Änderung zu verhindern.</p>
<p>Obwohl wir unser Bestes tun, um die persönlichen Daten, die Sie uns zur Verfügung stellen, zu schützen, weisen wir darauf hin, dass keine Methode der elektronischen Übertragung oder Speicherung zu 100 Prozent sicher ist, und niemand kann totale Datensicherheit garantieren.</p>
<p>Sie sind verantwortlich für die Wahl des Passworts und dessen allgemeine Sicherheitsstärke, um die Sicherheit Ihrer eigenen Daten im Rahmen unserer Dienste zu gewährleisten. Zum Beispiel sollten Sie sicherstellen, dass alle Passwörter, die mit dem Zugriff auf Ihre persönlichen Informationen und Konten verbunden sind, sicher und vertraulich bleiben.</p>
<h2>Wie lange wir Ihre persönlichen Daten behalten</h2>
<p>Wir bewahren Ihre persönlichen Daten nur so lange auf, wie wir sie benötigen. Dieser Zeitraum kann davon abhängen, wofür wir Ihre Daten in Übereinstimmung mit dieser Datenschutzrichtlinie verwenden. Zum Beispiel, wenn Sie uns personenbezogene Daten im Rahmen der Erstellung eines Accounts bei uns zur Verfügung gestellt haben, dürfen wir diese Daten für die Dauer aufbewahren, solange Ihr Account in unserem System existiert. Wenn Ihre persönlichen Daten für diesen Zweck nicht mehr benötigt werden, löschen oder anonymisieren wir sie, indem wir alle Angaben entfernen, die Sie identifizieren.</p>
<p>Falls erforderlich, können wir Ihre personenbezogenen Daten jedoch aufbewahren, um gesetzlichen, buchhalterischen oder Berichtsverpflichtungen nachzukommen oder für Archivierungszwecke im öffentlichen Interesse, wissenschaftlichen oder historischen Forschungs- oder statistische Zwecke.</p>
<h2>Privatsphäre von Kindern</h2>
<p>Unsere Produkte und Dienstleistungen richten sich nicht direkt an Kinder unter 13 Jahren, und wissentlich erfassen wir keine persönlichen Daten von Kindern unter 13 Jahren.</p>
<h2>Offenlegung persönlicher Daten an Dritte</h2>
<p>Wir können personenbezogene Daten weitergeben an:</p>
<ul>
   <li>eine Mutter-, Tochter- oder Schwestergesellschaft unseres Unternehmens</li>
   <li>Drittanbieter von Dienstleistungen, damit diese ihre Dienstleistungen erbringen können, einschließlich (ohne Einschränkung) IT-Dienstleister, Datenspeicher-, Hosting- und Serveranbieter, Fehlerprotokollierer, Inkassobüros, Anbieter von Wartungs- oder Problemlösungen, Marketinganbieter, professionelle Berater und Betreiber von Zahlungssystemen </li>
   <li>unsere Mitarbeiter, Auftragnehmer und/oder verbundene Unternehmen</li>
   <li>unsere bestehenden oder potenziellen Vertreter oder Geschäftspartner</li>
   <li>Kreditauskunfteien, Gerichte und Aufsichtsbehörden, falls Sie für Waren oder Dienstleistungen, die wir Ihnen bereitgestellt haben, nicht zahlen</li>
   <li>Gerichte, Aufsichtsbehörden und Strafverfolgungsbeamte, soweit dies gesetzlich vorgeschrieben ist, in Verbindung mit tatsächlichen oder bevorstehenden Gerichtsverfahren oder zur Feststellung, Ausübung oder Verteidigung unserer gesetzlichen Rechte</li>
   <li>Dritte, einschließlich Vertreter oder Subunternehmer, die uns bei der Bereitstellung von Informationen, Produkten, Dienstleistungen oder Direktmarketing für Sie unterstützen</li>
   <li>Dritte zur Erhebung und Verarbeitung von Daten</li>
   <li>ein Unternehmen, das unser gesamtes Vermögen und unsere Geschäftstätigkeit erwirbt oder an das wir sie ganz oder im Wesentlichen übertragen</li>
</ul>
<p>Zu den derzeit genutzten Drittenanbietern gehören:</p>
<ul>
   <li>SendFox</li>
   <li>Stripe</li>
</ul>
<h3>Internationaler Transfer persönlicher Daten</h3>
<p>Die von uns erhobenen personenbezogenen Daten werden in Schweiz gespeichert und/oder verarbeitet oder in Ländern, wo wir oder unsere Partner, verbundenen Unternehmen und Drittanbieter Einrichtungen unterhalten.</p>
<p>Die Länder, in denen wir Ihre personenbezogenen Daten speichern, verarbeiten oder übermitteln, haben möglicherweise nicht dieselben Datenschutzgesetze wie das Land, in dem Sie die Daten ursprünglich bereitgestellt haben. Wenn wir Ihre persönlichen Daten an Dritte in anderen Ländern weitergeben: (i) führen wir diese Übertragungen in Übereinstimmung mit den Anforderungen des geltenden Rechts durch; und (ii) schützen wir die übertragenen persönlichen Daten in Übereinstimmung mit dieser Datenschutzrichtlinie.</p>
<h2>Ihre Rechte und die Kontrolle Ihrer persönlichen Daten</h2>
<p><strong>Ihre Wahl:</strong> Durch die Bereitstellung personenbezogener Daten an uns erklären Sie sich damit einverstanden, dass wir Ihre personenbezogenen Daten gemäß dieser Datenschutzrichtlinie erfassen, speichern, verwenden und offenlegen. Sie sind nicht verpflichtet, uns personenbezogene Daten zur Verfügung zu stellen. Wenn Sie dies jedoch nicht tun, kann dies Ihre Nutzung unserer App oder der darin oder darüber angebotenen Produkte und/oder Dienstleistungen beeinträchtigen. </p>
<p><strong>Daten von Drittanbietern:</strong> Wenn wir persönliche Informationen über Sie von einem Dritten erhalten, werden wir diese wie in dieser Datenschutzerklärung beschrieben schützen. Wenn Sie ein Drittanbieter sind, der persönliche Daten einer anderen Person zur Verfügung stellt, sichern Sie zu, dass Sie die Zustimmung dieser Person haben, diese an uns weiterzugeben.</p>
<p><strong>Marketing-Erlaubnis:</strong> Wenn Sie zuvor zugestimmt haben, dass wir Ihre persönlichen Daten für Direktmarketing verwenden, können Sie Ihre Meinung jederzeit ändern, indem Sie sich mit uns in Verbindung setzen und die nachstehenden Angaben machen. </p>
<p><strong>Zugriff:</strong> Sie können Einzelheiten zu den persönlichen Daten anfordern, die wir über Sie gespeichert haben. </p>
<p><strong>Korrektur:</strong> Wenn Sie der Meinung sind, dass Informationen, die wir über Sie gespeichert haben, ungenau, veraltet, unvollständig, irrelevant oder irreführend sind, wenden Sie sich bitte an uns unter Verwendung der in dieser Datenschutzrichtlinie angegebenen Kontaktmöglichkeiten. Wir werden angemessene Schritte unternehmen, um alle Informationen zu korrigieren, die sich als ungenau, unvollständig, irreführend oder veraltet erweisen. </p>
<p><strong>Nicht-Diskriminierung:</strong> Wir werden Sie nicht benachteiligen, wenn Sie eines Ihrer Rechte in Bezug auf Ihre persönlichen Daten wahrnehmen. Sofern Ihre persönlichen Daten nicht benötigt werden, um Ihnen eine bestimmte Dienstleistung oder ein bestimmtes Angebot zu unterbreiten (z. B. bestimmte Inhalte an Ihr Gerät senden), werden wir Ihnen keine Waren oder Dienstleistungen vorenthalten und/oder Ihnen andere Preise oder Tarife für Waren oder Dienstleistungen in Rechnung stellen, auch nicht durch die Gewährung von Rabatten oder anderen Vorteilen oder die Verhängung von Strafen, oder Ihnen ein anderes Niveau oder eine andere Qualität von Waren oder Dienstleistungen bieten. </p>
<p><strong>Herunterladen personenbezogener Daten:</strong> Wir bieten Ihnen die Möglichkeit, die personenbezogenen Daten, die Sie über unsere App geteilt haben, herunterzuladen. Bitte kontaktieren Sie uns für weitere Informationen.</p>
<p><strong>Benachrichtigung über Datenschutzverletzungen:</strong> Wir werden die auf uns anwendbaren Gesetze in Bezug auf jede Datenschutzverletzung einhalten. </p>
<p><strong>Beschwerde:</strong> Wenn Sie der Meinung sind, dass wir gegen ein entsprechendes Datenschutzgesetz verstoßen haben, und eine Beschwerde einreichen möchten, wenden Sie sich bitte unter Verwendung der nachstehenden Angaben an uns und teilen Sie uns alle Einzelheiten zu dem mutmaßlichen Verstoß mit. Wir werden Ihre Beschwerde umgehend untersuchen und Ihnen schriftlich antworten, wobei wir Ihnen das Ergebnis unserer Untersuchung und die Schritte mitteilen werden, die wir unternehmen werden, um Ihre Beschwerde zu bearbeiten. Sie haben auch das Recht, sich mit Ihrer Beschwerde an Ihren Datenschutzbeauftragten oder eine Regulierungsbehörde zu wenden. </p>
<p><strong>Abmelden:</strong> Um sich von unserer E-Mail-Datenbank abzumelden oder Mitteilungen (einschließlich Marketingmitteilungen) abzubestellen, wenden Sie sich bitte an uns, indem Sie die in dieser Datenschutzrichtlinie angegebenen Kontaktmöglichkeiten verwenden, oder nutzen Sie die in der Mitteilung angegebenen Abmeldemöglichkeiten. Gegebenenfalls müssen wir Sie um bestimmte Informationen bitten, damit wir Ihre Identität bestätigen können.</p>
<h2>Verwendung von Cookies</h2>
<p>Unsere Datenschutzrichtlinie umfasst die Verwendung von Cookies zwischen Ihrem Gerät und unseren Servern. Ein Cookie ist ein kleines Datenpaket, das eine App auf Ihrem Gerät speichern kann. Es enthält in der Regel eine eindeutige Kennung, die es den App-Servern ermöglicht, Ihr Gerät zu erkennen, wenn Sie die App verwenden, Informationen über Ihr Konto, Ihre Sitzung und/oder Ihr Gerät, zusätzliche Daten, die dem Zweck des Cookies dienen, und alle selbstwartenden Informationen über das Cookie selbst. </p>
<p>Wir verwenden Cookies, um Ihrem Gerät Zugriff auf die Kernfunktionen unserer App zu gewähren, um die Nutzung und Leistung der App auf Ihrem Gerät zu verfolgen, um Ihre Erfahrung mit unserer App auf der Grundlage Ihrer Präferenzen anzupassen und um Werbung auf Ihrem Gerät zu schalten. Jegliche Kommunikation von Cookie-Daten zwischen Ihrem Gerät und unseren Servern erfolgt in einer sicheren Umgebung. </p>
<p>Weitere Informationen finden Sie in unserer Cookie-Richtlinie.</p>
<h2>Betriebsübertragungen</h2>
<p>Im Falle einer Übernahme von uns oder unseren Vermögenswerten oder in dem unwahrscheinlichen Fall, dass wir unser Geschäft aufgeben oder in Konkurs gehen, würden wir Daten, einschließlich Ihrer persönlichen Informationen, zu den Vermögenswerten zählen, die an Parteien übertragen werden, die uns übernehmen. Sie erkennen an, dass es zu solchen Übertragungen kommen kann und dass die Parteien, die uns übernehmen, Ihre personenbezogenen Daten im Rahmen der geltenden Gesetze weiterhin gemäß dieser Richtlinie verwenden können, die sie übernehmen müssen, da sie die Grundlage für alle Eigentums- oder Nutzungsrechte ist, die wir an diesen Daten haben.</p>
<h2>Grenzen unserer Richtlinie</h2>
<p>Unsere App kann Links zu externen Websites enthalten, die nicht von uns betrieben werden. Bitte beachten Sie, dass wir keine Kontrolle über die Inhalte und Richtlinien dieser Websites haben und keine Verantwortung oder Haftung für deren jeweilige Datenschutzpraktiken übernehmen können.</p>
<h2>Änderungen an diesen Richtlinien</h2>
<p>Es liegt in unserem Ermessen, unsere Datenschutzrichtlinie zu ändern, um Aktualisierungen unserer Geschäftsprozesse, aktuelle bewährte Praktiken oder gesetzliche oder behördliche Änderungen zu berücksichtigen. Wenn wir uns entscheiden, diese Datenschutzrichtlinie zu ändern, werden wir die Änderungen hier unter demselben Link veröffentlichen, über den Sie auf diese Datenschutzrichtlinie zugreifen.</p>
<p>Wenn es sich um wesentliche Änderungen handelt oder wenn dies gesetzlich vorgeschrieben ist, werden wir Sie (je nach den von Ihnen gewählten Präferenzen für Mitteilungen von uns) und alle unsere registrierten Nutzer mit den neuen Details und Links zu den aktualisierten oder geänderten Richtlinien kontaktieren.</p>
<p>Falls gesetzlich vorgeschrieben, holen wir Ihr Einverständnis ein oder geben Ihnen die Möglichkeit, sich für oder gegen eine neue Verwendung Ihrer personenbezogenen Daten zu entscheiden.</p>
<h2>Zusätzliche Angaben zur Einhaltung der Allgemeinen Datenschutzgrundverordnung (DSGVO) (EU)</h2>
<h3>Datenverantwortlicher / Datenverarbeiter</h3>
<p>Die DSGVO unterscheidet zwischen Organisationen, die personenbezogene Daten für ihre eigenen Zwecke verarbeiten (bekannt als "Datenverantwortliche") und Organisationen, die personenbezogene Daten im Auftrag anderer Organisationen verarbeiten (bekannt als "Datenverarbeiter"). Wir, Ditax by Graber Sandro, mit Sitz an der in unserem Abschnitt "Kontakt" angegebenen Adresse, sind ein Datenverantwortlicher in Bezug auf die personenbezogenen Daten, die Sie uns zur Verfügung stellen</p>
<h3>Rechtsgrundlagen für die Verarbeitung Ihrer persönlichen Daten</h3>
<p>Wir erheben und verwenden Ihre personenbezogenen Daten nur dann, wenn wir gesetzlich dazu berechtigt sind. In diesem Fall werden wir Ihre personenbezogenen Daten auf rechtmäßige, faire und transparente Weise erfassen und verwenden. Wenn wir Ihre Zustimmung zur Verarbeitung Ihrer personenbezogenen Daten einholen und Sie unter 16 Jahre alt sind, holen wir die Zustimmung Ihrer Eltern oder Ihres Erziehungsberechtigten zur Verarbeitung Ihrer personenbezogenen Daten für diesen speziellen Zweck ein.</p>
<p>Unsere Rechtsgrundlagen hängen davon ab, welche und wie Sie diese Dienste nutzen. Das bedeutet, dass wir Ihre Daten nur aus den folgenden Gründen erfassen und verwenden:</p>
<h4>Ihr Einverständnis</h4>
<p>Wenn Sie uns Ihr Einverständnis geben, Ihre personenbezogenen Daten für einen bestimmten Zweck zu erfassen und zu verwenden. Sie können Ihre Zustimmung jederzeit über die von uns bereitgestellten Möglichkeiten widerrufen; dies hat jedoch keine Auswirkungen auf eine bereits erfolgte Verwendung Ihrer Daten. Sie können der Angabe Ihrer E-Mail-Adresse zustimmen, um Marketing-E-Mails von uns zu erhalten. Sie können sich jederzeit abmelden, aber wir können keine bereits versendeten E-Mails zurückrufen. Wenn Sie weitere Fragen dazu haben, wie Sie Ihre Zustimmung zurückziehen können, wenden Sie sich bitte an die im Abschnitt "Kontakt" dieser Datenschutzrichtlinie angegebenen Daten.</p>
<h4>Erfüllung eines Vertrags oder einer Transaktion</h4>
<p>Wenn Sie einen Vertrag oder eine Transaktion mit uns abgeschlossen haben, oder um vorbereitende Schritte zu unternehmen, bevor wir einen Vertrag oder eine Transaktion mit Ihnen abschließen. Zum Beispiel, Wenn Sie sich mit einer Anfrage an uns wenden, benötigen wir unter Umständen personenbezogene Daten wie Ihren Namen und Ihre Kontaktdaten, um Ihnen antworten zu können. </p>
<h4>Unsere berechtigten Interessen</h4>
<p>Wenn wir der Meinung sind, dass dies für unsere berechtigten Interessen notwendig ist, z. B. um unsere Dienste bereitzustellen, zu betreiben, zu verbessern und zu kommunizieren. Zu unseren berechtigten Interessen gehören Forschung und Entwicklung, das Verständnis unserer Zielgruppe, Marketing und Werbung für unsere Dienste, Maßnahmen zum effizienten Betrieb unserer Dienste, Marketinganalysen und Maßnahmen zum Schutz unserer gesetzlichen Rechte und Interessen.</p>
<h4>Einhaltung der Rechtsvorschriften</h4>
<p>In einigen Fällen können wir rechtlich verpflichtet sein, Ihre personenbezogenen Daten zu verwenden oder aufzubewahren. Dazu gehören unter anderem gerichtliche Anordnungen, strafrechtliche Ermittlungen, behördliche Anfragen und Auflagen. Wenn Sie weitere Fragen dazu haben, wie wir personenbezogene Daten aufbewahren, um die gesetzlichen Bestimmungen zu erfüllen, können Sie sich gerne an die im Abschnitt „Kontakt" dieser Datenschutzrichtlinie angegebenen Kontaktdaten wenden. </p>
<h3>Internationale Übermittlungen außerhalb des Europäischen Wirtschaftsraums (EWR)</h3>
<p>Wir stellen sicher, dass jede Übermittlung personenbezogener Daten aus Ländern des Europäischen Wirtschaftsraums (EWR) in Länder außerhalb des EWR durch angemessene Schutzmaßnahmen geschützt wird, z. B. durch von der Europäischen Kommission genehmigte Standard-Datenschutzklauseln oder die Verwendung verbindlicher unternehmensinterner Vorschriften oder anderer rechtlich anerkannter Mittel. </p>
<h3>Ihre Rechte und die Kontrolle über Ihre personenbezogenen Daten</h3>
<p><strong>Einschränken:</strong> Sie haben das Recht, uns aufzufordern, die Verarbeitung Ihrer personenbezogenen Daten einzuschränken, wenn </p>
<ol type="i">
   <li>Sie Bedenken hinsichtlich der Richtigkeit Ihrer personenbezogenen Daten haben; </li>
   <li>Sie der Meinung sind, dass Ihre personenbezogenen Daten unrechtmäßig verarbeitet wurden;</li>
   <li>Sie die personenbezogenen Daten ausschließlich für die Zwecke eines Rechtsanspruchs benötigen, oder</li>
   <li>wir gerade Ihren Einspruch gegen die Verarbeitung auf der Grundlage legitimer Interessen prüfen.</li>
</ol>
<p><strong>Einspruch gegen die Verarbeitung:</strong> Sie haben das Recht, der Verarbeitung Ihrer personenbezogenen Daten zu widersprechen, wenn dies auf unserem berechtigten oder öffentlichem Interesse beruht. In diesem Fall müssen wir zwingende legitime Gründe für die Verarbeitung vorbringen, die Ihre Interessen, Rechte und Freiheiten überwiegen, damit wir mit der Verarbeitung Ihrer personenbezogenen Daten fortfahren können. </p>
<p><strong>Datenübertragbarkeit:</strong> Sie haben das Recht, eine Kopie der personenbezogenen Daten anzufordern, die wir über Sie gespeichert haben. Wenn möglich, stellen wir Ihnen diese Informationen im CSV-Format oder einem anderen leicht lesbaren maschinellen Format zur Verfügung. Sie haben auch das Recht zu verlangen, dass wir diese personenbezogenen Daten an einen Dritten weitergeben. </p>
<h2>Kontakt</h2>
<p>Wenn Sie Fragen oder Bedenken in Bezug auf Ihre Privatsphäre haben, können Sie uns unter den folgenden Angaben kontaktieren:</p>
<p>Ditax by Graber Sandro<br />
privacy@ditax.ch<br />
</p>
<h4>Allgemeine Datenschutzverordnung (GDPR) Compliance (EU) Datenschutzbeauftragter</h4>
<p>Wir haben einen internen Datenschutzbeauftragten ernannt, an den Sie sich wenden können, wenn Sie Fragen oder Bedenken in Bezug auf Ihre Privatsphäre oder unsere Richtlinien und Praktiken haben. Die Kontaktdaten des Datenschutzbeauftragten lauten wie folgt:</p>
<br />
Ditax by Graber Sandro<br />
privacyofficer@ditax.ch
  `;

  return (
    <div className="min-h-screen bg-[#020408]">
      <SubpageHeader 
        title="Datenschutz" 
        onBack={() => navigate(-1)} 
      />
      <LegalDocumentPage
        title=""
        staticContent={privacyContent}
        useDarkBackground={true}
      />
    </div>
  );
};

export default Privacy;
