import { AngeSymbol } from '@styles/ange-symbol';

export function SymbolByMunicipalityId(): React.ReactNode | null {
  if (typeof window !== 'undefined' && window.Cypress) return null;

  if (process.env.NEXT_PUBLIC_MUNICIPALITY_ID === '2260') {
    //Ånge
    // const modulePath = 'src/styles/ange-symbol';
    // const { AngeSymbol } = require(modulePath);
    // return React.createElement(AngeSymbol);
    return <AngeSymbol />;
  }
  //Sundsvall eller annat
  return null;
}
