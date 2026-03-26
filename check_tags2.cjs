const fs = require('fs');
const content = fs.readFileSync('src/AdminPanel.tsx', 'utf8');

// We will use a simple stack-based parser to find JSX tag mismatches
let stack = [];
let i = 0;
let line = 1;
let inString = false;
let stringChar = '';
let inComment = false;
let inJSXComment = false;

while (i < content.length) {
  if (content[i] === '\n') line++;
  
  if (inString) {
    if (content[i] === stringChar && content[i-1] !== '\\') {
      inString = false;
    }
    i++;
    continue;
  }
  
  if (inComment) {
    if (content[i] === '*' && content[i+1] === '/') {
      inComment = false;
      i += 2;
    } else {
      i++;
    }
    continue;
  }
  
  if (inJSXComment) {
    if (content.substr(i, 3) === '*/}') {
      inJSXComment = false;
      i += 3;
    } else {
      i++;
    }
    continue;
  }
  
  if (content[i] === '"' || content[i] === "'" || content[i] === '`') {
    inString = true;
    stringChar = content[i];
    i++;
    continue;
  }
  
  if (content[i] === '/' && content[i+1] === '*') {
    inComment = true;
    i += 2;
    continue;
  }
  
  if (content.substr(i, 3) === '{/*') {
    inJSXComment = true;
    i += 3;
    continue;
  }
  
  // Look for tags
  if (content[i] === '<') {
    let j = i + 1;
    let isClosing = false;
    if (content[j] === '/') {
      isClosing = true;
      j++;
    }
    
    // Read tag name
    let tagName = '';
    while (j < content.length && /[a-zA-Z0-9_.-]/.test(content[j])) {
      tagName += content[j];
      j++;
    }
    
    if (tagName) {
      // Find end of tag
      let k = j;
      let isSelfClosing = false;
      let inTagString = false;
      let tagStringChar = '';
      
      while (k < content.length) {
        if (content[k] === '\n') line++;
        
        if (inTagString) {
          if (content[k] === tagStringChar && content[k-1] !== '\\') {
            inTagString = false;
          }
          k++;
          continue;
        }
        
        if (content[k] === '"' || content[k] === "'") {
          inTagString = true;
          tagStringChar = content[k];
          k++;
          continue;
        }
        
        if (content[k] === '/' && content[k+1] === '>') {
          isSelfClosing = true;
          k += 2;
          break;
        }
        
        if (content[k] === '>') {
          k++;
          break;
        }
        
        k++;
      }
      
      if (!isSelfClosing) {
        if (isClosing) {
          const last = stack.pop();
          if (!last || last.name !== tagName) {
            console.log(`Mismatch at line ${line}: expected </${last ? last.name : 'none'}> but got </${tagName}>`);
          }
        } else {
          stack.push({ name: tagName, line: line });
        }
      }
      
      i = k;
      continue;
    }
  }
  
  i++;
}

console.log('Remaining tags:', stack.map(t => `${t.name} at line ${t.line}`));
