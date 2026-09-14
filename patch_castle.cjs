const fs = require('fs');
let content = fs.readFileSync('src/pages/Settings.tsx', 'utf8');

// We need to update the PDF logic for Castle Tower
// Find the PDF loop
const targetPdf = `        // Page 0 (frontLeftIdx) goes to the LEFT half (or Top).
        const frontLeftIdx = 2 * s; 
        if (paddedImages[frontLeftIdx]) {
          pdf.addImage(
            paddedImages[frontLeftIdx],
            "PNG",
            isCastleTowerStyle ? leftX : leftX, // Castle: top
            isCastleTowerStyle ? topY : topY,
            slotW,
            slotH,
            undefined,
            "FAST"
          );
        }

        // Page N-1 (frontRightIdx) goes to the RIGHT half (or Bottom).
        const frontRightIdx = N - 1 - 2 * s;
        if (paddedImages[frontRightIdx]) {
          pdf.addImage(
            paddedImages[frontRightIdx],
            "PNG",
            isCastleTowerStyle ? leftX : rightX, // Castle: bottom
            isCastleTowerStyle ? bottomY : topY,
            slotW,
            slotH,
            undefined,
            "FAST"
          );
        }

        // BACK SIDE
        pdf.addPage(jsPdfPaper, pdfOrientation);

        // Page 1 (backRightIdx) goes to the RIGHT half (or Top).
        const backRightIdx = 2 * s + 1; 
        if (paddedImages[backRightIdx]) {
          pdf.addImage(
            paddedImages[backRightIdx],
            "PNG",
            isCastleTowerStyle ? leftX : rightX, // Castle: top
            isCastleTowerStyle ? topY : topY,
            slotW,
            slotH,
            undefined,
            "FAST"
          );
        }
        
        // Page N-2 (backLeftIdx) goes to the LEFT half (or Bottom).
        const backLeftIdx = N - 2 - 2 * s; 
        if (paddedImages[backLeftIdx]) {
          pdf.addImage(
            paddedImages[backLeftIdx],
            "PNG",
            isCastleTowerStyle ? leftX : leftX, // Castle: bottom
            isCastleTowerStyle ? bottomY : topY,
            slotW,
            slotH,
            undefined,
            "FAST"
          );
        }`;

const replacePdf = `        const frontLeftIdx = 2 * s; 
        if (paddedImages[frontLeftIdx]) {
          pdf.addImage(
            paddedImages[frontLeftIdx],
            "PNG",
            isCastleTowerStyle ? leftX : leftX,
            isCastleTowerStyle ? topY : topY,
            slotW,
            slotH,
            undefined,
            "FAST"
          );
        }

        const frontRightIdx = N - 1 - 2 * s;
        if (paddedImages[frontRightIdx]) {
          pdf.addImage(
            isCastleTowerStyle && rotatedPaddedImages[frontRightIdx] ? rotatedPaddedImages[frontRightIdx] : paddedImages[frontRightIdx],
            "PNG",
            isCastleTowerStyle ? leftX : rightX, 
            isCastleTowerStyle ? bottomY : topY,
            slotW,
            slotH,
            undefined,
            "FAST"
          );
        }

        pdf.addPage(jsPdfPaper, pdfOrientation);

        const backRightIdx = 2 * s + 1; 
        if (paddedImages[backRightIdx]) {
          pdf.addImage(
            isCastleTowerStyle && rotatedPaddedImages[backRightIdx] ? rotatedPaddedImages[backRightIdx] : paddedImages[backRightIdx],
            "PNG",
            isCastleTowerStyle ? leftX : rightX, 
            isCastleTowerStyle ? topY : topY,
            slotW,
            slotH,
            undefined,
            "FAST"
          );
        }
        
        const backLeftIdx = N - 2 - 2 * s; 
        if (paddedImages[backLeftIdx]) {
          pdf.addImage(
            isCastleTowerStyle && rotatedPaddedImages[backLeftIdx] ? rotatedPaddedImages[backLeftIdx] : paddedImages[backLeftIdx],
            "PNG",
            isCastleTowerStyle ? leftX : leftX, 
            isCastleTowerStyle ? bottomY : topY,
            slotW,
            slotH,
            undefined,
            "FAST"
          );
        }`;

content = content.replace(targetPdf, replacePdf);

const targetSetup = `      const N = paddedImages.length;
      const S = N / 4;

      let jsPdfPaper = "a4";`;

const replaceSetup = `      const N = paddedImages.length;
      const S = N / 4;

      const rotatedPaddedImages = [...paddedImages];
      if (isCastleTowerStyle) {
        setExportProgressBooklet("جاري تدوير الصفحات...");
        const rotateImage180 = (src: string): Promise<string> => {
          return new Promise((resolve) => {
            if (!src) return resolve(src);
            const img = new Image();
            img.onload = () => {
              const c = document.createElement("canvas");
              c.width = img.width;
              c.height = img.height;
              const ctx = c.getContext("2d");
              if (ctx) {
                ctx.translate(img.width / 2, img.height / 2);
                ctx.rotate(Math.PI);
                ctx.drawImage(img, -img.width / 2, -img.height / 2);
                resolve(c.toDataURL("image/png", 0.7));
              } else {
                resolve(src);
              }
            };
            img.onerror = () => resolve(src);
            img.src = src;
          });
        };
        for (let s = 0; s < S; s++) {
          const frontRightIdx = N - 1 - 2 * s;
          const backRightIdx = 2 * s + 1;
          const backLeftIdx = N - 2 - 2 * s;
          if (rotatedPaddedImages[frontRightIdx]) rotatedPaddedImages[frontRightIdx] = await rotateImage180(rotatedPaddedImages[frontRightIdx]);
          if (rotatedPaddedImages[backRightIdx]) rotatedPaddedImages[backRightIdx] = await rotateImage180(rotatedPaddedImages[backRightIdx]);
          if (rotatedPaddedImages[backLeftIdx]) rotatedPaddedImages[backLeftIdx] = await rotateImage180(rotatedPaddedImages[backLeftIdx]);
        }
      }

      let jsPdfPaper = "a4";`;

content = content.replace(targetSetup, replaceSetup);
fs.writeFileSync('src/pages/Settings.tsx', content);
