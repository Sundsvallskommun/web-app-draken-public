const ones = ['noll', 'ett', 'två', 'tre', 'fyra', 'fem', 'sex', 'sju', 'åtta', 'nio'];
const teens = ['elva', 'tolv', 'tretton', 'fjorton', 'femton', 'sexton', 'sjutton', 'arton', 'nitton'];
const tens = ['', 'tio', 'tjugo', 'trettio', 'fyrtio', 'femtio', 'sextio', 'sjuttio', 'åttio', 'nittio'];
const thousands = ['', 'tusen', 'miljon', 'miljard'];

export function numberToSwedishWords(n) {
  n = n.replace(/\s/g, '').replace(/[a-zA-Z]/g, '');
  n = n.split('.')[0];
  if (n === '') return 'noll';
  if (!n) return 'noll';
  if (n === 0) return ones[0];

  let words = '';

  if (n < 0) {
    words = 'minus';
    n = -n;
  }

  let parts = [];
  let chunkCount = 0;

  while (n > 0) {
    let chunk = n % 1000;
    if (chunk > 0) {
      let chunkWords = convertChunk(chunk);
      if (chunkCount > 0) {
        chunkWords += ' ' + thousands[chunkCount];
        if (chunk > 1 && chunkCount > 1) {
          chunkWords += 'er'; // Pluralize thousands
        }
      }
      parts.unshift(chunkWords);
    }
    n = Math.floor(n / 1000);
    chunkCount++;
  }

  return [words, ...parts].join(' ');

  function convertChunk(chunk) {
    let chunkWords = '';
    let hundreds = Math.floor(chunk / 100);
    chunk %= 100;
    let tensPart = Math.floor(chunk / 10);
    let onesPart = chunk % 10;

    if (hundreds > 0) {
      chunkWords += ones[hundreds] + ' hundra';
      if (chunk > 0) chunkWords += ' ';
    }

    if (tensPart === 1 && onesPart > 0) {
      chunkWords += teens[onesPart - 1];
    } else {
      if (tensPart > 0) {
        chunkWords += tens[tensPart];
        if (onesPart > 0) chunkWords += ones[onesPart];
      } else if (onesPart > 0) {
        chunkWords += ones[onesPart];
      }
    }

    return chunkWords;
  }
}
