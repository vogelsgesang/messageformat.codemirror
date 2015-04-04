//based on the grammar of https://github.com/SlexAxton/messageformat.js
start
  = topLevelMessageFormatPattern

topLevelMessageFormatPattern
  = st:(messageFormatElement/string/invalidMessageFormatElement/invalidTopLevelLiteral)* {
      return { type: 'messageFormatPattern', statements: st};
    }

messageFormatPattern
  = st:(messageFormatElement/string/invalidMessageFormatElement/invalidLiteral)* {
      return { type: 'messageFormatPattern', statements: st};
    }

messageFormatElement
  = '{' _ argIdx:id _ efmt:(',' elementFormat)? _ '}' {
      var res = {
        type: "messageFormatElement",
        argumentIndex: argIdx
      };
      if (efmt && efmt.length) {
        res.elementFormat = efmt[1];
      } else {
        res.output = true;
      }
      return res;
    }

elementFormat
  = _ p1:pos format:(
      t:"plural" _ ',' _ s:pluralFormatPattern {
          return { type: "elementFormat", key: t, val: s };
        }
      / t:"selectordinal" _ ',' _ s:pluralFormatPattern _ {
          return { type: "elementFormat", key: t, val: s };
        }
      / t:"select" _ ',' _ s:selectFormatPattern {
          return { type: "elementFormat", key: t, val: s };
        }
      / t:id p:argStylePattern* {
          return { type: "elementFormat", key: t, val: p };
        }
    ) p2:pos _ {
      format.start = p1;
      format.end = p2;
      return format;
    }

pluralFormatPattern
  = op:offsetPattern? pf:(pluralForm)+ {
      return { type: "pluralFormatPattern", pluralForms: pf, offset: op || 0 };
    }

offsetPattern
  = _ "offset" _ ":" _ d:digits _ { return d; }

pluralForm
  = _ k:pluralKey _ "{" _ mfp:messageFormatPattern _ "}" {
      return { key: k, val: mfp };
    }

pluralKey
  = p1:pos k:(
      i:id { return i; }
      / "=" d:digits{ return d; }
    ) p2:pos {
      return { val: k, start: p1, end: p2 };
    }

selectFormatPattern
  = pf:selectForm+ { return { type: "selectFormatPattern", selectForms: pf }; }

selectForm
  = _ p1:pos k:id p2:pos _ "{" _ mfp:messageFormatPattern _ "}" {
      return { key: {val: k, start: p1, end: p2}, val: mfp };
    }

argStylePattern
  = _ "," _ p:id _ { return p; }

string
  = s:(chars/whitespace)+ { return { type: "string", val: s.join('') }; }

// This is a subset to keep code size down
// More or less, it has to be a single word
// that doesn't contain punctuation, etc
id "identifier"
  = s:$([0-9a-zA-Z$_][^ \t\n\r,.+={}]*) { return s; }

chars
  = chars:char+ { return chars.join(''); }

char
  = x:[^{}\\\0-\x1F\x7f \t\n\r] { return x; }
  / "\\#" { return "\\#"; }
  / "\\{" { return "\u007B"; }
  / "\\}" { return "\u007D"; }
  / "\\u" h1:hexDigit h2:hexDigit h3:hexDigit h4:hexDigit {
      return String.fromCharCode(parseInt("0x" + h1 + h2 + h3 + h4));
    }

digits
  = ds:[0-9]+ {
    //the number might start with 0 but must not be interpreted as an octal number
    //Hence, the base is passed to parseInt explicitely
    return parseInt((ds.join('')), 10);
  }

hexDigit
  = [0-9a-fA-F]

_ "whitespace"
  = w:whitespace* { return w.join(''); }

// Whitespace is undefined in the original JSON grammar, so I assume a simple
// conventional definition consistent with ECMA-262, 5th ed.
whitespace
  = [ \t\n\r]

//parses an invalid message format element
invalidMessageFormatElement
  = p1:pos '{' v:([^{}]/invalidBlock)* t:'}'? p2:pos {
      return {
        type: "invalidMessageFormatElement",
        val: v,
        unterminated: t === null,
        start: p1,
        end: p2
      };
    }

//accepts a block starting with { until the closing bracket
invalidBlock
  = '{' ([^{}]+/invalidBlock)* '}'

//common error for escape characters
invalidEscape
  = p1:pos t:$("\\u" hexDigit? hexDigit? hexDigit? hexDigit?) p2:pos {
      return {type: "invalidUnicode", text:t, start:p1, end:p2};
    }
  / p1:pos t:$("\\" [^ \t\n\r]) p2:pos {
      return {type: "invalidEscapeChar", text:t, start:p1, end:p2};
    }

//accepts every character, but marks it as invalid
invalidTopLevelLiteral
  = invalidEscape
  / p1:pos i:. p2:pos { return {type: "invalidLiteral", text:i, start: p1, end:p2}; }

//accepts every character except for }, but marks it as invalid
invalidLiteral
  = invalidEscape
  / p1:pos i:[^}] p2:pos { return {type: "invalidLiteral", text:i, start: p1, end:p2}; }

//does not parse anything but only stores the current parser position
pos
  = {return {line: line(), column: column(), offset: offset()};}
