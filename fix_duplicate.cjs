const fs = require('fs');
const content = fs.readFileSync('src/utils/planGenerator.ts', 'utf8');

const marker = ".filter(t => t.completed).length;\n      const savedPages = log.tasks\n        .filter(t => t.type === TaskType.FIXATION && t.completed)";

const idx = content.lastIndexOf(marker);
if (idx > 0) {
  const newContent = content.substring(0, idx).trim() + '\n';
  fs.writeFileSync('src/utils/planGenerator.ts', newContent);
  console.log("FIXED");
} else {
  console.log("MARKER NOT FOUND");
}
