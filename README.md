# Codemirror mode for messageformat.js

This repository provides a codemirror mode for editing template strings for MessageFormat.
Syntax highlighting code folding and a linter are integrated with the editor.
If you want to see it in action, try the [live demo](http://vogelsgesang.github.io/messageformat.codemirror/).

While there are a lot of different MessageFormat dialects, I will stick to the syntax accepted by [messageformat.js](https://github.com/SlexAxton/messageformat.js).

##Features

* syntax highlighting
* linter:
  * highlights invalid escape sequences
  * highlights invalid MessageFormat blocks
  * finds MessageFormat blocks with missing "other" form
  * finds duplicated keys in MessageFormat blocks
* highlights consecutive space characters and trailing space

Both the syntax highlighter and the linter are able to deal with syntactically invalid MessageFormat strings.
