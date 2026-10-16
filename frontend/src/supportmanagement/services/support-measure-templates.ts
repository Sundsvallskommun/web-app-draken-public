export interface SupportMeasureTemplate {
  key: string;
  label: string;
  titles: string[];
}

/** Standard control points per kind of inspection. Picked by the handler, who then edits the list freely. */
export const SUPPORT_MEASURE_TEMPLATES: SupportMeasureTemplate[] = [
  {
    key: 'serving_permit',
    label: 'Serveringstillstånd – tillsyn',
    titles: [
      'Serveringsansvarig närvarande och anmäld',
      'Ålderskontroll (18/20 år)',
      'Serveringstider följs',
      'Ingen överservering / märkbart berusade gäster',
      'Matutbud (lagad mat vid stadigvarande)',
      'Prislista och prissättning',
      'Marknadsföring (ej otillbörlig/riktad mot unga)',
      'Ordning och nykterhet',
      'Kassaregister och bokföring',
    ],
  },
  {
    key: 'beer_sales',
    label: 'Folkölsförsäljning – tillsyn',
    titles: [
      'Egenkontrollprogram finns och följs',
      'Ålderskontroll (18 år)',
      'Skyltning om åldersgräns',
      'Matvaror säljs i butiken',
      'Ingen försäljning till märkbart berusade',
      'Personalen känner till reglerna',
      'Ingen langning / misstänkt vidareförsäljning',
    ],
  },
  {
    key: 'tobacco_sales',
    label: 'Tobaksförsäljning – tillsyn',
    titles: [
      'Egenkontrollprogram finns och följs',
      'Ålderskontroll (18 år)',
      'Skyltning om åldersgräns',
      'Spårbarhets- och säkerhetsmärkning',
      'Endast tillåtna produkter',
      'Ingen förbjuden marknadsföring',
    ],
  },
  {
    key: 'nicotine_products',
    label: 'Nikotinprodukter / e-cigaretter – tillsyn',
    titles: [
      'Egenkontrollprogram finns och följs',
      'Ålderskontroll (18 år)',
      'Produktkrav och märkning',
      'Endast tillåtna smaker/produkter',
      'Ingen förbjuden marknadsföring',
    ],
  },
];
