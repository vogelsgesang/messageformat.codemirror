BIN=./node_modules/.bin

forgiving-messageformat-parser.js: forgiving-messageformat-parser.pegjs
	@${BIN}/pegjs -e forgivingMessageformatParser $< $@
