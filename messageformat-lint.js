(function(mod) {
  if (typeof exports == "object" && typeof module == "object") // CommonJS
    mod(require("../../lib/codemirror"));
  else if (typeof define == "function" && define.amd) // AMD
    define(["../../lib/codemirror"], mod);
  else // Plain browser env
    mod(CodeMirror);
})(function(CodeMirror) {
"use strict";

function createAnnotation(msg, severity, from, to) {
  return {
    message: msg,
    severity: severity,
    from: CodeMirror.Pos(from.line-1, from.column-1),
    to: CodeMirror.Pos(to.line-1, to.column-1),
  };
}

function extractHintsFromAst(astNode) {
  switch(astNode.type) {
    case "messageFormatPattern":
      return [].concat.apply([], astNode.statements.map(extractHintsFromAst));
    case "invalidUnicode":
      return [createAnnotation("Invalid unicode escape sequence: " + astNode.text, "error", astNode.start, astNode.end)];
    case "invalidEscapeChar":
      return [createAnnotation("Invalid escape character: " + astNode.text, "error", astNode.start, astNode.end)];
    case "invalidLiteral":
      return [createAnnotation("Invalid literal character: " + astNode.text, "error", astNode.start, astNode.end)];
    case "invalidMessageFormatElement":
      var msg = (astNode.unterminated ? "Unterminated" : "Invalid") + " messageformat element";
      return [createAnnotation(msg, "error", astNode.start, astNode.end)];
    case "messageFormatElement":
      if(astNode.elementFormat) {
        var elementFormat = astNode.elementFormat;
        if(["plural", "selectordinal", "select"].indexOf(elementFormat.key) >= 0) {
          var annotations = [];
          //check the own keys
          var duplicatedKeys = [];
          var indexedForms = {};
          var forms = elementFormat.key == "select" ? elementFormat.val.selectForms : elementFormat.val.pluralForms;
          forms.forEach(function(form) {
            if(!indexedForms[form.key.val]) indexedForms[form.key.val] = [];
            indexedForms[form.key.val].push(form);
            if(indexedForms[form.key.val].length > 1) duplicatedKeys.push(form.key.val);
          });
          //missing "other" key?
          if(!indexedForms.other) {
            annotations.push(createAnnotation("missing other key", "error", elementFormat.start, elementFormat.end));
          }
          //duplicated keys?
          if(duplicatedKeys.length) {
            duplicatedKeys.forEach(function (key) {
              var msg = "duplicated key: " + key;
              indexedForms[key].forEach(function(form) {
                annotations.push(createAnnotation(msg, "warning", form.key.start, form.key.end));
              });
            });
          }
          //don't forget the children...
          return [].concat.apply(annotations, forms.map(function(f) {return extractHintsFromAst(f.val);}));
        }
      }
  }
  return [];
}

CodeMirror.registerHelper("lint", "messageformat.js", function(text, options, editor) {
  var lineCnt = editor.lineCount();

  var ast = forgivingMessageformatParser.parse(text);
  return extractHintsFromAst(ast);
});

});
