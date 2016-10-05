## Header Tools


### Preparation

You need to run the following command before using the header tools.
```
$ cd ./_ghe_tools
$ npm install
```

### Usage

The typical usage scenario is the following:
1. Replace souce code headers to short one using tool
    - For JS-style files (`*.js,css`), `/*IOTASTARTER_JS_LICENSE@@2016@@*/`
    - For HTML-style files (`*.html,ejs`), `<!--IOTASTARTER_HTML_LICENSE@@2016@@-->`
1. Manually, insert source code headers (short one) to files which don't have header
1. Replace short one to long one using tool

#### 1. Replace headers to short one

```
$ npm run header:shrink
```
The command replaces all occurrences of IBM source code header with short one.
The IBM source code header for JS and CSS is like:
```
/**
  * Copyright 2016 IBM Corp. All Rights Reserved.
  ...
  */
```
, and for HTML and EJS is like:

```
<!-------------------------------------------------
    Copyright 2016 IBM Corp. All Rights Reserved.
  ...
  -------------------------------------------------->
```

#### 2. Insert source code header

In this step, you manually go through each files and see if the short version of the header
is in the source code. (You may also refer to the file `header-process-skipped-file-list.txt`,
which contains a list of files in which no IBM header found.)

When you want to insert an IBM header, insert `/*IOTASTARTER_JS_LICENSE@@2016@@*/` or 
`<!--IOTASTARTER_HTML_LICENSE@@2016@@-->` depending on the file type to the top of the file.

#### 3. Expand short header

Update the source code header description in the `header_target_js.js`
and `header_target_html.html`, which contain full versons of source code header
for each file type.

**MAKE SURE THAT RETURN CODES OF THE FILES ARE `\n`.**

Then, run the following command:
```
$ npm run header:expand
```

