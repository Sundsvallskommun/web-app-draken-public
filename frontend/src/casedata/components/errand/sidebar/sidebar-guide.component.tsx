import { LucideIcon as Icon, List, Select } from '@sk-web-gui/react';
import { useState } from 'react';

export const SidebarGuide: React.FC<{}> = () => {
  const [showLandLeaseAgreement, setShowLandLeaseAgreement] = useState<boolean>(false);
  const [showBuildingPermit, setBuildingPermit] = useState<boolean>(false);
  const [showRightOfUse, setRightOfUse] = useState<boolean>(false);
  const [showLandAgreement, setLandAgreement] = useState<boolean>(false);

  const selectGuide = (selectedValue) => {
    // Close all
    setShowLandLeaseAgreement(false);
    setBuildingPermit(false);
    setRightOfUse(false);
    setLandAgreement(false);

    switch (selectedValue) {
      case 'markupplatelseavtal':
        setShowLandLeaseAgreement(true);
        break;
      case 'bygglov':
        setBuildingPermit(true);
        break;
      case 'nyttjanderatt':
        setRightOfUse(true);
        break;
      case 'markforvarv':
        setLandAgreement(true);
    }
  };

  return (
    <div className="relative h-full flex flex-col justify-start">
      <div className="px-0 flex justify-between items-center">
        <span className="text-base md:text-large xl:text-lead font-semibold">Guider</span>
      </div>

      <div className="my-md">
        <Select
          className="w-full"
          onChange={(e) => {
            selectGuide(e.target.value);
          }}
          data-cy="select-guide"
        >
          <Select.Option value="">Välj guide</Select.Option>
          <Select.Option value="nyttjanderatt">Arrende/nyttjanderätt</Select.Option>
          <Select.Option value="bygglov">Bygglov</Select.Option>
          <Select.Option value="markforvarv">Markförvärv</Select.Option>
          <Select.Option value="markupplatelseavtal">Markupplåtelseavtal</Select.Option>
        </Select>
      </div>

      <div data-cy="guide-wrapper">
        {!showLandLeaseAgreement && !showBuildingPermit && !showRightOfUse && !showLandAgreement && (
          <p className="text-dark-disabled">Ingen guide vald</p>
        )}

        {showLandLeaseAgreement && (
          <div>
            <p className="text-base font-bold mb-12">Markupplåtelseavtal</p>
            <List listStyle="bullet">
              <List.Item className="pt-0">
                <List.Text>Vilken mark är berörd? Vilket avtal ska tecknas?</List.Text>
              </List.Item>
              <List.Item className="pt-sm">
                <List.Text>Är sträckan är lämplig eller finns bättre?</List.Text>
              </List.Item>
              <List.Item className="pt-sm">
                <List.Text>Ska Park/Gata/KoF/ Drak yttra sig?</List.Text>
              </List.Item>
              <List.Item className="pt-sm">
                <List.Text>Berörs tomträtt/arrende?</List.Text>
              </List.Item>
              <List.Item className="pt-sm">
                <List.Text>Berörs rättighet/vägrätt/GA/samfällighet?</List.Text>
              </List.Item>
              <List.Item className="pt-sm">
                <List.Text>Kontrollerat om bygglov krävs/finns.</List.Text>
              </List.Item>
              <List.Item className="pt-sm">
                <List.Text>Ersättning för rotnetto? Meddelat ekonomiavd. fastighet och summa.</List.Text>
              </List.Item>
              <List.Item className="pt-sm">
                <List.Text>
                  Fyllt i PG 125 880-5 och ref.nr. i värderingsprotokollet. Signeras enligt delegationsordningen
                  (arkivpapper).
                </List.Text>
              </List.Item>
              <List.Item className="pt-sm">
                <List.Text>Skickat och diariefört undertecknade avtal mm. till motpart.</List.Text>
              </List.Item>
              <List.Item className="pt-sm">
                <List.Text>Fått tillbaka avtal undertecknat av båda parter.</List.Text>
              </List.Item>
              <List.Item className="pt-sm">
                <List.Text>Alla undertecknade handlingar är diarieförda.</List.Text>
              </List.Item>
              <List.Item className="pt-sm">
                <List.Text>Lämnat handlingar i original till admin.</List.Text>
              </List.Item>
            </List>
          </div>
        )}
        {showBuildingPermit && (
          <div>
            <p className="text-base font-bold mb-12">Bygglov</p>
            <List listStyle="bullet">
              <List.Item className="pt-0">
                <List.Text>Granskat karta och situationsplan (2,5 m).</List.Text>
              </List.Item>
              <List.Item className="pt-sm">
                <List.Text>Är Gata/Park berörd? Hänvisa till dom i vårt yttrande.</List.Text>
              </List.Item>
              <List.Item className="pt-sm">
                <List.Text>Är Drak/KoF berörd? Skicka bygglovet till dom att yttra sig.</List.Text>
              </List.Item>
              <List.Item className="pt-sm">
                <List.Text>Gäller bygglovet kommunal mark? Hämta interna synpunkter.</List.Text>
              </List.Item>
              <List.Item className="pt-sm">
                <List.Text>Är bygglovet inom arrende/tomträtt? Läs avtalet och upplys Bygglov om det.</List.Text>
              </List.Item>
              <List.Item className="pt-sm">
                <List.Text>Saknas avtal för åtgärd på kommunal mark? Uppmana i yttrande att ansöka om avtal.</List.Text>
              </List.Item>
              <List.Item className="pt-sm">
                <List.Text>Skickat yttrande till Bygglov.</List.Text>
              </List.Item>
            </List>
          </div>
        )}
        {showRightOfUse && (
          <div>
            <p className="text-base font-bold mb-12">Arrende/nyttjanderätt</p>
            <List listStyle="bullet">
              <List.Item className="pt-0">
                <List.Text>Finns arrende/servitut/GA/Samf. på området?</List.Text>
              </List.Item>
              <List.Item className="pt-sm">
                <List.Text>Finns riksintressen/ fornminnen/ markföroreningar?</List.Text>
              </List.Item>
              <List.Item className="pt-sm">
                <List.Text>Behöver Park/Gata/KoF/ Drak yttra sig?</List.Text>
              </List.Item>
              <List.Item className="pt-sm">
                <List.Text>Kontrollera firmatecknare/motpart.</List.Text>
              </List.Item>
              <List.Item className="pt-sm">
                <List.Text>Upprätta avtal och karta.</List.Text>
              </List.Item>
              <List.Item className="pt-sm">
                <List.Text>Behövs besiktning / dokumentation?</List.Text>
              </List.Item>
              <List.Item className="pt-sm">
                <List.Text>Avtalet är granskat av en kollega.</List.Text>
              </List.Item>
              <List.Item className="pt-sm">
                <List.Text>Upplys motpart om administrativ avgift.</List.Text>
              </List.Item>
              <List.Item className="pt-sm">
                <List.Text>Mejla avtal och karta till motpart för granskning.</List.Text>
              </List.Item>
              <List.Item className="pt-sm">
                <List.Text>Skickat och diariefört handlingar till motpart.</List.Text>
              </List.Item>
              <List.Item className="pt-sm">
                <List.Text>Avtal åter från motpart. Signeras enligt delegationsordning.</List.Text>
              </List.Item>
              <List.Item className="pt-sm">
                <List.Text>Skickat undertecknade handlingar till motpart.</List.Text>
              </List.Item>
              <List.Item className="pt-sm">
                <List.Text>Alla undertecknade handlingar är diarieförda.</List.Text>
              </List.Item>
              <List.Item className="pt-sm">
                <List.Text>Handlingar i original är lämnade till admin.</List.Text>
              </List.Item>
              <List.Item className="pt-sm">
                <List.Text>Kartrutin OK</List.Text>
              </List.Item>
            </List>
          </div>
        )}
        {showLandAgreement && (
          <div>
            <p className="text-base font-bold mb-12">Markförvärv</p>
            <List listStyle="bullet">
              <List.Item className="pt-0">
                <List.Text>
                  Finns byggnader, inteckningar, rättigheter, upplåtelser, markföroreningar, lagfaren ägare.
                </List.Text>
              </List.Item>
              <List.Item className="pt-sm">
                <List.Text>Egenkontroll av företaget, ekonomi, firmatecknare.</List.Text>
              </List.Item>
              <List.Item className="pt-sm">
                <List.Text>Kontrollerat ev. bouppteckning, ev. fullmakt.</List.Text>
              </List.Item>
              <List.Item className="pt-sm">
                <List.Text>
                  Samtycke från överförmyndaren krävs om delägaren är omyndig. Gäller vid försäljning och byte.
                </List.Text>
              </List.Item>
              <List.Item className="pt-sm">
                <List.Text>Upprättat avtal, karta.</List.Text>
              </List.Item>
              <List.Item className="pt-sm">
                <List.Text>Upprättat köpebrev och lagt in i Draken.</List.Text>
              </List.Item>
              <List.Item className="pt-sm">
                <List.Text>Avtalet är granskat av en kollega.</List.Text>
              </List.Item>
              <List.Item className="pt-sm">
                <List.Text>Upplys motpart om administrativ avgift.</List.Text>
              </List.Item>
              <List.Item className="pt-sm">
                <List.Text>
                  Mejlat avtal, karta till motpart för granskning. Efterfrågat säljarens konto, bank.
                </List.Text>
              </List.Item>
              <List.Item className="pt-sm">
                <List.Text>Beslutsunderlag till Au, Sbn, Kf.</List.Text>
              </List.Item>
              <List.Item className="pt-sm">
                <List.Text>Skickat följebrev, avtal, karta till motpart. Diariefört ev. postade handlingar.</List.Text>
              </List.Item>
              <List.Item className="pt-sm">
                <List.Text>Avtal åter från motpart. Lämnat för signatur.</List.Text>
              </List.Item>
              <List.Item className="pt-sm">
                <List.Text>Skickat undertecknade handlingar till motpart.</List.Text>
              </List.Item>
              <List.Item className="pt-sm">
                <List.Text>Alla undertecknade handlingar är diarieförda.</List.Text>
              </List.Item>
              <List.Item className="pt-sm">
                <List.Text>Handlingar i original är lämnade till admin.</List.Text>
              </List.Item>
            </List>
          </div>
        )}
      </div>
    </div>
  );
};
