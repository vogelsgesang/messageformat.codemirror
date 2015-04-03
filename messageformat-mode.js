(function(mod) {
  if (typeof exports == "object" && typeof module == "object") // CommonJS
    mod(require("../../lib/codemirror"));
  else if (typeof define == "function" && define.amd) // AMD
    define(["../../lib/codemirror"], mod);
  else // Plain browser env
    mod(CodeMirror);
})(function(CodeMirror) {
"use strict";

CodeMirror.defineMode("messageformat.js", function(config, parserConfig) {

  var identifierRegexp = /^[0-9a-zA-Z$_][^ \t\n\r,.+={}]*/;

  function literalModeToken(stream, state) {
    if(stream.match(/^\\[{}#\\]/)) {
      return "atom";
    }
    var unicodeMatch = stream.match(/^\\u([0-9a-fA-F]{0,4})/);
    if(unicodeMatch) {
      return unicodeMatch[1].length == 4 ? "atom" : "error";
    }
    if(stream.eat("{")) {
      state.stack.push({type: "msgVariable"});
      return "bracket";
    }
    if(stream.eat("}")) {
      if(state.stack.length) {
        state.stack.pop();
        return "bracket";
      } else {
        return "error";
      }
    }
    if(stream.eatWhile(/[^\\{}#]+/)) {
      return "string";
    }
    stream.next();
    return "error";
  }

  function illegalBlockToken(stream, state) {
    if(stream.eat("{")) {
      state.stack.push({type: "illegalBlock"});
      return "error bracket";
    }
    if(stream.eat("}")) {
      state.stack.pop();
      return "error bracket";
    }
    stream.eatWhile(/[^{}]/);
    return "error";
  }

  function msgFormatToken(stream, state) {
    if(stream.eatWhile(/[ \t\n\r]/)) {
      return null;
    }
    var ownState = state.stack[state.stack.length - 1];
    if(!ownState.hasOwnProperty("varName")) {
      var varNameMatch = stream.match(identifierRegexp);
      if(varNameMatch) {
        ownState.varName = varNameMatch[0];
        return "def";
      }
    } else if(!ownState.hasOwnProperty("elementFormat")) {
      if(!ownState.expectingElementFormat) {
        if(stream.eat(",")) {
          ownState.expectingElementFormat = true;
          return null;
        }
        if(stream.eat("}")) {
          state.stack.pop();
          return "bracket";
        }
      } else {
        var elementFormatMatch = stream.match(identifierRegexp);
        if(elementFormatMatch) {
          ownState.elementFormat = elementFormatMatch[0];
          delete ownState.expectingElementFormat;
          return "keyword";
        }
      }
    } else if(ownState.elementFormat == "select") {
      var parsedSelectToken = selectToken(stream, state);
      if(parsedSelectToken !== undefined) return parsedSelectToken;
    } else if(ownState.elementFormat == "plural" || ownState.elementFormat == "selectordinal") {
      var parsedPluralToken = pluralToken(stream, state);
      if(parsedPluralToken !== undefined) return parsedPluralToken;
    } else {
      var parsedArgumentToken = argumentToken(stream, state);
      if(parsedArgumentToken !== undefined) return parsedArgumentToken;
    }
    if(stream.eat("{")) {
      state.stack.push({type: "illegalBlock"});
      return "error bracket";
    }
    if(stream.eat("}")) {
      state.stack.pop();
      return "error bracket";
    }
    stream.next();
    return "error";
  }

  function createChoicesTokenizer(keyMatcher) {
    return function(stream, state) {
      var ownState = state.stack[state.stack.length - 1];
      if(!ownState.isAcceptingChoices) {
        if(stream.eat(",")) {
          ownState.isAcceptingChoices = true;
          ownState.currentKey = null;
          ownState.keys = [];
          return null;
        }
      } else {
        if(ownState.currentKey === null) {
          var keyToken = keyMatcher(stream, state);
          if(keyToken !== undefined) {
            ownState.currentKey = stream.current();
            return keyToken;
          }
          if(ownState.keys.length > 0 && stream.eat("}")) {
            state.stack.pop();
            return "bracket";
          }
        } else {
          if(stream.eat("{")) {
            ownState.keys.push(ownState.currentKey);
            ownState.currentKey = null;
            state.stack.push({type: "literal"});
            return "bracket";
          }
        }
      }
    };
  }

  var selectToken = createChoicesTokenizer(function(stream, state) {
    if(stream.match(identifierRegexp)) {
      return "keyword";
    }
  });

  var pluralToken = createChoicesTokenizer(function(stream, state) {
    if(stream.match(identifierRegexp)) {
      return "keyword";
    }
    if(stream.match(/^=[0-9]+/)) {
      return "number";
    }
  });

  function argumentToken(stream, state) {
    var ownState = state.stack[state.stack.length - 1];
    if(!ownState.isAcceptingArgument) {
      if(stream.eat(",")) {
        ownState.isAcceptingArgument = true;
        return null;
      }
      if(stream.eat("}")) {
        state.stack.pop();
        return "bracket";
      }
    } else {
      if(stream.match(identifierRegexp)) {
        ownState.isAcceptingArgument = false;
        return "keyword";
      }
    }
  }

  return {
    startState: function() {
      return {
        stack: []
      };
    },

    token: function(stream, state) {
      var stack = state.stack;
      var currentState = stack.length > 0 ? stack[stack.length-1].type : "literal";
      if(currentState === "literal") {
        return literalModeToken(stream, state);
      } else if(currentState === "msgVariable") {
        return msgFormatToken(stream, state);
      } else if(currentState === "illegalBlock") {
        return illegalBlockToken(stream, state);
      }
    },
    fold: "brace"
  };

});

});
