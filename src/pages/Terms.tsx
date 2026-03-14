import React from 'react';
import { useNavigate } from 'react-router-dom';
import { SubpageHeader } from '@/components/ui/subpage-header';
import LegalDocumentPage from '@/components/legal/LegalDocumentPage';
import { useI18n } from '@/contexts/I18nContext';

const Terms = () => {
  const navigate = useNavigate();
  const { t } = useI18n();
  
  const termsContent = `<h2>Ditax by Graber Sandro Nutzungsbedingungen</h2>
<p>Diese Nutzungsbedingungen regeln deine Nutzung von Ditax, unserer Website unter <a href="https://ditax.ch">https://ditax.ch</a>, und aller damit verbundenen Dienstleistungen, die von Ditax by Graber Sandro bereitgestellt werden.</p>
<p>Wenn du ein Ditax-Konto erstellst oder Ditax verwendest, erklärst du dich damit einverstanden, diese Nutzungsbedingungen einzuhalten und alle geltenden Gesetze und Vorschriften zu befolgen. Wenn du mit diesen Nutzungsbedingungen nicht einverstanden bist, ist es dir untersagt, die App weiter zu nutzen, auf unsere Website zuzugreifen oder andere von Ditax by Graber Sandro bereitgestellte Dienste zu nutzen.</p>
<p>Wenn du auf Ditax zugreifst oder es herunterlädst, (1) aus dem Apple App Store, stimmst du den in den Nutzungsbedingungen des App Store festgelegten Nutzungsregeln zu; und/oder (2) aus dem Google Play Store, stimmst du den Allgemeinen Geschäftsbedingungen von Android, Google Inc. einschließlich der Nutzungsbedingungen von Google Apps zu.</p>
<p>Wir, Ditax by Graber Sandro, behalten uns das Recht vor, diese Nutzungsbedingungen nach eigenem Ermessen zu überprüfen und zu ändern. In diesem Fall werden wir diese Seite aktualisieren und dich über die App und/oder die E-Mail-Adresse benachrichtigen, die du bei der Erstellung deines Kontos angegeben hast. Alle Änderungen dieser Nutzungsbedingungen treten sofort ab dem Datum der Veröffentlichung in Kraft.</p>
<p>Diese Nutzungsbedingungen wurden zuletzt am 7. Juli 2025 aktualisiert</p>
<h3>Anwendungsbeschränkungen</h3>
<p>Durch die Nutzung von Ditax und unserer Website garantierst du für dich selbst, für jede juristische Person, die du vertrittst und die diesen Nutzungsbedingungen zugestimmt hat, und für deine Benutzer, dass du Folgendes unterlassen wirst:</p>
<ul>
   <li>Ditax oder darin enthaltene Materialien und Software oder auf unserer Website enthaltene Materialien und Software zu ändern, zu kopieren, abgeleitete Werke davon zu erstellen, zu dekompilieren oder zurückzuentwickeln; </li>
   <li>Urheberrechts- oder andere Eigentumshinweise aus Ditax oder darin enthaltenen Materialien und Software oder auf unserer Website zu entfernen;</li>
   <li>Ditax oder damit zusammenhängende Materialien an eine andere Person zu übertragen oder die Materialien auf einem anderen Server zu „spiegeln";</li>
   <li>Ditax oder einen der damit verbundenen Dienste wissentlich oder fahrlässig auf eine Weise zu nutzen, die unsere Netzwerke oder andere von Ditax by Graber Sandro bereitgestellte Dienste missbraucht oder stört; </li>
   <li>Ditax oder die damit verbundenen Dienste zu nutzen, um belästigendes, anstößiges, obszönes, betrügerisches oder rechtswidriges Material zu übertragen oder zu veröffentlichen;</li>
   <li>Ditax oder die damit verbundenen Dienste unter Verstoß gegen geltende Gesetze oder Vorschriften zu nutzen;</li>
   <li>Ditax in Verbindung mit dem Versand nicht autorisierter Werbung oder Spam zu nutzen;</li>
   <li>Benutzerdaten ohne die Zustimmung des Benutzers zu sammeln, zu erfassen oder zu erheben; oder </li>
   <li>Ditax oder die damit verbundenen Dienste in einer Weise zu nutzen, die die Privatsphäre, die geistigen Eigentumsrechte oder andere Rechte Dritter verletzen könnte.</li>
</ul>
<h3>Geistiges Eigentum</h3>
<p>Das geistige Eigentum an den Materialien in Ditax und auf unserer Website ist Eigentum von Ditax by Graber Sandro oder an Ditax by Graber Sandro lizenziert. Du darfst Ditax herunterladen, um die Anwendung auf deinem Mobilgerät ausschließlich für den persönlichen Gebrauch anzuzeigen, zu verwenden und darzustellen.</p>
<p>Dies stellt die Gewährung einer Lizenz dar, nicht eine Übertragung des Eigentums. Diese Lizenz erlischt automatisch, wenn Sie gegen eine dieser Einschränkungen oder die Nutzungsbedingungen verstoßen, und kann von Ditax by Graber Sandro jederzeit gekündigt werden. </p>
<h2>Automatische Updates.</h2>
<p>Du erteilst uns die Erlaubnis, Updates für Ditax auf dein Gerät herunterzuladen und zu installieren, in Übereinstimmung mit deinen Datenschutzeinstellungen. Diese Erlaubnis kann jederzeit widerrufen werden, indem du Ditax von deinem Gerät löschst.</p>
<h3>Haftung</h3>
<p>Ditax und die Materialien in Ditax und auf unserer Website werden ohne Mängelgewähr bereitgestellt. Soweit gesetzlich zulässig, übernimmt Ditax by Graber Sandro keine ausdrücklichen oder stillschweigenden Garantien und lehnt hiermit alle anderen Garantien ab, einschließlich, aber nicht beschränkt auf stillschweigende Garantien oder Bedingungen der Marktgängigkeit, der Eignung für einen bestimmten Zweck oder der Nichtverletzung von geistigem Eigentum oder anderer Rechtsverletzungen.</p>
<p>In keinem Fall haften Ditax by Graber Sandro oder seine Lieferanten für Folgeschäden, die dir oder Dritten durch die Nutzung oder die Unmöglichkeit der Nutzung von Ditax, unserer Website oder anderer von Ditax by Graber Sandro bereitgestellter Dienste oder der Materialien in Ditax entstehen, selbst wenn Ditax by Graber Sandro oder ein autorisierter Vertreter mündlich oder schriftlich über die Möglichkeit solcher Schäden informiert wurde.</p>
<p>Im Zusammenhang mit dieser Vereinbarung umfasst der Begriff „Folgeschäden" jegliche Folgeschäden, indirekte Verluste, tatsächliche oder erwartete Gewinneinbußen, entgangene Gewinne, Einnahmeverluste, Geschäftseinbußen, Firmenwertverluste, Gelegenheitsverluste, Ersparnisverluste, Reputationsverluste, Nutzungsverluste und/oder Datenverluste bzw. -beschädigungen, unabhängig davon, ob sie sich aus Gesetzen, Verträgen, Billigkeitsrecht, unerlaubten Handlungen (einschließlich Fahrlässigkeit), Schadensersatzansprüchen oder anderen Gründen ergeben.</p>
<p>Da einige Gerichtsbarkeiten keine Beschränkungen von stillschweigenden Garantien oder Haftungsbeschränkungen für Folgeschäden oder zufällige Schäden zulassen, gelten diese Beschränkungen möglicherweise nicht für Sie.</p>
<h3>Richtigkeit und Vertrauenswürdigkeit des Materials</h3>
<p>Die in Ditax oder auf unserer Website enthaltenen Materialien sind nicht umfassend und dienen nur zu allgemeinen Informationszwecken. Soweit gesetzlich zulässig, übernimmt Ditax by Graber Sandro keine Gewähr oder Zusicherungen hinsichtlich der Richtigkeit, der wahrscheinlichen Ergebnisse oder der Zuverlässigkeit der Verwendung der Materialien in Ditax oder auf unserer Website oder in sonstiger Weise im Zusammenhang mit diesen Materialien oder mit Ressourcen, die mit Ditax und unserer Website verlinkt sind.</p>
<h3>Links</h3>
<p>Ditax by Graber Sandro hat nicht alle mit Ditax oder auf der entsprechenden Website verlinkten Websites überprüft und ist nicht für die Inhalte solcher verlinkten Websites verantwortlich. Die Aufnahme eines Links bedeutet nicht, dass Ditax by Graber Sandro die Website befürwortet, genehmigt oder kontrolliert. Die Nutzung einer solchen verlinkten Website erfolgt auf eigene Gefahr und wir empfehlen dringend, dass du selbst die Eignung dieser Websites überprüfst.</p>
<h2>Hinweis zu Apple</h2>
<p>In dem Umfang, in dem du Ditax auf einem iOS-Gerät verwendest oder darauf zugreifst, erkennst du die Bedingungen dieser Klausel an und stimmst ihnen zu. Du erkennst an, dass diese Nutzungsbedingungen nur zwischen dir und Ditax by Graber Sandro gelten, nicht mit Apple Inc. (Apple), und dass Apple nicht für Ditax und alle in Ditax verfügbaren Materialien verantwortlich ist.</p>
<p>Apple ist nicht verpflichtet, dir Wartungs- und Supportleistungen in Bezug auf Ditax zur Verfügung zu stellen.</p>
<p>Wenn Ditax nicht den geltenden Gewährleistungsbedingungen entspricht, kannst du Apple benachrichtigen und Apple wird dir den Kaufpreis der mobilen Anwendung erstatten. Soweit gesetzlich zulässig, hat Apple keinerlei weitere Gewährleistungsverpflichtungen in Bezug auf Ditax und alle anderen Ansprüche, Verluste, Verbindlichkeiten, Schäden, Kosten oder Ausgaben, die auf die Nichteinhaltung einer Gewährleistung zurückzuführen sind, gehen zu unseren Lasten.</p>
<p>Apple ist nicht dafür verantwortlich, Ansprüche von dir oder Dritten im Zusammenhang mit Ditax oder deiner Nutzung von Ditax zu bearbeiten, einschließlich, aber nicht beschränkt auf (1) Produkthaftungsansprüche; (2) Ansprüche, dass unsere mobile Anwendung nicht den geltenden gesetzlichen oder behördlichen Anforderungen entspricht; und (3) Ansprüche, die sich aus dem Verbraucherschutz oder ähnlichen Gesetzen ergeben.</p>
<p>Apple ist nicht verantwortlich für die Untersuchung, Verteidigung, Beilegung und Erfüllung von Ansprüchen Dritter, die behaupten, dass unsere mobile Anwendung die geistigen Eigentumsrechte dieser Dritten verletzt.</p>
<p>Du erklärst dich damit einverstanden, bei der Nutzung von Ditax alle anwendbaren Bedingungen Dritter einzuhalten, einschließlich aller Nutzungsregeln, die im Apple App Store-Servicevertrag festgelegt sind.</p>
<p>Apple und die Tochtergesellschaften von Apple sind Drittbegünstigte dieser Nutzungsbedingungen und mit deiner Zustimmung zu diesen Nutzungsbedingungen erhält Apple das Recht (und es wird davon ausgegangen, dass Apple dieses Recht akzeptiert hat), diese Nutzungsbedingungen dir gegenüber als Drittbegünstigter dieser Nutzungsbedingungen durchzusetzen.</p>
<p>Hiermit versicherst und garantierst du, dass (1) du dich nicht in einem Land befindest, das einem Embargo der US-Regierung unterliegt oder das von der US-Regierung als „terroristenunterstützendes" Land eingestuft wurde; und (2) du nicht auf einer Liste der US-Regierung mit verbotenen oder eingeschränkten Parteien aufgeführt bist.</p>
<h3>Kündigungsrecht</h3>
<p>Wir können dein Ditax-Konto und dein Recht zur Nutzung von Ditax und diesen Nutzungsbedingungen sofort nach schriftlicher Benachrichtigung an dich wegen eines Verstoßes gegen diese Nutzungsbedingungen aussetzen oder kündigen.</p>
<h3>Aufhebung</h3>
<p>Jede Bestimmung dieser Nutzungsbedingungen, die ganz oder teilweise ungültig oder nicht durchsetzbar ist, wird in dem Umfang aufgehoben, in dem sie ungültig oder nicht durchsetzbar ist. Die Gültigkeit der übrigen Bestimmungen dieser Nutzungsbedingungen bleibt davon unberührt.</p>
<h3>Anwendbares Recht</h3>
<p>Diese Nutzungsbedingungen unterliegen den Gesetzen von Schweiz und werden in Übereinstimmung mit diesen ausgelegt. Sie unterwerfen sich unwiderruflich der ausschließlichen Zuständigkeit der Gerichte in diesem Staat oder an diesem Ort.</p>`;

  return (
    <div className="min-h-screen">
      <SubpageHeader 
        title={t.termsPage.title}
        onBack={() => navigate(-1)} 
      />
      <LegalDocumentPage
        title=""
        staticContent={termsContent}
        useWhiteBackground={true}
      />
    </div>
  );
};

export default Terms;
