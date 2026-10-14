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
    // The rows of the paper protocol "Tillsynsprotokoll Alkohollagen"; the PDF lists whatever the handler kept.
    titles: [
      'Nykterhet (3:5, 3:8, 8:20)',
      'Ålderskontroll (3:7, 3:8)',
      'Servering minderåriga',
      'Marknadsföring (7:1)',
      'Alkoholfria alternativ (8:22)',
      'Personalliggare',
      'Brandskydd (8:16)',
      'För många gäster',
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
