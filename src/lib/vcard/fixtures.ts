const b64Tail = 'QUJDREVGRw'
const photoBase64 = (b64Tail.repeat(20) + 'AB=').slice(0, 178)

function foldVCardLine(line: string, firstLen: number): string {
  let out = line.slice(0, firstLen)
  let rest = line.slice(firstLen)
  while (rest.length) {
    out += '\r\n ' + rest.slice(0, firstLen - 1)
    rest = rest.slice(firstLen - 1)
  }
  return out
}

export const minimal3 = [
  'BEGIN:VCARD',
  'VERSION:3.0',
  'FN:Ram K. Sharma',
  'N:Sharma;Ram;K;;;',
  'ORG:Acme.io',
  'TITLE:Founder',
  'TEL;TYPE=CELL,VOICE:+91 98765 43210',
  'EMAIL;TYPE=INTERNET,HOME:ram@acme.io',
  'EMAIL;TYPE=WORK:ram@personal.example.com',
  'END:VCARD',
  'BEGIN:VCARD',
  'VERSION:3.0',
  'FN:Priya Sharma',
  'N:Sharma;Priya;;;',
  'TEL;TYPE=HOME:022 2345 6789',
  'END:VCARD',
  'BEGIN:VCARD',
  'VERSION:3.0',
  'FN: solo contact',
  'X-CUSTOM:hello',
  'END:VCARD',
  ''
].join('\r\n')

export const qpNote = [
  'BEGIN:VCARD',
  'VERSION:3.0',
  'FN:Old Phone Card',
  'N:Card;Old;;;',
  'NOTE;ENCODING=QUOTED-PRINTABLE;CHARSET=UTF-8:Met at conf 2019.=0AOld addr=',
  'ess: 12 MG Road,=20Bangalore.=0AMoved in 2021.',
  'END:VCARD',
  ''
].join('\r\n')

export const photoBday = [
  'BEGIN:VCARD',
  'VERSION:3.0',
  'FN:Photo Person',
  'N:Person;Photo;;;',
  foldVCardLine('PHOTO;ENCODING=BASE64;TYPE=JPEG:' + photoBase64, 60),
  'BDAY:1990-04-15',
  'ADR;TYPE=HOME:;;12 MG Road;Bangalore;Karnataka;560001;India',
  'CATEGORIES:family,Friend',
  'UID:https://example.com/test-uid',
  'REV:20240101T000000Z',
  'item1.TEL;TYPE=CELL:+91 11111 22222',
  'item1.X-ABLabel:_$!<Mobile>!$_',
  'END:VCARD',
  ''
].join('\r\n')

export const unicode = [
  'BEGIN:VCARD',
  'VERSION:3.0',
  foldVCardLine('FN:प्रिया शर्मा प्रिया शर्मा प्रिया शर्मा प्रिया', 40),
  'N:शर्मा;प्रिया;;;',
  'this line has no colon',
  'END:VCARD',
  'BEGIN:VCARD',
  'VERSION:3.0',
  'FN:علي حسن',
  'N:حسن;علي;;;',
  'END:VCARD',
  'BEGIN:VCARD',
  'VERSION:3.0',
  'FN:Joy 🎉 Friend',
  'END:VCARD',
  ''
].join('\r\n')

export const version21 = [
  'BEGIN:VCARD',
  'VERSION:2.1',
  'N:Patel;Raj;;;',
  'FN:Raj Patel',
  'TEL;CELL:+91 98765 43210',
  'NOTE;ENCODING=QUOTED-PRINTABLE:Card from old phone=20=' + '\r\nwith soft break.',
  'END:VCARD',
  ''
].join('\r\n')

export const multiNote = [
  'BEGIN:VCARD',
  'VERSION:3.0',
  'FN:Two Notes',
  'N:Notes;Two;;;',
  'NOTE:First note from old phone.',
  'NOTE;ENCODING=QUOTED-PRINTABLE;CHARSET=UTF-8:Second=0Anote.',
  'END:VCARD',
  ''
].join('\r\n')
